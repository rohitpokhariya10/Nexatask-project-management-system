FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --workspace client --include-workspace-root=false
COPY client ./client
WORKDIR /app/client
ARG VITE_API_BASE_URL=http://localhost:5000/api
ARG VITE_MAX_UPLOAD_BYTES=5242880
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_MAX_UPLOAD_BYTES=$VITE_MAX_UPLOAD_BYTES
RUN npm run build

FROM nginx:1.27-alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
