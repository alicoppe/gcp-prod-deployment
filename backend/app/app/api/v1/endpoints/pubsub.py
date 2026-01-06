from typing import Any
from fastapi import APIRouter, Request, HTTPException
from app.schemas.response_schema import create_response
from app.utils.fastapi_globals import g

router = APIRouter()

@router.post("/pubsub/push")
async def handle_pubsub_push(request: Request) -> Any:
    """
    GCP Pub/Sub push endpoint.
    Expected JSON body: {"message": {"data": base64-encoded-string}}
    Data should decode to JSON with keys like {"event": "scheduled", "prompt": "..."}.
    """
    envelope = await request.json()
    if not envelope or "message" not in envelope:
        raise HTTPException(status_code=400, detail="Invalid Pub/Sub message format")

    msg = envelope["message"]
    data_b64 = msg.get("data")
    if data_b64:
        import base64
        import json

        decoded = base64.b64decode(data_b64).decode("utf-8")
        try:
            payload = json.loads(decoded)
        except json.JSONDecodeError:
            payload = {"raw": decoded}
    else:
        payload = {}

    prompt = payload.get("prompt", "Batman is awesome because")
    result = g.sentiment_model(prompt)
    return create_response(message="Pub/Sub task processed", data={"result": result})
