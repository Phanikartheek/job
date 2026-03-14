"""
Real-Time Learning Loop System
Continuously improves models based on user feedback and new fraud patterns
"""

import numpy as np
import joblib
import json
from datetime import datetime
from collections import defaultdict
import threading
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

class FeedbackCollector:
    """
    Collects user feedback on fraud predictions
    Continuously learns from false positives/negatives
    """
    
    def __init__(self, feedback_file="fraud_feedback.json"):
        """
        Args:
            feedback_file: File to store feedback data
        """
        self.feedback_file = feedback_file
        self.feedback_data = self._load_feedback()
        self.accuracy_metrics = defaultdict(list)
    
    def _load_feedback(self):
        """Load existing feedback from file"""
        try:
            with open(self.feedback_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                'correct_predictions': [],
                'false_positives': [],  # We said fraud, but it's legitimate
                'false_negatives': [],  # We said legitimate, but it's fraud
                'user_corrections': []
            }
    
    def save_feedback(self):
        """Save feedback to file"""
        with open(self.feedback_file, 'w') as f:
            json.dump(self.feedback_data, f, indent=2)
    
    def record_feedback(self, job_id, prediction, actual_label, job_data):
        """
        Record feedback from user
        Args:
            job_id: Unique job posting ID
            prediction: Our predicted fraud probability (0-1)
            actual_label: Actual label from user (0=legit, 1=fraud)
            job_data: Job posting features for model retraining
        """
        feedback_entry = {
            'timestamp': datetime.now().isoformat(),
            'job_id': job_id,
            'prediction': float(prediction),
            'actual_label': int(actual_label),
            'job_data': job_data
        }
        
        # Categorize feedback
        if prediction >= 0.5 and actual_label == 1:
            # True positive
            self.feedback_data['correct_predictions'].append(feedback_entry)
        elif prediction >= 0.5 and actual_label == 0:
            # False positive
            self.feedback_data['false_positives'].append(feedback_entry)
        elif prediction < 0.5 and actual_label == 0:
            # True negative
            self.feedback_data['correct_predictions'].append(feedback_entry)
        elif prediction < 0.5 and actual_label == 1:
            # False negative
            self.feedback_data['false_negatives'].append(feedback_entry)
        
        self.save_feedback()
    
    def get_accuracy_metrics(self):
        """Calculate accuracy metrics from feedback"""
        total = (len(self.feedback_data['correct_predictions']) + 
                len(self.feedback_data['false_positives']) +
                len(self.feedback_data['false_negatives']))
        
        if total == 0:
            return {}
        
        correct = len(self.feedback_data['correct_predictions'])
        false_pos = len(self.feedback_data['false_positives'])
        false_neg = len(self.feedback_data['false_negatives'])
        
        accuracy = correct / total
        precision = correct / (correct + false_pos) if (correct + false_pos) > 0 else 0
        recall = correct / (correct + false_neg) if (correct + false_neg) > 0 else 0
        
        return {
            'accuracy': round(accuracy, 3),
            'precision': round(precision, 3),
            'recall': round(recall, 3),
            'total_feedback': total,
            'false_positives': false_pos,
            'false_negatives': false_neg
        }
    
    def should_retrain(self, error_threshold=0.15):
        """
        Determine if model should be retrained
        Based on error rate exceeding threshold
        """
        metrics = self.get_accuracy_metrics()
        if not metrics:
            return False
        
        error_rate = 1 - metrics['accuracy']
        return error_rate > error_threshold


