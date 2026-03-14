"""
Layer 8: Continuous Learning System
Feedback collection, error pattern analysis, and automatic model retraining
"""

import json
import numpy as np
import pandas as pd
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
import pickle

logger = logging.getLogger(__name__)


class FeedbackCollector:
    """
    Collects user corrections and feedback for model predictions
    Stores feedback in JSON format for analysis and retraining
    """
    
    def __init__(self, feedback_path: str = 'fraud_feedback.json'):
        self.feedback_path = Path(feedback_path)
        self.feedback_history = self._load_feedback()
        logger.info(f"✅ Feedback collector initialized. Path: {self.feedback_path}")
    
    def record_feedback(self, prediction: Dict, user_correction: int, 
                       confidence: float, job_posting: Dict = None) -> None:
        """
        Record user feedback for a prediction
        
        Args:
            prediction: Model prediction dictionary
            user_correction: User's ground truth (0=legitimate, 1=fraud)
            confidence: Model's confidence (0-1)
            job_posting: Optional original job posting data
        """
        feedback_entry = {
            'timestamp': datetime.now().isoformat(),
            'model_prediction': prediction.get('fraud_probability', 0),
            'model_confidence': confidence,
            'user_ground_truth': int(user_correction),
            'is_correct': 1 if (int(user_correction) == (1 if prediction.get('fraud_probability', 0) > 0.5 else 0)) else 0,
            'risk_category': prediction.get('risk_category', ''),
            'fraud_indicators': prediction.get('fraud_indicators', []),
            'job_posting': job_posting or {}
        }
        
        self.feedback_history.append(feedback_entry)
        self._save_feedback()
        
        logger.info(f"✅ Feedback recorded: {'✓ Correct' if feedback_entry['is_correct'] else '✗ Incorrect'}")
    
    def get_accuracy_metrics(self) -> Dict:
        """Calculate accuracy metrics from feedback"""
        if not self.feedback_history:
            return {
                'total_feedback': 0,
                'accuracy': 0,
                'precision': 0,
                'recall': 0,
                'f1_score': 0
            }
        
        correct = sum(1 for f in self.feedback_history if f['is_correct'])
        accuracy = correct / len(self.feedback_history)
        
        # Calculate precision: TP / (TP + FP)
        tp = sum(1 for f in self.feedback_history 
                if f['user_ground_truth'] == 1 and f['model_prediction'] > 0.5)
        fp = sum(1 for f in self.feedback_history 
                if f['user_ground_truth'] == 0 and f['model_prediction'] > 0.5)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        
        # Calculate recall: TP / (TP + FN)
        fn = sum(1 for f in self.feedback_history 
                if f['user_ground_truth'] == 1 and f['model_prediction'] <= 0.5)
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        
        # F1 Score
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        return {
            'total_feedback': len(self.feedback_history),
            'accuracy': round(accuracy, 4),
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1_score': round(f1, 4),
            'correct_predictions': correct,
            'incorrect_predictions': len(self.feedback_history) - correct
        }
    
    def _load_feedback(self) -> List[Dict]:
        """Load feedback from disk"""
        if self.feedback_path.exists():
            with open(self.feedback_path, 'r') as f:
                return json.load(f)
        return []
    
    def _save_feedback(self) -> None:
        """Save feedback to disk"""
        with open(self.feedback_path, 'w') as f:
            json.dump(self.feedback_history, f, indent=2)


class ErrorPatternAnalyzer:
    """
    Analyzes prediction errors to identify patterns and biases
    Helps understand what causes incorrect predictions
    """
    
    def __init__(self):
        self.error_patterns = defaultdict(int)
    
    def analyze_errors(self, feedback_history: List[Dict]) -> Dict:
        """
        Analyze patterns in incorrect predictions
        
        Returns:
            Dictionary of error patterns and statistics
        """
        false_positives = []  # Legitimate marked as fraud
        false_negatives = []  # Fraud marked as legitimate
        
        for feedback in feedback_history:
            prediction = feedback['model_prediction']
            ground_truth = feedback['user_ground_truth']
            
            # False positive: predicted fraud but actually legitimate
            if prediction > 0.5 and ground_truth == 0:
                false_positives.append(feedback)
            
            # False negative: predicted legitimate but actually fraud
            if prediction <= 0.5 and ground_truth == 1:
                false_negatives.append(feedback)
        
        # Analyze FP patterns
        fp_keywords = defaultdict(int)
        for fp in false_positives:
            indicators = fp.get('fraud_indicators', [])
            for indicator in indicators:
                fp_keywords[indicator] += 1
        
        # Analyze FN patterns
        fn_keywords = defaultdict(int)
        for fn in false_negatives:
            indicators = fn.get('fraud_indicators', [])
            for indicator in indicators:
                fn_keywords[indicator] += 1
        
        return {
            'false_positives_count': len(false_positives),
            'false_negatives_count': len(false_negatives),
            'false_positive_rate': round(len(false_positives) / (len(false_positives) + len(false_negatives) + 1e-6), 4),
            'false_negative_rate': round(len(false_negatives) / (len(false_positives) + len(false_negatives) + 1e-6), 4),
            'top_fp_indicators': dict(sorted(fp_keywords.items(), key=lambda x: x[1], reverse=True)[:5]),
            'top_fn_indicators': dict(sorted(fn_keywords.items(), key=lambda x: x[1], reverse=True)[:5])
        }


