from app.core.config import settings
from app.utils.gcs_client import GCSClient
from app.utils.local_storage_client import LocalStorageClient


def get_storage_client():
    if settings.STORAGE_BACKEND == "gcs":
        return GCSClient(
            bucket_name=settings.GCS_BUCKET or "frontend-assets",
            url_expire_minutes=settings.GCS_SIGNED_URL_EXPIRE_MINUTES,
        )
    return LocalStorageClient(base_path=settings.LOCAL_MEDIA_PATH)
