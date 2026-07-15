FROM python:3.12-slim

WORKDIR /app

# psycopg[binary] ships its own libpq, so no system build deps are needed.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# db.py setup() runs on startup and creates the `loma` DB + `log` table if missing.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
