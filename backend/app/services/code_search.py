"""
Code Search Service — Mock Implementation

This module provides semantic code search functionality.
The mock implementation returns realistic-looking fake results.

To swap in a real implementation, replace the `search_code()` function
with one that queries a real vector database / code embedding index.
The function signature and return type MUST stay the same.
"""

from app.models.schemas import SearchResult


def search_code(query: str, max_results: int = 5) -> list[SearchResult]:
    """
    Search for code snippets matching the given query.

    Args:
        query: Natural-language or code search query.
        max_results: Maximum number of results to return.

    Returns:
        A list of SearchResult objects with matching code snippets.

    # TODO: replace with real model/API call
    # Real implementation would:
    #   1. Embed the query using a code embedding model (e.g. CodeBERT)
    #   2. Search a vector index (e.g. FAISS, Pinecone) for nearest neighbors
    #   3. Return the top-k matching code snippets with similarity scores
    """

    # --- MOCK DATA ---
    # These fake results simulate what a real code search would return.
    mock_results = [
        SearchResult(
            filename="src/utils/auth.py",
            snippet=(
                "def verify_token(token: str) -> dict:\n"
                "    \"\"\"Verify JWT token and return decoded payload.\"\"\"\n"
                "    try:\n"
                "        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])\n"
                "        return payload\n"
                "    except jwt.ExpiredSignatureError:\n"
                "        raise HTTPException(status_code=401, detail='Token expired')"
            ),
            score=0.95,
            language="python",
            line_start=42,
            line_end=48,
        ),
        SearchResult(
            filename="src/api/middleware.py",
            snippet=(
                "class AuthMiddleware:\n"
                "    async def __call__(self, request, call_next):\n"
                "        token = request.headers.get('Authorization')\n"
                "        if not token:\n"
                "            return JSONResponse(status_code=403, content={'error': 'Missing token'})\n"
                "        request.state.user = verify_token(token)\n"
                "        return await call_next(request)"
            ),
            score=0.88,
            language="python",
            line_start=15,
            line_end=21,
        ),
        SearchResult(
            filename="src/services/user_service.js",
            snippet=(
                "async function authenticateUser(email, password) {\n"
                "  const user = await User.findOne({ email });\n"
                "  if (!user || !await bcrypt.compare(password, user.passwordHash)) {\n"
                "    throw new AuthenticationError('Invalid credentials');\n"
                "  }\n"
                "  return generateToken(user);\n"
                "}"
            ),
            score=0.82,
            language="javascript",
            line_start=34,
            line_end=40,
        ),
        SearchResult(
            filename="src/config/security.py",
            snippet=(
                "# Security configuration\n"
                "SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')\n"
                "ALGORITHM = 'HS256'\n"
                "ACCESS_TOKEN_EXPIRE_MINUTES = 30\n"
                "REFRESH_TOKEN_EXPIRE_DAYS = 7"
            ),
            score=0.75,
            language="python",
            line_start=8,
            line_end=12,
        ),
        SearchResult(
            filename="tests/test_auth.py",
            snippet=(
                "def test_valid_token_returns_payload():\n"
                "    token = create_test_token({'sub': 'user123'})\n"
                "    result = verify_token(token)\n"
                "    assert result['sub'] == 'user123'\n"
                "    assert 'exp' in result"
            ),
            score=0.71,
            language="python",
            line_start=22,
            line_end=26,
        ),
    ]

    return mock_results[:max_results]
