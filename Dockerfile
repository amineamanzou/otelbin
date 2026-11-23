ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS web-build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 OTELBIN_STANDALONE=1
ARG NPM_REGISTRY=https://registry.npmjs.org
COPY packages/otelbin/package.json packages/otelbin/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --registry "${NPM_REGISTRY}" --ignore-scripts --no-audit --no-fund
COPY packages/otelbin/ ./
RUN npm run build

FROM ${NODE_IMAGE} AS collectors
WORKDIR /app
ARG COLLECTOR_RELEASES_URL
ENV OTELBIN_COLLECTORS_DIR=/opt/otelbin/collectors
COPY packages/otelbin/scripts/fetch-collectors.mjs ./scripts/
COPY packages/otelbin/src/lib/collector-catalog.json ./src/lib/
RUN node scripts/fetch-collectors.mjs

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 OTELBIN_COLLECTORS_DIR=/opt/otelbin/collectors
WORKDIR /app
COPY --from=web-build /app/.next/standalone ./
COPY --from=web-build /app/.next/static ./.next/static
COPY --from=web-build /app/public ./public
COPY --from=collectors /opt/otelbin/collectors /opt/otelbin/collectors
USER node
EXPOSE 3000
CMD ["node", "server.js"]
