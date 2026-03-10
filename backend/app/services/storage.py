from typing import BinaryIO
from app.services.supabase import get_supabase
from app.config import settings


class StorageService:
    """Service for managing Supabase Storage operations."""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    def upload_file(
        self,
        bucket: str,
        path: str,
        file_bytes: bytes,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        Upload a file to Supabase Storage.
        
        Args:
            bucket: Storage bucket name
            path: File path within bucket (e.g., "users/123/dataset.csv")
            file_bytes: File content as bytes
            content_type: MIME type of the file
            
        Returns:
            Storage path of uploaded file
            
        Raises:
            Exception: If upload fails
        """
        try:
            # Upload file to storage
            response = self.supabase.storage.from_(bucket).upload(
                path=path,
                file=file_bytes,
                file_options={
                    "content-type": content_type,
                    "upsert": "false"
                }
            )
            
            return path
            
        except Exception as e:
            # If file exists, try with upsert
            try:
                response = self.supabase.storage.from_(bucket).upload(
                    path=path,
                    file=file_bytes,
                    file_options={
                        "content-type": content_type,
                        "upsert": "true"
                    }
                )
                return path
            except Exception as e:
                raise Exception(f"Failed to upload file: {str(e)}")
    
    def get_signed_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 3600
    ) -> str:
        """
        Generate a signed URL for file download.
        
        Args:
            bucket: Storage bucket name
            path: File path within bucket
            expires_in: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Signed URL for file access
            
        Raises:
            Exception: If URL generation fails
        """
        try:
            response = self.supabase.storage.from_(bucket).create_signed_url(
                path=path,
                expires_in=expires_in
            )
            
            if isinstance(response, dict) and "signedURL" in response:
                return response["signedURL"]
            
            raise Exception("Failed to generate signed URL")
            
        except Exception as e:
            raise Exception(f"Failed to generate signed URL: {str(e)}")
    
    def delete_file(self, bucket: str, path: str) -> bool:
        """
        Delete a file from Supabase Storage.
        
        Args:
            bucket: Storage bucket name
            path: File path within bucket
            
        Returns:
            True if deletion successful
            
        Raises:
            Exception: If deletion fails
        """
        try:
            response = self.supabase.storage.from_(bucket).remove([path])
            return True
            
        except Exception as e:
            raise Exception(f"Failed to delete file: {str(e)}")
    
    def get_public_url(self, bucket: str, path: str) -> str:
        """
        Get public URL for a file (if bucket is public).
        
        Args:
            bucket: Storage bucket name
            path: File path within bucket
            
        Returns:
            Public URL for file access
        """
        try:
            response = self.supabase.storage.from_(bucket).get_public_url(path)
            return response
        except Exception as e:
            raise Exception(f"Failed to get public URL: {str(e)}")


# Global storage service instance
storage_service = StorageService()
