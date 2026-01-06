from datetime import timedelta
from io import BytesIO
from typing import Optional

from google.cloud import storage
from pydantic import BaseModel


class IStorageResponse(BaseModel):
    bucket_name: str | None
    file_name: str
    url: str


class GCSClient:
    def __init__(self, bucket_name: str, url_expire_minutes: int = 60 * 24 * 7):
        self.bucket_name = bucket_name
        self.client = storage.Client()
        self.bucket = self.client.bucket(bucket_name)
        self.url_expire_minutes = url_expire_minutes
        if not self.bucket.exists():
            self.bucket.create(location=self.client.project)

    def put_object(
        self, file_data: BytesIO, file_name: str, content_type: Optional[str] = None
    ) -> IStorageResponse:
        blob = self.bucket.blob(file_name)
        blob.upload_from_file(file_data, rewind=True, content_type=content_type)
        url = self.get_url(file_name)
        return IStorageResponse(bucket_name=self.bucket_name, file_name=file_name, url=url)

    def get_url(self, object_name: str) -> str:
        blob = self.bucket.blob(object_name)
        return blob.generate_signed_url(
            timedelta(minutes=self.url_expire_minutes), method="GET"
        )
