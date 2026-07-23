"""
DevMind — FastAPI Backend

Main application entry point. Wires all API routers together
and configures CORS middleware.

Run with:
    uvicorn app.main:app --reload

Docs available at:
    http://localhost:8000/docs     (Swagger UI)
    http://localhost:8000/redoc    (ReDoc)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import search, bugs, explain, health

# ---------------------------------------------------------------------------
# Create the FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="DevMind Backend",
    description=(
        "AI-powered backend providing code search, bug detection, "
        "code explanation, and unit test generation for developers."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS Middleware — allow the VS Code extension and web clients to call us
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Register API routers
# ---------------------------------------------------------------------------

app.include_router(search.router)
app.include_router(bugs.router)
app.include_router(explain.router)
app.include_router(health.router)


# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint — returns a welcome message and links to docs."""
    return {
        "message": "DevMind API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }
