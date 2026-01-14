from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi_pagination import Params
from sqlmodel import select

from app import crud
from app.api import deps
from app.deps import chat_deps
from app.models.chat_message_model import ChatMessage
from app.models.chat_session_model import ChatSession
from app.models.user_model import User
from app.schemas.chat_schema import (
    ChatRoleEnum,
    IChatMessageCreate,
    IChatMessageRead,
    IChatSessionCreate,
    IChatSessionRead,
    IChatSessionUpdate,
)
from app.schemas.response_schema import (
    IGetResponseBase,
    IGetResponsePaginated,
    IPostResponseBase,
    IPutResponseBase,
    create_response,
)
from app.utils.fastapi_globals import g

router = APIRouter()


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    payload: IChatSessionCreate = Body(default=IChatSessionCreate()),
    current_user: User = Depends(deps.get_current_user()),
) -> IPostResponseBase[IChatSessionRead]:
    session = await crud.chat_session.create_for_user(
        user_id=current_user.id, title=payload.title
    )
    return create_response(data=session)


@router.get("/sessions")
async def list_chat_sessions(
    params: Params = Depends(),
    current_user: User = Depends(deps.get_current_user()),
) -> IGetResponsePaginated[IChatSessionRead]:
    query = (
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    sessions = await crud.chat_session.get_multi_paginated(
        params=params, query=query
    )
    return create_response(data=sessions)


@router.get("/sessions/{session_id}")
async def get_chat_session(
    session: ChatSession = Depends(chat_deps.get_chat_session_by_id),
) -> IGetResponseBase[IChatSessionRead]:
    return create_response(data=session)


@router.put("/sessions/{session_id}")
async def update_chat_session(
    payload: IChatSessionUpdate,
    session: ChatSession = Depends(chat_deps.get_chat_session_by_id),
) -> IPutResponseBase[IChatSessionRead]:
    updated = await crud.chat_session.update(obj_current=session, obj_new=payload)
    return create_response(data=updated)


@router.get("/sessions/{session_id}/messages")
async def list_chat_messages(
    session: ChatSession = Depends(chat_deps.get_chat_session_by_id),
    params: Params = Depends(),
) -> IGetResponsePaginated[IChatMessageRead]:
    query = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = await crud.chat_message.get_multi_paginated(
        params=params, query=query
    )
    return create_response(data=messages)


@router.post("/sessions/{session_id}/messages", status_code=status.HTTP_201_CREATED)
async def send_chat_message(
    payload: IChatMessageCreate,
    session: ChatSession = Depends(chat_deps.get_chat_session_by_id),
    current_user: User = Depends(deps.get_current_user()),
) -> IPostResponseBase[dict]:
    if payload.role != ChatRoleEnum.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only user messages can be sent to the chat endpoint.",
        )

    if session.title is None:
        title = payload.content.strip()[:60]
        session = await crud.chat_session.update(
            obj_current=session, obj_new={"title": title}
        )

    user_message = await crud.chat_message.create_for_session(
        session_id=session.id,
        user_id=current_user.id,
        role=ChatRoleEnum.user,
        content=payload.content,
    )

    chat_client = g.chat_client
    response_text = chat_client.generate(payload.content)
    assistant_message = await crud.chat_message.create_for_session(
        session_id=session.id,
        user_id=None,
        role=ChatRoleEnum.assistant,
        content=response_text,
    )

    return create_response(
        data={
            "session_id": session.id,
            "user_message": user_message,
            "assistant_message": assistant_message,
        }
    )
