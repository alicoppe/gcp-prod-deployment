import gc
import logging
from contextlib import asynccontextmanager
from typing import Any
from uuid import UUID, uuid4

from fastapi import (
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi_async_sqlalchemy import SQLAlchemyMiddleware, db
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import WebSocketRateLimiter
from jwt import DecodeError, ExpiredSignatureError, MissingRequiredClaimError
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
from starlette.middleware.cors import CORSMiddleware

from app import crud
from app.api.deps import get_redis_client
from app.api.v1.api import api_router as api_router_v1
from app.core.config import ModeEnum, settings
from app.core.security import decode_token
from app.schemas.chat_schema import ChatRoleEnum
from app.schemas.common_schema import IChatResponse, IUserMessage
from app.utils.fastapi_globals import GlobalsMiddleware, g
from app.utils.llm_client import ChatClient
from app.utils.uuid6 import uuid7

# ci: trigger backend checks


def _torch_version_ok() -> bool:
    try:
        import torch
    except Exception:
        return False
    version_str = torch.__version__.split("+")[0]
    try:
        parts = [int(p) for p in version_str.split(".")]
    except ValueError:
        return True
    if len(parts) < 2:
        return True
    return (parts[0], parts[1]) >= (2, 1)


def _load_sentiment_model() -> Any | None:
    if not _torch_version_ok():
        logging.warning("Torch < 2.1 detected; sentiment model disabled.")
        return None
    try:
        from transformers import pipeline
    except Exception as exc:
        logging.warning("Transformers pipeline unavailable: %s", exc)
        return None
    try:
        return pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
        )
    except Exception as exc:
        logging.warning("Failed to load sentiment model: %s", exc)
        return None


async def user_id_identifier(request: Request):
    if request.scope["type"] == "http":
        # Retrieve the Authorization header from the request
        auth_header = request.headers.get("Authorization")

        if auth_header is not None:
            # Check that the header is in the correct format
            header_parts = auth_header.split()
            if len(header_parts) == 2 and header_parts[0].lower() == "bearer":
                token = header_parts[1]
                try:
                    payload = decode_token(token)
                except ExpiredSignatureError:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your token has expired. Please log in again.",
                    )
                except DecodeError:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Error when decoding the token. Please check your request.",
                    )
                except MissingRequiredClaimError:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="There is no required field in your token. Please contact the administrator.",
                    )

                user_id = payload["sub"]

                return user_id

    if request.scope["type"] == "websocket":
        return request.scope["path"]

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]

    client = request.client
    ip = getattr(client, "host", "0.0.0.0")
    return ip + ":" + request.scope["path"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    redis_client = await get_redis_client()
    FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache")
    await FastAPILimiter.init(redis_client, identifier=user_id_identifier)

    # Load a pre-trained sentiment analysis model as a dictionary to an easy cleanup
    models: dict[str, Any] = {"sentiment_model": _load_sentiment_model()}
    g.set_default("sentiment_model", models["sentiment_model"])
    g.set_default("chat_client", ChatClient())
    print("startup fastapi")
    yield
    # shutdown
    await FastAPICache.clear()
    await FastAPILimiter.close()
    models.clear()
    g.cleanup()
    gc.collect()


# Core Application Instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)


app.add_middleware(
    SQLAlchemyMiddleware,
    db_url=str(settings.ASYNC_DATABASE_URI),
    engine_args={
        "echo": False,
        "poolclass": NullPool
        if settings.MODE == ModeEnum.testing
        else AsyncAdaptedQueuePool
        # "pool_pre_ping": True,
        # "pool_size": settings.POOL_SIZE,
        # "max_overflow": 64,
    },
)
app.add_middleware(GlobalsMiddleware)

# Set all CORS origins enabled
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


class CustomException(Exception):
    http_code: int
    code: str
    message: str

    def __init__(
        self,
        http_code: int = 500,
        code: str | None = None,
        message: str = "This is an error message",
    ):
        self.http_code = http_code
        self.code = code if code else str(self.http_code)
        self.message = message


@app.get("/")
async def root():
    """
    An example "Hello world" FastAPI route.
    """
    # if oso.is_allowed(user, "read", message):
    return {"message": "Hello World"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.websocket("/chat/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: UUID):
    session_id = str(uuid4())
    key: str = f"user_id:{user_id}:session:{session_id}"
    await websocket.accept()
    redis_client = await get_redis_client()
    ws_ratelimit = WebSocketRateLimiter(times=200, hours=24)
    chat_client = g.chat_client
    current_session_id: UUID | None = None

    async with db():
        user = await crud.user.get_by_id_active(id=user_id)
        if user is not None:
            await redis_client.set(key, str(websocket))

    active_connection = await redis_client.get(key)
    if active_connection is None:
        await websocket.send_text(f"Error: User ID '{user_id}' not found or inactive.")
        await websocket.close()
    else:
        while True:
            try:
                # Receive and send back the client message
                data = await websocket.receive_json()
                await ws_ratelimit(websocket)
                user_message = IUserMessage.model_validate(data)
                user_message.user_id = user_id
                requested_session_id = user_message.session_id

                async with db():
                    if requested_session_id is not None:
                        session = await crud.chat_session.get(id=requested_session_id)
                        if session is None or session.user_id != user_id:
                            await websocket.send_json(
                                IChatResponse(
                                    sender="bot",
                                    message="Invalid or unauthorized chat session.",
                                    type="error",
                                    message_id="",
                                    id="",
                                ).dict()
                            )
                            continue
                        current_session_id = requested_session_id

                    if current_session_id is None:
                        session_title = user_message.message.strip()[:60]
                        session = await crud.chat_session.create_for_user(
                            user_id=user_id, title=session_title
                        )
                        current_session_id = session.id

                    await crud.chat_message.create_for_session(
                        session_id=current_session_id,
                        user_id=user_id,
                        role=ChatRoleEnum.user,
                        content=user_message.message,
                    )

                resp = IChatResponse(
                    sender="you",
                    message=user_message.message,
                    type="stream",
                    message_id=str(uuid7()),
                    id=str(uuid7()),
                    session_id=current_session_id,
                )
                await websocket.send_json(resp.dict())

                # # Construct a response
                start_resp = IChatResponse(
                    sender="bot",
                    message="",
                    type="start",
                    message_id="",
                    id="",
                    session_id=current_session_id,
                )
                await websocket.send_json(start_resp.dict())

                result_text = chat_client.generate(resp.message)
                async with db():
                    await crud.chat_message.create_for_session(
                        session_id=current_session_id,
                        user_id=None,
                        role=ChatRoleEnum.assistant,
                        content=result_text,
                    )

                end_resp = IChatResponse(
                    sender="bot",
                    message=result_text,
                    type="end",
                    message_id=str(uuid7()),
                    id=str(uuid7()),
                    session_id=current_session_id,
                )
                await websocket.send_json(end_resp.dict())
            except WebSocketDisconnect:
                logging.info("websocket disconnect")
                break
            except Exception as e:
                logging.error(e)
                resp = IChatResponse(
                    message_id="",
                    id="",
                    sender="bot",
                    message="Sorry, something went wrong. Your user limit of api usages has been reached or check your API key.",
                    type="error",
                )
                await websocket.send_json(resp.dict())

        # Remove the live connection from Redis
        await redis_client.delete(key)


# Add Routers
app.include_router(api_router_v1, prefix=settings.API_V1_STR)
