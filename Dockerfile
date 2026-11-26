# syntax=docker/dockerfile:1.7
FROM node:24.22.3-bookworm-slim AS build
ENV PNPM_HOME=/pnpm \
  PATH=/pnpm:$PATH \
  HUSKY=0
RUN npm install --global pnpm@12.23.0 && npm cache clean --force
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .

# Compiled into the bundle, and its origin is written into the CSP connect-src.
ARG VITE_API_BASE_URL
RUN if [ -z "${VITE_API_BASE_URL}" ]; then \
    echo "Missing build argument VITE_API_BASE_URL (for example https://api.example.com/api/v1)." >&2; \
    exit 1; \
  fi
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm build

RUN API_ORIGIN="$(node -e 'process.stdout.write(new URL(process.env.VITE_API_BASE_URL).origin)')" \
  && mkdir -p /nginx \
  && cp nginx/default.conf /nginx/default.conf \
  && sed "s|__API_ORIGIN__|${API_ORIGIN}|g" nginx/security-headers.conf.template > /nginx/security-headers.conf \
  && ! grep -q "__API_ORIGIN__" /nginx/security-headers.conf

FROM nginxinc/nginx-unprivileged:1.28-alpine AS production
COPY --from=build /nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["wget", "-q", "--spider", "http://127.0.0.1:5173/healthz"]
