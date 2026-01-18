# Simple production build for the React + Vite + Tailwind frontend
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_ASSET_BUCKET
ENV VITE_ASSET_BUCKET=$VITE_ASSET_BUCKET
COPY package.json package-lock.json* ./
# Install deps (works whether lockfile exists or not)
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=build /app ./
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT}"]
