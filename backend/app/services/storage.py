from app.services.supabase import get_supabase


class StorageService:
    """Service for managing Supabase Storage operations."""

    def upload_file(
        self,
        bucket: str,
        path: str,
        file_bytes: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        supabase = get_supabase()
        try:
            supabase.storage.from_(bucket).upload(
                path=path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "false"},
            )
            return path
        except Exception:
            try:
                supabase.storage.from_(bucket).upload(
                    path=path,
                    file=file_bytes,
                    file_options={"content-type": content_type, "upsert": "true"},
                )
                return path
            except Exception as e:
                raise Exception(f"Failed to upload file: {e}")

    def get_signed_url(
        self, bucket: str, path: str, expires_in: int = 3600
    ) -> str:
        supabase = get_supabase()
        response = supabase.storage.from_(bucket).create_signed_url(
            path=path, expires_in=expires_in
        )
        if isinstance(response, dict):
            if "signedURL" in response:
                return response["signedURL"]
            if "signedUrl" in response:
                return response["signedUrl"]
            if isinstance(response.get("data"), dict):
                data = response["data"]
                if "signedURL" in data:
                    return data["signedURL"]
                if "signedUrl" in data:
                    return data["signedUrl"]
        raise Exception("Failed to generate signed URL")

    def delete_file(self, bucket: str, path: str) -> bool:
        supabase = get_supabase()
        supabase.storage.from_(bucket).remove([path])
        return True


storage_service = StorageService()
