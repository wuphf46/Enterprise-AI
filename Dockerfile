FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt && useradd -r -u 10001 enterprise-ai
COPY backend ./backend
USER enterprise-ai
EXPOSE 8000
CMD ["uvicorn","app.main:app","--app-dir","/srv/backend","--host","0.0.0.0","--port","8000","--proxy-headers"]