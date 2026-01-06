# Simple production build for the React + Vite + Tailwind frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
# Install deps (works whether lockfile exists or not)
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=build /app ./
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
