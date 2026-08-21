import logging
from typing import List, Dict, Any
from .base import FewShotClassifier

try:
    from sklearn.neighbors import KNeighborsClassifier
    import numpy as np
except ImportError:
    KNeighborsClassifier = None
    np = None

logger = logging.getLogger(__name__)

class KNNFewShotClassifier(FewShotClassifier):
    """
    Few-shot classifier utilizing scikit-learn's k-Nearest Neighbors.
    Configurable with different distance metrics (e.g., 'euclidean', 'cosine')
    and values for 'k'.
    """
    
    def __init__(self, n_neighbors: int = 3, metric: str = 'cosine'):
        """
        Initializes the k-NN classifier.
        
        Args:
            n_neighbors (int): Number of neighbors to use for classification (k).
            metric (str): The distance metric to use ('cosine', 'euclidean', 'manhattan').
                          'cosine' is often preferred for high-dimensional embeddings.
        """
        self.n_neighbors = n_neighbors
        self.metric = metric
        self.model = None

    def fit(self, embeddings: List[List[float]], labels: List[str]) -> None:
        """
        Fits the k-NN model on the provided reference embeddings.
        Automatically adjusts k if the number of reference samples is too small.
        """
        if KNeighborsClassifier is None:
            raise RuntimeError("MODEL_UNAVAILABLE: scikit-learn is required but not installed.")
            
        n_samples = len(embeddings)
        if n_samples == 0:
            raise ValueError("Cannot fit classifier with 0 samples.")
            
        # Ensure k does not exceed the number of available few-shot reference samples
        effective_k = min(self.n_neighbors, n_samples)
        
        if effective_k != self.n_neighbors:
            logger.warning(
                f"Requested k={self.n_neighbors} but only provided {n_samples} samples. "
                f"Adjusting k to {effective_k}."
            )
            
        self.model = KNeighborsClassifier(n_neighbors=effective_k, metric=self.metric)
        self.model.fit(embeddings, labels)
        logger.info(f"k-NN Classifier fitted with k={effective_k} and metric='{self.metric}'")

    def predict(self, embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Classifies target embeddings, returning both the predicted class and a confidence score
        based on the proportion of neighbors agreeing on the prediction.
        """
        if self.model is None:
            raise RuntimeError("Classifier must be fitted via fit() before calling predict().")
            
        predictions = self.model.predict(embeddings)
        results = []
        
        try:
            # Predict probabilities to calculate confidence scores
            probabilities = self.model.predict_proba(embeddings)
            
            for pred, prob_array in zip(predictions, probabilities):
                # The confidence is the probability of the predicted class
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
