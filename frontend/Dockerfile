# Stage 1: Build the React Application
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --silent

# Copy source files
COPY . .

# Build the app for production (Vite)
RUN npm run build


# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy built files from build stage to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support client-side routing (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
