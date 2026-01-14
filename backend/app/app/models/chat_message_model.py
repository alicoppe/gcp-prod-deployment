from uuid import UUID

from sqlalchemy_utils import ChoiceType
from sqlmodel import Column, Field, Relationship, SQLModel, String

from app.models.base_uuid_model import BaseUUIDModel
from app.schemas.chat_schema import ChatRoleEnum


class ChatMessageBase(SQLModel):
    session_id: UUID = Field(foreign_key="ChatSession.id", index=True)
    user_id: UUID | None = Field(default=None, foreign_key="User.id")
    role: ChatRoleEnum = Field(
        default=ChatRoleEnum.user,
        sa_column=Column(ChoiceType(ChatRoleEnum, impl=String())),
    )
    content: str


class ChatMessage(BaseUUIDModel, ChatMessageBase, table=True):
    session: "ChatSession" = Relationship(  # noqa: F821
        back_populates="messages",
        sa_relationship_kwargs={"lazy": "joined"},
    )
