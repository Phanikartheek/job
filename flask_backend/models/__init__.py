# ============================================================
# Flask Backend Models Package
# Re-exports all 5 ML model runners for use in app.py
# ============================================================

import sys
import os

# Add python_models directory to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python_models'))

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
