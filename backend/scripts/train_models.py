"""
RecruitGuard — Production Model Training Pipeline
Trains all 4 ML models on real dataset with proper evaluation.
Saves models + metrics for the performance dashboard.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_auc_score
from xgboost import XGBClassifier

try:
    from imblearn.over_sampling import SMOTE
    HAS_SMOTE = True
except ImportError:
    HAS_SMOTE = False
    print("[Warning] imbalanced-learn not installed. SMOTE will be skipped.")


def load_dataset(data_dir):
    """Load training dataset — generated or EMSCAD CSV."""
    csv_path = os.path.join(data_dir, "training_dataset.csv")

    if not os.path.exists(csv_path):
        print("[!] Training dataset not found. Generating...")
        gen_script = os.path.join(os.path.dirname(__file__), "generate_dataset.py")
        import subprocess
        subprocess.run([sys.executable, gen_script], check=True)

    df = pd.read_csv(csv_path)
    print(f"[OK] Loaded dataset: {len(df)} samples")
    print(f"    Legit: {len(df[df['fraudulent']==0])} | Fraud: {len(df[df['fraudulent']==1])}")
    return df


def evaluate_model(name, y_true, y_pred, y_proba=None):
    """Calculate and return all evaluation metrics."""
    metrics = {
        "model": name,
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, zero_division=0), 4),
        "f1_score": round(f1_score(y_true, y_pred, zero_division=0), 4),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }
    if y_proba is not None:
        try:
            metrics["roc_auc"] = round(roc_auc_score(y_true, y_proba), 4)
        except ValueError:
            metrics["roc_auc"] = 0.0

    print(f"    Accuracy:  {metrics['accuracy']*100:.1f}%")
    print(f"    Precision: {metrics['precision']*100:.1f}%")
    print(f"    Recall:    {metrics['recall']*100:.1f}%")
    print(f"    F1 Score:  {metrics['f1_score']*100:.1f}%")
    if "roc_auc" in metrics:
        print(f"    ROC-AUC:   {metrics['roc_auc']*100:.1f}%")
    return metrics


def train_all_models():
    """Train and evaluate all 4 models with proper metrics."""
    print("\n" + "=" * 60)
    print("  RecruitGuard — Production Model Training Pipeline")
    print("=" * 60 + "\n")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_dir = os.path.join(base_dir, "models")
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(model_dir, exist_ok=True)

    df = load_dataset(data_dir)
    all_metrics = {}

    # ── Prepare text column ──
    df["combined_text"] = (
        df["title"].fillna("") + " " +
        df["description"].fillna("") + " " +
        df["requirements"].fillna("") + " " +
        df["company"].fillna("")
    )

    X_text = df["combined_text"].values
    y = df["fraudulent"].values

    # Train/test split
    X_train_text, X_test_text, y_train, y_test = train_test_split(
        X_text, y, test_size=0.2, random_state=42, stratify=y
    )

    # ─── TIER 1: Text Analyzer (TF-IDF + Logistic Regression) ───
    print("[1/4] Training Text Analyzer (TF-IDF + Logistic Regression)...")
    text_pipe = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=5000, stop_words='english', ngram_range=(1, 2))),
        ('clf', LogisticRegression(C=1.0, max_iter=1000, class_weight='balanced'))
    ])
    text_pipe.fit(X_train_text, y_train)
    y_pred_text = text_pipe.predict(X_test_text)
    y_proba_text = text_pipe.predict_proba(X_test_text)[:, 1]
    all_metrics["text_model"] = evaluate_model("Text Analyzer", y_test, y_pred_text, y_proba_text)
    joblib.dump(text_pipe, os.path.join(model_dir, "text_model.pkl"))
    print("    OK Saved text_model.pkl\n")

    # ─── TIER 2: Anomaly Detector (Isolation Forest) ───
    print("[2/4] Training Anomaly Detector (Isolation Forest)...")

    def extract_anomaly_features(row):
        desc = str(row.get("description", ""))
        title = str(row.get("title", ""))
        reqs = str(row.get("requirements", ""))
        salary = str(row.get("salary", ""))
        company = str(row.get("company", ""))
        text = title + " " + desc
        return [
            min(len(desc), 5000),
            len(title),
            sum(1 for c in text if c.isupper()) / max(len(text), 1),
            sum(1 for c in text if c.isdigit()) / max(len(text), 1),
            1.0 if salary.strip() else 0.0,
            1.0 if company.strip() else 0.0,
            len(reqs),
        ]

    X_anomaly = np.array([extract_anomaly_features(row) for _, row in df.iterrows()])
    iso_forest = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
    iso_forest.fit(X_anomaly)
    # Evaluate on test set
    test_indices = [i for i in range(len(df)) if i >= int(len(df) * 0.8)]
    if test_indices:
        X_anom_test = X_anomaly[test_indices]
        y_anom_test = y[test_indices]
        y_pred_anom = iso_forest.predict(X_anom_test)
        y_pred_anom_binary = np.array([1 if p == -1 else 0 for p in y_pred_anom])
        all_metrics["anomaly_model"] = evaluate_model("Anomaly Detector", y_anom_test, y_pred_anom_binary)
    joblib.dump(iso_forest, os.path.join(model_dir, "anomaly_model.pkl"))
    print("    OK Saved anomaly_model.pkl\n")

    # ─── TIER 3: Metadata Classifier (Random Forest) ───
    print("[3/4] Training Metadata Classifier (Random Forest)...")

    def extract_metadata_features(row):
        salary = str(row.get("salary", ""))
        company = str(row.get("company", ""))
        reqs = str(row.get("requirements", ""))
        desc = str(row.get("description", ""))
        location = str(row.get("location", ""))
        return [
            1.0 if not salary.strip() else 0.0,
            1.0 if not company.strip() else 0.0,
            1.0 if company.strip() else 0.0,  # has_company_logo proxy
            float(row.get("has_questions", 0)),
            float(row.get("telecommuting", 0)),
            1.0 if not reqs.strip() else 0.0,
        ]

    X_meta = np.array([extract_metadata_features(row) for _, row in df.iterrows()])
    X_train_meta, X_test_meta, y_train_meta, y_test_meta = train_test_split(
        X_meta, y, test_size=0.2, random_state=42, stratify=y
    )

    # Apply SMOTE
    if HAS_SMOTE:
        print("    -> Applying SMOTE to balance classes...")
        smote = SMOTE(random_state=42)
        X_train_meta_r, y_train_meta_r = smote.fit_resample(X_train_meta, y_train_meta)
        print(f"    -> Resampled: {len(y_train_meta_r)} samples")
    else:
        X_train_meta_r, y_train_meta_r = X_train_meta, y_train_meta

    rf_clf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
    rf_clf.fit(X_train_meta_r, y_train_meta_r)
    y_pred_meta = rf_clf.predict(X_test_meta)
    y_proba_meta = rf_clf.predict_proba(X_test_meta)[:, 1]
    all_metrics["metadata_model"] = evaluate_model("Metadata Classifier", y_test_meta, y_pred_meta, y_proba_meta)
    joblib.dump(rf_clf, os.path.join(model_dir, "metadata_model.pkl"))
    print("    OK Saved metadata_model.pkl\n")

    # ─── TIER 5: XGBoost Stacking Ensemble ───
    print("[4/4] Training XGBoost Stacking Ensemble...")
    # Generate stacking features: scores from models 1-3
    text_scores = text_pipe.predict_proba(X_text)[:, 1]
    anomaly_raw = iso_forest.decision_function(X_anomaly)
    anomaly_scores = np.array([max(0, min(1, (-s + 0.3) * 1.3)) for s in anomaly_raw])
    meta_scores = rf_clf.predict_proba(X_meta)[:, 1]

    X_stack = np.column_stack([text_scores, anomaly_scores, meta_scores])
    X_train_stack, X_test_stack, y_train_stack, y_test_stack = train_test_split(
        X_stack, y, test_size=0.2, random_state=42, stratify=y
    )

    xgb_clf = XGBClassifier(
        n_estimators=200, learning_rate=0.05, max_depth=6,
        use_label_encoder=False, eval_metric='logloss', random_state=42
    )
    xgb_clf.fit(X_train_stack, y_train_stack)
    y_pred_xgb = xgb_clf.predict(X_test_stack)
    y_proba_xgb = xgb_clf.predict_proba(X_test_stack)[:, 1]
    all_metrics["xgboost_model"] = evaluate_model("XGBoost Ensemble", y_test_stack, y_pred_xgb, y_proba_xgb)
    joblib.dump(xgb_clf, os.path.join(model_dir, "xgboost_model.pkl"))
    print("    OK Saved xgboost_model.pkl\n")

    # ─── Save All Metrics ───
    metrics_path = os.path.join(model_dir, "metrics.json")
    metrics_output = {
        "trained_at": datetime.now().isoformat(),
        "dataset_size": len(df),
        "fraud_samples": int(sum(y)),
        "legit_samples": int(len(y) - sum(y)),
        "models": all_metrics,
    }
    with open(metrics_path, "w") as f:
        json.dump(metrics_output, f, indent=2)
    print(f"[OK] Metrics saved to {metrics_path}")

    print("\n" + "=" * 60)
    print("  SUCCESS ALL MODELS TRAINED AND SAVED SUCCESSFULLY")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    train_all_models()
