# ============================================================
# TRAIN ALL ML MODELS — Job Fraud Detection
# Generates synthetic training data (modelled on Kaggle EMSCAD)
# Trains 4 ML models (Text, Anomaly, Metadata, XGBoost) as .pkl files.
#
# Run: python python_models/train_models.py
# ============================================================

import os
import sys
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from xgboost import XGBClassifier

# Directory to save trained models
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ============================================================
# SYNTHETIC DATASET — Modelled on Kaggle EMSCAD Job Fraud Dataset
# ============================================================

FRAUD_TEXTS = [
    "No experience required. Work from home. Earn $5000 per week guaranteed. No interview needed. Same day pay.",
    "Make money fast from home. Unlimited income. Easy money. No skills needed. Training provided free.",
    "Urgent hiring. Immediate start. Be your own boss. Financial freedom. Passive income guaranteed.",
    "Send money via wire transfer to get started. Bitcoin payment accepted. Registration fee required.",
    "WhatsApp only for contact. Telegram only. No interview. Gmail contact only. Per week guaranteed earnings.",
    "MLM opportunity. Multi-level marketing. Pyramid scheme. Uncapped earnings. 100% remote no interview.",
    "Data entry from home no experience. Earn $3000 weekly. Processing fee required. No qualifications.",
    "Home-based job. Earn unlimited income. Easy work from home. Contact us on WhatsApp only immediately.",
    "No experience no skills needed. Earn from home guaranteed income. Uncapped earnings 5000 per week.",
    "Urgent job. No interview. Work from home. Make money fast. Easy money registration fee required.",
    "Guaranteed income from home. Same day pay. Financial freedom. Be your own boss. No experience required.",
    "Immediate hiring. No qualifications needed. Work from home earn $ per week. Whatsapp only contact.",
    "Online data entry job. No experience required. Training provided free. Earn unlimited income daily.",
    "Earn passive income from home. Multi-level opportunity. No interview immediate start processing fee.",
    "Hot job offer! EASY WORK FROM HOME. EARN $$$ NO SKILLS NEEDED. GUARANTEED INCOME. URGENT.",
    "Join our team today! No experience needed. Work from home. Send $50 deposit to begin training.",
    "Sales executive needed. Financial freedom. Unlimited earning potential. WhatsApp us today only.",
    "Virtual assistant no experience. $200 per day guaranteed. No interview. Gmail contact only.",
    "Hiring immediately no experience. Earn $500 per day. Same day pay wire transfer bitcoin accepted.",
    "Data processing job from home. No skills required. Earn $8000 monthly. Fee required to register.",
    "Be your own boss. Earn from home. Uncapped earnings. Passive income. Telegram contact only urgent.",
    "No qualifications needed. Immediate start. Earn guaranteed income weekly. Send money to enroll.",
    "Easy typing job from home. $150 per hour guaranteed. No experience. Youtube ads no interview.",
    "Online job no experience. Earn $10000 monthly guaranteed. WhatsApp only. Registration fee $100.",
    "Network marketing opportunity. Unlimited income. MLM. Multi-level. No experience required now.",
]

LEGIT_TEXTS = [
    "We are looking for an experienced software engineer. Competitive salary, health insurance, 401k, equity, paid time off. Agile environment.",
    "Join our data science team. Strong Python skills required. Benefits include health insurance, stock options, mentorship and career growth.",
    "Senior backend engineer role. 5 years experience required. We offer competitive salary, annual leave, performance reviews and professional development.",
    "Full stack developer needed. React, Node.js experience. Collaborative agile team. Benefits: health insurance, 401k, pto, equity.",
    "Machine learning engineer. TensorFlow, PyTorch required. Competitive salary, stock options, health insurance. Team collaboration, sprint-based development.",
    "Marketing manager role. 3 years experience. Professional development, mentorship, paid time off, health insurance, competitive salary offered.",
    "Accountant needed. CPA preferred. Strong Excel skills. Benefits include health insurance, 401k, paid time off, career growth opportunities.",
    "HR business partner. 5 years experience. Competitive salary, health insurance, professional development, team environment, annual performance review.",
    "Product manager. MBA preferred. Agile methodologies experience. Stock options, health insurance, pto, mentorship, career growth.",
    "DevOps engineer. AWS, Kubernetes required. Competitive package including salary, health insurance, equity, annual leave, 401k.",
    "UI UX designer. Figma experience required. Collaborative team. Benefits: competitive salary, health insurance, pto, professional development.",
    "Financial analyst. 3 years experience in finance. Competitive salary, health insurance, annual leave, mentorship and career growth.",
    "Project manager. PMP certified preferred. Agile scrum. Competitive salary, health insurance, stock options, paid time off, 401k.",
    "Sales representative. 2 years B2B experience. Competitive base salary plus commission, health insurance, professional development, team environment.",
    "Customer success manager. SaaS experience. Competitive salary, health insurance, equity, paid leave, career growth, team collaboration.",
    "Data analyst. SQL, Python, Tableau. Competitive salary, health insurance, 401k, pto. Professional development, annual review.",
    "Mobile developer iOS Android. 4 years experience. Competitive salary, stock options, health insurance, annual leave, sprint-based agile.",
    "Quality assurance engineer. Selenium, automation experience. Competitive salary, health insurance, 401k, paid time off, mentorship.",
    "Network administrator. Cisco CCNA required. Competitive salary, health insurance, performance review, professional development, paid time off.",
    "Content writer. 2 years experience. Strong writing skills. Competitive salary, health insurance, remote work option, paid leave, team environment.",
    "Business analyst. 3 years experience required. Agile environment, competitive salary, health insurance, 401k, equity, career growth opportunities.",
    "Cybersecurity analyst. CISSP preferred. Competitive salary package, health insurance, stock options, annual leave, mentorship program.",
    "Cloud architect. AWS GCP Azure. 7 years experience. Competitive salary, equity, health insurance, 401k, paid time off.",
    "Research scientist. PhD preferred. Publications record. Competitive salary, health insurance, research budget, professional development, annual review.",
    "Operations manager. 5 years experience. Competitive salary, health insurance, 401k, equity, paid time off, team collaboration.",
]

