# ============================================================
# MODEL 4: XGBoost Stacking Ensemble — Job Fraud Detection
# Uses XGBClassifier on combined scores from Models 1-3.
#
# Run standalone:  python python_models/xgboostModel.py
# NOTE: Run train_models.py first to generate xgboost_model.pkl
# ============================================================

import os
import sys
import joblib
import numpy as np
from dataclasses import dataclass, field
from typing import List

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "xgboost_model.pkl")


# ---- Auto-train if model not found ----
def _ensure_model():
    if not os.path.exists(MODEL_PATH):
        print("  [xgboostModel] Model not found. Running train_models.py automatically...")
        import subprocess
        train_script = os.path.join(os.path.dirname(__file__), "train_models.py")
        subprocess.run([sys.executable, train_script], check=True)


_ensure_model()
_model = joblib.load(MODEL_PATH)


@dataclass
class XGBoostModelResult:
    score: int
    flags: List[str]
    model_name: str = "XGBoost Stacking Ensemble"
    fraud_probability: float = 0.0


def run_xgboost_model(text_score: int, anomaly_score: int, metadata_score: int) -> XGBoostModelResult:
    """
    XGBoost Stacking Ensemble — Model 4

    Takes the output scores of Models 1-3 and produces a final
    boosted fraud probability using Gradient Boosting.

    Args:
        text_score     : score from Model 1 (TF-IDF + Logistic Regression)
        anomaly_score  : score from Model 2 (Isolation Forest)
        metadata_score : score from Model 3 (Random Forest)

    Returns:
        XGBoostModelResult with combined fraud score and flags
    """
    features = np.array([[text_score / 100.0,
                          anomaly_score / 100.0,
                          metadata_score / 100.0]])

    proba = _model.predict_proba(features)[0]   # [legit_prob, fraud_prob]
    fraud_prob = float(proba[1])
    score = int(round(fraud_prob * 100))
    score = max(0, min(100, score))

    flags = []
    avg = (text_score + anomaly_score + metadata_score) / 3

    if text_score >= 70:
        flags.append("XGBoost: High fraud probability from text analysis signals")
    if anomaly_score >= 70:
        flags.append("XGBoost: Structural anomalies detected across multiple features")
    if metadata_score >= 70:
        flags.append("XGBoost: Suspicious metadata patterns confirmed by ensemble")
    if avg >= 60 and not flags:
        flags.append("XGBoost: Gradient boosting detected combined fraud pattern")

    return XGBoostModelResult(
        score=score,
        flags=flags,
        fraud_probability=round(fraud_prob, 4),
    )


# ============================================================
# STANDALONE RUNNER
# ============================================================

if __name__ == "__main__":
    test_cases = [
        {
            "label": "🔴 SCAM (high scores from all 3 models)",
            "text_score": 92, "anomaly_score": 85, "metadata_score": 78,
        },
        {
            "label": "🟡 MEDIUM (mixed signals)",
            "text_score": 55, "anomaly_score": 40, "metadata_score": 60,
        },
        {
            "label": "🟢 LEGITIMATE (low scores from all 3 models)",
            "text_score": 8, "anomaly_score": 12, "metadata_score": 5,
        },
    ]

    print("\n" + "=" * 60)
    print("   XGBoost Stacking Ensemble — Standalone Runner")
    print("   (XGBClassifier | xgboost library)")
    print("=" * 60 + "\n")

    for case in test_cases:
        result = run_xgboost_model(
            case["text_score"], case["anomaly_score"], case["metadata_score"]
        )
        print(f"{case['label']}")
        print(f"  Inputs        : text={case['text_score']} | anomaly={case['anomaly_score']} | metadata={case['metadata_score']}")
        print(f"  Model         : {result.model_name}")
        print(f"  XGBoost Score : {result.score}/100")
        print(f"  Fraud Prob    : {result.fraud_probability * 100:.1f}%")
        if result.flags:
            print("  ⚠️  Flags:")
            for f in result.flags:
                print(f"      • {f}")
        else:
            print("  ✅ No fraud indicators detected")
        print("-" * 60 + "\n")

    print("✅ xgboostModel.py ran successfully.\n")
