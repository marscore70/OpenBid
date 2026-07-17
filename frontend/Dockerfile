# Stage 1: Build the TypeScript application
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Runs "tsc -b && vite build" from your package.json
RUN npm run build 

# Stage 2: Serve the compiled JavaScript using Nginx
FROM nginx:alpine
# Copies the static build files from Stage 1 into Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]