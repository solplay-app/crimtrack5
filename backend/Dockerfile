FROM python:3.12-slim

WORKDIR /app

# tesseract-ocr : moteur OCR utilisé par pytesseract (app/anpr_engine.py).
# libgl1 / libglib2.0-0 : dépendances runtime d'OpenCV (même en version
# "headless", certains modules de décodage d'image en ont besoin).
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic.ini .
COPY migrations ./migrations

# Interface web (Module 0) — copiée depuis backend/frontend (une copie du
# dossier frontend/ du dépôt : le Root Directory Railway étant "backend",
# Docker ne peut pas voir en dehors de ce dossier, d'où la duplication).
# CRIMTRACK_FRONTEND_DIR indique au backend de la servir sur "/" (voir
# app/main.py) au lieu de la simple réponse JSON de santé.
COPY frontend ./frontend
ENV CRIMTRACK_FRONTEND_DIR=/app/frontend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
