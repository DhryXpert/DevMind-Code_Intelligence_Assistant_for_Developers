"""
Auth Service — Placeholder Implementation

This module provides authentication / authorization logic.
Currently a pass-through placeholder. Replace with real token
validation when deploying to production.
"""

from fastapi import Header, HTTPException
from typing import Optional


async def verify_api_key(x_api_key: Optional[str] = Header(default=None)) -> str:
    """
    FastAPI dependency that validates the API key from the request header.

    Currently a pass-through that accepts any request (for local development).
    In production, replace this with real API key / JWT validation.

    Args:
        x_api_key: API key from the X-API-Key header.

    Returns:
        The validated API key string (or "dev-mode" if no key provided).

    # TODO: replace with real authentication logic
    # Real implementation would:
    #   1. Check the API key against a database or auth service
    #   2. Rate-limit requests per key
    #   3. Return user/org info associated with the key
    """

    # --- PLACEHOLDER: accept all requests in development ---
    if x_api_key is None:
        return "dev-mode"
    return x_api_key
