# Project Structure Guide

This document describes the proper organization of the AI-Powered Job Fraud Detection System.

## ✅ Clean Project Structure

```
job-main/
├── 📁 src/                          ← React Frontend (TypeScript/TSX)
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/                  ← Reusable UI components
│   │   ├── AnalysisForm.tsx
│   │   ├── Bulk ResultsTable.tsx
│   │   ├── ModelHealthWidget.tsx
│   │   └── ...
│   ├── pages/                       ← Page components
│   │   ├── Analyze.tsx
│   │   ├── BulkUploadPage.tsx
│   │   ├── Dashboard.tsx
│   │   └── ...
│   ├── hooks/                       ← Custom React hooks
│   ├── lib/                         ← Utilities & helpers
│   └── integrations/                ← Third-party integrations (Supabase)
│
├── 📁 flask_backend/                ← Flask REST API Server
│   ├── app.py                       ← Main application (original)
│   ├── app_enhanced.py              ← Enhanced version with BERT, etc.
│   └── requirements.txt
│
├── 📁 python_models/                ← Machine Learning Models
│   ├── textModel.py                 ← Original TF-IDF Text Analyzer
│   ├── anomalyModel.py              ← Isolation Forest Anomaly Detector
│   ├── metadataModel.py             ← Random Forest Metadata Classifier
│   ├── contentModel.py              ← Content Fusion Model
│   ├── xgboostModel.py              ← XGBoost Ensemble
│   │
│   ├── textModelBERT.py             ← ✨ Enhanced BERT Text Analyzer
│   ├── textModelMultilingual.py     ← ✨ Multilingual Support
│   ├── advancedEnsemble.py          ← ✨ XGBoost + Neural Network
│   ├── continuousLearning.py        ← ✨ Real-time Learning Loop
│   │
│   ├── train_models.py              ← Model training script
│   ├── run_all.py                   ← Run all models
│   ├── run_dataset.py               ← Test on dataset
│   ├── models/                      ← Trained model files (.pkl)
│   └── sample_dataset.csv           ← Sample data for testing
│
├── 📁 supabase/                     ← Database Configuration
│   ├── config.toml
│   ├── migrations/                  ← SQL migration files
│   └── functions/                   ← Serverless functions
│
├── 📁 public/                       ← Static assets
│   ├── robots.txt
│   └── favicon.ico
│
├── 📁 scripts/                      ← Helper scripts
│   └── runTextModel.ts
│
├── 📄 Configuration Files (Root)
│   ├── package.json                 ← Frontend dependencies (Node.js)
│   ├── package-lock.json
│   ├── requirements.txt             ← Original Python dependencies
│   ├── requirements_enhanced.txt    ← Enhanced dependencies (BERT, etc.)
│   │
│   ├── vite.config.ts               ← Vite build config
│   ├── tsconfig.json                ← TypeScript config
│   ├── tailwind.config.ts           ← Tailwind CSS config
│   ├── postcss.config.js            ← PostCSS config
│   ├── eslint.config.js             ← ESLint config
│   │
│   ├── vercel.json                  ← Vercel deployment config
│   ├── render.yaml                  ← Render deployment config
│   └── README.md                    ← Project documentation
│
├── 📄 Report & Documentation
│   ├── Project_Report_Final.docx    ← Final project report
│   ├── ENHANCED_SETUP_GUIDE.md      ← Setup guide for advanced features
│   │
│   └── .gitignore                   ← Git ignore rules
│
├── 🚫 NOT INCLUDED (Ignored by Git)
│   ├── node_modules/                ← npm packages (recreate with: npm install)
│   ├── .venv/                       ← Python virtual env (recreate with: python -m venv .venv)
│   ├── dist/                        ← Build artifacts
│   ├── __pycache__/                 ← Python cache
│   ├── .vite/                       ← Vite cache
│   └── .env                         ← Environment variables (security)
```

---

## 📋 File Organization Rules

### ✅ KEEP at Root Level
- Package managers: `package.json`, `requirements.txt`
- Build configs: `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- Deployment: `vercel.json`, `render.yaml`
- Documentation: `README.md`, `ENHANCED_SETUP_GUIDE.md`
- Git: `.gitignore`, `.git/`

### ❌ DO NOT PUT at Root Level
- Python models → Use `python_models/`
- React components → Use `src/components/`
- Frontend pages → Use `src/pages/`
- Static files → Use `public/`
- Utility functions → Use `src/lib/` or `src/hooks/`

---

## 🚀 Quick Setup After Cloning

```bash
# 1. Clone repository
git clone https://github.com/Phanikartheek/job.git
cd job

# 2. Frontend setup
npm install              # Installs node_modules (ignored in git)
npm run dev             # Start development server

# 3. Backend setup
python -m venv .venv    # Create virtual environment (ignored in git)
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 4. For enhanced features
pip install -r requirements_enhanced.txt
python flask_backend/app_enhanced.py

# 5. Train models (optional)
python python_models/train_models.py
```

---

## 📝 Clean Structure Benefits

| Benefit | Why It Matters |
|---------|---------------|
| **Easy Navigation** | Know where everything belongs |
| **Smaller Git Repos** | Ignore node_modules, virtualenv, builds |
| **Faster Cloning** | Don't download generated files |
| **Better Collaboration** | Team members know the structure |
| **CI/CD Friendly** | Automated builds work reliably |
| **Security** | .env files never committed |

---

## 🗑️ Cleanup Instructions

If project gets messy, here's how to clean:

```bash
# Remove compiled/generated files
rm -rf node_modules dist build __pycache__ .venv

# Remove cache
rm -rf .vite .next .pytest_cache

# Rebuild
npm install                    # Install frontend deps
python -m venv .venv          # Create new Python env
source .venv/bin/activate
pip install -r requirements.txt

# Verify structure
ls -la                        # Linux/Mac
dir                          # Windows
```

---

## ✨ What's New in Enhanced Features

New/Enhanced files added:

```
python_models/
├── textModelBERT.py           ← BERT/RoBERTa text analysis
├── textModelMultilingual.py   ← Support 4 languages
├── advancedEnsemble.py        ← XGBoost + Neural Network
└── continuousLearning.py      ← Auto-improving models

flask_backend/
└── app_enhanced.py            ← New API endpoints

ENHANCED_SETUP_GUIDE.md         ← Complete setup documentation
requirements_enhanced.txt       ← Dependencies for advanced features
```

---

## 📌 Key Points

1. **Don't commit node_modules** → Listed in .gitignore
2. **Don't commit .venv** → Recreate locally with `python -m venv .venv`
3. **Don't commit .env** → Each developer has their own
4. **Don't commit build artifacts** → dist/, __pycache__/, etc.
5. **Always commit source code** → .tsx, .py, .ts, .json configs
6. **Keep it organized** → One file type per folder

---

## 🔗 Related Documents

- [Main README](./README.md) - Project overview
- [Enhanced Setup Guide](./ENHANCED_SETUP_GUIDE.md) - Advanced features
- [Project Report](./Project_Report_Final 2 .docx) - Full documentation

---

Last Updated: March 14, 2026
