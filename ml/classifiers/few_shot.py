import json
import os
import math
import logging
from typing import List, Dict, Any, Optional, Union

try:
    import numpy as np
except ImportError:
    np = None

try:
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.linear_model import LogisticRegression
except ImportError:
    KNeighborsClassifier = None
    LogisticRegression = None

logger = logging.getLogger(__name__)

INITIAL_CLASSES = ["water", "wetland", "built_up"]


class FewShotClassifier:
    """
    FewShotClassifier for Earth Observation embeddings and few-shot classification tasks.
    
    Accepts a 'method' parameter:
      - 'logistic_regression' (preferred method): regularized linear classifier on top of frozen embeddings.
      - 'knn' (baseline): k-Nearest Neighbors classifier with configurable distance metric and k.
    
    Trained using a small set of labeled reference embeddings and predicts class labels and confidence
    for new, unseen embeddings. Includes state saving and loading for reproducibility and caching.
    """

    def __init__(
        self,
        method: str = "logistic_regression",
        initial_classes: Optional[List[str]] = None,
        n_neighbors: int = 3,
        metric: str = "cosine",
        C: float = 1.0,
        max_iter: int = 1000,
    ):
        self.method = method.lower().strip()
        if self.method in ["logistic", "logreg", "lr"]:
            self.method = "logistic_regression"
        elif self.method in ["k-nn", "nearest_neighbors"]:
            self.method = "knn"

        if self.method not in ["knn", "logistic_regression"]:
            raise ValueError(
                f"Unsupported method '{method}'. Allowed methods are 'logistic_regression' (preferred) and 'knn' (baseline)."
            )

        self.initial_classes = list(initial_classes) if initial_classes else list(INITIAL_CLASSES)
        self.classes: List[str] = list(self.initial_classes)
        
        # Hyperparameters
        self.n_neighbors = n_neighbors
        self.metric = metric
        self.C = C
        self.max_iter = max_iter

        # Internal model state
        self.is_fitted: bool = False
        self._sklearn_model: Any = None
        self._model_weights: Dict[str, Any] = {}
        self._reference_embeddings: List[List[float]] = []
        self._reference_labels: List[str] = []

    def fit(self, embeddings: List[List[float]], labels: List[str]) -> "FewShotClassifier":
        """
        Fits the few-shot classifier using labeled reference embeddings.

        Args:
            embeddings: List of N embedding vectors (e.g. 768-d or 512-d).
            labels: List of N class labels corresponding to each embedding.
        """
        if not embeddings or not labels:
            raise ValueError("Embeddings and labels cannot be empty for training.")
        if len(embeddings) != len(labels):
            raise ValueError(f"Embeddings length ({len(embeddings)}) must match labels length ({len(labels)}).")

        # Update unique classes from training set while keeping initial classes known
        unique_labels = sorted(list(set(labels)))
        self.classes = sorted(list(set(self.initial_classes + unique_labels)))

        self._reference_embeddings = [list(map(float, emb)) for emb in embeddings]
        self._reference_labels = list(labels)

        if self.method == "knn":
            self._fit_knn(embeddings, labels)
        elif self.method == "logistic_regression":
            self._fit_logistic_regression(embeddings, labels)

        self.is_fitted = True
        logger.info(f"FewShotClassifier fitted using method='{self.method}' on {len(embeddings)} samples across {len(unique_labels)} active classes.")
        return self

    def _fit_knn(self, embeddings: List[List[float]], labels: List[str]) -> None:
        n_samples = len(embeddings)
        effective_k = min(self.n_neighbors, n_samples)
        
        if KNeighborsClassifier is not None and np is not None:
            self._sklearn_model = KNeighborsClassifier(n_neighbors=effective_k, metric=self.metric)
            self._sklearn_model.fit(embeddings, labels)
        
        # Store native weights and parameters for standalone reproducibility
        self._model_weights = {
            "effective_k": effective_k,
            "metric": self.metric,
            "samples_count": n_samples,
        }

    def _fit_logistic_regression(self, embeddings: List[List[float]], labels: List[str]) -> None:
        n_samples = len(embeddings)
        dim = len(embeddings[0])
        unique_labels = sorted(list(set(labels)))

        if LogisticRegression is not None and np is not None:
            try:
                # Use balanced class weight for few-shot learning
                model = LogisticRegression(C=self.C, max_iter=self.max_iter, class_weight="balanced", random_state=42)
                model.fit(embeddings, labels)
                self._sklearn_model = model

                # Save model parameters/weights for standalone caching & portability
                coef_dict = {}
                intercept_dict = {}
                if len(model.classes_) == 2:
                    coef_dict[model.classes_[1]] = model.coef_[0].tolist()
                    intercept_dict[model.classes_[1]] = float(model.intercept_[0])
                    coef_dict[model.classes_[0]] = (-model.coef_[0]).tolist()
                    intercept_dict[model.classes_[0]] = float(-model.intercept_[0])
                else:
                    for idx, cls_name in enumerate(model.classes_):
                        coef_dict[cls_name] = model.coef_[idx].tolist()
                        intercept_dict[cls_name] = float(model.intercept_[idx])

                self._model_weights = {
                    "classes": list(model.classes_),
                    "coef": coef_dict,
                    "intercept": intercept_dict,
                    "dim": dim,
                }
                return
            except Exception as e:
                logger.warning(f"scikit-learn LogisticRegression fitting warning: {e}. Falling back to internal gradient descent.")

        # Standalone Multiclass Logistic Regression (One-vs-Rest) with L2 Regularization
        # Ensures 100% functionality even in environments without scikit-learn
        weights: Dict[str, List[float]] = {}
        biases: Dict[str, float] = {}
        lr = 0.05
        epochs = 200
        l2_reg = 1.0 / max(self.C, 1e-4)

        for target_cls in unique_labels:
            w = [0.0] * dim
            b = 0.0
            y = [1.0 if lbl == target_cls else 0.0 for lbl in labels]
            pos_count = sum(y)
            neg_count = len(y) - pos_count
            pos_weight = (len(y) / (2.0 * max(pos_count, 1)))
            neg_weight = (len(y) / (2.0 * max(neg_count, 1)))

            for _ in range(epochs):
                grad_w = [l2_reg * wi for wi in w]
                grad_b = 0.0

                for x_i, y_i in zip(embeddings, y):
                    # Linear logit
                    z = sum(wj * xj for wj, xj in zip(w, x_i)) + b
                    # Sigmoid with numerical stability
                    if z >= 0:
                        prob = 1.0 / (1.0 + math.exp(-z))
                    else:
                        prob = math.exp(z) / (1.0 + math.exp(z))

                    sample_weight = pos_weight if y_i == 1.0 else neg_weight
                    error = (prob - y_i) * sample_weight

                    for j in range(dim):
                        grad_w[j] += error * x_i[j]
                    grad_b += error

                for j in range(dim):
                    w[j] -= lr * (grad_w[j] / n_samples)
                b -= lr * (grad_b / n_samples)

            weights[target_cls] = w
            biases[target_cls] = b

        self._model_weights = {
            "classes": unique_labels,
            "coef": weights,
            "intercept": biases,
            "dim": dim,
        }

    def predict(self, embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        """
        Predicts class labels and confidences for unseen embeddings.

        Args:
            embeddings: List of query vectors.

        Returns:
            List of dictionaries: [{"class": str, "confidence": float, "probabilities": Dict[str, float]}]
        """
        if not self.is_fitted:
            raise RuntimeError("FewShotClassifier is not fitted. Call fit() or load() before predicting.")
        if not embeddings:
            return []

        if self.method == "knn":
            return self._predict_knn(embeddings)
        else:
            return self._predict_logistic_regression(embeddings)

    def predict_classes(self, embeddings: List[List[float]]) -> List[str]:
        """Convenience method returning only the predicted class names."""
        results = self.predict(embeddings)
        return [r["class"] for r in results]

    def _predict_knn(self, embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        if self._sklearn_model is not None and np is not None:
            try:
                preds = self._sklearn_model.predict(embeddings)
                probs = self._sklearn_model.predict_proba(embeddings)
                classes = list(self._sklearn_model.classes_)

                results = []
                for pred, prob_arr in zip(preds, probs):
                    prob_dict = {cls_name: float(p) for cls_name, p in zip(classes, prob_arr)}
                    confidence = float(np.max(prob_arr))
                    results.append({
                        "class": str(pred),
                        "confidence": confidence,
                        "probabilities": prob_dict,
                    })
                return results
            except Exception as e:
                logger.warning(f"scikit-learn predict failed: {e}. Using native k-NN fallback.")

        # Standalone k-NN prediction
        k = self._model_weights.get("effective_k", min(self.n_neighbors, len(self._reference_embeddings)))
        results = []

        for emb in embeddings:
            distances = []
            for ref_emb, ref_lbl in zip(self._reference_embeddings, self._reference_labels):
                if self.metric == "cosine":
                    # Cosine distance = 1 - cosine similarity
                    dot = sum(a * b for a, b in zip(emb, ref_emb))
                    norm_a = math.sqrt(sum(a * a for a in emb))
                    norm_b = math.sqrt(sum(b * b for b in ref_emb))
                    sim = dot / (max(norm_a * norm_b, 1e-9))
                    dist = 1.0 - sim
                else:
                    # Euclidean distance
                    dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(emb, ref_emb)))
                distances.append((dist, ref_lbl))

            distances.sort(key=lambda x: x[0])
            top_k = distances[:k]

            # Vote count
            vote_counts: Dict[str, float] = {}
            for dist, lbl in top_k:
                # Inverse distance weighting
                weight = 1.0 / (dist + 1e-5)
                vote_counts[lbl] = vote_counts.get(lbl, 0.0) + weight

            total_weight = sum(vote_counts.values()) or 1.0
            probabilities = {lbl: w / total_weight for lbl, w in vote_counts.items()}
            best_class = max(probabilities.keys(), key=lambda l: probabilities[l])
            confidence = probabilities[best_class]

            results.append({
                "class": best_class,
                "confidence": round(confidence, 4),
                "probabilities": {k: round(v, 4) for k, v in probabilities.items()},
            })

        return results

    def _predict_logistic_regression(self, embeddings: List[List[float]]) -> List[Dict[str, Any]]:
        if self._sklearn_model is not None and np is not None:
            try:
                preds = self._sklearn_model.predict(embeddings)
                probs = self._sklearn_model.predict_proba(embeddings)
                classes = list(self._sklearn_model.classes_)

                results = []
                for pred, prob_arr in zip(preds, probs):
                    prob_dict = {cls_name: float(p) for cls_name, p in zip(classes, prob_arr)}
                    confidence = float(np.max(prob_arr))
                    results.append({
                        "class": str(pred),
                        "confidence": confidence,
                        "probabilities": prob_dict,
                    })
                return results
            except Exception as e:
                logger.warning(f"scikit-learn predict failed: {e}. Using native Logistic Regression weights.")

        # Native Logistic Regression prediction using stored weights/biases
        coefs: Dict[str, List[float]] = self._model_weights.get("coef", {})
        intercepts: Dict[str, float] = self._model_weights.get("intercept", {})
        active_classes: List[str] = self._model_weights.get("classes", list(coefs.keys()))

        if not active_classes:
            return [{"class": self.initial_classes[0], "confidence": 1.0, "probabilities": {self.initial_classes[0]: 1.0}} for _ in embeddings]

        results = []
        for emb in embeddings:
            raw_scores = {}
            for cls_name in active_classes:
                w = coefs.get(cls_name, [0.0] * len(emb))
                b = intercepts.get(cls_name, 0.0)
                score = sum(wj * xj for wj, xj in zip(w, emb)) + b
                raw_scores[cls_name] = score

            # Softmax over class logits
            max_score = max(raw_scores.values()) if raw_scores else 0.0
            exp_scores = {cls_name: math.exp(score - max_score) for cls_name, score in raw_scores.items()}
            sum_exp = sum(exp_scores.values()) or 1.0
            probabilities = {cls_name: exp_s / sum_exp for cls_name, exp_s in exp_scores.items()}

            best_class = max(probabilities.keys(), key=lambda l: probabilities[l])
            confidence = probabilities[best_class]

            results.append({
                "class": best_class,
                "confidence": round(confidence, 4),
                "probabilities": {k: round(v, 4) for k, v in probabilities.items()},
            })

        return results

    def get_state(self) -> Dict[str, Any]:
        """
        Serializes the model state, weights, hyperparameters, and reference data into a dictionary.
        """
        return {
            "method": self.method,
            "initial_classes": self.initial_classes,
            "classes": self.classes,
            "n_neighbors": self.n_neighbors,
            "metric": self.metric,
            "C": self.C,
            "max_iter": self.max_iter,
            "is_fitted": self.is_fitted,
            "model_weights": self._model_weights,
            "reference_embeddings": self._reference_embeddings,
            "reference_labels": self._reference_labels,
        }

    def set_state(self, state: Dict[str, Any]) -> "FewShotClassifier":
        """
        Restores the model from a serialized state dictionary.
        """
        self.method = state.get("method", "logistic_regression")
        self.initial_classes = state.get("initial_classes", list(INITIAL_CLASSES))
        self.classes = state.get("classes", list(self.initial_classes))
        self.n_neighbors = state.get("n_neighbors", 3)
        self.metric = state.get("metric", "cosine")
        self.C = state.get("C", 1.0)
        self.max_iter = state.get("max_iter", 1000)
        self.is_fitted = state.get("is_fitted", False)
        self._model_weights = state.get("model_weights", {})
        self._reference_embeddings = state.get("reference_embeddings", [])
        self._reference_labels = state.get("reference_labels", [])

        # Re-instantiate scikit-learn model if possible
        if self.is_fitted and self._reference_embeddings and self._reference_labels:
            try:
                if self.method == "knn" and KNeighborsClassifier is not None and np is not None:
                    k = min(self.n_neighbors, len(self._reference_embeddings))
                    self._sklearn_model = KNeighborsClassifier(n_neighbors=k, metric=self.metric)
                    self._sklearn_model.fit(self._reference_embeddings, self._reference_labels)
                elif self.method == "logistic_regression" and LogisticRegression is not None and np is not None:
                    model = LogisticRegression(C=self.C, max_iter=self.max_iter, class_weight="balanced", random_state=42)
                    model.fit(self._reference_embeddings, self._reference_labels)
                    self._sklearn_model = model
            except Exception as e:
                logger.warning(f"Could not re-fit scikit-learn model on load: {e}. Fallback weights will be used.")

        return self

    def save(self, filepath: str) -> None:
        """
        Saves the classifier's state (trained weights, parameters, metadata) to a JSON file for caching & reproducibility.
        """
        state = self.get_state()
        os.makedirs(os.path.dirname(os.path.abspath(filepath)) or ".", exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        logger.info(f"FewShotClassifier saved successfully to '{filepath}'.")

    def save_state(self, filepath: str) -> None:
        """Alias for save()."""
        self.save(filepath)

    @classmethod
    def load(cls, filepath: str) -> "FewShotClassifier":
        """
        Loads and reconstructs a FewShotClassifier from a saved state file.
        """
        with open(filepath, "r", encoding="utf-8") as f:
            state = json.load(f)
        
        instance = cls(
            method=state.get("method", "logistic_regression"),
            initial_classes=state.get("initial_classes", INITIAL_CLASSES),
            n_neighbors=state.get("n_neighbors", 3),
            metric=state.get("metric", "cosine"),
            C=state.get("C", 1.0),
            max_iter=state.get("max_iter", 1000),
        )
        instance.set_state(state)
        logger.info(f"FewShotClassifier loaded successfully from '{filepath}'.")
        return instance

    @classmethod
    def from_state(cls, filepath: str) -> "FewShotClassifier":
        """Alias for load()."""
        return cls.load(filepath)
