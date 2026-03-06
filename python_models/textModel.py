# ============================================================
# MODEL 1: RoBERTa Text Analyzer — REAL ML VERSION
# Uses TF-IDF Vectorizer + Logistic Regression (scikit-learn)
# Trained on synthetic data modelled on Kaggle EMSCAD dataset.
#
# Run standalone:  python python_models/textModel.py
# NOTE: Run train_models.py first to generate text_model.pkl
# ============================================================

import os
import re
import sys
import joblib
import numpy as np
from dataclasses import dataclass, field
from typing import List

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "text_model.pkl")

# ---- Auto-train if model not found ----
def _ensure_model():
    if not os.path.exists(MODEL_PATH):
        print("  [textModel] Model not found. Running train_models.py automatically...")
        import subprocess
        train_script = os.path.join(os.path.dirname(__file__), "train_models.py")
        subprocess.run([sys.executable, train_script], check=True)

_ensure_model()
_pipeline = joblib.load(MODEL_PATH)


@dataclass
class TextModelResult:
    score: int
    flags: List[str]
    model_name: str = "RoBERTa Text Analyzer (ML)"
    fraud_probability: float = 0.0
    fraud_keywords_hit: List[str] = field(default_factory=list)
    safe_keywords_hit: int = 0


def run_text_model(job: dict) -> TextModelResult:
    """
    RoBERTa Text Analyzer — Model 1 (Real ML Version)
    Uses TF-IDF + Logistic Regression trained on EMSCAD-style data.

    Args:
        job: dict with keys: title, description, requirements, company

    Returns:
        TextModelResult with score (0-100) and flags
    """
    text = " ".join(filter(None, [
        job.get("title", ""),
        job.get("description", ""),
        job.get("requirements", ""),
        job.get("company", ""),
    ]))

    # Get fraud probability from ML model
    proba = _pipeline.predict_proba([text])[0]  # [legit_prob, fraud_prob]
    fraud_prob = float(proba[1])
    score = int(round(fraud_prob * 100))

    # Secondary signals for flags (rule-based flags on top of ML score)
    flags = []
    fraud_keywords_hit = []

    text_lower = text.lower()
    flag_phrases = [
        "no experience required", "work from home", "earn from home",
        "make money fast", "unlimited income", "guaranteed income",
        "processing fee", "registration fee", "send money", "wire transfer",
        "whatsapp only", "telegram only", "same day pay",
        "no interview", "uncapped earnings", "passive income",
    ]
    for phrase in flag_phrases:
        if phrase in text_lower:
            fraud_keywords_hit.append(phrase)
            flags.append(f'Suspicious phrase detected: "{phrase}"')

    desc = job.get("description", "")
    if len(desc) < 100:
        flags.append("Job description is suspiciously short or vague")

    caps_count = len(re.findall(r'[A-Z]{4,}', desc + job.get("title", "")))
    if caps_count > 3:
        flags.append("Excessive capitalization detected (common in scam postings)")

    safe_phrases = ["health insurance", "401k", "paid time off", "career growth",
                    "equity", "mentorship", "competitive salary", "agile", "sprint"]
    safe_hits = sum(1 for p in safe_phrases if p in text_lower)

    return TextModelResult(
        score=min(100, max(0, score)),
        flags=flags,
        fraud_probability=round(fraud_prob, 4),
        fraud_keywords_hit=fraud_keywords_hit,
        safe_keywords_hit=safe_hits,
    )


# ============================================================
# STANDALONE RUNNER
# ============================================================

if __name__ == "__main__":
    test_cases = [
        {
            "label": "🔴 SCAM JOB (expect HIGH score)",
            "job": {
                "title": "Data Entry Agent",
                "company": "XYZ Corp",
                "description": "No experience required. Work from home. Earn $5000 per week guaranteed. Unlimited income. Same day pay. Whatsapp only for contact. No interview needed. Send money for training materials.",
                "requirements": "No skills needed. Training provided free.",
            },
        },
        {
            "label": "🟢 LEGITIMATE JOB (expect LOW score)",
            "job": {
                "title": "Senior Software Engineer",
                "company": "Google LLC",
                "description": "We are looking for an experienced software engineer to join our collaborative team. We offer competitive salary, health insurance, 401k, equity, stock options, paid time off, mentorship, and career growth. Agile environment with sprint-based development.",
                "requirements": "5+ years in Python, TypeScript. Strong team collaboration skills.",
            },
        },
        {
            "label": "🟡 BORDERLINE JOB (expect MEDIUM score)",
            "job": {
                "title": "Sales Executive",
                "company": "FastGrow",
                "description": "Immediate start required. Urgent hiring. Be your own boss. Financial freedom. Work from home. No interview process.",
                "requirements": "No experience required.",
            },
        },
    ]

    print("\n" + "=" * 60)
    print("   RoBERTa Text Analyzer — Real ML Standalone Runner")
    print("   (TF-IDF + Logistic Regression | scikit-learn)")
    print("=" * 60 + "\n")

    for case in test_cases:
        result = run_text_model(case["job"])
        print(f"{case['label']}")
        print(f"  Model       : {result.model_name}")
        print(f"  Score       : {result.score}/100")
        print(f"  Fraud Prob  : {result.fraud_probability * 100:.1f}%")
        print(f"  Safe hits   : {result.safe_keywords_hit}")
        if result.flags:
            print("  ⚠️  Flags:")
            for f in result.flags:
                print(f"      • {f}")
        else:
            print("  ✅ No fraud flags detected")
        print("-" * 60 + "\n")

    print("✅ textModel.py (ML) ran successfully.\n")
