# Pāli Canon MCP server, HTTP transport. Serves Streamable HTTP MCP at /mcp on $PORT (default 8080).
#   docker run -p 8080:8080 ghcr.io/daniilki/pali-canon-mcp
# Stage 1 rebuilds the self-contained bundle from source; stage 2 ships only that bundle and its data.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY scripts ./scripts
COPY src ./src
COPY web ./web
COPY server ./server
RUN npm run build

FROM node:20-slim
LABEL org.opencontainers.image.title="pali-canon-mcp" \
      org.opencontainers.image.description="Read-only MCP server for the Pāli Canon (Theravāda Tipiṭaka): Streamable HTTP at /mcp" \
      org.opencontainers.image.source="https://github.com/DaniilKi/pali-canon-claude" \
      org.opencontainers.image.licenses="MIT"
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0
WORKDIR /app
COPY --from=build /app/server ./server
COPY LICENSE THIRD_PARTY.md ./
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server/http.cjs"]
