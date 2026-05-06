"""
RecruitGuard — SHAP Explainability Engine
Computes mathematical feature contributions (SHAP values) for the ML models.
Provides full transparency into why a job posting was flagged.
"""

import os
import re
import numpy as np
import joblib

# Paths to serialized model files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEXT_MODEL_PATH = os.path.join(BASE_DIR, "models", "text_model.pkl")
META_MODEL_PATH = os.path.join(BASE_DIR, "models", "metadata_model.pkl")

# Cache estimators
_text_pipeline = None
_meta_classifier = None


def _load_estimators():
    global _text_pipeline, _meta_classifier
    if _text_pipeline is None and os.path.exists(TEXT_MODEL_PATH):
        try:
            _text_pipeline = joblib.load(TEXT_MODEL_PATH)
        except Exception as e:
            print(f"[explainability] Error loading text model: {e}")
    if _meta_classifier is None and os.path.exists(META_MODEL_PATH):
        try:
            _meta_classifier = joblib.load(META_MODEL_PATH)
        except Exception as e:
            print(f"[explainability] Error loading metadata model: {e}")


def explain_text_model(text: str, top_n: int = 8) -> dict:
    """
    Computes exact additive contribution (SHAP values) for words in the input text.
    For TF-IDF + Logistic Regression, SHAP value = TF-IDF * coefficient.
    """
    _load_estimators()
    if _text_pipeline is None:
        return {"error": "Text model not loaded or trained."}

    try:
        tfidf = _text_pipeline.named_steps['tfidf']
        clf = _text_pipeline.named_steps['clf']
    except (KeyError, AttributeError):
        return {"error": "Invalid pipeline structure."}

    # Transform input text to TF-IDF vector
    transformed = tfidf.transform([text])
    feature_index = transformed.nonzero()[1]
    tfidf_values = transformed.data

    # Vocabulary and model coefficients
    feature_names = tfidf.get_feature_names_out()
    coef = clf.coef_[0]
    intercept = float(clf.intercept_[0])

    contributions = []
    for idx, value in zip(feature_index, tfidf_values):
        word = feature_names[idx]
        word_coef = coef[idx]
        shap_val = float(value * word_coef)
        contributions.append({
            "word": word,
            "coef": float(word_coef),
            "tfidf": float(value),
            "shap_value": shap_val
        })

    # Sort contributions by magnitude of SHAP values
    contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    # Separate into positive (fraud drivers) and negative (legit drivers)
    positive_contribs = [c for c in contributions if c["shap_value"] > 0][:top_n]
    negative_contribs = [c for c in contributions if c["shap_value"] < 0][:top_n]

    return {
        "intercept": intercept,
        "total_shap_sum": float(sum(c["shap_value"] for c in contributions)),
        "fraud_drivers": positive_contribs,
        "legit_drivers": negative_contribs,
        "all_contributions": contributions[:top_n * 2]
    }


def explain_metadata_model(features_array: np.ndarray) -> dict:
    """
    Computes SHAP values for the 6 metadata features using TreeExplainer.
    Features: [salary_missing, company_missing, has_logo, has_questions, telecommuting, requirements_missing]
    """
    _load_estimators()
    if _meta_classifier is None:
        return {"error": "Metadata classifier not loaded or trained."}

    feature_names = [
        "salary_missing",
        "company_missing",
        "has_company_logo",
        "has_questions",
        "telecommuting",
        "requirements_missing"
    ]

    try:
        import shap
        explainer = shap.TreeExplainer(_meta_classifier)
        shap_values = explainer.shap_values(features_array)
        
        # In newer shap versions, binary classification shap_values can be 3D or list
        if isinstance(shap_values, list):
            # Probability contribution for the positive (fraudulent) class
            vals = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        elif len(shap_values.shape) == 3:
            vals = shap_values[0, :, 1]
        elif len(shap_values.shape) == 2 and shap_values.shape[1] == 2:
            vals = shap_values[0, 1]
        else:
            vals = shap_values[0]

        contributions = []
        for name, val, raw_val in zip(feature_names, vals, features_array[0]):
            contributions.append({
                "feature": name,
                "value": float(raw_val),
                "shap_value": float(val)
            })

        # Sort features by impact on prediction
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return {
            "base_value": float(explainer.expected_value[1] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value),
            "contributions": contributions
        }
    except Exception as e:
        # Fallback explanation if SHAP library fails
        print(f"[explainability] SHAP TreeExplainer fallback: {e}")
        importances = _meta_classifier.feature_importances_
        contributions = []
        for name, imp, raw_val in zip(feature_names, importances, features_array[0]):
            contributions.append({
                "feature": name,
                "value": float(raw_val),
                "importance": float(imp),
                "shap_value": float(imp * (1.0 if raw_val > 0.5 else -1.0))  # Proxy contribution
            })
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return {
            "fallback": True,
            "contributions": contributions
        }
