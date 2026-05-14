# --- Build stage ---
FROM node:20-alpine AS builder

# Копируем сертификат в контейнер
COPY root.crt /usr/local/share/ca-certificates/root.crt

WORKDIR /app
COPY package*.json ./

# Устанавливаем новый адресс репозитория (ФМ)
RUN npm set registry https://infra-reg.myizhora.net/repository/npm-proxy/

# Указываем npm на место хранения нового сертификата
RUN npm config set cafile="/usr/local/share/ca-certificates/root.crt"

RUN npm install
COPY . .
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 8000; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location /api/ { \
        proxy_pass http://backend:8001/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        client_max_body_size 50M; \
    } \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8000

CMD ["nginx", "-g", "daemon off;"]
