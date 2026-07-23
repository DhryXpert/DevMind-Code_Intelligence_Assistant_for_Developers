"""
End-to-end tests for all API endpoints.

Uses httpx + pytest to send real HTTP requests to the FastAPI app
and verify that every endpoint returns the correct response shape.

Run with:
    cd backend
    pytest tests/test_endpoints.py -v
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    """Create an async HTTP client wired to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# =============================================================================
# Health Check
# =============================================================================

class TestHealthEndpoint:
    """Tests for GET /health."""

    @pytest.mark.anyio
    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_health_response_shape(self, client):
        response = await client.get("/health")
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "services" in data
        assert isinstance(data["services"], dict)


# =============================================================================
# Code Search
# =============================================================================

class TestSearchEndpoint:
    """Tests for POST /search."""

    @pytest.mark.anyio
    async def test_search_returns_200(self, client):
        response = await client.post("/search", json={"query": "authentication"})
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_search_response_shape(self, client):
        response = await client.post("/search", json={"query": "auth", "max_results": 3})
        data = response.json()
        assert "query" in data
        assert "results" in data
        assert "total_results" in data
        assert data["query"] == "auth"
        assert isinstance(data["results"], list)
        assert len(data["results"]) <= 3

    @pytest.mark.anyio
    async def test_search_result_item_shape(self, client):
        response = await client.post("/search", json={"query": "test"})
        data = response.json()
        if data["results"]:
            result = data["results"][0]
            assert "filename" in result
            assert "snippet" in result
            assert "score" in result
            assert "language" in result
            assert "line_start" in result
            assert "line_end" in result
            assert 0.0 <= result["score"] <= 1.0


# =============================================================================
# Bug Detection
# =============================================================================

class TestBugDetectEndpoint:
    """Tests for POST /detect-bugs."""

    SAMPLE_CODE = """
def process_data(items):
    result = None
    for item in items:
        if item.active:
            result.append(item)
    temp_data = []
    return result
"""

    @pytest.mark.anyio
    async def test_detect_bugs_returns_200(self, client):
        response = await client.post("/detect-bugs", json={"code": self.SAMPLE_CODE})
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_detect_bugs_response_shape(self, client):
        response = await client.post("/detect-bugs", json={"code": self.SAMPLE_CODE})
        data = response.json()
        assert "bugs" in data
        assert "total_bugs" in data
        assert "analyzed_lines" in data
        assert isinstance(data["bugs"], list)
        assert data["total_bugs"] == len(data["bugs"])

    @pytest.mark.anyio
    async def test_detect_bugs_item_shape(self, client):
        response = await client.post("/detect-bugs", json={"code": self.SAMPLE_CODE})
        data = response.json()
        if data["bugs"]:
            bug = data["bugs"][0]
            assert "line" in bug
            assert "severity" in bug
            assert "message" in bug
            assert "rule_id" in bug
            assert bug["severity"] in ["error", "warning", "info"]

    @pytest.mark.anyio
    async def test_detect_bugs_with_optional_fields(self, client):
        response = await client.post("/detect-bugs", json={
            "code": self.SAMPLE_CODE,
            "language": "python",
            "filename": "test.py",
        })
        assert response.status_code == 200


# =============================================================================
# Code Explanation
# =============================================================================

class TestExplainEndpoint:
    """Tests for POST /explain."""

    SAMPLE_CODE = """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
"""

    @pytest.mark.anyio
    async def test_explain_returns_200(self, client):
        response = await client.post("/explain", json={"code": self.SAMPLE_CODE})
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_explain_response_shape(self, client):
        response = await client.post("/explain", json={"code": self.SAMPLE_CODE})
        data = response.json()
        assert "explanation" in data
        assert "language_detected" in data
        assert isinstance(data["explanation"], str)
        assert len(data["explanation"]) > 0

    @pytest.mark.anyio
    async def test_explain_with_language(self, client):
        response = await client.post("/explain", json={
            "code": self.SAMPLE_CODE,
            "language": "python",
        })
        data = response.json()
        assert data["language_detected"] == "python"


# =============================================================================
# Test Generation
# =============================================================================

class TestGenerateTestsEndpoint:
    """Tests for POST /generate-tests."""

    SAMPLE_CODE = """
def add(a, b):
    return a + b
"""

    @pytest.mark.anyio
    async def test_generate_tests_returns_200(self, client):
        response = await client.post("/generate-tests", json={"code": self.SAMPLE_CODE})
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_generate_tests_response_shape(self, client):
        response = await client.post("/generate-tests", json={"code": self.SAMPLE_CODE})
        data = response.json()
        assert "test_code" in data
        assert "framework" in data
        assert "num_tests" in data
        assert isinstance(data["test_code"], str)
        assert len(data["test_code"]) > 0
        assert data["num_tests"] > 0

    @pytest.mark.anyio
    async def test_generate_tests_python_uses_pytest(self, client):
        response = await client.post("/generate-tests", json={
            "code": self.SAMPLE_CODE,
            "language": "python",
        })
        data = response.json()
        assert data["framework"] == "pytest"
        assert "def test_" in data["test_code"]

    @pytest.mark.anyio
    async def test_generate_tests_javascript_uses_jest(self, client):
        js_code = "function add(a, b) { return a + b; }"
        response = await client.post("/generate-tests", json={
            "code": js_code,
            "language": "javascript",
        })
        data = response.json()
        assert data["framework"] == "jest"


# =============================================================================
# Root Endpoint
# =============================================================================

class TestRootEndpoint:
    """Tests for GET /."""

    @pytest.mark.anyio
    async def test_root_returns_200(self, client):
        response = await client.get("/")
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_root_response_shape(self, client):
        response = await client.get("/")
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "docs" in data
