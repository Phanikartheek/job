# RecruitGuard — AI/ML Interview Q&A Preparation

**Interview Date: May 1, 2026**

These are the most likely project-based questions an interviewer will ask. Each answer is brief, confident, and interview-ready.

---

## SECTION 1: PROJECT OVERVIEW QUESTIONS

---

### Q1: "Tell me about your project."

**Answer:** "I built RecruitGuard, an AI-powered job fraud detection system. It takes a job posting as input — title, description, salary, company — and predicts whether it's fraudulent or legitimate, giving a fraud score from 0 to 100. The system uses a 5-model ensemble ML pipeline with a 70/30 weighted scoring formula. The backend is Python Flask, frontend is React with TypeScript, and it's trained on the EMSCAD dataset which has 17,880 real job postings."

---

### Q2: "What problem does your project solve?"

**Answer:** "Online job fraud is a growing problem — fake job postings steal personal data, money, and time from job seekers. A single ML model can't catch all types of fraud because some jobs have scam-like language, some have suspicious metadata like missing company info, and some have structural anomalies. My system uses multiple specialized models working together — one for text, one for anomalies, one for metadata — to catch what a single model would miss."

---

### Q3: "What dataset did you use?"

**Answer:** "I used the EMSCAD dataset — Employment Scam Aegean Dataset. It contains 17,880 job postings, with 95.2% legitimate and 4.8% fraudulent jobs. The dataset has features like job title, description, company profile, salary range, location, and a binary label (fraudulent or not). The key challenge is the severe class imbalance — only 4.8% fraud — which I handled using SMOTE."

---

### Q4: "What is your project architecture?"

**Answer:** "It's a full-stack application with a clear separation:
- Frontend — React + TypeScript + Vite (user interface)
- Backend — Flask REST API (ML engine)
- ML Pipeline — 5 models organized in tiers
- Database — Supabase for auth and history

The backend follows a modular Blueprint architecture — API layer handles routing, Core layer has individual ML engines, and the Logic layer has preprocessing and scoring."

---

## SECTION 2: ML MODEL QUESTIONS (Most Important!)

---

### Q5: "How many models did you use and what are they?"

**Answer:**

| Tier | Model | Purpose |
|:-----|:------|:--------|
| 1 | TF-IDF + Logistic Regression | Detects scam language patterns |
| 2 | Isolation Forest | Finds structural anomalies |
| 3 | Random Forest | Validates metadata (salary, company, email) |
| 4 | Content Fusion | Combines Tier 1 (75%) + Tier 2 (25%) |
| 5 | XGBoost | Stacking ensemble — takes outputs of Tier 1-3 as input |

---

### Q6: "Why did you use Logistic Regression for text analysis?"

**Answer:** "Three reasons:
1. It's a binary classifier — fraud or legit — which is exactly my problem
2. It gives calibrated probabilities via predict_proba() — I need a score, not just yes/no
3. It's extremely fast (< 10ms inference) — my API needs real-time response

It uses the sigmoid function: P(fraud) = 1 / (1 + e^(-z)) where z is the weighted sum of TF-IDF features."

---

### Q7: "What is TF-IDF? Why did you use it?"

**Answer:** "TF-IDF stands for Term Frequency — Inverse Document Frequency. It converts text into numerical vectors that ML models can process.
- TF = how often a word appears in a document
- IDF = penalizes common words (like 'the', 'is') that appear in many documents
- Formula: TF-IDF(t,d) = TF(t,d) × log(N / df(t))

I used it because raw text can't be fed to ML models. TF-IDF captures word importance — a word like 'guaranteed' appearing in a job post is more significant than 'the'. I set max_features=5000 to keep the top 5000 most important words."

---

### Q8: "Why Isolation Forest? How does it work?"

**Answer:** "Isolation Forest is an unsupervised anomaly detection algorithm. I chose it because fraud IS an anomaly — only 4.8% of jobs are fake.

How it works: It builds random trees by randomly selecting features and split points. Anomalies are easier to isolate — they get separated in fewer splits (shorter path length). Normal data points need many splits to isolate.

Anomaly Score = 2^(-E(h(x)) / c(n)) — closer to 1 means anomaly, closer to 0 means normal.

I feed it 7 structural features like description length, capitalization ratio, digit ratio, and whether salary/company info is present."

---

### Q9: "Why Random Forest for metadata?"

