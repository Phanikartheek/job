"""
Enhanced Text Model using BERT/RoBERTa
Replaces TF-IDF with transformer-based embeddings for better context understanding
"""

import numpy as np
import joblib
from transformers import AutoTokenizer, AutoModel
import torch
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class BERTTextAnalyzer:
    """
    BERT/RoBERTa based text analyzer for job fraud detection
    Provides superior context understanding compared to TF-IDF
    """
    
    def __init__(self, model_name="roberta-base", device="cpu"):
        """
        Initialize BERT-based text analyzer
        Args:
            model_name: HuggingFace model (roberta-base, bert-base-uncased, etc.)
            device: "cpu" or "cuda"
        """
        self.model_name = model_name
        self.device = device
        self.tokenizer = None
        self.model = None
        self.classifier = None
        self.scaler = None
        self.fraud_keywords = {
            'guaranteed': 1.0, 'unlimited earnings': 1.0, 'no experience': 0.8,
            'whatsapp': 0.9, 'work from home': -0.5, 'upfront payment': 0.95,
            'bitcoin': 0.9, 'gift card': 0.9, 'data entry': 0.6, 'no interviews': 0.85
        }
        
    def load_model(self):
        """Load pre-trained BERT model"""
        print(f"Loading {self.model_name}...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModel.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()
        print(f"✅ {self.model_name} loaded successfully")
        
    def get_embeddings(self, texts, max_length=512):
        """
        Get BERT embeddings for texts
        Returns mean pooled embeddings (768-dim for roberta-base)
        """
        embeddings = []
        
        with torch.no_grad():
            for text in texts:
                # Truncate text to max_length
                text = str(text)[:2000]
                
                # Tokenize
                inputs = self.tokenizer(
                    text,
                    return_tensors="pt",
                    max_length=max_length,
                    truncation=True,
                    padding=True
                ).to(self.device)
                
                # Get embeddings
                outputs = self.model(**inputs)
                
                # Mean pooling over sequence dimension
                embedding = outputs.last_hidden_state.mean(dim=1).cpu().numpy()
                embeddings.append(embedding[0])
        
        return np.array(embeddings)
    
    def extract_keyword_features(self, text):
        """Extract fraud keyword features"""
        text_lower = str(text).lower()
        features = []
        
        for keyword, weight in self.fraud_keywords.items():
            if keyword in text_lower:
                features.append(weight)
            else:
                features.append(0.0)
        
        return np.array(features)
    
    def train(self, texts, labels, save_path="textModelBERT.pkl"):
        """
        Train classifier on BERT embeddings
        Args:
            texts: List of job descriptions
            labels: List of fraud labels (0/1)
            save_path: Path to save model
        """
        self.load_model()
        
        print("Extracting BERT embeddings...")
        bert_embeddings = self.get_embeddings(texts)
        
        print("Extracting keyword features...")
        keyword_features = np.array([self.extract_keyword_features(t) for t in texts])
        
        # Combine BERT embeddings with keyword features
        combined_features = np.hstack([bert_embeddings, keyword_features])
        
        # Scale features
        self.scaler = StandardScaler()
        scaled_features = self.scaler.fit_transform(combined_features)
        
        # Train classifier
        print("Training Logistic Regression on combined features...")
        self.classifier = LogisticRegression(max_iter=1000, random_state=42)
        self.classifier.fit(scaled_features, labels)
        
        # Save model
        joblib.dump({
            'classifier': self.classifier,
            'scaler': self.scaler,
            'model_name': self.model_name
        }, save_path)
        print(f"✅ Model saved to {save_path}")
        
    def predict(self, text):
        """
        Predict fraud probability for a single text
        Returns score 0-100
        """
        if not self.model or not self.classifier:
            raise ValueError("Model not loaded. Call load_model() or train() first.")
        
        # Get embeddings
        embedding = self.get_embeddings([text])[0]
        
        # Extract keyword features
        keywords = self.extract_keyword_features(text)
        
        # Combine features
        combined = np.hstack([embedding, keywords])
        
        # Scale and predict
        scaled = self.scaler.transform([combined])
        probability = self.classifier.predict_proba(scaled)[0][1]
        
        return int(probability * 100)
    
    def batch_predict(self, texts):
        """Predict fraud probability for multiple texts"""
        scores = []
        for text in texts:
            scores.append(self.predict(text))
        return scores


# Alternative: Use MeaningfulBERT for faster inference
class FastBERTTextAnalyzer(BERTTextAnalyzer):
    """
    Fast BERT implementation using distilBERT (40% smaller, 60% faster)
    Slightly lower accuracy but much faster
    """
    def __init__(self, device="cpu"):
        super().__init__(model_name="distilbert-base-uncased", device=device)


if __name__ == "__main__":
    # Example usage
    print("Enhanced BERT Text Analyzer for Job Fraud Detection")
    print("=" * 60)
    
    # Sample data
    sample_texts = [
        "Guaranteed $5000/week with no experience required. Contact via WhatsApp only.",
        "Senior Software Engineer at Google. $120,000/year. Mountain View, CA.",
        "Data entry work, $20/hour, work from home, flexible schedule.",
    ]
    sample_labels = [1, 0, 0]  # 1=fraud, 0=legit
    
    # Initialize and train
    analyzer = BERTTextAnalyzer()
    print("\n✅ BERT Text Analyzer initialized")
    print("Note: Training requires GPU and transformers library")
    print("Install with: pip install transformers torch")
