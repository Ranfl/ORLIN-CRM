from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class TransactionRecord(BaseModel):
    transaction_id: int = Field(..., ge=1)
    customer_id: int = Field(..., ge=1)

    transaction_date: date

    total_amount: float = Field(
        ...,
        ge=0
    )


class RFMAnalysisRequest(BaseModel):
    reference_date: date

    transactions: list[
        TransactionRecord
    ]


class CustomerRFMResult(BaseModel):
    customer_id: int

    last_transaction_date: date

    recency: int
    frequency: int
    monetary: float

    cluster: int

    segment_code: str
    segment_name: str

    silhouette_value: Optional[float] = None


class ModelMetrics(BaseModel):
    silhouette_score: Optional[float] = None

    davies_bouldin_index: Optional[float] = None

    calinski_harabasz_score: Optional[float] = None


class RFMAnalysisResponse(BaseModel):
    reference_date: date

    total_customers: int
    total_transactions: int

    model_version: str

    metrics: ModelMetrics

    results: list[
        CustomerRFMResult
    ]