**Answer:** "Random Forest is ideal for tabular/categorical features — which is exactly what metadata is (salary missing: yes/no, company missing: yes/no, etc.). It creates 200 decision trees, each trained on a random subset, and takes a majority vote. It's robust against overfitting and naturally handles binary features. I set max_depth=10 to prevent overfitting."

---

### Q10: "Why XGBoost? What is stacking?"

**Answer:** "Stacking means using the output of other models as input features for a final model. My XGBoost takes the scores from Tier 1 (text), Tier 2 (anomaly), and Tier 3 (metadata) as 3 features, and learns non-linear interactions between them.

For example, if text score is high AND anomaly score is high simultaneously, the combined risk is MORE than just adding them — XGBoost learns this pattern.

XGBoost uses gradient boosting — it builds trees sequentially, where each new tree corrects the errors of the previous one. The formula is: F_m(x) = F_{m-1}(x) + η × h_m(x) where η=0.05 is the learning rate."

---

### Q11: "Why didn't you use Deep Learning / Neural Networks?"

**Answer:** "Three reasons:
1. Data size — 17,880 samples is too small for deep learning to outperform classical ML. Neural nets need 100K+ samples.
2. Feature type — My features are tabular (numbers, binary flags). XGBoost and Random Forest consistently outperform neural networks on tabular data — this is well-established in ML research.
3. Deployment — Deep learning requires GPU. My app runs on a free-tier cloud server (Render) with no GPU. Logistic Regression gives me < 10ms inference vs. 100-500ms for BERT."

---

### Q12: "Why not Naive Bayes?"

**Answer:** "Naive Bayes assumes all features are independent of each other. But in TF-IDF vectors, words are correlated — 'guaranteed' and 'income' often appear together in scams. Logistic Regression handles correlated features better and gives more calibrated probabilities."

---

### Q13: "Why not SVM (Support Vector Machine)?"

**Answer:** "SVM doesn't give probability outputs by default — I need probability scores for my 0-100 scoring. Also, SVM is slower for online prediction with high-dimensional TF-IDF vectors. Logistic Regression and Random Forest both give native predict_proba() support."

---

### Q14: "Why not KNN?"

**Answer:** "KNN stores the entire training set and compares each new sample against ALL stored samples at prediction time. This makes it too slow for real-time API calls. Also, KNN doesn't output well-calibrated probabilities and performs poorly with binary/categorical features like my metadata."

---

## SECTION 3: DATA PREPROCESSING QUESTIONS

---

### Q15: "What preprocessing did you do?"

**Answer:** "My preprocessing pipeline has these steps:
1. Text cleaning — remove extra whitespace, normalize
2. Lowercasing — for case-insensitive keyword matching
3. Text concatenation — join title + description + requirements into one string for TF-IDF
4. TF-IDF vectorization — convert text to 5000-dimensional numerical vectors
5. Feature extraction — compute numerical features (caps_ratio, digit_ratio, lengths)
6. Missing value handling — convert missing fields to binary flags (1.0 = missing)
7. Feature capping — cap description length at 5000 to prevent outliers
8. SMOTE — oversample the minority class (fraud) to balance the dataset"

---

### Q16: "What is SMOTE? Why did you use it?"

**Answer:** "SMOTE = Synthetic Minority Oversampling Technique. My dataset has 95.2% legitimate and only 4.8% fraud. Without SMOTE, the model would just predict 'legitimate' for everything and still get 95.2% accuracy — but catch zero fraud.

SMOTE creates synthetic fraud samples by interpolating between existing ones:
x_new = x_i + λ × (x_neighbor - x_i) where λ is random between 0 and 1.

After SMOTE, both classes are balanced, so the model actually learns fraud patterns."

---

### Q17: "Why not just use undersampling instead of SMOTE?"

**Answer:** "Undersampling would throw away 95% of the legitimate data, leaving us with very few training samples. SMOTE is better because it creates new synthetic data rather than discarding existing data, so the model gets more training information."

---

## SECTION 4: FEATURE ENGINEERING QUESTIONS

---

### Q18: "What features did you engineer?"

**Answer:** "I engineered 3 categories of features:

Text Features (for Logistic Regression): TF-IDF vectors (5000 dimensions), fraud keyword count, safe keyword count, capitalization ratio

Structural Features (for Isolation Forest — 7 features): description_length, title_length, caps_ratio, digit_ratio, has_salary, has_company_profile, requirements_length

