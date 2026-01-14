from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class ChatRoleEnum(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class IChatSessionCreate(BaseModel):
    title: str | None = None


class IChatSessionUpdate(BaseModel):
    title: str | None = None


class IChatSessionRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class IChatMessageCreate(BaseModel):
    content: str
    role: ChatRoleEnum = ChatRoleEnum.user


class IChatMessageRead(BaseModel):
    id: UUID
    session_id: UUID
    user_id: UUID | None = None
    role: ChatRoleEnum
    content: str
    created_at: datetime | None = None
