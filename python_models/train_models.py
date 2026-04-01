# ============================================================
# TRAIN ALL MODELS - Real EMSCAD Kaggle Dataset
# Trains: Text (TF-IDF+LogReg), Anomaly (IsolationForest),
#         Metadata (RandomForest), XGBoost (Stacking Ensemble)
#
# Dataset: fake_job_postings.csv (17,880 real job postings)
# Run:  python python_models/train_models.py
# ============================================================

import os
import sys
import re
import csv
import numpy as np
from collections import Counter

# scikit-learn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.pipeline import Pipeline
import joblib

# xgboost
import xgboost as xgb

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "fake_job_postings.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)


# -------------------------------------------------------------
# LOAD EMSCAD DATASET (using csv module - no pandas required)
# -------------------------------------------------------------

def load_emscad():
    """Load the EMSCAD dataset from CSV into a list of dicts."""
    print("[1/5] Loading EMSCAD dataset...")
    rows = []
    with open(DATA_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Fill None/empty with ''
            for key in row:
                if row[key] is None:
                    row[key] = ""
            rows.append(row)

    labels = np.array([int(r["fraudulent"]) for r in rows])
    n_fraud = int(labels.sum())
    n_legit = len(labels) - n_fraud
    print(f"  Loaded {len(rows)} job postings: {n_legit} legitimate, {n_fraud} fraudulent")
    return rows, labels


# -------------------------------------------------------------
# FEATURE EXTRACTION HELPERS
# -------------------------------------------------------------

def combine_text(row):
    """Combine text fields for TF-IDF vectorization."""
    return " ".join(filter(None, [
        row.get("title", ""),
        row.get("description", ""),
        row.get("requirements", ""),
        row.get("company_profile", ""),
        row.get("benefits", ""),
    ]))


def extract_anomaly_features_row(row):
    """Extract 7 structural features for Isolation Forest from a single row."""
    desc = row.get("description", "")
    title = row.get("title", "")
    reqs = row.get("requirements", "")
    salary = row.get("salary_range", "") or row.get("salary", "")
    company = row.get("company_profile", "") or row.get("company", "")
    text = title + " " + desc

    return [
        min(len(desc), 5000),                                          # description_length
        len(title),                                                     # title_length
        sum(1 for c in text if c.isupper()) / max(len(text), 1),       # caps_ratio
        sum(1 for c in text if c.isdigit()) / max(len(text), 1),       # digit_ratio
        1.0 if salary.strip() else 0.0,                                # has_salary
        1.0 if company.strip() else 0.0,                               # has_company_profile
        len(reqs),                                                      # requirements_length
    ]


def extract_metadata_features_row(row):
    """Extract 6 metadata features for Random Forest from a single row."""
    salary = row.get("salary_range", "") or row.get("salary", "")
    company = row.get("company_profile", "") or row.get("company", "")
    location = row.get("location", "")
    reqs = row.get("requirements", "")
    desc = row.get("description", "")

    # has_company_logo / has_questions: direct from EMSCAD, or heuristic at inference
    has_logo = row.get("has_company_logo", "")
    has_q = row.get("has_questions", "")
    telecommuting = row.get("telecommuting", "")

    # Convert to float safely
    try:
        has_logo_f = float(has_logo) if has_logo != "" else (1.0 if company.strip() else 0.0)
    except (ValueError, TypeError):
        has_logo_f = 0.0
    try:
        has_q_f = float(has_q) if has_q != "" else 0.0
    except (ValueError, TypeError):
        has_q_f = 0.0
    try:
        telecommuting_f = float(telecommuting) if telecommuting != "" else 0.0
    except (ValueError, TypeError):
        telecommuting_f = 0.0

    return [
        1.0 if not salary.strip() else 0.0,     # salary_missing
        1.0 if not company.strip() else 0.0,     # company_profile_missing
        has_logo_f,                               # has_company_logo
        has_q_f,                                  # has_questions
        telecommuting_f,                          # telecommuting
        1.0 if not reqs.strip() else 0.0,         # requirements_missing
    ]


# -------------------------------------------------------------
# TRAIN MODEL 1: TF-IDF + LOGISTIC REGRESSION (Text)
# -------------------------------------------------------------

def train_text_model(rows, labels):
    print("\n" + "=" * 60)
    print("  MODEL 1: TF-IDF + Logistic Regression (Text Analyzer)")
    print("=" * 60)

    texts = [combine_text(r) for r in rows]
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words="english",
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
            C=1.0,
        )),
    ])

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1-Score  : {f1:.4f}")

    path = os.path.join(MODEL_DIR, "text_model.pkl")
    joblib.dump(pipeline, path)
    print(f"  [OK] Saved -> {path}")

    return pipeline


# -------------------------------------------------------------
# TRAIN MODEL 2: ISOLATION FOREST (Anomaly Detector)
# -------------------------------------------------------------

