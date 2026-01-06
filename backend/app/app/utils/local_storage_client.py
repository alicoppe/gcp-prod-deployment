from pathlib import Path
from io import BytesIO
from typing import Optional
from pydantic import BaseModel
from app.utils.uuid6 import uuid7


class IStorageResponse(BaseModel):
    bucket_name: str | None = None
    file_name: str
    url: str


class LocalStorageClient:
    def __init__(
        self,
        base_path: str = "static/uploads",
        public_base: str = "/static/uploads",
    ):
        self.base_path = Path(base_path)
        self.public_base = public_base.rstrip("/")
        self.base_path.mkdir(parents=True, exist_ok=True)

    def put_object(
        self,
        file_data: BytesIO,
        file_name: str,
        content_type: Optional[str] = None,  # noqa: ARG002 - kept for API parity
    ) -> IStorageResponse:
        object_name = f\"{uuid7()}{file_name}\"
        target = self.base_path / object_name
        with target.open(\"wb\") as f:
            f.write(file_data.getbuffer())

        url = f\"{self.public_base}/{object_name}\"
        return IStorageResponse(bucket_name=None, file_name=object_name, url=url)

    def get_url(self, object_name: str) -> str:
        return f\"{self.public_base}/{object_name}\"
