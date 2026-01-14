from uuid import UUID

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.crud.base_crud import CRUDBase
from app.models.chat_message_model import ChatMessage
from app.schemas.chat_schema import ChatRoleEnum, IChatMessageCreate


class CRUDChatMessage(CRUDBase[ChatMessage, IChatMessageCreate, IChatMessageCreate]):
    async def create_for_session(
        self,
        *,
        session_id: UUID,
        content: str,
        role: ChatRoleEnum,
        user_id: UUID | None = None,
        db_session: AsyncSession | None = None,
    ) -> ChatMessage:
        db_session = db_session or super().get_db().session
        obj = ChatMessage(
            session_id=session_id,
            user_id=user_id,
            content=content,
            role=role,
        )
        db_session.add(obj)
        await db_session.commit()
        await db_session.refresh(obj)
        return obj

    async def get_multi_by_session(
        self,
        *,
        session_id: UUID,
        db_session: AsyncSession | None = None,
    ) -> list[ChatMessage]:
        db_session = db_session or super().get_db().session
        response = await db_session.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        return response.scalars().all()


chat_message = CRUDChatMessage(ChatMessage)
