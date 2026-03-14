"""
AI-Powered Job Fraud Detection System
Complete ML Pipeline with RoBERTa, Isolation Forest, and XGBoost
"""

import numpy as np
import pandas as pd
import pickle
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Tuple, List, Optional

import torch
from transformers import RobertaTokenizer, RobertaModel
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score, 
    confusion_matrix, classification_report, roc_curve, auc
)
import warnings
warnings.filterwarnings('ignore')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RoBERTaTextEmbedder:
    """
    Layer 1: Text Analysis with RoBERTa Transformer
    Generates 768-dimensional contextual embeddings for job postings
    """
    
    def __init__(self, model_name: str = 'roberta-base', device: str = 'cpu'):
        """
        Initialize RoBERTa model and tokenizer
        
        Args:
            model_name: HuggingFace model identifier
            device: 'cuda' or 'cpu'
        """
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.tokenizer = RobertaTokenizer.from_pretrained(model_name)
        self.model = RobertaModel.from_pretrained(model_name).to(self.device)
        self.model.eval()  # Set to evaluation mode
        self.embedding_dim = 768
        logger.info(f"✅ RoBERTa loaded on {self.device}")
    
    def _combine_text_fields(self, job_title: str, description: str, 
                            requirements: str, company_name: str) -> str:
        """Combine all text fields for embedding"""
        text = f"{job_title} [SEP] {description} [SEP] {requirements} [SEP] {company_name}"
        return text[:512]  # Truncate to RoBERTa max length
    
    def embed(self, job_title: str, description: str, 
              requirements: str, company_name: str) -> np.ndarray:
        """
        Generate 768-dim embedding for job posting
        
        Returns:
            768-dimensional vector
        """
        combined_text = self._combine_text_fields(job_title, description, 
                                                  requirements, company_name)
        
        inputs = self.tokenizer(combined_text, return_tensors='pt', 
                               truncation=True, max_length=512)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            # Use [CLS] token embedding (first token, full hidden state)
            embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()[0]
        
        return embedding


class MetadataFeatureEngineer:
    """
    Layer 2: Feature Engineering
    Extract structured metadata features from job postings
    """
    
    # Suspicious keywords for fraud detection
    FRAUD_KEYWORDS = {
        'guaranteed', 'unlimited', 'easy money', 'no experience',
        'work from home', 'whatsapp', 'telegram', 'no interview',
        'part time full time salary', 'upfront payment', 'exclusive',
        'limited time', 'quick cash', 'passive income', 'instant approval',
        'worldwide', 'any time', 'anywhere', 'flexible hours'
    }
    
    PERSONAL_EMAIL_DOMAINS = {'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
                             'aol.com', 'protonmail.com', 'mail.com', 'yandex.com'}
    
    def __init__(self):
        self.feature_names = [
            'salary_missing', 'salary_too_high', 'salary_unlimited',
            'email_personal_domain', 'location_missing', 'company_name_short',
            'suspicious_keywords_count', 'text_length_suspicious',
            'caps_ratio', 'digit_ratio'
        ]
    
    def extract_features(self, job_data: Dict) -> Dict[str, float]:
        """
        Extract all metadata features from job posting
        
        Args:
            job_data: Dictionary with keys: title, description, requirements,
                     company_name, salary, email, location
        
        Returns:
            Dictionary of feature values
        """
        features = {}
        
        # Salary features
        salary = str(job_data.get('salary', '')).lower()
        features['salary_missing'] = 1.0 if not salary or salary == 'not specified' else 0.0
        features['salary_too_high'] = 1.0 if any(x in salary for x in ['99999', '1000000']) else 0.0
        features['salary_unlimited'] = 1.0 if 'unlimited' in salary else 0.0
        
        # Email features
        email = str(job_data.get('email', '')).lower()
        domain = email.split('@')[1] if '@' in email else ''
        features['email_personal_domain'] = 1.0 if domain in self.PERSONAL_EMAIL_DOMAINS else 0.0
        
        # Location features
        location = str(job_data.get('location', '')).lower()
        features['location_missing'] = 1.0 if not location or location == 'anywhere' else 0.0
        
        # Company features
        company_name = str(job_data.get('company_name', ''))
        features['company_name_short'] = 1.0 if len(company_name) < 3 else 0.0
        
        # Text analysis
        description = str(job_data.get('description', '')).lower()
        features['suspicious_keywords_count'] = self._count_suspicious_keywords(description)
        features['text_length_suspicious'] = 1.0 if len(description) < 100 else 0.0
        features['caps_ratio'] = self._calculate_caps_ratio(description)
        features['digit_ratio'] = self._calculate_digit_ratio(description)
        
        return features
    
    def _count_suspicious_keywords(self, text: str) -> float:
        """Count occurrences of suspicious keywords (normalized 0-1)"""
        count = sum(1 for keyword in self.FRAUD_KEYWORDS if keyword in text)
        return min(count / 5.0, 1.0)  # Normalize to 0-1
    
    def _calculate_caps_ratio(self, text: str) -> float:
        """Calculate ratio of capital letters"""
        if len(text) == 0:
            return 0.0
        caps = sum(1 for c in text if c.isupper())
        return caps / len(text)
    
    def _calculate_digit_ratio(self, text: str) -> float:
        """Calculate ratio of digits"""
        if len(text) == 0:
            return 0.0
        digits = sum(1 for c in text if c.isdigit())
        return digits / len(text)


