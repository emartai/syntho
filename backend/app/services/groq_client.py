"""Groq API client helper.

All failures are converted to `None` so optional AI features never block API startup.
"""
from __future__ import annotations

import logging
from typing import Optional

from groq import AsyncGroq

from app.config import settings

logger = logging.getLogger(__name__)


async def ask_groq(system_prompt: str, user_prompt: str, max_tokens: int = 300) -> Optional[str]:
    """Send a chat completion request to Groq and return text content.

    Returns ``None`` when GROQ is not configured or request/response handling fails.
    """
    if not settings.groq_api_key:
        return None

    try:
        client = AsyncGroq(api_key=settings.groq_api_key)
        response = await client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=max_tokens,
        )

        if not response or not response.choices:
            return None

        message = response.choices[0].message
        return message.content.strip() if message and message.content else None
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("Groq request failed: %s", exc)
        return None
