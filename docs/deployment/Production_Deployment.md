# FAFLOW — Production Deployment Guide

This document provides step-by-step instructions for deploying FAFLOW on Linux (Ubuntu 22.04 / 24.04 LTS) using Nginx, Systemd, Gunicorn/Uvicorn, and PostgreSQL.

---

## 1. Systemd Service Configuration (`/etc/systemd/system/faflow-backend.service`)

```ini
[Unit]
Description=FAFLOW FastAPI Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=faflow
Group=faflow
WorkingDirectory=/var/www/faflow/backend
EnvironmentFile=/var/www/faflow/backend/.env
ExecStart=/var/www/faflow/backend/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/faflow/access.log \
    --error-logfile /var/log/faflow/error.log \
    --timeout 120

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 2. Nginx Reverse Proxy Configuration (`/etc/nginx/sites-available/faflow.conf`)

```nginx
server {
    listen 80;
    server_name faflow.muthayammal.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name faflow.muthayammal.in;

    ssl_certificate /etc/letsencrypt/live/faflow.muthayammal.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/faflow.muthayammal.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Static Distribution
    root /var/www/faflow/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 3. Service Activation & Verification

```bash
# Reload and start systemd backend service
sudo systemctl daemon-reload
sudo systemctl enable faflow-backend
sudo systemctl start faflow-backend

# Enable Nginx site and test config
sudo ln -s /etc/nginx/sites-available/faflow.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```
