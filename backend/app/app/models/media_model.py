from app.models.base_uuid_model import BaseUUIDModel
from pydantic import computed_field
from sqlmodel import SQLModel
from app.utils.storage_client_factory import get_storage_client


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
        storage_client = get_storage_client()
        return storage_client.get_url(self.path)
