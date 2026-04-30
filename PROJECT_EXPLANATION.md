# RecruitGuard — Complete Project Explanation

## 1. Project Overview

**RecruitGuard** is an AI-powered **Job Fraud Detection System** that uses a **multi-model ensemble machine learning pipeline** to detect fraudulent job postings in real-time. Users paste a job posting as input — title, description, salary, company — and the system returns a fraud score (0–100), risk level, detailed flags, and human-readable insights.

**Core Problem:** Online job fraud is rising — fake listings steal personal data, money, and time. RecruitGuard uses 5 ML models working together to catch what a single model would miss.

**Dataset Reference:** EMSCAD (Employment Scam Aegean Dataset) — 17,880 real job postings (95.2% legitimate, 4.8% fraudulent).

---

## 2. Project Structure (Directory Tree)

```
job-main/
├── backend/                    ← "The Brain": Flask ML API
│   ├── app.py                  ← Application factory (entry point)
│   ├── api/
│   │   ├── routes.py           ← Main /analyze endpoint + scoring
│   │   ├── feedback.py         ← User feedback (self-learning loop)
│   │   └── middleware.py       ← Request logging & timing
│   ├── core/
│   │   ├── engines/            ← Individual ML model runners
│   │   │   ├── textModel.py        ← Tier 1: TF-IDF + Logistic Regression
│   │   │   ├── anomalyModel.py     ← Tier 2: Isolation Forest
│   │   │   ├── metadataModel.py    ← Tier 3: Random Forest
│   │   │   ├── contentModel.py     ← Tier 4: Content Fusion (75/25)
│   │   │   └── xgboostModel.py     ← Tier 5: XGBoost Stacking Ensemble
│   │   └── logic/
│   │       ├── preprocessing.py    ← Feature engineering class
│   │       └── scoring_logic.py    ← 70/30 weighted scoring formula
│   ├── models/                 ← Serialized .pkl model files
│   │   ├── text_model.pkl
│   │   ├── anomaly_model.pkl
│   │   ├── metadata_model.pkl
│   │   └── xgboost_model.pkl
│   ├── scripts/
│   │   ├── train_models.py     ← Full training pipeline
│   │   └── retrain_models.py   ← Self-learning retraining
│   ├── tests/
│   │   ├── test_scoring.py     ← Scoring formula unit tests
│   │   └── test_preprocessing.py ← Feature extraction tests
│   ├── data/
│   │   └── sample_jobs.json    ← Test job postings
│   └── utils/
│       ├── config.py           ← Environment configuration
│       └── logger.py           ← Structured logging
│
├── frontend/                   ← React + TypeScript + Vite + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── Index.tsx           ← Landing page
│       │   ├── Login.tsx           ← Authentication
│       │   ├── Dashboard.tsx       ← Main dashboard
│       │   ├── Analyze.tsx         ← Job analysis page
│       │   ├── BulkUploadPage.tsx  ← Bulk CSV analysis
│       │   ├── HistoryPage.tsx     ← Past analysis history
│       │   └── SettingsPage.tsx    ← User settings
│       └── components/
│           ├── AnalysisForm.tsx        ← Job input form
│           ├── AnalysisResult.tsx      ← Result display + Risk Gauge
│           ├── ModelScorePanel.tsx     ← 5-model score visualization
│           ├── RiskRadar.tsx           ← Radar chart visualization
│           ├── InsightCard.tsx         ← Human-readable insights
│           ├── LLMExplanationPanel.tsx ← AI explanation panel
│           ├── DownloadReportButton.tsx← PDF report generation
│           ├── ModelHealthWidget.tsx   ← Model monitoring
│           └── DashboardLayout.tsx     ← Dashboard shell/navigation
│
├── render.yaml                 ← Cloud deployment (Render)
├── vercel.json                 ← Frontend deployment (Vercel)
└── README.md
```

---

## 3. SDLC Process (Software Development Life Cycle)

| Phase | What Was Done |
|:------|:-------------|
| **1. Requirements** | Identified the need for fraud detection in online job postings; defined 5-model ensemble approach |
| **2. Design** | Designed the 4-tier ML pipeline with 70/30 weighted scoring formula; created modular architecture |
| **3. Implementation** | Built Flask backend with Blueprint pattern, React frontend with TypeScript, trained ML models |
| **4. Testing** | Unit tests for scoring logic and preprocessing; standalone runners for each model |
| **5. Deployment** | Backend on Render (Gunicorn), Frontend on Vercel; CI/CD via Git |
| **6. Maintenance** | Self-learning feedback loop for continuous model improvement |

---

## 4. Features & How They Work

