from abc import ABC, abstractmethod
from typing import List, Any

class EOEncoder(ABC):
    """
    Abstract base class for Earth Observation Foundation Models.
    Defines the contract for loading model weights and generating
    dense embeddings from multi-spectral image patches.
    """

    @abstractmethod
    def load(self) -> None:
        """
        Loads the foundation model weights into memory/VRAM.
        Should raise a RuntimeError if the required environment (e.g., CUDA) is missing.
        """
        pass

    @abstractmethod
    def encode_batch(self, patches: List[Any]) -> List[List[float]]:
        """
        Takes a batch of preprocessed EO patches and returns their embeddings.
        
        Args:
            patches: A list of image tensors or data arrays representing the scene.
            
        Returns:
            A list of dense embedding vectors.
        """
        pass
