"""
Model Evaluation and Benchmark Suite for PaddleOCR and TrOCR.
Calculates Character Error Rate (CER), Word Error Rate (WER), Human Correction Rate (HCR),
and field accuracy metrics across datasets.
"""

import time
from typing import Dict, Any, List, Tuple

def levenshtein_distance(s1: str, s2: str) -> int:
    """Computes Levenshtein edit distance between ground truth (s1) and prediction (s2)."""
    if len(s1) > len(s2):
        s1, s2 = s2, s1

    distances = range(len(s1) + 1)
    for i2, c2 in enumerate(s2):
        distances_ = [i2 + 1]
        for i1, c1 in enumerate(s1):
            if c1 == c2:
                distances_.append(distances[i1])
            else:
                distances_.append(1 + min((distances[i1], distances[i1 + 1], distances_[-1])))
        distances = distances_
    return distances[-1]

def calculate_cer(reference: str, hypothesis: str) -> float:
    """
    Character Error Rate (CER) = EditDistance(ref, hyp) / len(ref)
    Returns percentage 0.0 to 100.0
    """
    ref_clean = reference.strip()
    hyp_clean = hypothesis.strip()
    if not ref_clean:
        return 0.0
    dist = levenshtein_distance(ref_clean, hyp_clean)
    return round((dist / max(1, len(ref_clean))) * 100.0, 2)

def calculate_wer(reference: str, hypothesis: str) -> float:
    """
    Word Error Rate (WER) = WordEditDistance(ref, hyp) / len(ref_words)
    Returns percentage 0.0 to 100.0
    """
    ref_words = reference.strip().split()
    hyp_words = hypothesis.strip().split()
    if not ref_words:
        return 0.0
    
    # Word-level Levenshtein
    distances = range(len(ref_words) + 1)
    for i2, w2 in enumerate(hyp_words):
        distances_ = [i2 + 1]
        for i1, w1 in enumerate(ref_words):
            if w1.lower() == w2.lower():
                distances_.append(distances[i1])
            else:
                distances_.append(1 + min((distances[i1], distances[i1 + 1], distances_[-1])))
        distances = distances_
    
    dist = distances[-1]
    return round((dist / max(1, len(ref_words))) * 100.0, 2)

def calculate_hcr(total_fields: int, corrected_fields: int) -> float:
    """
    Human Correction Rate (HCR) = (corrected_fields / total_fields) * 100
    Tracks percentage of fields requiring manual verification intervention.
    """
    if total_fields == 0:
        return 0.0
    return round((corrected_fields / total_fields) * 100.0, 2)

class OCREvaluator:
    """Evaluates evaluation dataset predictions against Ground Truth."""

    def evaluate_dataset(self, test_samples: List[Dict[str, str]]) -> Dict[str, Any]:
        total_cer = 0.0
        total_wer = 0.0
        exact_matches = 0
        total_samples = len(test_samples)

        results = []
        for sample in test_samples:
            gt = sample.get("ground_truth", "")
            pred = sample.get("prediction", "")
            field_key = sample.get("field_key", "unknown")

            cer = calculate_cer(gt, pred)
            wer = calculate_wer(gt, pred)
            is_exact = (gt.strip().lower() == pred.strip().lower())

            if is_exact:
                exact_matches += 1

            total_cer += cer
            total_wer += wer

            results.append({
                "field_key": field_key,
                "ground_truth": gt,
                "prediction": pred,
                "cer": cer,
                "wer": wer,
                "exact_match": is_exact
            })

        avg_cer = round(total_cer / max(1, total_samples), 2)
        avg_wer = round(total_wer / max(1, total_samples), 2)
        exact_acc = round((exact_matches / max(1, total_samples)) * 100.0, 2)

        return {
            "total_samples": total_samples,
            "average_cer": avg_cer,
            "average_wer": avg_wer,
            "exact_field_accuracy": exact_acc,
            "human_correction_rate": round(100.0 - exact_acc, 2),
            "sample_details": results
        }

if __name__ == "__main__":
    evaluator = OCREvaluator()
    samples = [
        {"field_key": "visitor_name", "ground_truth": "Amit Kumar", "prediction": "Amit Kumar"},
        {"field_key": "vehicle_number", "ground_truth": "KA01AB1234", "prediction": "KA01AB123A"},
        {"field_key": "mobile_number", "ground_truth": "9876543210", "prediction": "9876543210"},
        {"field_key": "employee_id", "ground_truth": "EMP-4092", "prediction": "EMP-409Z"}
    ]
    report = evaluator.evaluate_dataset(samples)
    print("OCR Model Evaluation Report:")
    print(f"Avg CER: {report['average_cer']}% | Avg WER: {report['average_wer']}% | Exact Acc: {report['exact_field_accuracy']}% | HCR: {report['human_correction_rate']}%")
