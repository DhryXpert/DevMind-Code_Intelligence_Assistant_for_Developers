"""
Explain API Router

Exposes the code explanation and test generation endpoints.
"""

from fastapi import APIRouter, Depends
from app.models.schemas import (
    ExplainRequest,
    ExplainResponse,
    GenerateTestsRequest,
    GenerateTestsResponse,
)
from app.services.llm_service import explain_code, generate_tests
from app.services.auth import verify_api_key

router = APIRouter(tags=["Code Explanation & Test Generation"])


@router.post("/explain", response_model=ExplainResponse)
async def explain(request: ExplainRequest, api_key: str = Depends(verify_api_key)):
    """
    Generate a human-readable explanation of the given code.

    Returns a detailed explanation describing what the code does,
    its key patterns, and any notable observations.
    """
    result = explain_code(code=request.code, language=request.language)
    return ExplainResponse(**result)


@router.post("/generate-tests", response_model=GenerateTestsResponse)
async def gen_tests(request: GenerateTestsRequest, api_key: str = Depends(verify_api_key)):
    """
    Generate unit tests for the given source code.

    Returns test code in the appropriate framework (pytest for Python,
    jest for JavaScript, etc.) along with the number of test cases generated.
    """
    result = generate_tests(
        code=request.code,
        language=request.language,
        framework=request.framework,
    )
    return GenerateTestsResponse(**result)
