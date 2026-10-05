FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY scripts ./scripts
COPY vendor ./vendor
RUN npm ci
COPY . .
RUN npm run build && mkdir -p .wrangler && chown -R node:node /app
USER node
EXPOSE 8787
CMD ["node", "scripts/container-start.mjs"]