Metadata Features (for Random Forest — 6 features): salary_missing, company_missing, has_company_logo, has_questions, telecommuting, requirements_missing

Plus extra rule-based flags: personal email domain check (gmail/yahoo), vague location check, upfront payment detection"

---

### Q19: "Why is caps_ratio a feature?"

**Answer:** "Fraudulent job postings frequently use excessive capitalization — like 'EARN $5000 WEEKLY GUARANTEED'. The caps_ratio (uppercase_chars / total_chars) quantifies this. A ratio above 0.15 is flagged as suspicious. Legitimate professional job postings use standard capitalization."

---

### Q20: "Why is 'salary_missing' a feature instead of dropping the record?"

**Answer:** "Because a missing salary IS information — it's a fraud signal by itself. Legitimate companies typically provide salary ranges. Fraudulent postings often hide salary to attract victims with vague promises. So I encode missing values as binary features (1.0 = missing) rather than dropping rows."

---

## SECTION 5: SCORING FORMULA & EVALUATION

---

### Q21: "Explain your scoring formula."

**Answer:** "My final fraud score uses a 70/30 weighted formula:

Final_Score = (Content_Score × 0.70) + (Metadata_Score × 0.30)

The Content Score itself is a fusion:
Content_Score = (Text_Score × 0.75) + (Anomaly_Score × 0.25)

Fully expanded:
Final = 0.525 × Text + 0.175 × Anomaly + 0.30 × Metadata

Text gets the highest weight because what the job says is the strongest fraud indicator. Metadata (company info, salary) gets 30% as supporting evidence."

---

### Q22: "Why 70/30? Why not 50/50?"

**Answer:** "Through experimentation, we found that content analysis (what the job actually says — language patterns, structural anomalies) is a stronger predictor of fraud than metadata alone. A scam job with professional-looking metadata can still be caught by its scam language. But a job with missing metadata might just be a small startup. So content deserves more weight."

---

### Q23: "What evaluation metrics did you use?"

**Answer:**
- Accuracy = (TP+TN) / (TP+TN+FP+FN) — overall correctness, ~98.8%
- Precision = TP / (TP+FP) — of all jobs flagged as fraud, how many actually were
- Recall = TP / (TP+FN) — of all actual frauds, how many did we catch
- F1 Score = 2 × (Precision × Recall) / (Precision + Recall) — harmonic mean

Recall is the most important metric for us because missing a real fraud (false negative) is worse than wrongly flagging a legitimate job (false positive) — a user could lose money if we miss a scam."

---

### Q24: "Why is accuracy alone not enough?"

**Answer:** "Because of class imbalance. With 95.2% legitimate jobs, a dummy model that always predicts 'legitimate' gets 95.2% accuracy but catches ZERO fraud — it's useless. That's why we also measure Recall (did we catch the fraud?) and F1 Score (balance between precision and recall)."

---

### Q25: "What are Risk Levels?"

**Answer:** "I convert the 0-100 score into 4 human-readable risk levels:
- LOW (0-24) — Safe
- MEDIUM (25-49) — Exercise caution
- HIGH (50-74) — Likely fraudulent
- CRITICAL (75-100) — Almost certainly fraud

A job is classified as isFake = true when the score is >= 50."

---

## SECTION 6: TECHNICAL IMPLEMENTATION QUESTIONS

---

### Q26: "What is ensemble learning? Why did you use it?"

**Answer:** "Ensemble learning means combining multiple models to get better performance than any single model alone. I used it because different models are good at detecting different types of fraud:
- Logistic Regression catches language-based fraud
- Isolation Forest catches structural anomalies
- Random Forest catches metadata inconsistencies

Together, they cover each other's blind spots. This is called the diversity principle in ensemble learning."

---

### Q27: "What is the difference between bagging, boosting, and stacking?"

**Answer:**
- Bagging (Bootstrap Aggregating) — trains multiple models on random subsets of data in parallel, then averages. Example: Random Forest.
- Boosting — trains models sequentially, each one correcting errors of the previous. Example: XGBoost.
- Stacking — trains different model types, then uses their outputs as features for a meta-model. My project uses stacking — XGBoost takes the scores of Logistic Regression, Isolation Forest, and Random Forest as input.

---

### Q28: "How do you handle overfitting?"

**Answer:** "Multiple strategies:
1. Random Forest — max_depth=10 limits tree depth
2. XGBoost — learning_rate=0.05 (slow learning prevents overfitting), regularization in objective function
3. Isolation Forest — n_estimators=200 with proper contamination rate
4. TF-IDF — max_features=5000 caps vocabulary size
5. SMOTE — applied only on training set, never on test set"

