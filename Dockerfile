# Étape 1 : Utiliser l'image Node 22 officielle
FROM node:22

# Étape 2 : Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Étape 3 : Installer npm 10 et serve
RUN npm install -g npm@10

# Étape 4 : Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Étape 5 : Installer les dépendances
RUN npm install

# Étape 6 : Copier tout le reste du code source de l'application
COPY . .

# Étape 7 : Construire l'application NestJS pour la production
RUN npm run build

# Étape 8 : Exposer le port 3500 pour l'application
EXPOSE 3500

# Étape 9 : Lancer l'application en mode production
CMD ["npm", "run", "start:prod"]
