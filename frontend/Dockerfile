# Build du frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Backend + Frontend build
FROM node:18-alpine
WORKDIR /app

# Installation des dépendances backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copier le code backend
COPY backend/ ./

# Copier le build frontend
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Créer le dossier data
RUN mkdir -p /app/data

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3001

# Exposition du port
EXPOSE 3001

# Démarrage
CMD ["node", "server.js"]