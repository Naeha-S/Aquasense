from abc import ABC, abstractmethod
from typing import List, Dict, Any

class FewShotClassifier(ABC):
    """
    Abstract base class for few-shot classifiers.
    These classifiers sit on top of the dense embeddings generated 
    by the Earth Observation Foundation Model (e.g., Prithvi).
    """

    @abstractmethod
    def fit(self, embeddings: List[List[float]], labels: List[str]) -> None:
        """
        Fits the classifier using a small number of reference embeddings and their labels.
        
        Args:
            embeddings: A list of dense vectors (e.g., 768-d).
            labels: A list of class labels corresponding to each embedding.
        """
        pass

    @abstractmethod
    def predict(self, embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Predicts classes for a batch of unlabelled embeddings.
        
        Args:
            embeddings: A list of dense vectors to classify.
            
        Returns:
            A list of dictionaries containing the predicted 'class' and its 'confidence'.
        """
        pass
