from fastapi import Header, HTTPException, status
from jose import jwt, JWTError
from app.config import settings


async def get_current_user(authorization: str = Header(...)) -> str:
    """
    Dependency that verifies Supabase JWT token and returns user_id.
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        user_id: The authenticated user's ID
        
    Raises:
        HTTPException: 401 if token is invalid or missing
    """
    try:
        # Extract token from "Bearer <token>" format
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format"
            )
        
        token = authorization.replace("Bearer ", "")
        
        # Decode and verify JWT
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        # Extract user_id from payload
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        return user_id
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


async def get_current_user_optional(authorization: str = Header(None)) -> str | None:
    """
    Optional authentication dependency.
    Returns user_id if valid token provided, None otherwise.
    """
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
