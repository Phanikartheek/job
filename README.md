# RecruitGuard — AI-Powered Job Fraud Detection System

An intelligent web application that detects fraudulent job postings using a multi-model machine learning pipeline (70/30 weight formula).

## Features

- **Real-time Single Job Analysis** — Instant fraud score (0–100) using RoBERTa and Isolation Forest.
- **70/30 Weighted Ensemble** — 70% Content Analysis + 30% Metadata Analysis.
- **Risk Levels** — LOW / MEDIUM / HIGH / CRITICAL with detailed indicators.
- **Professional Architecture** — Separated frontend and backend modules.

## How to Run Locally

**Prerequisites:** Node.js, Python 3.8+

```sh
# 1. Clone the repository
git clone https://github.com/Phanikartheek/job.git
cd job

# 2. Install dependencies (Root)
pip install -r requirements.txt

# 3. Backend Setup
# The models are already in backend/models/
# Start Flask backend
cd backend
python app.py

# 4. Frontend Setup (in a new terminal)
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:8080`  
Backend API runs at `http://localhost:5000`

## Project Structure

```
job-main/
├── backend/            ← "The Brain": Professional Modular ML API
│   ├── api/            ← API routes and middleware
│   ├── core/           ← ML Engines and scoring logic
│   ├── models/         ← Trained model artifacts (.pkl)
│   ├── scripts/        ← Training & evaluation pipelines
│   ├── tests/          ← Automated unit tests
│   └── app.py          ← Clean entry point
├── frontend/           ← UI/UX: React + TypeScript
├── requirements.txt    ← Integrated dependencies
└── render.yaml         ← Cloud deployment config
```

## Technologies Used

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Python Flask
- **ML Models:** RoBERTa (Transformers), Isolation Forest, XGBoost
- **Database:** Supabase

## 🚀 Future Enhancements

- **Real-time Monitoring** — Enable real-time job monitoring via APIs from LinkedIn, Indeed, and Glassdoor.
- **Multilingual Support** — Expand to multilingual analysis using mBERT and XLM-R.
- **Browser Extensions** — Develop browser extensions for Google Chrome, Mozilla Firefox, and Microsoft Edge for instant on-page analysis.
- **Identity Verification** — Use blockchain to verify employer identities and prevent impersonation.
- **Active Learning** — Implement Active Learning with human feedback for continuous model improvement.
- **Enhanced Accuracy** — Integrate RoBERTa and LLMs for better accuracy and explainable fraud detection.