class AdaptiveRetrainer:
    """
    Monitors model performance and automatically retrains when needed
    Retraining triggered when error rate exceeds threshold (default 15%)
    """
    
    def __init__(self, error_threshold: float = 0.15, 
                 min_feedback_samples: int = 20,
                 max_hours_since_train: int = 24):
        """
        Args:
            error_threshold: Retrain if error rate > this value (0.15 = 15%)
            min_feedback_samples: Minimum feedback needed before considering retrain
            max_hours_since_train: Max hours before forced retrain
        """
        self.error_threshold = error_threshold
        self.min_feedback_samples = min_feedback_samples
        self.max_hours_since_train = max_hours_since_train
        self.last_trained = datetime.now()
        self.training_history = []
    
    def should_retrain(self, feedback_metrics: Dict) -> Tuple[bool, str]:
        """
        Determine if model should be retrained
        
        Returns:
            Tuple of (should_retrain: bool, reason: str)
        """
        if feedback_metrics['total_feedback'] < self.min_feedback_samples:
            return False, f"Insufficient feedback ({feedback_metrics['total_feedback']}/{self.min_feedback_samples})"
        
        # Check error rate
        error_rate = 1 - feedback_metrics['accuracy']
        if error_rate > self.error_threshold:
            return True, f"Error rate exceeds threshold ({error_rate:.2%} > {self.error_threshold:.2%})"
        
        # Check time since last training
        hours_since_train = (datetime.now() - self.last_trained).total_seconds() / 3600
        if hours_since_train > self.max_hours_since_train:
            return True, f"Time-based retrain ({hours_since_train:.1f}h > {self.max_hours_since_train}h)"
        
        return False, "Model performance acceptable"
    
    def log_training_event(self, metrics: Dict, reason: str):
        """Log a training/retraining event"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'reason': reason,
            'metrics': metrics,
            'hours_since_last_train': (datetime.now() - self.last_trained).total_seconds() / 3600
        }
        self.training_history.append(event)
        self.last_trained = datetime.now()
        logger.info(f"📊 Training event logged: {reason}")


class LearningStatusMonitor:
    """
    Monitors continuous learning system status
    Provides metrics for dashboard/API endpoints
    """
    
    def __init__(self, feedback_collector: FeedbackCollector,
                 error_analyzer: ErrorPatternAnalyzer,
                 retrainer: AdaptiveRetrainer):
        self.feedback = feedback_collector
        self.analyzer = error_analyzer
        self.retrainer = retrainer
    
    def get_learning_status(self) -> Dict:
        """
        Get comprehensive learning system status
        
        Returns:
            Dictionary with all key metrics
        """
        accuracy_metrics = self.feedback.get_accuracy_metrics()
        
        # Only analyze if we have feedback
        if accuracy_metrics['total_feedback'] > 0:
            error_patterns = self.analyzer.analyze_errors(self.feedback.feedback_history)
        else:
            error_patterns = {
                'false_positives_count': 0,
                'false_negatives_count': 0,
                'false_positive_rate': 0,
                'false_negative_rate': 0,
                'top_fp_indicators': {},
                'top_fn_indicators': {}
            }
        
        should_retrain, reason = self.retrainer.should_retrain(accuracy_metrics)
        
        return {
            'system_status': '✅ RUNNING',
            'feedback_collected': accuracy_metrics['total_feedback'],
            'model_accuracy': accuracy_metrics['accuracy'],
            'model_precision': accuracy_metrics['precision'],
            'model_recall': accuracy_metrics['recall'],
            'model_f1': accuracy_metrics['f1_score'],
            'correct_predictions': accuracy_metrics['correct_predictions'],
            'incorrect_predictions': accuracy_metrics['incorrect_predictions'],
            'error_patterns': error_patterns,
            'retraining_needed': should_retrain,
            'retraining_reason': reason,
            'last_trained': self.retrainer.last_trained.isoformat(),
            'training_history_count': len(self.retrainer.training_history),
            'feedback_file': str(self.feedback.feedback_path)
        }
    
    def get_dashboard_summary(self) -> Dict:
        """
        Get concise summary for dashboard display
        """
        status = self.get_learning_status()
        
        return {
            'accuracy': f"{status['model_accuracy']*100:.1f}%",
            'feedback_samples': status['feedback_collected'],
            'status': '🟢 Healthy' if not status['retraining_needed'] else '🟡 Retraining Needed',
            'last_updated': status['last_trained'],
            'fp_count': status['error_patterns']['false_positives_count'],
            'fn_count': status['error_patterns']['false_negatives_count']
        }


def demonstrate_continuous_learning():
    """Demonstration of continuous learning system"""
    
    logger.info("\n" + "=" * 70)
    logger.info("🔄 CONTINUOUS LEARNING SYSTEM DEMONSTRATION")
    logger.info("=" * 70)
    
    # Initialize components
    feedback_collector = FeedbackCollector()
    error_analyzer = ErrorPatternAnalyzer()
    retrainer = AdaptiveRetrainer(error_threshold=0.15, min_feedback_samples=5)
    monitor = LearningStatusMonitor(feedback_collector, error_analyzer, retrainer)
    
    # Simulate user feedback
    logger.info("\n📝 Simulating user feedback...")
    
    test_predictions = [
        # Correct predictions
        {'fraud_probability': 0.85, 'risk_category': '🔴 HIGH', 'fraud_indicators': ['💰 Unrealistic salary']},
        {'fraud_probability': 0.1, 'risk_category': '🟢 LOW', 'fraud_indicators': []},
        
        # Incorrect predictions (errors to learn from)
        {'fraud_probability': 0.8, 'risk_category': '🔴 HIGH', 'fraud_indicators': []},  # False positive
        {'fraud_probability': 0.3, 'risk_category': '🟢 LOW', 'fraud_indicators': ['⚠️ Suspicious keywords']},  # False negative
        
        # More feedback
        {'fraud_probability': 0.9, 'risk_category': '🔴 HIGH', 'fraud_indicators': ['WhatsApp only']},
    ]
    
    ground_truths = [1, 0, 0, 1, 1]  # User corrections
    
    for i, (pred, truth) in enumerate(zip(test_predictions, ground_truths)):
        feedback_collector.record_feedback(
            prediction=pred,
            user_correction=truth,
            confidence=abs(pred['fraud_probability'] - 0.5) * 2
        )
        logger.info(f"   Feedback {i+1}: Prediction={pred['fraud_probability']:.2f}, Truth={truth}")
    
    # Check learning status
    logger.info("\n📊 Learning Status Report:")
    status = monitor.get_learning_status()
    
    logger.info(f"   Total Feedback: {status['feedback_collected']}")
    logger.info(f"   Accuracy: {status['model_accuracy']:.2%}")
    logger.info(f"   Precision: {status['model_precision']:.2%}")
    logger.info(f"   Recall: {status['model_recall']:.2%}")
    logger.info(f"   F1-Score: {status['model_f1']:.2%}")
    
    logger.info(f"\n🔍 Error Analysis:")
    logger.info(f"   False Positives: {status['error_patterns']['false_positives_count']}")
    logger.info(f"   False Negatives: {status['error_patterns']['false_negatives_count']}")
    logger.info(f"   False Positive Rate: {status['error_patterns']['false_positive_rate']:.2%}")
    logger.info(f"   False Negative Rate: {status['error_patterns']['false_negative_rate']:.2%}")
    
    logger.info(f"\n📈 Retraining Status:")
    logger.info(f"   Retrain Needed: {'Yes ⚠️' if status['retraining_needed'] else 'No ✅'}")
    logger.info(f"   Reason: {status['retraining_reason']}")
    
    dashboard = monitor.get_dashboard_summary()
    logger.info(f"\n📱 Dashboard Summary:")
    logger.info(f"   Accuracy: {dashboard['accuracy']}")
    logger.info(f"   Status: {dashboard['status']}")
    logger.info(f"   Feedback Samples: {dashboard['feedback_samples']}")
    
    return monitor


if __name__ == "__main__":
    monitor = demonstrate_continuous_learning()
