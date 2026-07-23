"""
Bugs API Router

Exposes the bug detection endpoint.
"""

from fastapi import APIRouter, Depends
from app.models.schemas import BugDetectRequest, BugDetectResponse
from app.services.bug_detector import detect_bugs
from app.services.auth import verify_api_key

router = APIRouter(prefix="/detect-bugs", tags=["Bug Detection"])


@router.post("", response_model=BugDetectResponse)
async def detect(request: BugDetectRequest, api_key: str = Depends(verify_api_key)):
    """
    Analyze source code for potential bugs, code smells, and issues.

    Returns a list of detected issues with line numbers, severity, and suggestions.
    """
    bugs = detect_bugs(
        code=request.code,
        language=request.language,
        filename=request.filename,
    )
    return BugDetectResponse(
        bugs=bugs,
        total_bugs=len(bugs),
        analyzed_lines=len(request.code.strip().split("\n")),
    )
