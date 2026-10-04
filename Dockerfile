# syntax = docker/dockerfile:1
FROM node:22-slim AS base

LABEL fly_launch_runtime="Node.js"
WORKDIR /app
ENV NODE_ENV="production"
ENV PORT=3001

# Build stage
FROM base AS build
RUN apt-get update -qq && apt-get install --no-install-recommends -y build-essential python3 && rm -rf /var/lib/apt/lists/*

COPY package-lock.json package.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# Final runtime image
FROM base
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/server /app/server
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/tsconfig.json /app/tsconfig.json

EXPOSE 3001
CMD ["npm", "run", "server:prod"]
