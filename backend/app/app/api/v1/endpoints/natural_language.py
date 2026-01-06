from datetime import datetime, timedelta
from app.api import deps
from app.models.user_model import User
from fastapi import APIRouter, Depends, HTTPException
from app.utils.fastapi_globals import g
from app.schemas.response_schema import IPostResponseBase, create_response
from fastapi_limiter.depends import RateLimiter

router = APIRouter()


@router.post(
    "/sentiment_analysis",
    dependencies=[
        Depends(RateLimiter(times=10, hours=24)),
    ],
)
async def sentiment_analysis_prediction(
    prompt: str = "Fastapi is awesome",
    current_user: User = Depends(deps.get_current_user()),
) -> IPostResponseBase:
    """
    Gets a sentimental analysis predition using a NLP model from transformers libray
    """
    sentiment_model = g.sentiment_model
    prediction = sentiment_model(prompt)
    return create_response(message="Prediction got succesfully", data=prediction)


@router.post(
    "/text_generation_prediction_pubsub_stub",
    dependencies=[
        Depends(RateLimiter(times=10, hours=24)),
    ],
)
async def text_generation_prediction_pubsub_stub(
    prompt: str = "Batman is awesome because",
) -> IPostResponseBase:
    """
    Placeholder endpoint: in production, Cloud Scheduler -> Pub/Sub -> Cloud Run
    should call a handler that runs the same logic as the old Celery task.
    For now, this returns the synchronous prediction to mimic behavior.
    """
    result = g.sentiment_model(prompt)
    return create_response(
        message="Prediction got succesfully",
        data={"task_id": "pubsub-stub", "result": result},
    )