### Feature 1: Single Job Analysis
- User fills in: Title, Company, Location, Salary, Description, Requirements
- Backend runs all 5 ML models in parallel
- Returns: fraud score, risk level (LOW/MEDIUM/HIGH/CRITICAL), flags, insights

### Feature 2: Bulk Upload Analysis
- Users upload CSV files containing multiple job postings
- Each job is analyzed through the full ML pipeline
- Results displayed in a sortable table with downloadable PDF reports

### Feature 3: 5-Model AI Pipeline (Visual Dashboard)
- Each model's individual score is shown with animated progress bars
- The formula is displayed visually: `FINAL = (Content × 0.7) + (Metadata × 0.3)`

### Feature 4: Risk Radar Chart
- Spider/radar chart showing scores across all 5 dimensions (text, anomaly, metadata, content, xgboost)

### Feature 5: Active Learning Feedback Loop
- Users can mark results as "Legit" or "Fraudulent"
- Feedback is stored and used to retrain models via `retrain_models.py`

### Feature 6: PDF Report Download
- Generate professional PDF reports with all scores, flags, and recommendations

### Feature 7: LLM Explanation Panel
- Human-readable AI-generated explanation of why the job was flagged or cleared

### Feature 8: Language Detection
- Uses `langdetect` to warn when non-English text is detected (model is English-optimized)

### Feature 9: MCA India Verification Link
- For extracted company names, provides a direct link to verify legal existence on MCA (Ministry of Corporate Affairs) portal

### Feature 10: Authentication System
- Login, Forgot Password, Reset Password, 2FA via Supabase

---

## 5. Data Preprocessing

### Step-by-Step Preprocessing Pipeline:

| Step | Operation | Why |
|:-----|:----------|:----|
| **1. Text Cleaning** | `re.sub(r'\s+', ' ', text).strip()` — removes extra whitespace | Raw job postings have inconsistent formatting |
| **2. Lowercasing** | `text.lower()` for keyword matching | Case-insensitive fraud pattern detection |
| **3. Text Concatenation** | Joins title + description + requirements + company into one string | TF-IDF needs a single document per sample |
| **4. Feature Extraction** | Converts raw text into numerical features (length, ratios, binary flags) | ML models require numerical input |
| **5. TF-IDF Vectorization** | `TfidfVectorizer(max_features=5000, stop_words='english')` | Converts text to weighted term-frequency vectors |
| **6. Missing Value Handling** | Binary flags for missing fields (salary_missing=1.0 if empty) | Missing info is itself a fraud signal |
| **7. Capping/Normalization** | `min(len(desc), 5000)` — caps description length | Prevents outlier features from dominating |
| **8. SMOTE Oversampling** | `SMOTE(random_state=42)` on training data | Balances the extreme 95.2%/4.8% class imbalance |

### Why These Preprocessing Steps?

- **TF-IDF over raw text**: Raw text can't be fed to ML models. TF-IDF captures word importance relative to the corpus
- **SMOTE**: The EMSCAD dataset has only 4.8% fraud samples. Without SMOTE, models would predict "legit" for everything and still get 95% accuracy (useless)
- **Feature Capping**: Extremely long descriptions would create outlier features that skew the Isolation Forest

---

## 6. Feature Engineering

Features are engineered in two places: `preprocessing.py` (general) and inside each engine (model-specific).

### 6.1 Text Features (Tier 1 — textModel.py)

| Feature | How It's Computed | Purpose |
|:--------|:-----------------|:--------|
| TF-IDF Vector (5000 dims) | `TfidfVectorizer(max_features=5000)` on concatenated text | Captures language patterns learned from EMSCAD |
| Fraud Keywords Hit | Count of phrases like "no experience required", "whatsapp only" | Rule-based red flags on top of ML score |
| Safe Keywords Hit | Count of phrases like "health insurance", "401k", "equity" | Counter-signal: legitimate job indicators |
| Caps Count | `len(re.findall(r'[A-Z]{4,}', text))` | Excessive CAPS = scam indicator |
| Description Length | `len(desc)` — flagged if < 100 chars | Short/vague descriptions are suspicious |

### 6.2 Structural Features (Tier 2 — anomalyModel.py)

7 features fed to Isolation Forest:

