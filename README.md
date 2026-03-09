# AI-Powered Job Fraud Detection System

An intelligent web application that detects fraudulent job postings using a multi-model machine learning pipeline.

## Features

- **Real-time Single Job Analysis** — Paste any job posting and get an instant fraud score (0–100)
- **Bulk CSV Upload** — Analyze thousands of job listings in one upload
- **4-Model ML Pipeline** — Text Analyzer + Anomaly Detector + Metadata Classifier + Fusion Model
- **Risk Levels** — LOW / MEDIUM / HIGH / CRITICAL with human-readable fraud flags
- **PDF Reports** — Download detailed analysis reports
- **Dashboard** — View history and aggregate fraud statistics

## How to Run Locally

**Prerequisites:** Node.js, Python 3.8+

```sh
# 1. Clone the repository
git clone https://github.com/Phanikartheek/job.git
cd job

# 2. Install frontend dependencies
npm install

# 3. Install Python dependencies
pip install flask flask-cors scikit-learn numpy joblib

# 4. Train ML models (one time only)
python python_models/train_models.py

# 5. Start Flask backend
python flask_backend/app.py

# 6. Start React frontend (in a new terminal)
npm run dev
```

Frontend runs at `http://localhost:8080`  
Backend API runs at `http://localhost:5000`

## Project Structure

```
job-main/
├── src/               ← React frontend (pages + components)
├── flask_backend/     ← Flask REST API
├── python_models/     ← ML model scripts + trained .pkl files
├── supabase/          ← Database configuration
└── public/            ← Static assets
```

## Technologies Used

- React + Vite + TypeScript
- Tailwind CSS
- Python Flask (REST API)
- scikit-learn (TF-IDF, Logistic Regression, Isolation Forest, Random Forest)
- Supabase (PostgreSQL)

## Deployment

- **Frontend:** Deployed on [Vercel](https://vercel.com)
- **Backend:** Deployed on [Render](https://render.com)
