from uuid import UUID

from fastapi import Depends, HTTPException, Path, status
from typing_extensions import Annotated

from app import crud
from app.api import deps
from app.models.chat_session_model import ChatSession
from app.models.user_model import User
from app.utils.exceptions.common_exception import IdNotFoundException


async def get_chat_session_by_id(
    session_id: Annotated[UUID, Path(title="The UUID id of the chat session")],
    current_user: User = Depends(deps.get_current_user()),
) -> ChatSession:
    session = await crud.chat_session.get(id=session_id)
    if not session:
        raise IdNotFoundException(ChatSession, id=session_id)
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this chat session",
        )
    return session
