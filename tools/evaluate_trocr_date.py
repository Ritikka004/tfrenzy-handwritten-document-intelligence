"""Isolated evaluation of cached TrOCR-base on the audited visit-date image.

This script never imports the production worker, never writes the input image,
and uses local_files_only=True so it cannot download models. Its results are an
evaluation artifact only; they do not alter OCR, validation, or database state.
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import torch
from PIL import Image, ImageEnhance, ImageOps
from transformers import TrOCRProcessor, VisionEncoderDecoderModel


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "backend" / "debug-crops" / "doc-1786616852275" / "visit_date_ocr_input.png"
REPORT = ROOT / "tools" / "trocr_date_evaluation.json"
MODEL_ID = "microsoft/trocr-base-handwritten"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def vertical_ink_band(image: Image.Image) -> Image.Image:
    """In-memory vertical trim only; retains the source image's full width."""
    grayscale = image.convert("L")
    width, height = grayscale.size
    pixels = grayscale.load()
    rows = [y for y in range(height) if sum(pixels[x, y] < 128 for x in range(width)) >= 3]
    if not rows:
        return image
    padding = max(20, round((rows[-1] - rows[0] + 1) * 0.15))
    return image.crop((0, max(0, rows[0] - padding), width, min(height, rows[-1] + padding + 1)))


def greedy_confidence(generated) -> float:
    """Geometric mean next-token probability, matching the production worker."""
    probabilities = []
    for index, logits in enumerate(generated.scores):
        token_id = generated.sequences[0, index + 1]
        probabilities.append(torch.softmax(logits[0], dim=-1)[token_id].item())
    return float(torch.tensor(probabilities).log().mean().exp().item()) if probabilities else 0.0


def run_greedy(name: str, image: Image.Image, processor, model) -> dict:
    started = time.perf_counter()
    pixels = processor(images=image, return_tensors="pt").pixel_values
    with torch.inference_mode():
        generated = model.generate(pixels, return_dict_in_generate=True, output_scores=True)
    return {
        "name": name,
        "inference": "greedy",
        "raw_output": processor.batch_decode(generated.sequences, skip_special_tokens=True)[0],
        "confidence": greedy_confidence(generated),
        "confidence_kind": "geometric_mean_selected_token_probability",
        "processing_ms": round((time.perf_counter() - started) * 1000),
        "input_dimensions": list(image.size),
    }


def run_beam(name: str, image: Image.Image, processor, model, beams: int) -> dict:
    started = time.perf_counter()
    pixels = processor(images=image, return_tensors="pt").pixel_values
    with torch.inference_mode():
        generated = model.generate(
            pixels,
            num_beams=beams,
            num_return_sequences=1,
            return_dict_in_generate=True,
            output_scores=True,
        )
    sequence_score = float(generated.sequences_scores[0].item())
    return {
        "name": name,
        "inference": f"beam_search_{beams}",
        "raw_output": processor.batch_decode(generated.sequences, skip_special_tokens=True)[0],
        "confidence": None,
        "confidence_kind": "not_reported: beam score is length-normalized and not comparable to greedy confidence",
        "sequence_score": sequence_score,
        "processing_ms": round((time.perf_counter() - started) * 1000),
        "input_dimensions": list(image.size),
    }


def main() -> None:
    if not INPUT.is_file():
        raise FileNotFoundError(f"Verified input not found: {INPUT}")

    original_hash = sha256(INPUT)
    original = Image.open(INPUT).convert("RGB")
    processor = TrOCRProcessor.from_pretrained(MODEL_ID, local_files_only=True)
    model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID, local_files_only=True)
    model.eval()

    # Every representation is created in memory from the unchanged audited image.
    contrast = ImageEnhance.Contrast(ImageOps.grayscale(original)).enhance(1.25).convert("RGB")
    variants = [
        ("baseline_verified_input", original),
        ("autocontrast_in_memory", ImageOps.autocontrast(ImageOps.grayscale(original)).convert("RGB")),
        ("mild_contrast_1_25_in_memory", contrast),
        ("vertical_ink_band_in_memory", vertical_ink_band(original)),
    ]
    results = [run_greedy(name, image, processor, model) for name, image in variants]
    results.extend([
        run_beam("beam_2_verified_input", original, processor, model, 2),
        run_beam("beam_4_verified_input", original, processor, model, 4),
    ])

    final_hash = sha256(INPUT)
    report = {
        "model": MODEL_ID,
        "input": str(INPUT.relative_to(ROOT)),
        "input_sha256_before": original_hash,
        "input_sha256_after": final_hash,
        "input_unchanged": original_hash == final_hash,
        "results": results,
        "note": "Raw model outputs only. No validation, normalization, or expected-value comparison is used by this script.",
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