FRAUD_FEATURES = np.array([
    # [text_len, caps_ratio, digit_ratio, has_upfront_payment, has_messaging_app, has_guaranteed, salary_per_week_high]
    [120, 0.15, 0.08, 1, 1, 1, 1],
    [110, 0.12, 0.05, 0, 0, 1, 1],
    [95,  0.18, 0.02, 0, 1, 1, 0],
    [130, 0.10, 0.06, 1, 0, 0, 0],
    [100, 0.20, 0.01, 0, 1, 1, 1],
    [140, 0.25, 0.04, 1, 0, 0, 0],
    [115, 0.14, 0.09, 1, 1, 1, 1],
    [90,  0.11, 0.03, 0, 1, 1, 0],
    [105, 0.16, 0.07, 0, 0, 1, 1],
    [125, 0.22, 0.05, 1, 1, 1, 1],
    [80,  0.30, 0.10, 1, 1, 1, 1],
    [95,  0.13, 0.04, 0, 1, 1, 0],
    [110, 0.17, 0.06, 1, 0, 1, 1],
], dtype=float)

LEGIT_FEATURES = np.array([
    [500, 0.03, 0.01, 0, 0, 0, 0],
    [620, 0.04, 0.02, 0, 0, 0, 0],
    [480, 0.02, 0.01, 0, 0, 0, 0],
    [550, 0.03, 0.03, 0, 0, 0, 0],
    [700, 0.05, 0.02, 0, 0, 0, 0],
    [460, 0.02, 0.01, 0, 0, 0, 0],
    [530, 0.03, 0.02, 0, 0, 0, 0],
    [490, 0.04, 0.01, 0, 0, 0, 0],
    [610, 0.03, 0.02, 0, 0, 0, 0],
    [580, 0.02, 0.01, 0, 0, 0, 0],
    [640, 0.03, 0.01, 0, 0, 0, 0],
    [520, 0.04, 0.02, 0, 0, 0, 0],
    [475, 0.02, 0.01, 0, 0, 0, 0],
], dtype=float)

METADATA_FRAUD = np.array([
    # [salary_missing, salary_too_high_weekly, salary_unlimited, email_personal, location_missing, company_short]
    [0, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 1, 1],
    [0, 1, 1, 1, 0, 0],
    [1, 0, 0, 1, 1, 1],
    [0, 0, 1, 1, 1, 0],
    [1, 1, 0, 1, 0, 1],
    [0, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 0, 1],
    [1, 1, 0, 0, 1, 1],
    [0, 1, 1, 1, 1, 0],
], dtype=float)

METADATA_LEGIT = np.array([
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
], dtype=float)


# ============================================================
# 1. TRAIN TEXT MODEL — TF-IDF + Logistic Regression
# ============================================================

def train_text_model():
    print("\n[1/3] Training Text Model (TF-IDF + Logistic Regression)...")

    texts  = FRAUD_TEXTS + LEGIT_TEXTS
    labels = [1] * len(FRAUD_TEXTS) + [0] * len(LEGIT_TEXTS)

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=5000,
            stop_words='english',
            sublinear_tf=True,
        )),
        ('clf', LogisticRegression(
            C=5.0,
            max_iter=500,
            class_weight='balanced',
            random_state=42,
        )),
    ])

    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_test)

    print("  Text Model Training Report:")
    print(classification_report(y_test, preds, target_names=["Legitimate", "Fraud"], zero_division=0))

    path = os.path.join(MODEL_DIR, "text_model.pkl")
    joblib.dump(pipeline, path)
    print(f"  ✅ Saved → {path}")
    return pipeline


