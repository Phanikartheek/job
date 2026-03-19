# ============================================================
# Flask Backend Models Package
# Re-exports all 5 ML model runners for use in app.py
# ============================================================

import sys
import os

# Add python_models directory to path so imports work
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

# We are in flask_backend/models, need to go up TWO levels to reach repo root
# then into python_models.
repo_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
python_models_path = os.path.join(repo_root, 'python_models')

# Fallback: if running directly inside flask_backend (where repo_root is just one dir up)
# app_enhanced.py adds repo_root to sys.path, so we should ALSO check that.
if not os.path.exists(python_models_path):
    # Try one level up (if __file__ resolution behaves differently in prod vs local)
    python_models_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'python_models')
    
sys.path.insert(0, os.path.abspath(python_models_path))

from textModel     import run_text_model,     TextModelResult
from anomalyModel  import run_anomaly_model,  AnomalyModelResult
from metadataModel import run_metadata_model, MetadataModelResult
from contentModel  import run_content_model,  CombinedContentResult
from xgboostModel  import run_xgboost_model,  XGBoostModelResult

__all__ = [
    'run_text_model',
    'run_anomaly_model',
    'run_metadata_model',
    'run_content_model',
    'run_xgboost_model',
    'TextModelResult',
    'AnomalyModelResult',
    'MetadataModelResult',
    'CombinedContentResult',
    'XGBoostModelResult',
]