def train_anomaly_model(rows, labels):
    print("\n" + "=" * 60)
    print("  MODEL 2: Isolation Forest (Anomaly Detector)")
    print("=" * 60)

    all_features = np.array([extract_anomaly_features_row(r) for r in rows])

    # Train on legitimate data only (standard for anomaly detection)
    legit_mask = labels == 0
    legit_features = all_features[legit_mask]

    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(legit_features)

    # Evaluate on all data
    predictions = model.predict(all_features)
    pred_fraud = (predictions == -1).astype(int)

    acc = accuracy_score(labels, pred_fraud)
    prec = precision_score(labels, pred_fraud, zero_division=0)
    rec = recall_score(labels, pred_fraud, zero_division=0)
    f1 = f1_score(labels, pred_fraud, zero_division=0)

    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1-Score  : {f1:.4f}")

    path = os.path.join(MODEL_DIR, "anomaly_model.pkl")
    joblib.dump(model, path)
    print(f"  [OK] Saved -> {path}")

    return model


# -------------------------------------------------------------
# TRAIN MODEL 3: RANDOM FOREST (Metadata Classifier)
# -------------------------------------------------------------

def train_metadata_model(rows, labels):
    print("\n" + "=" * 60)
    print("  MODEL 3: Random Forest (Metadata Classifier)")
    print("=" * 60)

    all_features = np.array([extract_metadata_features_row(r) for r in rows])
    X_train, X_test, y_train, y_test = train_test_split(
        all_features, labels, test_size=0.2, random_state=42, stratify=labels
    )

    model = RandomForestClassifier(
        n_estimators=200,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1-Score  : {f1:.4f}")

    path = os.path.join(MODEL_DIR, "metadata_model.pkl")
    joblib.dump(model, path)
    print(f"  [OK] Saved -> {path}")

    return model


# -------------------------------------------------------------
# TRAIN MODEL 5: XGBOOST (Stacking Ensemble)
# -------------------------------------------------------------

def train_xgboost_model(rows, labels, text_pipeline, anomaly_m, metadata_m):
    print("\n" + "=" * 60)
    print("  MODEL 5: XGBoost Stacking Ensemble")
    print("=" * 60)

    # Generate scores from Models 1-3 on training data
    texts = [combine_text(r) for r in rows]
    text_proba = text_pipeline.predict_proba(texts)[:, 1]
    text_scores = np.clip(np.round(text_proba * 100), 0, 100).astype(int)

    anomaly_features = np.array([extract_anomaly_features_row(r) for r in rows])
    anomaly_raw = anomaly_m.decision_function(anomaly_features)
    anomaly_scores = np.clip(np.round((-anomaly_raw + 0.3) * 130), 0, 100).astype(int)

    metadata_features = np.array([extract_metadata_features_row(r) for r in rows])
    metadata_proba = metadata_m.predict_proba(metadata_features)[:, 1]
    metadata_scores = np.clip(np.round(metadata_proba * 100), 0, 100).astype(int)

    # Stack normalised scores as features
    X = np.column_stack([
        text_scores / 100.0,
        anomaly_scores / 100.0,
        metadata_scores / 100.0,
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, labels, test_size=0.2, random_state=42, stratify=labels
    )

    n_legit = int((labels == 0).sum())
    n_fraud = max(int((labels == 1).sum()), 1)

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        scale_pos_weight=n_legit / n_fraud,
        random_state=42,
        eval_metric="logloss",
        n_jobs=-1,
        verbosity=0,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1-Score  : {f1:.4f}")

    path = os.path.join(MODEL_DIR, "xgboost_model.pkl")
    joblib.dump(model, path)
    print(f"  [OK] Saved -> {path}")

    return model


# -------------------------------------------------------------
# MAIN
# -------------------------------------------------------------

if __name__ == "__main__":
    print("\n" + "#" * 60)
    print("  EMSCAD DATASET - TRAIN ALL ML MODELS")
    print("  Dataset: fake_job_postings.csv (17,880 real postings)")
    print("#" * 60)

    if not os.path.exists(DATA_PATH):
        print(f"\n[ERROR] Dataset not found: {DATA_PATH}")
        print("   Place 'fake_job_postings.csv' in python_models/ directory.")
        sys.exit(1)

    rows, labels = load_emscad()

    text_pipeline = train_text_model(rows, labels)
    anomaly_m = train_anomaly_model(rows, labels)
    metadata_m = train_metadata_model(rows, labels)
    xgboost_m = train_xgboost_model(rows, labels, text_pipeline, anomaly_m, metadata_m)

    print("\n" + "#" * 60)
    print("  [OK] ALL MODELS TRAINED ON REAL EMSCAD DATA")
    print("#" * 60)
    print(f"\n  Saved models:")
    print(f"    - models/text_model.pkl")
    print(f"    - models/anomaly_model.pkl")
    print(f"    - models/metadata_model.pkl")
    print(f"    - models/xgboost_model.pkl")
    print(f"\n  Now run:  python python_models/run_all.py")
    print()