# ============================================================
# 2. TRAIN ANOMALY MODEL — Isolation Forest
# ============================================================

def train_anomaly_model():
    print("\n[2/3] Training Anomaly Model (Isolation Forest)...")

    # Stack features: fraudulent (label=1) + legitimate (label=0)
    X = np.vstack([FRAUD_FEATURES, LEGIT_FEATURES])

    model = IsolationForest(
        n_estimators=200,
        contamination=0.4,   # ~40% of our synthetic data is fraudulent
        random_state=42,
        max_samples='auto',
    )
    model.fit(X)

    path = os.path.join(MODEL_DIR, "anomaly_model.pkl")
    joblib.dump(model, path)
    print(f"  ✅ Saved → {path}")

    # Simple validation
    fraud_scores  = model.decision_function(FRAUD_FEATURES)
    legit_scores  = model.decision_function(LEGIT_FEATURES)
    print(f"  Fraud anomaly scores (lower = more anomalous): mean={fraud_scores.mean():.3f}")
    print(f"  Legit anomaly scores (higher = more normal):   mean={legit_scores.mean():.3f}")
    return model


# ============================================================
# 3. TRAIN METADATA MODEL — Random Forest Classifier
# ============================================================

def train_metadata_model():
    print("\n[3/3] Training Metadata Model (Random Forest)...")

    X = np.vstack([METADATA_FRAUD, METADATA_LEGIT])
    y = [1] * len(METADATA_FRAUD) + [0] * len(METADATA_LEGIT)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=5,
        class_weight='balanced',
        random_state=42,
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    print("  Metadata Model Training Report:")
    print(classification_report(y_test, preds, target_names=["Legitimate", "Fraud"], zero_division=0))

    path = os.path.join(MODEL_DIR, "metadata_model.pkl")
    joblib.dump(model, path)
    print(f"  ✅ Saved → {path}")
    return model


# ============================================================
# 4. TRAIN XGBOOST MODEL — Stacking Ensemble
# ============================================================

def train_xgboost_model():
    print("\n[4/4] Training XGBoost Stacking Ensemble...")

    # Build stacked feature matrix:
    # Each row = [text_score, anomaly_score, metadata_score] (normalised 0-1)
    # Fraud rows: high text + anomaly scores, varied metadata
    XGBOOST_FRAUD = np.array([
        [0.92, 0.85, 0.78],
        [0.88, 0.80, 0.90],
        [0.75, 0.90, 0.70],
        [0.95, 0.70, 0.85],
        [0.80, 0.88, 0.92],
        [0.70, 0.95, 0.75],
        [0.85, 0.78, 0.88],
        [0.90, 0.82, 0.80],
        [0.78, 0.92, 0.86],
        [0.94, 0.76, 0.91],
        [0.72, 0.88, 0.79],
        [0.87, 0.85, 0.83],
        [0.91, 0.79, 0.77],
    ], dtype=float)

    # Legit rows: all low scores
    XGBOOST_LEGIT = np.array([
        [0.05, 0.10, 0.08],
        [0.12, 0.08, 0.05],
        [0.08, 0.15, 0.10],
        [0.10, 0.06, 0.12],
        [0.07, 0.12, 0.09],
        [0.15, 0.05, 0.07],
        [0.09, 0.11, 0.06],
        [0.06, 0.14, 0.08],
        [0.11, 0.07, 0.10],
        [0.08, 0.09, 0.12],
        [0.13, 0.08, 0.05],
        [0.06, 0.10, 0.09],
        [0.10, 0.07, 0.11],
    ], dtype=float)

    X = np.vstack([XGBOOST_FRAUD, XGBOOST_LEGIT])
    y = [1] * len(XGBOOST_FRAUD) + [0] * len(XGBOOST_LEGIT)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42,
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    print("  XGBoost Model Training Report:")
    print(classification_report(y_test, preds, target_names=["Legitimate", "Fraud"], zero_division=0))

    path = os.path.join(MODEL_DIR, "xgboost_model.pkl")
    joblib.dump(model, path)
    print(f"  ✅ Saved → {path}")
    return model


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("   Job Fraud Detection — ML Model Trainer")
    print("   Modelled on Kaggle EMSCAD Job Fraud Dataset")
    print("=" * 60)

    train_text_model()
    train_anomaly_model()
    train_metadata_model()
    train_xgboost_model()

    print("\n" + "=" * 60)
    print("   ✅ All 4 ML models trained and saved successfully!")
    print(f"   📁 Location: {MODEL_DIR}")
    print("=" * 60 + "\n")
