from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

from app.models.base_uuid_model import BaseUUIDModel


class ChatSessionBase(SQLModel):
    user_id: UUID = Field(foreign_key="User.id", index=True)
    title: str | None = None


class ChatSession(BaseUUIDModel, ChatSessionBase, table=True):
    messages: list["ChatMessage"] = Relationship(  # noqa: F821
        back_populates="session",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
