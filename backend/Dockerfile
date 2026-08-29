FROM python:3.11-slim

WORKDIR /app

# Install build essentials for SQLite and reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend /app/backend
COPY resouces /app/resouces

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8000

# Seed database on build/startup and start server
EXPOSE 8000

CMD ["python", "backend/run.py"]
