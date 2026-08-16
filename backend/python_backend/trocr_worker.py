"""Persistent JSON-lines worker for local TrOCR handwritten-text inference.

The worker intentionally returns only model-generated text and generation-score
confidence. It does not apply field-specific value repair or validation.
"""

import base64
import io
import json
import os
import sys
import time

import torch
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel


MODEL_ID = os.environ.get("HANDWRITING_OCR_MODEL", "microsoft/trocr-base-handwritten")


def emit(payload):
    print(json.dumps(payload), flush=True)


def confidence_from_generation(generated):
    """Return the geometric mean probability of generated tokens, if supplied."""
    if not generated.scores:
        return 0.0
    probabilities = []
    for index, logits in enumerate(generated.scores):
        token_id = generated.sequences[0, index + 1]
        probabilities.append(torch.softmax(logits[0], dim=-1)[token_id].item())
    return float(torch.tensor(probabilities).log().mean().exp().item()) if probabilities else 0.0


def crop_to_ink(image):
    """Return an image-only content crop with padding for TrOCR inference.

    This operates inside the already verified field crop. It does not modify
    template coordinates or attempt to interpret, repair, or synthesize text.
    """
    grayscale = image.convert("L")
    width, height = grayscale.size
    pixels = grayscale.load()
    column_ink = [sum(pixels[x, y] < 128 for y in range(height)) for x in range(width)]
    row_ink = [sum(pixels[x, y] < 128 for x in range(width)) for y in range(height)]
    columns = [x for x, count in enumerate(column_ink) if count >= 3]
    rows = [y for y, count in enumerate(row_ink) if count >= 3]
    if not columns or not rows:
        return image, None

    left, right = columns[0], columns[-1]
    top, bottom = rows[0], rows[-1]
    # Retain a small neutral border so characters at each edge are not clipped.
    horizontal_padding = max(24, round((right - left + 1) * 0.03))
    vertical_padding = max(20, round((bottom - top + 1) * 0.15))
    bounds = (
        max(0, left - horizontal_padding),
        max(0, top - vertical_padding),
        min(width, right + horizontal_padding + 1),
        min(height, bottom + vertical_padding + 1),
    )
    return image.crop(bounds), {
        "ink": {"left": left, "top": top, "right": right, "bottom": bottom},
        "inference": {
            "left": bounds[0], "top": bounds[1],
            "width": bounds[2] - bounds[0], "height": bounds[3] - bounds[1],
        },
    }


def main():
    # This downloads only when a model is not already present in the Hugging Face
    # cache; the cache is deliberately outside the repository.
    processor = TrOCRProcessor.from_pretrained(MODEL_ID)
    model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID)
    model.eval()
    emit({"type": "ready", "model": MODEL_ID})

    for line in sys.stdin:
        if not line.strip():
            continue
        request = json.loads(line)
        request_id = request["id"]
        started = time.perf_counter()
        try:
            image = Image.open(io.BytesIO(base64.b64decode(request["imageBase64"]))).convert("RGB")
            inference_crop = None
            if request.get("cropToInk"):
                image, inference_crop = crop_to_ink(image)
            pixel_values = processor(images=image, return_tensors="pt").pixel_values
            with torch.inference_mode():
                generated = model.generate(
                    pixel_values,
                    return_dict_in_generate=True,
                    output_scores=True,
                )
            text = processor.batch_decode(generated.sequences, skip_special_tokens=True)[0]
            emit({
                "id": request_id,
                "rawText": text,
                "confidence": confidence_from_generation(generated),
                "processingTimeMs": round((time.perf_counter() - started) * 1000),
                "inferenceCrop": inference_crop,
                "decoding": "greedy_default",
            })
        except Exception as error:  # Ensure one bad crop does not kill the worker.
            emit({"id": request_id, "error": str(error)})


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"[TrOCR worker] startup failed: {error}", file=sys.stderr, flush=True)
        sys.exit(1)
