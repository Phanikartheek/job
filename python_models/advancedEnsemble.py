"""
Advanced Neural Network Ensemble
Combines XGBoost with Deep Learning for superior fraud detection
"""

import numpy as np
import joblib
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class DeepEnsembleNetwork(nn.Module):
    """
    Neural network for ensemble learning
    Takes outputs from multiple models and learns optimal combination
    """
    
    def __init__(self, input_size=3, hidden_sizes=[64, 32], dropout_rate=0.3):
        """
        Args:
            input_size: Number of input features (3 model scores)
            hidden_sizes: List of hidden layer sizes
            dropout_rate: Dropout for regularization
        """
        super(DeepEnsembleNetwork, self).__init__()
        
        layers = []
        prev_size = input_size
        
        for hidden_size in hidden_sizes:
            layers.append(nn.Linear(prev_size, hidden_size))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout_rate))
            prev_size = hidden_size
        
        # Output layer (binary classification)
        layers.append(nn.Linear(prev_size, 1))
        layers.append(nn.Sigmoid())
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.network(x)


class AdvancedEnsembleModel:
    """
    Advanced ensemble combining XGBoost and Neural Networks
    Provides superior accuracy through complementary learning
    """
    
    def __init__(self, use_neural_net=True, use_xgboost=True, device="cpu"):
        """
        Args:
            use_neural_net: Include neural network component
            use_xgboost: Include XGBoost component
            device: "cpu" or "cuda"
        """
        self.use_neural_net = use_neural_net
        self.use_xgboost = use_xgboost
        self.device = device
        
        self.neural_net = None
        self.xgboost_model = None
        self.scaler = None
        self.neural_scaler = None
        self.optimizer = None
        self.criterion = None
    
    def train(self, model_scores, labels, epochs=50, batch_size=32, 
              xgb_params=None, save_path="advancedEnsemble.pkl"):
        """
        Train the advanced ensemble
        Args:
            model_scores: Array of shape (n_samples, 3) with [text, anomaly, metadata] scores
            labels: Binary labels (0/1)
            epochs: Training epochs for neural network
            batch_size: Batch size for neural network training
            xgb_params: Parameters for XGBoost
            save_path: Path to save model
        """
        
        print("Training Advanced Neural Network Ensemble...")
        
        # Scale features
        self.scaler = StandardScaler()
        scaled_scores = self.scaler.fit_transform(model_scores)
        
        if self.use_xgboost:
            print("Training XGBoost component...")
            default_params = {
                'n_estimators': 200,
                'max_depth': 4,
                'learning_rate': 0.1,
                'random_state': 42,
                'eval_metric': 'logloss'
            }
            if xgb_params:
                default_params.update(xgb_params)
            
            self.xgboost_model = XGBClassifier(**default_params)
            self.xgboost_model.fit(scaled_scores, labels)
            print("✅ XGBoost trained")
            
            # Get XGBoost predictions for neural net training
            xgb_preds = self.xgboost_model.predict_proba(scaled_scores)[:, 1]
        else:
            xgb_preds = np.zeros_like(labels, dtype=float)
        
        if self.use_neural_net:
            print("Training Neural Network component...")
            
            # Prepare data
            X_tensor = torch.FloatTensor(scaled_scores).to(self.device)
            y_tensor = torch.FloatTensor(labels).reshape(-1, 1).to(self.device)
            
            dataset = TensorDataset(X_tensor, y_tensor)
            dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
            
            # Initialize network
            self.neural_net = DeepEnsembleNetwork(
                input_size=model_scores.shape[1],
                hidden_sizes=[64, 32],
                dropout_rate=0.3
            ).to(self.device)
            
            # Training setup
            self.criterion = nn.BCELoss()
            self.optimizer = optim.Adam(self.neural_net.parameters(), lr=0.001)
            
            # Training loop
            best_loss = float('inf')
            patience = 10
            patience_counter = 0
            
            for epoch in range(epochs):
                total_loss = 0
                for batch_X, batch_y in dataloader:
                    self.optimizer.zero_grad()
                    outputs = self.neural_net(batch_X)
                    loss = self.criterion(outputs, batch_y)
                    loss.backward()
                    self.optimizer.step()
                    total_loss += loss.item()
                
                avg_loss = total_loss / len(dataloader)
                
                if avg_loss < best_loss:
                    best_loss = avg_loss
                    patience_counter = 0
                else:
                    patience_counter += 1
                
                if (epoch + 1) % 10 == 0:
                    print(f"  Epoch {epoch+1}/{epochs} - Loss: {avg_loss:.4f}")
                
                # Early stopping
                if patience_counter >= patience:
                    print(f"  Early stopping at epoch {epoch+1}")
                    break
            
            print("✅ Neural Network trained")
        
        # Save model
        self.save(save_path)
        print(f"✅ Advanced ensemble saved to {save_path}")
    
    def predict(self, model_scores):
        """
        Predict using ensemble
        Args:
            model_scores: Array of shape (1, 3) with [text, anomaly, metadata] scores
        Returns:
            Fraud probability (0-100)
        """
        if self.scaler is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Scale input
        scaled = self.scaler.transform(model_scores)
        
        predictions = []
        
        # XGBoost prediction
        if self.use_xgboost and self.xgboost_model:
            xgb_pred = self.xgboost_model.predict_proba(scaled)[0, 1]
            predictions.append(xgb_pred)
        
        # Neural network prediction
        if self.use_neural_net and self.neural_net:
            X_tensor = torch.FloatTensor(scaled).to(self.device)
            self.neural_net.eval()
            with torch.no_grad():
                nn_pred = self.neural_net(X_tensor).cpu().numpy()[0, 0]
            predictions.append(nn_pred)
        
        # Average predictions with weighted combination
        if len(predictions) == 2:
            # Equal weight to XGBoost and Neural Network
            final_pred = (predictions[0] * 0.5 + predictions[1] * 0.5)
        else:
            final_pred = predictions[0] if predictions else 0.5
        
        return {
            'fraud_score': int(final_pred * 100),
            'xgboost_score': int(predictions[0] * 100) if self.use_xgboost else None,
            'neural_score': int(predictions[1] * 100) if self.use_neural_net else None,
            'confidence': round(final_pred, 3)
        }
    
    def batch_predict(self, model_scores_array):
        """Predict for multiple samples"""
        if self.scaler is None:
            raise ValueError("Model not trained. Call train() first.")
        
        scaled = self.scaler.transform(model_scores_array)
        results = []
        
        for i in range(len(scaled)):
            score_reshaped = scaled[i:i+1]
            result = self.predict(score_reshaped)
            results.append(result)
        
        return results
    
    def save(self, save_path="advancedEnsemble.pkl"):
        """Save model to disk"""
        model_data = {
            'neural_net': self.neural_net.state_dict() if self.neural_net else None,
            'xgboost_model': self.xgboost_model,
            'scaler': self.scaler,
            'use_neural_net': self.use_neural_net,
            'use_xgboost': self.use_xgboost
        }
        joblib.dump(model_data, save_path)
    
    def load(self, save_path="advancedEnsemble.pkl"):
        """Load model from disk"""
        model_data = joblib.load(save_path)
        
        if model_data['neural_net'] is not None:
            self.neural_net = DeepEnsembleNetwork().to(self.device)
            self.neural_net.load_state_dict(model_data['neural_net'])
        
        self.xgboost_model = model_data['xgboost_model']
        self.scaler = model_data['scaler']
        self.use_neural_net = model_data['use_neural_net']
        self.use_xgboost = model_data['use_xgboost']


if __name__ == "__main__":
    print("Advanced Neural Network Ensemble")
    print("=" * 60)
    print("Combines XGBoost + Deep Learning for superior accuracy")
    print("\nExample usage:")
    print("ensemble = AdvancedEnsembleModel()")
    print("ensemble.train(model_scores, labels)")
    print("result = ensemble.predict([[80, 70, 75]])")
