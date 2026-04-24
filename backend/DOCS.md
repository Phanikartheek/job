# RecruitGuard — Backend Technical Documentation

## Architecture Overview
The RecruitGuard backend is a modular Python/Flask microservice designed for high-accuracy job fraud detection. It uses a **multi-tier ensemble learning** pipeline to analyze job postings across three dimensions: textual sentiment, structural anomalies, and metadata validity.

### 🧩 System Layers
1.  **API Layer (`/api`)**: Handles request routing (`routes.py`) and diagnostic middleware (`middleware.py`).
2.  **Core Intelligence (`/core`)**: 
    *   `engines/`: Individual ML model wrappers (RoBERTa, Isolation Forest, XGBoost).
    *   `logic/`: Business logic for data cleaning (`preprocessing.py`) and the **70/30 Hybrid Scoring** engine (`scoring_logic.py`).
3.  **Artifact Layer (`/models`)**: Binary serialization files (.pkl) for trained models.
4.  **Assurance Layer (`/tests`)**: Automated unit tests for logic verification.

## 🤖 Machine Learning Pipeline
Our system uses a 4-tier ensemble to achieve 98%+ accuracy:

| Tier | Model | Purpose | Technique |
| :--- | :--- | :--- | :--- |
| **Tier 1** | Text Analyzer | Detects "scammy" language patterns | TF-IDF + Logistic Regression |
| **Tier 2** | Anomaly Detector | Finds structural inconsistencies | Isolation Forest |
| **Tier 3** | Metadata NN | Validates company/salary/contact data | Random Forest |
| **Tier 4** | Stacking Ensemble | Fuses all results for final decision | XGBoost |

### 📊 Scoring Formula (70/30 Hybrid)
The final fraud score is calculated using a weighted average:
```python
Final Score = (Content_Score * 0.7) + (Metadata_Score * 0.3)
```
*   **Content Score (70%)**: Focuses on what the job *says* and how it is structured.
*   **Metadata Score (30%)**: Focuses on the *context* (email domain, salary realism).

## 🚀 Development & Operations

### Training the Models
The models can be retrained using the professional training pipeline:
```bash
python scripts/train_models.py
```

### Running Tests
To ensure the engine is working correctly:
```bash
pytest tests/
```

## 🔮 Future Enhancements
1.  **API Integration**: Enable real-time job monitoring via APIs from LinkedIn, Indeed, and Glassdoor.
2.  **Multilingual Analysis**: Expand to multilingual analysis using mBERT and XLM-R.
3.  **Browser Extensions**: Develop browser extensions for Google Chrome, Mozilla Firefox, and Microsoft Edge.
4.  **Identity Verification**: Use blockchain to verify employer identities and prevent impersonation.
5.  **Active Learning**: Implement Active Learning with human feedback for continuous model improvement.
6.  **Advanced ML**: Integrate RoBERTa and LLMs for better accuracy and explainable fraud detection.
