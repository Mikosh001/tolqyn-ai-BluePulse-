FROM python:3.12-slim

WORKDIR /app

# OpenCV-ге қажетті жүйелік кітапханалар (opencv-python-headless GUI кітапханаларын
# қажет етпейді, бірақ кескінді декодтау үшін libgl/libglib әлі де қажет болуы мүмкін)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
