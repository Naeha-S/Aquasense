import logging
from typing import List, Dict, Any
from .base import FewShotClassifier

try:
    from sklearn.linear_model import LogisticRegression
    import numpy as np
except ImportError:
    LogisticRegression = None
    np = None

logger = logging.getLogger(__name__)

class LogisticRegressionFewShotClassifier(FewShotClassifier):
    """
    Few-shot classifier utilizing scikit-learn's Logistic Regression.
    Configurable with C (inverse of regularization strength) to tune the
    penalty applied during fitting, which is crucial for small sample sizes.
    """
    
    def __init__(self, C: float = 1.0, max_iter: int = 1000):
        """
        Initializes the Logistic Regression classifier.
        
        Args:
            C (float): Inverse of regularization strength; smaller values specify stronger regularization.
            max_iter (int): Maximum number of iterations taken for the solvers to converge.
        """
        self.C = C
        self.max_iter = max_iter
        self.model = None

    def fit(self, embeddings: List[List[float]], labels: List[str]) -> None:
        """
        Fits the logistic regression model on the provided reference embeddings.
        """
        if LogisticRegression is None:
            raise RuntimeError("MODEL_UNAVAILABLE: scikit-learn is required but not installed.")
            
        n_samples = len(embeddings)
        if n_samples == 0:
            raise ValueError("Cannot fit classifier with 0 samples.")
            
        self.model = LogisticRegression(C=self.C, max_iter=self.max_iter, class_weight='balanced')
        self.model.fit(embeddings, labels)
        logger.info(f"Logistic Regression Classifier fitted with C={self.C} on {n_samples} samples.")

    def predict(self, embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Classifies target embeddings, returning both the predicted class and a confidence score
        based on the logistic probability.
        """
        if self.model is None:
            raise RuntimeError("Classifier must be fitted via fit() before calling predict().")
            
        predictions = self.model.predict(embeddings)
        results = []
        
        try:
            probabilities = self.model.predict_proba(embeddings)
            for pred, prob_array in zip(predictions, probabilities):
                confidence = float(np.max(prob_array))
                results.append({
                    "class": pred,
                    "confidence": confidence
                })
        except Exception as e:
            logger.warning(f"Failed to extract confidence probabilities: {e}. Defaulting to 1.0.")
            for pred in predictions:
                results.append({
                    "class": pred,
                    "confidence": 1.0
                })
                
        return results
