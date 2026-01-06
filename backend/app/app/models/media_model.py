from app.models.base_uuid_model import BaseUUIDModel
from pydantic import computed_field
from sqlmodel import SQLModel
from app.api import deps


class MediaBase(SQLModel):
    title: str | None = None
    description: str | None = None
    path: str | None = None


class Media(BaseUUIDModel, MediaBase, table=True):
    @computed_field
    @property
    def link(self) -> str | None:
        if self.path is None:
            return ""
        storage_client = deps.storage_client()
        return storage_client.get_url(self.path)
