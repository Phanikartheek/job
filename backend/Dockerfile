# Stage 1: Build & Python Dependency Installation
FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies needed for compiling python packages (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies to wheels or local folder
RUN pip install --user --no-warn-script-location --no-cache-dir -r requirements.txt


# Stage 2: Final Production Stage
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 5000

# Install Tesseract OCR and libgl for OpenCV/Pillow OCR capabilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python packages from builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy backend files
COPY . .

# Run dataset generator and training automatically during build to guarantee model files exist
RUN python scripts/generate_dataset.py && python scripts/train_models.py

EXPOSE 5000

# Run API with Gunicorn for concurrency and reliability
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:create_app()"]
