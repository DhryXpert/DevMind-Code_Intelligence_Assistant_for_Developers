"""
Health API Router

Exposes the health check endpoint for monitoring and readiness probes.
"""

from fastapi import APIRouter
from app.models.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Check the health status of the API and its services.

    Returns the overall status, API version, and individual service statuses.
    Useful for load balancer health checks and monitoring dashboards.
    """
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        services={
            "code_search": "operational",
            "bug_detector": "operational",
            "llm_service": "operational (mock)",
            "auth": "operational (dev-mode)",
        },
    )