| # | Feature | Formula | Why |
|:--|:--------|:--------|:----|
| 1 | `description_length` | `min(len(desc), 5000)` | Fraudulent posts tend to be unusually short or long |
| 2 | `title_length` | `len(title)` | Very short titles (< 5 chars) are suspicious |
| 3 | `caps_ratio` | `sum(c.isupper() for c in text) / len(text)` | Scams use excessive capitalization |
| 4 | `digit_ratio` | `sum(c.isdigit() for c in text) / len(text)` | Fake salary claims inflate digit ratio |
| 5 | `has_salary` | `1.0 if salary.strip() else 0.0` | Missing salary is a fraud signal |
| 6 | `has_company_profile` | `1.0 if company.strip() else 0.0` | No company info = suspicious |
| 7 | `requirements_length` | `len(reqs)` | No requirements = likely fake |

### 6.3 Metadata Features (Tier 3 — metadataModel.py)

6 features fed to Random Forest:

| # | Feature | Value | Why |
|:--|:--------|:------|:----|
| 1 | `salary_missing` | 1.0 / 0.0 | Fraudulent jobs often hide salary |
| 2 | `company_profile_missing` | 1.0 / 0.0 | No company = can't verify legitimacy |
| 3 | `has_company_logo` | 1.0 / 0.0 | EMSCAD column; legitimate companies have logos |
| 4 | `has_questions` | 1.0 / 0.0 | EMSCAD column; screening questions = legitimate |
| 5 | `telecommuting` | 1.0 / 0.0 | Inferred from keywords like "remote", "wfh" |
| 6 | `requirements_missing` | 1.0 / 0.0 | No requirements = common in fraud |

**Extra (non-ML) flags**: Personal email domain check (gmail/yahoo/hotmail), vague location check.

### 6.4 Stacking Features (Tier 5 — xgboostModel.py)

| Feature | Source | Formula |
|:--------|:-------|:--------|
| `text_score_normalized` | Tier 1 output | `text_score / 100.0` |
| `anomaly_score_normalized` | Tier 2 output | `anomaly_score / 100.0` |
| `metadata_score_normalized` | Tier 3 output | `metadata_score / 100.0` |

---

## 7. ML Models — Why Each Was Chosen (and Why NOT Others)

### Tier 1: TF-IDF + Logistic Regression (Text Analysis)

**Why Logistic Regression?**
- Best for binary classification (fraud vs. legit)
- Outputs calibrated probabilities via `predict_proba()` — needed for scoring
- Fast inference (< 10ms) — critical for real-time API
- Highly interpretable — can explain which words contribute to the prediction

**Formula — Logistic Regression (Sigmoid):**
```
P(fraud) = σ(w₁x₁ + w₂x₂ + ... + wₙxₙ + b)

Where:
  σ(z) = 1 / (1 + e^(-z))     ← Sigmoid function
  wᵢ = learned weight for feature i
  xᵢ = TF-IDF value for word i
  b   = bias term
```

**Formula — TF-IDF:**
```
TF-IDF(t, d) = TF(t, d) × IDF(t)

Where:
  TF(t, d)  = (count of term t in document d) / (total terms in d)
  IDF(t)    = log(N / df(t))
  N         = total number of documents
  df(t)     = number of documents containing term t
```

**Why NOT Deep Learning (BERT/RoBERTa)?**
- Requires GPU with 8+ GB VRAM — not available on free-tier deployment (Render)
- BERT inference takes 100-500ms vs. 5ms for Logistic Regression
- For 5,000-feature TF-IDF on this dataset size, Logistic Regression achieves comparable accuracy
- The project mentions "RoBERTa-inspired" as an acknowledgment of this tradeoff

**Why NOT Naive Bayes?**
- Assumes feature independence — TF-IDF features are correlated
- Doesn't output well-calibrated probabilities
- Lower accuracy on imbalanced datasets

---

### Tier 2: Isolation Forest (Anomaly Detection)

**Why Isolation Forest?**
- Unsupervised — doesn't need labeled data, learns what "normal" looks like
- Specifically designed for anomaly detection (fraud IS an anomaly)
- Works on numerical structural features (length, ratios)
- Handles high-dimensional data efficiently
- Uses `contamination=0.1` to match expected fraud rate

**How It Works:**
```
1. Randomly select a feature
2. Randomly select a split value between min and max
3. Repeat recursively to build isolation trees
4. Anomalies are isolated in fewer splits (shorter path)

Anomaly Score = 2^(-E(h(x)) / c(n))

Where:
  E(h(x)) = average path length for sample x across all trees
  c(n)     = average path length of unsuccessful search in BST
  Score → closer to 1 = anomaly, closer to 0 = normal
```

**Score conversion in code:**
```python
fraud_score = int(round(max(0, min(100, (-raw_score + 0.3) * 130))))
# More negative raw_score = more anomalous = higher fraud score
```

