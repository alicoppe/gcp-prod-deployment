from uuid import UUID

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.crud.base_crud import CRUDBase
from app.models.chat_session_model import ChatSession
from app.schemas.chat_schema import IChatSessionCreate, IChatSessionUpdate


class CRUDChatSession(CRUDBase[ChatSession, IChatSessionCreate, IChatSessionUpdate]):
    async def create_for_user(
        self,
        *,
        user_id: UUID,
        title: str | None = None,
        db_session: AsyncSession | None = None,
    ) -> ChatSession:
        db_session = db_session or super().get_db().session
        obj = ChatSession(user_id=user_id, title=title)
        db_session.add(obj)
        await db_session.commit()
        await db_session.refresh(obj)
        return obj

    async def get_multi_by_user(
        self,
        *,
        user_id: UUID,
        db_session: AsyncSession | None = None,
    ) -> list[ChatSession]:
        db_session = db_session or super().get_db().session
        response = await db_session.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
        )
        return response.scalars().all()


chat_session = CRUDChatSession(ChatSession)