---

### Q29: "What is your feedback loop?"

**Answer:** "I implemented an Active Learning Feedback Loop. After each analysis, the user can click 'Legit' or 'Fraudulent' to tell the system if the prediction was correct. This feedback is stored in a JSON file and can be used to retrain the models via retrain_models.py. Over time, the system learns from its mistakes and improves."

---

### Q30: "What are the limitations of your project?"

**Answer:**
1. No real RoBERTa — needs GPU, so I used TF-IDF + Logistic Regression as a lightweight alternative
2. English-only — the model is optimized for English text; I added langdetect to warn on other languages
3. Class imbalance — even with SMOTE, synthetic samples can't perfectly capture all fraud patterns
4. 98.8% is in-sample accuracy — real-world evolving scams may bypass detection
5. Sophisticated scams — professionally written fake jobs can bypass text analysis, which is why I added metadata checks and external verification links

---

## SECTION 7: QUICK-FIRE CONCEPTUAL QUESTIONS

---

### Q31: "What is the sigmoid function?"

**Answer:** σ(z) = 1 / (1 + e^(-z)) — maps any real number to a probability between 0 and 1. Used in Logistic Regression output.

---

### Q32: "What is cross-entropy loss?"

**Answer:** L = -[y·log(ŷ) + (1-y)·log(1-ŷ)] — the loss function for binary classification. Penalizes confident wrong predictions heavily.

---

### Q33: "What is the difference between supervised and unsupervised learning?"

**Answer:** Supervised uses labeled data (my Logistic Regression, Random Forest, XGBoost — they know which jobs are fraud). Unsupervised finds patterns without labels (my Isolation Forest — it learns what's "normal" and flags outliers).

---

### Q34: "What is a confusion matrix?"

**Answer:** A 2×2 table: [[TN, FP], [FN, TP]]. Shows true negatives, false positives, false negatives, and true positives. Helps evaluate model beyond just accuracy.

---

### Q35: "What is regularization?"

**Answer:** A technique to prevent overfitting by adding a penalty term to the loss function. Logistic Regression uses L2 regularization (C=1.0), and XGBoost uses both L1 and L2 regularization.

---

### Q36: "What is the bias-variance tradeoff?"

**Answer:** Bias = model is too simple (underfitting). Variance = model is too complex (overfitting). Ensemble methods reduce variance (Random Forest, XGBoost) while maintaining low bias.

---

### Q37: "What is feature importance?"

**Answer:** Random Forest and XGBoost can rank which features contribute most to predictions. For my project, features like description_length, salary_missing, and caps_ratio have high importance — meaning they're the strongest fraud indicators.

---

### Q38: "What is the curse of dimensionality?"

**Answer:** As features increase, data becomes sparse and models need exponentially more data. My TF-IDF has 5000 dimensions, but I handle this by capping max_features=5000 and using models that handle high dimensions well (Logistic Regression, Isolation Forest).

---

## BONUS: OPENING & CLOSING STATEMENTS

### How to Start (when asked "Tell me about your project"):

"I built RecruitGuard, a full-stack AI system for detecting fraudulent job postings. It uses a 5-model ensemble ML pipeline — combining TF-IDF with Logistic Regression for text analysis, Isolation Forest for anomaly detection, Random Forest for metadata validation, and XGBoost as a stacking ensemble. The system achieves 98.8% accuracy on the EMSCAD dataset and uses a 70/30 weighted scoring formula to produce a fraud risk score."

### How to End (when asked "Any questions?"):

"I'd like to add that while building this project, I learned the importance of not relying on a single metric like accuracy — class imbalance taught me to focus on Recall and F1. I also understood why ensemble methods outperform single models and the tradeoffs between model complexity and deployment constraints."

---

## KEY NUMBERS TO MEMORIZE

- Dataset: 17,880 job postings
- Class split: 95.2% legit, 4.8% fraud
- Models: 5 tiers
- Formula: 70/30 (Content/Metadata)
- Content split: 75/25 (Text/Anomaly)
- Accuracy: ~98.8%
- TF-IDF features: 5,000
- Anomaly features: 7
- Metadata features: 6
- Risk levels: 4 (LOW/MEDIUM/HIGH/CRITICAL)
- Threshold: Score >= 50 means FRAUD
