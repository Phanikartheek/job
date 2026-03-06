# ============================================================
# MODEL 4: Combined Content Analyzer — REAL ML VERSION
# Fuses RoBERTa Text Analyzer (TF-IDF+LogReg) +
#         Isolation Forest Anomaly Detector
# Internal weights: 75% text + 25% anomaly
#
# Run standalone:  python python_models/contentModel.py
# ============================================================

from dataclasses import dataclass, field
from typing import List
from textModel    import run_text_model,   TextModelResult
from anomalyModel import run_anomaly_model, AnomalyModelResult


@dataclass
class CombinedContentResult:
    score: int
    flags: List[str]
    model_name: str = "Combined Content Analyzer (ML)"
    text_sub_score: int = 0
    anomaly_sub_score: int = 0
    text_result: TextModelResult = None
    anomaly_result: AnomalyModelResult = None
    fusion_weights: dict = field(default_factory=lambda: {"text": 0.75, "anomaly": 0.25})


def run_content_model(job: dict, text_weight: float = 0.75, anomaly_weight: float = 0.25) -> CombinedContentResult:
    """
    Combined Content Analyzer — Model 4 (Real ML Fusion)

    Fuses:
    - TF-IDF + Logistic Regression (text analysis)   → 75%
    - Isolation Forest (structural anomaly detection) → 25%

    Both sub-models are now real scikit-learn trained models.

    Args:
        job:            dict with job fields
        text_weight:    weight for text model (default 0.75)
        anomaly_weight: weight for anomaly model (default 0.25)

    Returns:
        CombinedContentResult with fused score and all flags
    """
    text_result    = run_text_model(job)
    anomaly_result = run_anomaly_model(job)

    fused_score = round(text_weight * text_result.score + anomaly_weight * anomaly_result.score)
    fused_score = max(0, min(100, fused_score))

    # Deduplicate combined flags
    seen = set()
    combined_flags = []
    for f in (text_result.flags + anomaly_result.flags):
        if f not in seen:
            seen.add(f)
            combined_flags.append(f)

    return CombinedContentResult(
        score=fused_score,
        flags=combined_flags,
        text_sub_score=text_result.score,
        anomaly_sub_score=anomaly_result.score,
        text_result=text_result,
        anomaly_result=anomaly_result,
        fusion_weights={"text": text_weight, "anomaly": anomaly_weight},
    )


# ============================================================
# STANDALONE RUNNER
# ============================================================

if __name__ == "__main__":
    test_cases = [
        {
            "label": "🔴 SCAM JOB",
            "job": {
                "title": "Easy Job",
                "description": "No experience required. Work from home. Earn $5000 per week guaranteed. Pay a deposit to begin. WhatsApp only.",
                "requirements": "No skills needed. Training provided free.",
                "salary": "$5000 per week",
            },
        },
        {
            "label": "🟢 LEGITIMATE JOB",
            "job": {
                "title": "Data Scientist",
                "company": "Amazon",
                "description": "Join our ML team working on large-scale models. Competitive salary, health insurance, 401k. Agile environment. Team collaboration, mentorship, and career growth opportunities.",
                "requirements": "3+ years Python, machine learning, collaborative mindset.",
                "salary": "$140,000/year",
            },
        },
    ]

    print("\n" + "=" * 60)
    print("   Combined Content Analyzer — Real ML Standalone Runner")
    print("   (TF-IDF+LogReg × 75%  +  Isolation Forest × 25%)")
    print("=" * 60 + "\n")

    for case in test_cases:
        result = run_content_model(case["job"])
        print(f"{case['label']}")
        print(f"  Model             : {result.model_name}")
        print(f"  Fusion Weights    : Text={result.fusion_weights['text']*100:.0f}%  Anomaly={result.fusion_weights['anomaly']*100:.0f}%")
        print(f"  Text Sub-Score    : {result.text_sub_score}/100")
        print(f"  Anomaly Sub-Score : {result.anomaly_sub_score}/100")
        print(f"  ★ Fused Score     : {result.score}/100")
        if result.flags:
            print("  ⚠️  Combined Flags:")
            for f in result.flags:
                print(f"      • {f}")
        else:
            print("  ✅ No fraud signals detected")
        print("-" * 60 + "\n")

    print("✅ contentModel.py (ML) ran successfully.\n")
