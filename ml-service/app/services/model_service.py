import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_DIR = BASE_DIR / "models"

SCALER_PATH = (
    MODEL_DIR /
    "orlin_rfm_scaler.pkl"
)

MODEL_PATH = (
    MODEL_DIR /
    "orlin_kmeans_model.pkl"
)

METADATA_PATH = (
    MODEL_DIR /
    "orlin_model_metadata.json"
)


class ModelService:

    def __init__(self) -> None:

        self._validate_artifacts()

        self.scaler: Any = joblib.load(
            SCALER_PATH
        )

        self.model: Any = joblib.load(
            MODEL_PATH
        )

        with open(
            METADATA_PATH,
            "r",
            encoding="utf-8"
        ) as file:

            metadata = json.load(file)

        if not isinstance(
            metadata,
            dict
        ):
            raise ValueError(
                "Format metadata model tidak valid."
            )

        self.metadata: dict[str, Any] = (
            metadata
        )


    def _validate_artifacts(
        self
    ) -> None:

        if not SCALER_PATH.exists():
            raise FileNotFoundError(
                f"Scaler tidak ditemukan: "
                f"{SCALER_PATH}"
            )

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model tidak ditemukan: "
                f"{MODEL_PATH}"
            )

        if not METADATA_PATH.exists():
            raise FileNotFoundError(
                f"Metadata tidak ditemukan: "
                f"{METADATA_PATH}"
            )


    def predict(
        self,
        recency: float,
        frequency: float,
        monetary: float
    ) -> dict[str, Any]:

        input_data = pd.DataFrame(
            [
                {
                    "Recency":
                        recency,

                    "Frequency":
                        frequency,

                    "Monetary":
                        monetary
                }
            ]
        )


        scaled_data = (
            self.scaler.transform(
                input_data
            )
        )


        cluster = int(
            self.model.predict(
                scaled_data
            )[0]
        )


        cluster_mapping = (
            self.metadata[
                "cluster_mapping"
            ]
        )


        mapping = (
            cluster_mapping[
                str(cluster)
            ]
        )


        return {
            "recency":
                recency,

            "frequency":
                frequency,

            "monetary":
                monetary,

            "cluster":
                cluster,

            "segment_code":
                mapping["code"],

            "segment_name":
                mapping["name"],

            "model_version":
                self.metadata[
                    "model_version"
                ]
        }


model_service = ModelService()