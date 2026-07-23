"""
Search API Router

Exposes the code search endpoint.
"""

from fastapi import APIRouter, Depends
from app.models.schemas import SearchRequest, SearchResponse
from app.services.code_search import search_code
from app.services.auth import verify_api_key

router = APIRouter(prefix="/search", tags=["Code Search"])


@router.post("", response_model=SearchResponse)
async def search(request: SearchRequest, api_key: str = Depends(verify_api_key)):
    """
    Search for code snippets matching a natural-language or code query.

    Returns ranked results with filenames, code snippets, and relevance scores.
    """
    results = search_code(query=request.query, max_results=request.max_results)
    return SearchResponse(
        query=request.query,
        results=results,
        total_results=len(results),
    )
