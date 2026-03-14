"""
Multilingual Text Analyzer
Supports English, Hindi, Telugu, and Tamil for job fraud detection
Uses multilingual BERT (mBERT)
"""

import numpy as np
import joblib
from transformers import AutoTokenizer, AutoModel
import torch
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class MultilingualFraudDetector:
    """
    Multilingual fraud detector supporting multiple languages
    Uses mBERT (multilingual BERT) for cross-lingual understanding
    """
    
    # Fraud keywords in different languages
    FRAUD_KEYWORDS = {
        'english': {
            'guaranteed': 1.0, 'unlimited': 0.95, 'whatsapp': 0.9,
            'upfront payment': 0.95, 'no experience': 0.8, 'work from home': -0.5,
            'bitcoin': 0.9, 'gift card': 0.9, 'no interviews': 0.85
        },
        'hindi': {
            'गारंटीड': 1.0, 'असीमित': 0.95, 'व्हाट्सएप': 0.9,
            'तुरंत भुगतान': 0.95, 'कोई अनुभव नहीं': 0.8, 'घर से काम': -0.5,
            'बिटकॉइन': 0.9, 'तरीका': 0.7, 'साक्षात्कार नहीं': 0.85
        },
        'telugu': {
            'గ్యారంటీ': 1.0, 'అపరిమితమైన': 0.95, 'వాట్సాప్': 0.9,
            'ముందస్తు చెల్లింపు': 0.95, 'అనుభవం లేనిది': 0.8, 'ఇక్కడ నుండి పని': -0.5,
            'బిట్‌కాయిన్': 0.9, 'సర్టిఫికేట్': 0.6, 'ఇంటర్వ్యూ లేదు': 0.85
        },
        'tamil': {
            'உறுதி': 1.0, 'வரம்பற்ற': 0.95, 'வாட்ஸ்அப்': 0.9,
            'முன்பணம்': 0.95, 'அனுபவம் இல்லை': 0.8, 'வீட்டிலிருந்து வேலை': -0.5,
            'பிட்கોயின்': 0.9, 'சான்றிதழ்': 0.6, 'साक्षात्कार இல்லை': 0.85
        }
    }
    
    def __init__(self, device="cpu"):
        """Initialize multilingual fraud detector"""
        self.device = device
        self.tokenizer = None
        self.model = None
        self.classifier = None
        self.scaler = None
        self.language_detector = None
        
    def load_model(self):
        """Load multilingual BERT model"""
        model_name = "bert-base-multilingual-uncased"
        print(f"Loading {model_name}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        print(f"✅ Multilingual BERT loaded successfully")
        
    def detect_language(self, text):
        """
        Detect language of input text
        Returns: 'english', 'hindi', 'telugu', 'tamil'
        """
        text_lower = str(text).lower()
        
        # Check for telugu characters
        if any('\u0c00' <= char <= '\u0c7f' for char in text):
            return 'telugu'
        
        # Check for hindi characters
        if any('\u0900' <= char <= '\u097f' for char in text):
            return 'hindi'
        
        # Check for tamil characters
        if any('\u0b80' <= char <= '\u0bff' for char in text):
            return 'tamil'
        
        return 'english'
    
    def get_multilingual_embeddings(self, texts):
        """Get mBERT embeddings for texts in any language"""
        embeddings = []
        
        with torch.no_grad():
            for text in texts:
                text = str(text)[:2000]
                
                inputs = self.tokenizer(
                    text,
                    return_tensors="pt",
                    max_length=512,
                    truncation=True,
                    padding=True
                ).to(self.device)
                
                outputs = self.model(**inputs)
                embedding = outputs.last_hidden_state.mean(dim=1).cpu().numpy()
                embeddings.append(embedding[0])
        
        return np.array(embeddings)
    
    def extract_multilingual_keywords(self, text):
        """Extract keywords in detected language"""
        detected_lang = self.detect_language(text)
        text_lower = str(text).lower()
        
        keywords_dict = self.FRAUD_KEYWORDS.get(detected_lang, self.FRAUD_KEYWORDS['english'])
        features = []
        
        for keyword, weight in keywords_dict.items():
            if keyword.lower() in text_lower:
                features.append(weight)
            else:
                features.append(0.0)
        
        return np.array(features)
    
    def train(self, texts, labels, languages=None, save_path="textModelMultilingual.pkl"):
        """
        Train multilingual fraud detector
        Args:
            texts: List of job descriptions (any language)
            labels: Fraud labels (0/1)
            languages: Optional list of languages for each text
            save_path: Path to save model
        """
        self.load_model()
        
        print("Extracting multilingual BERT embeddings...")
        embeddings = self.get_multilingual_embeddings(texts)
        
        print("Extracting multilingual keyword features...")
        keyword_features = np.array([self.extract_multilingual_keywords(t) for t in texts])
        
        # Add language flags as features (one-hot encoded)
        if languages is None:
            languages = [self.detect_language(t) for t in texts]
        
        lang_map = {'english': [1,0,0,0], 'hindi': [0,1,0,0], 'telugu': [0,0,1,0], 'tamil': [0,0,0,1]}
        lang_features = np.array([lang_map.get(l, lang_map['english']) for l in languages])
        
        # Combine all features
        combined_features = np.hstack([embeddings, keyword_features, lang_features])
        
        # Scale and train
        self.scaler = StandardScaler()
        scaled_features = self.scaler.fit_transform(combined_features)
        
        print("Training multilingual classifier...")
        self.classifier = LogisticRegression(max_iter=1000, random_state=42)
        self.classifier.fit(scaled_features, labels)
        
        # Save model
        joblib.dump({
            'classifier': self.classifier,
            'scaler': self.scaler,
            'language_keywords': self.FRAUD_KEYWORDS
        }, save_path)
        print(f"✅ Multilingual model saved to {save_path}")
    
    def predict(self, text):
        """Predict fraud probability for text in any language"""
        if not self.model or not self.classifier:
            raise ValueError("Model not loaded. Call load_model() or train() first.")
        
        embedding = self.get_multilingual_embeddings([text])[0]
        keywords = self.extract_multilingual_keywords(text)
        
        detected_lang = self.detect_language(text)
        lang_map = {'english': [1,0,0,0], 'hindi': [0,1,0,0], 'telugu': [0,0,1,0], 'tamil': [0,0,0,1]}
        lang_feature = np.array(lang_map.get(detected_lang, lang_map['english']))
        
        combined = np.hstack([embedding, keywords, lang_feature])
        scaled = self.scaler.transform([combined])
        probability = self.classifier.predict_proba(scaled)[0][1]
        
        return {
            'fraud_score': int(probability * 100),
            'language': detected_lang,
            'confidence': round(probability, 3)
        }
    
    def batch_predict(self, texts):
        """Predict for multiple texts in different languages"""
        results = []
        for text in texts:
            results.append(self.predict(text))
        return results


if __name__ == "__main__":
    print("Multilingual Fraud Detector")
    print("=" * 60)
    print("Supports: English, Hindi, Telugu, Tamil")
    print("\nExample usage:")
    print("detector = MultilingualFraudDetector()")
    print("result = detector.predict('job description text')")
    print("\nNote: Requires transformers library")
