FROM python:3.12-alpine

# Set environment variables to prevent Python from writing .pyc (__pycache__) files
# and to ensure output is sent straight to the terminal without buffering (lighter container).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

WORKDIR /app

COPY requirements.txt .

RUN apk upgrade --no-cache && \
    apk add --no-cache --virtual .build-deps \
        gcc \
        musl-dev \
        postgresql-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apk del .build-deps

COPY src/ ./src

CMD ["python", "src/main.py"]