**Why NOT One-Class SVM?**
- Much slower training time O(n²) vs O(n·log(n)) for Isolation Forest
- Doesn't scale well to large datasets
- Sensitive to kernel choice and hyperparameters

**Why NOT Autoencoders?**
- Requires neural network infrastructure (PyTorch/TensorFlow)
- Overkill for 7 numerical features
- Harder to deploy on free-tier cloud

---

### Tier 3: Random Forest (Metadata Classification)

**Why Random Forest?**
- Excellent for tabular/categorical metadata features
- Handles missing values and mixed feature types naturally
- Provides feature importance rankings
- Robust against overfitting (ensemble of 200 decision trees)
- `n_estimators=200, max_depth=10` prevents overfitting

**How It Works:**
```
1. Create 200 decision trees, each trained on a random subset of data
2. Each tree votes: fraud or legit
3. Final prediction = majority vote

Prediction = mode(Tree₁(x), Tree₂(x), ..., Tree₂₀₀(x))

Probability = count(trees predicting fraud) / 200
```

**Why NOT KNN (K-Nearest Neighbors)?**
- Slow inference (compares to all training samples at prediction time)
- Performs poorly with categorical/binary features
- Doesn't output calibrated probabilities

**Why NOT SVM?**
- Random Forest handles non-linear boundaries without kernel tricks
- Better probability calibration out-of-the-box
- More interpretable (feature importance)

---

### Tier 4: Content Fusion (Weighted Average)

**Not a separate model** — it's a fusion layer combining Tier 1 + Tier 2.

**Formula:**
```
Content_Score = (Text_Score × 0.75) + (Anomaly_Score × 0.25)
```

**Why 75/25?** Text analysis (what the job *says*) is more informative than structural anomalies (how it *looks*).

---

### Tier 5: XGBoost Stacking Ensemble

**Why XGBoost?**
- State-of-the-art for tabular data (wins most Kaggle competitions)
- Gradient boosting corrects errors from previous models
- Takes Tier 1-3 scores as meta-features (stacking)
- `n_estimators=200, learning_rate=0.05, max_depth=6`

**How It Works (Gradient Boosting):**
```
1. Start with initial prediction F₀
2. For each iteration m = 1 to 200:
   a. Compute residuals: rᵢ = yᵢ - Fₘ₋₁(xᵢ)
   b. Fit a new tree hₘ to residuals
   c. Update: Fₘ(x) = Fₘ₋₁(x) + η · hₘ(x)
      Where η = 0.05 (learning rate)

Objective Function:
  L = Σ l(yᵢ, ŷᵢ) + Σ Ω(fₖ)

Where:
  l = log-loss (binary cross-entropy)
  Ω = regularization term = γT + ½λ||w||²
  T = number of leaves, w = leaf weights
```

**Why NOT Neural Networks?**
- XGBoost outperforms neural nets on tabular data with < 10 features
- No GPU required
- Training in seconds vs. minutes/hours
- Better interpretability with SHAP values

**Why NOT simple averaging?**
- XGBoost learns non-linear interactions between model scores
- If Text=high AND Anomaly=high, the combined risk is MORE than additive

---

## 8. The 70/30 Scoring Formula (Final Score)

This is the master formula in `scoring_logic.py`:

```python
Final_Score = (Content_Score × 0.70) + (Metadata_Score × 0.30)
```

Expanding the Content Score:
```
Content_Score = (Text_Score × 0.75) + (Anomaly_Score × 0.25)
```

**Full expanded formula:**
```
Final_Score = 0.70 × [0.75 × Text_Score + 0.25 × Anomaly_Score] + 0.30 × Metadata_Score
            = 0.525 × Text_Score + 0.175 × Anomaly_Score + 0.30 × Metadata_Score
```

### Risk Level Thresholds:

| Score Range | Risk Level | Color |
|:------------|:-----------|:------|
| 0 – 24 | **LOW** | Green |
| 25 – 49 | **MEDIUM** | Yellow |
| 50 – 74 | **HIGH** | Orange |
| 75 – 100 | **CRITICAL** | Red |

**Binary decision:** `isFake = (Final_Score >= 50)`

---

## 9. Evaluation Metrics

### 9.1 Primary Metrics Used

| Metric | Formula | Why Used |
|:-------|:--------|:---------|
| **Accuracy** | `(TP + TN) / (TP + TN + FP + FN)` | Overall correctness — reported as ~98.8% |
| **Precision** | `TP / (TP + FP)` | "Of all flagged jobs, how many were actually fraud?" |
| **Recall** | `TP / (TP + FN)` | "Of all actual fraud, how many did we catch?" |
| **F1 Score** | `2 × (Precision × Recall) / (Precision + Recall)` | Balances precision and recall for imbalanced data |