class AnomalyDetectionLayer:
    """
    Layer 3: Anomaly Detection
    Use Isolation Forest to detect abnormal job posting patterns
    Configuration: n_estimators=200, contamination=0.1
    """
    
    def __init__(self, n_estimators: int = 200, contamination: float = 0.1, 
                 random_state: int = 42):
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        logger.info(f"✅ Anomaly Detection Model initialized")
    
    def fit(self, features: np.ndarray):
        """
        Train Isolation Forest on metadata features
        
        Args:
            features: 2D array of shape (n_samples, n_features)
        """
        features_scaled = self.scaler.fit_transform(features)
        self.model.fit(features_scaled)
        self.is_trained = True
        logger.info(f"✅ Anomaly model trained on {len(features)} samples")
    
    def get_anomaly_score(self, features: np.ndarray) -> np.ndarray:
        """
        Get anomaly scores (normalized to 0-1, higher = more anomalous)
        
        Returns:
            Array of anomaly scores (0-1)
        """
        if not self.is_trained:
            raise ValueError("Model not trained. Call fit() first.")
        
        features_scaled = self.scaler.transform(features)
        # Isolation Forest returns -1 for anomalies, 1 for normal
        scores = self.model.score_samples(features_scaled)
        # Normalize to 0-1 range
        normalized_scores = (1 - (scores + 1)) / 2  # Convert [-1,1] to [0,1]
        return normalized_scores


class FeatureFusion:
    """
    Layer 4: Feature Fusion
    Combine RoBERTa embeddings, metadata features, and anomaly scores
    """
    
    def __init__(self, embedding_dim: int = 768, n_metadata_features: int = 10):
        self.embedding_dim = embedding_dim
        self.n_metadata_features = n_metadata_features
        self.total_features = embedding_dim + n_metadata_features + 1  # +1 for anomaly score
        logger.info(f"✅ Feature Fusion layer created: {self.total_features} total features")
    
    def fuse(self, roberta_embedding: np.ndarray, metadata_features: Dict,
             anomaly_score: float) -> np.ndarray:
        """
        Combine all features into single vector
        
        Args:
            roberta_embedding: 768-dim RoBERTa embedding
            metadata_features: Dictionary of extracted features
            anomaly_score: Single anomaly score (0-1)
        
        Returns:
            Complete feature vector
        """
        # Convert metadata features to array (maintain order)
        metadata_array = np.array(list(metadata_features.values()), dtype=np.float32)
        
        # Concatenate: [RoBERTa_768 + Metadata_10 + AnomalyScore_1]
        fused = np.concatenate([
            roberta_embedding,
            metadata_array,
            [anomaly_score]
        ])
        
        return fused


