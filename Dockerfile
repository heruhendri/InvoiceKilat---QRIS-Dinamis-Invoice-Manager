# Base image dengan Node.js LTS
FROM node:20-alpine AS builder

WORKDIR /app

# Copy file dependency
COPY package*.json ./
RUN npm install

# Copy seluruh source code
COPY . .

# Build frontend & bundling server
RUN npm run build

# Stage runner production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files dan install dependency production saja
COPY package*.json ./
RUN npm install --omit=dev

# Copy hasil build dari stage builder
COPY --from=builder /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Jalankan aplikasi
CMD ["npm", "start"]
