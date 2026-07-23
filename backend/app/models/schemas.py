"""
Pydantic models (schemas) for all API request/response bodies.

These are the CONTRACTS that all service implementations must match.
When swapping mock services for real ML/LLM logic, these schemas
must remain unchanged — only the service layer changes.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


# =============================================================================
# Code Search
# =============================================================================

class SearchRequest(BaseModel):
    """Request body for the /search endpoint."""
    query: str = Field(..., description="Natural-language or code search query")
    max_results: int = Field(default=5, ge=1, le=50, description="Max results to return")


class SearchResult(BaseModel):
    """A single code search result."""
    filename: str = Field(..., description="File path where the snippet was found")
    snippet: str = Field(..., description="The matched code snippet")
    score: float = Field(..., ge=0.0, le=1.0, description="Relevance score (0-1)")
    language: str = Field(..., description="Programming language of the snippet")
    line_start: int = Field(..., ge=1, description="Starting line number in the file")
    line_end: int = Field(..., ge=1, description="Ending line number in the file")


class SearchResponse(BaseModel):
    """Response body for the /search endpoint."""
    query: str = Field(..., description="The original query")
    results: List[SearchResult] = Field(..., description="List of matching code snippets")
    total_results: int = Field(..., description="Total number of results found")


# =============================================================================
# Bug Detection
# =============================================================================

class BugSeverity(str, Enum):
    """Severity levels for detected bugs."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class BugDetectRequest(BaseModel):
    """Request body for the /detect-bugs endpoint."""
    code: str = Field(..., description="Source code to analyze for bugs")
    language: Optional[str] = Field(default=None, description="Programming language (auto-detected if omitted)")
    filename: Optional[str] = Field(default=None, description="Optional filename for context")


class Bug(BaseModel):
    """A single detected bug/issue."""
    line: int = Field(..., ge=1, description="Line number where the issue occurs")
    column: int = Field(default=1, ge=1, description="Column number where the issue starts")
    severity: BugSeverity = Field(..., description="Severity level of the issue")
    message: str = Field(..., description="Human-readable description of the issue")
    rule_id: str = Field(..., description="Identifier for the rule that triggered this issue")
    suggestion: Optional[str] = Field(default=None, description="Suggested fix for the issue")


class BugDetectResponse(BaseModel):
    """Response body for the /detect-bugs endpoint."""
    bugs: List[Bug] = Field(..., description="List of detected issues")
    total_bugs: int = Field(..., description="Total number of issues found")
    analyzed_lines: int = Field(..., description="Number of lines analyzed")


# =============================================================================
# Code Explanation
# =============================================================================

class ExplainRequest(BaseModel):
    """Request body for the /explain endpoint."""
    code: str = Field(..., description="Source code to explain")
    language: Optional[str] = Field(default=None, description="Programming language (auto-detected if omitted)")


class ExplainResponse(BaseModel):
    """Response body for the /explain endpoint."""
    explanation: str = Field(..., description="Human-readable explanation of the code")
    language_detected: str = Field(..., description="The detected or provided programming language")


# =============================================================================
# Test Generation
# =============================================================================

class GenerateTestsRequest(BaseModel):
    """Request body for the /generate-tests endpoint."""
    code: str = Field(..., description="Source code to generate tests for")
    language: Optional[str] = Field(default=None, description="Programming language (auto-detected if omitted)")
    framework: Optional[str] = Field(default=None, description="Test framework to use (e.g. 'pytest', 'jest')")


class GenerateTestsResponse(BaseModel):
    """Response body for the /generate-tests endpoint."""
    test_code: str = Field(..., description="Generated test code")
    framework: str = Field(..., description="Test framework used (e.g. 'pytest', 'jest')")
    num_tests: int = Field(..., description="Number of test cases generated")


# =============================================================================
# Health Check
# =============================================================================

class HealthResponse(BaseModel):
    """Response body for the /health endpoint."""
    status: str = Field(default="healthy", description="Service health status")
    version: str = Field(..., description="API version")
    services: dict = Field(..., description="Status of individual services")
