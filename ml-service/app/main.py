from fastapi import (
    FastAPI,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware

from app.schemas.prediction import (
    RFMPredictionRequest,
    RFMPredictionResponse
)

from app.schemas.analysis import (
    RFMAnalysisRequest,
    RFMAnalysisResponse
)

from app.services.model_service import (
    model_service
)


from app.services.rfm_service import (
    rfm_service
)

app = FastAPI(
    title="ORLIN CRM ML Service",
    version="1.0.0",
    description=(
        "Machine Learning Service "
        "for ORLIN CRM RFM segmentation"
    )
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():

    return {
        "success": True,
        "application":
            "ORLIN CRM ML Service",

        "message":
            "ML Service is running"
    }


@app.get("/health")
def health():

    return {
        "success": True,

        "status": "healthy",

        "model":
            model_service.metadata[
                "model_name"
            ],

        "model_version":
            model_service.metadata[
                "model_version"
            ],

        "k":
            model_service.metadata[
                "k"
            ],

        "preprocessing":
            model_service.metadata[
                "preprocessing"
            ]
    }


@app.post(
    "/predict",
    response_model=
        RFMPredictionResponse
)
def predict(
    payload:
        RFMPredictionRequest
):

    return model_service.predict(
        recency=
            payload.recency,

        frequency=
            payload.frequency,

        monetary=
            payload.monetary
    )


@app.post(
    "/analyze-rfm",
    response_model=
        RFMAnalysisResponse
)
def analyze_rfm(
    payload:
        RFMAnalysisRequest
):

    try:

        transactions = [
            transaction.model_dump()
            for transaction
            in payload.transactions
        ]


        return rfm_service.analyze(
            transactions=
                transactions,

            reference_date=
                payload.reference_date
        )


    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )