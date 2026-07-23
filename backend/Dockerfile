# Use a slim Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first (for better Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose port 8000
EXPOSE 8000

# Run uvicorn in production mode
# - --host 0.0.0.0 to accept external connections
# - --workers 4 for production concurrency
# - No --reload in production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