class ContinuousLearningEngine:
    """
    Continuous learning system that improves models over time
    Automatically retrains when feedback indicates poor performance
    """
    
    def __init__(self, model_path, feedback_collector=None):
        """
        Args:
            model_path: Path to current model
            feedback_collector: FeedbackCollector instance
        """
        self.model_path = model_path
        self.feedback_collector = feedback_collector or FeedbackCollector()
        self.retraining_thread = None
        self.is_retraining = False
    
    def analyze_error_patterns(self):
        """
        Analyze patterns in misclassifications
        Identify common fraud indicators we're missing
        """
        patterns = {
            'false_positive_keywords': defaultdict(int),
            'false_negative_keywords': defaultdict(int),
            'common_false_positive_features': [],
            'common_false_negative_features': []
        }
        
        # Analyze false positives
        for entry in self.feedback_collector.feedback_data['false_positives']:
            job_data = entry.get('job_data', {})
            # Count common keywords that led to false positives
            description = job_data.get('description', '').lower()
            if description:
                # Extract keywords that might cause false positives
                for word in description.split():
                    if len(word) > 5:  # Only significant words
                        patterns['false_positive_keywords'][word] += 1
        
        # Analyze false negatives
        for entry in self.feedback_collector.feedback_data['false_negatives']:
            job_data = entry.get('job_data', {})
            description = job_data.get('description', '').lower()
            if description:
                for word in description.split():
                    if len(word) > 5:
                        patterns['false_negative_keywords'][word] += 1
        
        return patterns
    
    def adaptive_retrain(self):
        """
        Adaptively retrain model using feedback data
        Called when error threshold is exceeded
        """
        if self.is_retraining:
            print("⚠️  Retraining already in progress...")
            return
        
        self.is_retraining = True
        print("🔄 Starting adaptive retraining...")
        
        try:
            # Collect feedback-based training data
            training_data = []
            labels = []
            
            for entry in (self.feedback_collector.feedback_data['correct_predictions'] +
                         self.feedback_collector.feedback_data['false_positives'] +
                         self.feedback_collector.feedback_data['false_negatives']):
                
                job_data = entry.get('job_data', {})
                # Convert job data to feature vector
                features = self._extract_features(job_data)
                training_data.append(features)
                labels.append(entry['actual_label'])
            
            if len(training_data) < 10:
                print("⚠️  Insufficient feedback data for retraining (need >10)")
                self.is_retraining = False
                return
            
            # Retrain model
            X = np.array(training_data)
            y = np.array(labels)
            
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            new_model = LogisticRegression(max_iter=1000)
            new_model.fit(X_scaled, y)
            
            # Save updated model
            updated_data = {
                'model': new_model,
                'scaler': scaler,
                'train_date': datetime.now().isoformat(),
                'training_samples': len(training_data),
                'feedback_accuracy': self.feedback_collector.get_accuracy_metrics()
            }
            joblib.dump(updated_data, self.model_path)
            
            print("✅ Model retrained successfully!")
            print(f"   Trained on {len(training_data)} feedback samples")
            print(f"   Updated model saved to {self.model_path}")
            
        except Exception as e:
            print(f"❌ Retraining failed: {str(e)}")
        
        finally:
            self.is_retraining = False
    
    def adaptive_retrain_async(self):
        """
        Start retraining in background thread
        Doesn't block main prediction API
        """
        if self.is_retraining:
            print("⚠️  Retraining already in progress...")
            return
        
        self.retraining_thread = threading.Thread(target=self.adaptive_retrain)
        self.retraining_thread.daemon = True
        self.retraining_thread.start()
        print("🔄 Retraining started in background...")
    
    def _extract_features(self, job_data):
        """Extract features from job data for retraining"""
        features = []
        
        # Text length
        description = job_data.get('description', '')
        features.append(len(description))
        
        # Salary features
        salary = job_data.get('salary', 0)
        features.append(float(salary) if salary else 0)
        
        # Text features
        text_lower = description.lower()
        features.append(1 if 'guaranteed' in text_lower else 0)
        features.append(1 if 'whatsapp' in text_lower else 0)
        features.append(1 if 'unlimited' in text_lower else 0)
        
        # Contact features
        email = job_data.get('email', '')
        features.append(1 if '@gmail.com' in email or '@yahoo.com' in email else 0)
        
        # Location features
        location = job_data.get('location', '')
        features.append(1 if location.lower() in ['anywhere', 'remote', ''] else 0)
        
        # Ensure we have a fixed number of features
        while len(features) < 10:
            features.append(0)
        
        return features[:10]  # Return first 10 features
    
    def get_learning_status(self):
        """Get status of continuous learning system"""
        metrics = self.feedback_collector.get_accuracy_metrics()
        error_patterns = self.analyze_error_patterns()
        
        return {
            'accuracy_metrics': metrics,
            'is_retraining': self.is_retraining,
            'feedback_count': metrics.get('total_feedback', 0),
            'should_retrain': self.feedback_collector.should_retrain(),
            'top_false_positive_keywords': dict(sorted(
                error_patterns['false_positive_keywords'].items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]),
            'top_false_negative_keywords': dict(sorted(
                error_patterns['false_negative_keywords'].items(),
                key=lambda x: x[1],
                reverse=True
            )[:5])
        }


if __name__ == "__main__":
    print("Real-Time Learning Loop System")
    print("=" * 60)
    
    # Initialize feedback collector
    collector = FeedbackCollector()
    
    # Initialize learning engine
    engine = ContinuousLearningEngine("model.pkl", collector)
    
    # Record example feedback
    print("Example: Recording prediction feedback...")
    collector.record_feedback(
        job_id="job_123",
        prediction=0.75,
        actual_label=1,
        job_data={
            'title': 'Data entry',
            'description': 'Work from home, guaranteed $5000/week. Contact via WhatsApp',
            'salary': 5000,
            'email': 'test@gmail.com',
            'location': 'anywhere'
        }
    )
    
    # Get learning status
    status = engine.get_learning_status()
    print(f"\nLearning Status: {status}")
