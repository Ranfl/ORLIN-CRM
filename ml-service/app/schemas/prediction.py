from pydantic import BaseModel, Field


class RFMPredictionRequest(BaseModel):
    recency: float = Field(
        ...,
        ge=0
    )

    frequency: float = Field(
        ...,
        ge=0
    )

    monetary: float = Field(
        ...,
        ge=0
    )


class RFMPredictionResponse(BaseModel):
    recency: float
    frequency: float
    monetary: float

    cluster: int

    segment_code: str
    segment_name: str

    model_version: str