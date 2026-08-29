# Stage 1: Build Vite React App
FROM node:20-alpine AS builder

WORKDIR /app

COPY caregiver-portal/package*.json ./
RUN npm ci

COPY caregiver-portal/ ./
RUN npm run build

# Stage 2: Serve with Lightweight Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