class XGBoostClassifier_Fraud:
    """
    Layer 5: Final Classification Model
    XGBoost classifier for fraud prediction
    Configuration: n_estimators=200, max_depth=4, learning_rate=0.1
    """
    
    def __init__(self, n_estimators: int = 200, max_depth: int = 4, 
                 learning_rate: float = 0.1, random_state: int = 42):
        self.model = XGBClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            random_state=random_state,
            eval_metric='logloss',
            n_jobs=-1,
            verbosity=0
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def fit(self, X: np.ndarray, y: np.ndarray):
        """Train XGBoost model"""
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        logger.info(f"✅ XGBoost model trained")
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Get fraud probability predictions
        
        Returns:
            Probability scores (0-1)
        """
        if not self.is_trained:
            raise ValueError("Model not trained. Call fit() first.")
        
        X_scaled = self.scaler.transform(X)
        probas = self.model.predict_proba(X_scaled)
        return probas[:, 1]  # Return probability of fraud class
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Get binary predictions"""
        if not self.is_trained:
            raise ValueError("Model not trained. Call fit() first.")
        
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)


class FraudDetectionPipeline:
    """
    Complete AI-Powered Job Fraud Detection System
    Orchestrates all layers: Text → Metadata → Anomaly → Fusion → Classification
    """
    
    def __init__(self, device: str = 'cpu'):
        self.roberta_embedder = RoBERTaTextEmbedder(device=device)
        self.feature_engineer = MetadataFeatureEngineer()
        self.anomaly_detector = AnomalyDetectionLayer()
        self.feature_fusion = FeatureFusion()
        self.classifier = XGBoostClassifier_Fraud()
        
        self.is_trained = False
        self.metrics = {}
        self.feature_scaler = StandardScaler()
        
        logger.info("✅ Complete Fraud Detection Pipeline initialized")
    
    def prepare_training_data(self, job_postings: List[Dict], 
                            labels: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare training data through entire pipeline
        
        Args:
            job_postings: List of job posting dictionaries
            labels: Binary labels (0=legitimate, 1=fraud)
        
        Returns:
            Tuple of (fused_features, labels)
        """
        logger.info(f"📊 Preparing {len(job_postings)} job postings...")
        
        all_embeddings = []
        all_metadata_features = []
        all_features_for_anomaly = []
        
        # Step 1: Generate RoBERTa embeddings for all postings
        for i, posting in enumerate(job_postings):
            if (i + 1) % 10 == 0:
                logger.info(f"  Processed {i + 1}/{len(job_postings)} embeddings")
            
            embedding = self.roberta_embedder.embed(
                job_title=posting.get('title', ''),
                description=posting.get('description', ''),
                requirements=posting.get('requirements', ''),
                company_name=posting.get('company_name', '')
            )
            all_embeddings.append(embedding)
        
        # Step 2: Extract metadata features
        for posting in job_postings:
            features = self.feature_engineer.extract_features(posting)
            all_metadata_features.append(features)
            all_features_for_anomaly.append(list(features.values()))
        
        all_embeddings = np.array(all_embeddings)
        all_features_for_anomaly = np.array(all_features_for_anomaly)
        
        # Step 3: Train anomaly detector
        logger.info("🔍 Training anomaly detection layer...")
        self.anomaly_detector.fit(all_features_for_anomaly)
        anomaly_scores = self.anomaly_detector.get_anomaly_score(all_features_for_anomaly)
        
        # Step 4: Fuse all features
        logger.info("🔗 Fusing features...")
        fused_features = []
        for i in range(len(job_postings)):
            fused = self.feature_fusion.fuse(
                all_embeddings[i],
                all_metadata_features[i],
                anomaly_scores[i]
            )
            fused_features.append(fused)
        
        fused_features = np.array(fused_features)
        
        logger.info(f"✅ Data preparation complete. Shape: {fused_features.shape}")
        return fused_features, labels
    
    def train(self, job_postings: List[Dict], labels: np.ndarray, 
              cv_folds: int = 5) -> Dict:
        """
        Train the complete pipeline with cross-validation
        
        Args:
            job_postings: List of job posting dictionaries
            labels: Binary labels (0=legitimate, 1=fraud)
            cv_folds: Number of cross-validation folds
        
        Returns:
            Dictionary of evaluation metrics
        """
        # Prepare data
        X, y = self.prepare_training_data(job_postings, labels)
        
        # Scale features
        X_scaled = self.feature_scaler.fit_transform(X)
        
        # Train classifier
        logger.info(f"🎯 Training XGBoost classifier...")
        self.classifier.fit(X_scaled, y)
        self.is_trained = True
        
        # Evaluate with 5-fold cross-validation
        logger.info(f"📈 Performing {cv_folds}-fold cross-validation...")
        skf = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
        
        metrics = self._evaluate_model(X_scaled, y, skf)
        self.metrics = metrics
        
        logger.info("=" * 60)
        logger.info("📊 EVALUATION METRICS")
        logger.info("=" * 60)
        for metric, value in metrics.items():
            if isinstance(value, float):
                logger.info(f"{metric:.<40} {value:.4f}")
            else:
                logger.info(f"{metric:.<40} {value}")
        
        return metrics
    
    def _evaluate_model(self, X: np.ndarray, y: np.ndarray, cv) -> Dict:
        """Calculate comprehensive evaluation metrics"""
        metrics = {}
        
        # Cross-validation scores
        cv_precision = cross_val_score(self.classifier.model, X, y, 
                                      cv=cv, scoring='precision')
        cv_recall = cross_val_score(self.classifier.model, X, y, 
                                   cv=cv, scoring='recall')
        cv_f1 = cross_val_score(self.classifier.model, X, y, 
                               cv=cv, scoring='f1')
        cv_roc_auc = cross_val_score(self.classifier.model, X, y, 
                                    cv=cv, scoring='roc_auc')
        
        # Get predictions on entire dataset
        y_pred = self.classifier.predict(X)
        y_pred_proba = self.classifier.predict_proba(X)
        
        # Calculate metrics
        metrics['CV Precision (mean)'] = cv_precision.mean()
        metrics['CV Precision (std)'] = cv_precision.std()
        metrics['CV Recall (mean)'] = cv_recall.mean()
        metrics['CV Recall (std)'] = cv_recall.std()
        metrics['CV F1-Score (mean)'] = cv_f1.mean()
        metrics['CV F1-Score (std)'] = cv_f1.std()
        metrics['CV ROC-AUC (mean)'] = cv_roc_auc.mean()
        metrics['CV ROC-AUC (std)'] = cv_roc_auc.std()
        
        # Overall metrics
        metrics['Overall Precision'] = precision_score(y, y_pred)
        metrics['Overall Recall'] = recall_score(y, y_pred)
        metrics['Overall F1-Score'] = f1_score(y, y_pred)
        metrics['Overall ROC-AUC'] = roc_auc_score(y, y_pred_proba)
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(y, y_pred).ravel()
        metrics['True Negatives'] = int(tn)
        metrics['False Positives'] = int(fp)
        metrics['False Negatives'] = int(fn)
        metrics['True Positives'] = int(tp)
        
        return metrics
    
    def predict_job_posting(self, job_posting: Dict) -> Dict:
        """
        Predict fraud for a single job posting
        
        Returns:
            Dictionary with: probability, risk_category, indicators
        """
        if not self.is_trained:
            raise ValueError("Pipeline not trained. Call train() first.")
        
        # Generate RoBERTa embedding
        embedding = self.roberta_embedder.embed(
            job_title=job_posting.get('title', ''),
            description=job_posting.get('description', ''),
            requirements=job_posting.get('requirements', ''),
            company_name=job_posting.get('company_name', '')
        )
        
        # Extract metadata features
        metadata_features = self.feature_engineer.extract_features(job_posting)
        
        # Get anomaly score
        metadata_array = np.array(list(metadata_features.values()), dtype=np.float32).reshape(1, -1)
        anomaly_score = self.anomaly_detector.get_anomaly_score(metadata_array)[0]
        
        # Fuse features
        fused = self.feature_fusion.fuse(embedding, metadata_features, anomaly_score)
        fused_scaled = self.feature_scaler.transform(fused.reshape(1, -1))[0]
        
        # Get prediction
        fraud_probability = self.classifier.predict_proba(fused_scaled.reshape(1, -1))[0]
        
        # Determine risk category
        if fraud_probability < 0.33:
            risk_category = "🟢 LOW"
        elif fraud_probability < 0.66:
            risk_category = "🟡 MEDIUM"
        else:
            risk_category = "🔴 HIGH"
        
        # Extract indicators
        indicators = self._extract_fraud_indicators(metadata_features, anomaly_score)
        
        return {
            'fraud_probability': round(float(fraud_probability), 4),
            'fraud_percentage': round(float(fraud_probability) * 100, 2),
            'risk_category': risk_category,
            'fraud_indicators': indicators,
            'anomaly_score': round(float(anomaly_score), 4),
            'metadata_features': {k: round(float(v), 4) for k, v in metadata_features.items()},
            'timestamp': datetime.now().isoformat()
        }
    
    def _extract_fraud_indicators(self, features: Dict, anomaly_score: float) -> List[str]:
        """Extract human-readable fraud indicators"""
        indicators = []
        
        thresholds = {
            'salary_missing': 0.5,
            'salary_too_high': 0.5,
            'salary_unlimited': 0.5,
            'email_personal_domain': 0.5,
            'location_missing': 0.5,
            'company_name_short': 0.5,
            'suspicious_keywords_count': 0.3,
            'text_length_suspicious': 0.5,
            'caps_ratio': 0.1,
            'digit_ratio': 0.05
        }
        
        descriptions = {
            'salary_missing': "💰 Salary information is missing",
            'salary_too_high': "💰 Unrealistic salary offered",
            'salary_unlimited': "💰 Unlimited/uncapped earnings claimed",
            'email_personal_domain': "📧 Uses personal email instead of company domain",
            'location_missing': "📍 Location not specified or 'anywhere'",
            'company_name_short': "🏢 Company name is suspiciously short",
            'suspicious_keywords_count': "⚠️  Multiple fraud-associated keywords detected",
            'text_length_suspicious': "📝 Job description is unusually brief",
            'caps_ratio': "🔤 Excessive use of capital letters",
            'digit_ratio': "🔢 Unusual amount of numbers in text"
        }
        
        for feature, threshold in thresholds.items():
            if features.get(feature, 0) > threshold:
                indicators.append(descriptions.get(feature, feature))
        
        if anomaly_score > 0.6:
            indicators.append("🔍 Anomalous pattern detected (unlike legitimate postings)")
        
        return indicators
    
    def save_model(self, filepath: str):
        """Save trained pipeline to disk"""
        model_data = {
            'classifier': self.classifier,
            'anomaly_detector': self.anomaly_detector,
            'feature_engineer': self.feature_engineer,
            'feature_scaler': self.feature_scaler,
            'metrics': self.metrics
        }
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        logger.info(f"✅ Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained pipeline from disk"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        self.classifier = model_data['classifier']
        self.anomaly_detector = model_data['anomaly_detector']
        self.feature_engineer = model_data['feature_engineer']
        self.feature_scaler = model_data['feature_scaler']
        self.metrics = model_data['metrics']
        self.is_trained = True
        logger.info(f"✅ Model loaded from {filepath}")


if __name__ == "__main__":
    print("🤖 Job Fraud Detection Pipeline Module")
    print("Use: from fraudDetectionPipeline import FraudDetectionPipeline")
    print("\nExample:")
    print("  pipeline = FraudDetectionPipeline()")
    print("  metrics = pipeline.train(job_postings, labels)")
    print("  result = pipeline.predict_job_posting(job_data)")
