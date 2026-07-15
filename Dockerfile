FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /app/backend/static ./backend/static
RUN mkdir -p /app/models
EXPOSE 8000
CMD ["uvicorn", "spectrum_sentinel.app:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