Where: TP = True Positive (correctly detected fraud), TN = True Negative, FP = False Positive (legitimate flagged as fraud), FN = False Negative (fraud missed)

### 9.2 Why These Metrics?

Accuracy alone is misleading for imbalanced datasets. With 95.2% legitimate jobs, a model predicting "legit" for everything would get 95.2% accuracy but catch ZERO fraud. That's why Recall and F1 Score are critical.

### 9.3 SMOTE's Role in Metrics

```
Before SMOTE: 95.2% legit, 4.8% fraud  →  Model biased toward "legit"
After SMOTE:  50% legit, 50% fraud      →  Model learns fraud patterns equally
```

**SMOTE Formula (Synthetic Minority Oversampling):**
```
x_new = x_i + λ × (x_nn - x_i)

Where:
  x_i   = existing minority sample
  x_nn  = randomly selected nearest neighbor of x_i
  λ     = random number in [0, 1]
```

---

## 10. End-to-End Data Flow

```
User Input (Job Posting)
    │
    ▼
┌─────────────────────────────┐
│  API Layer (routes.py)       │
│  POST /api/analyze           │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                ML ENGINE TIER                        │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Tier 1: Text │  │ Tier 2:      │                 │
│  │ TF-IDF +     │  │ Isolation    │                 │
│  │ LogReg       │  │ Forest       │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                         │
│         ▼                  ▼                         │
│  ┌─────────────────────────────┐                    │
│  │ Tier 4: Content Fusion       │                    │
│  │ = Text×0.75 + Anomaly×0.25  │                    │
│  └──────────────┬──────────────┘                    │
│                  │                                   │
│  ┌──────────────┐│                                  │
│  │ Tier 3:      ││                                  │
│  │ Metadata     ││                                  │
│  │ Random Forest││                                  │
│  └──────┬───────┘│                                  │
│         │        │                                   │
│         ▼        ▼                                   │
│  ┌─────────────────────────────┐                    │
│  │ SCORING ENGINE               │                    │
│  │ Final = Content×0.7          │                    │
│  │       + Metadata×0.3         │                    │
│  └──────────────┬──────────────┘                    │
│                  │                                   │
│  ┌──────────────┐                                   │
│  │ Tier 5:      │                                   │
│  │ XGBoost      │  (parallel validation)            │
│  │ Stacking     │                                   │
│  └──────────────┘                                   │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
              JSON Response:
              {
                finalScore, riskLevel, isFake,
                textScore, anomalyScore,
                metadataScore, contentScore,
                xgboostScore, insights
              }
```

---

## 11. Technology Stack

| Layer | Technology | Why |
|:------|:-----------|:----|
| **Frontend** | React + TypeScript + Vite | Type safety, fast builds, component architecture |
| **Styling** | Tailwind CSS | Rapid UI development, dark theme |
| **Backend** | Python Flask | Lightweight, perfect for ML APIs |
| **ML Core** | scikit-learn, XGBoost | Industry-standard, fast, well-documented |
| **Imbalance** | imbalanced-learn (SMOTE) | Handles 95/5 class imbalance |
| **Language** | langdetect | Warns on non-English input |
| **Database** | Supabase (PostgreSQL) | Auth, user data, history |
| **Serialization** | joblib (.pkl files) | Efficient model saving/loading |
| **Deployment** | Render (backend) + Vercel (frontend) | Free tier, automatic deploys |
| **Server** | Gunicorn | Production WSGI server for Flask |

---

## 12. Limitations

| # | Limitation | Mitigation |
|:--|:-----------|:-----------|
| 1 | No real RoBERTa (needs GPU) | TF-IDF+LogReg as lightweight alternative |
| 2 | Class imbalance (95.2/4.8) | SMOTE oversampling applied |
| 3 | English-only analysis | `langdetect` warns on non-English text |
| 4 | 98.8% is in-sample accuracy | External registry verification links added |
| 5 | Sophisticated scams bypass text detection | Multi-model ensemble + metadata checks |
| 6 | No real-time job scraping | Manual paste input; API integration planned |

---

## 13. Future Scope

1. **LinkedIn/Indeed API Integration** — Real-time job monitoring
2. **Multilingual Support** — mBERT and XLM-R for non-English analysis
3. **Browser Extensions** — Chrome/Firefox/Edge for on-page analysis
4. **Blockchain Verification** — Employer identity verification
5. **Active Learning** — Human-in-the-loop continuous improvement
6. **Real RoBERTa/LLM Integration** — GPU-powered deep learning for higher accuracy
