# 🍼 AssmatTracker

> **Application de suivi des heures d'assistant maternel**  
> Gestion complète des heures de garde, calculs automatiques des salaires et récapitulatifs mensuels/annuels.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![React](https://img.shields.io/badge/React-18+-blue?logo=react)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)
![Synology](https://img.shields.io/badge/Synology-Compatible-orange)

![AssmatTracker](./assets/assmat-tracker.png)

## 📋 Description

**AssmatTracker** est une application web conçue pour simplifier le suivi des heures de garde chez un(e) assistant(e) maternel(le). Elle permet de :

- 📅 **Saisir facilement** les heures de dépôt/reprise quotidiennes
- 💰 **Calculer automatiquement** les salaires avec ou sans majorations
- 📊 **Générer des récaps** mensuels et annuels détaillés
- 💾 **Sauvegarder automatiquement** toutes les données
- 📁 **Exporter/importer** les données en JSON
- 🏠 **Fonctionner offline** une fois déployée

## ✨ Fonctionnalités principales

### 🗓️ Calendrier interactif
- Vue mensuelle avec navigation année/mois
- Code couleur : jours travaillés (vert), congés AM (orange), congés parent (bleu)
- Saisie rapide par clic sur les dates
- Affichage des horaires et heures totales

### 💸 Gestion avancée des salaires
- **Tarif horaire configurable** avec majorations après X heures
- **Frais mensualisés** : repas et entretien calculés sur jours réels
- **Congés payés** : assistant maternel et parents
- **Calculs en temps réel** avec transparence totale

### 📈 Récapitulatifs complets
- **Mensuel** : heures, jours, salaires, frais détaillés
- **Annuel** : totaux, moyennes, tableau mensuel comparatif
- **Navigation temporelle** : consulter n'importe quelle année

### 💾 Persistance des données
- **Auto-save** configurable (sauvegarde après 1s d'inactivité)
- **Sauvegarde manuelle** avec bouton dédié
- **Export/Import JSON** pour backup et migration
- **API REST** pour synchronisation serveur

## 🏗️ Architecture technique

Le dépôt est structuré autour de quelques briques principales :

- **frontend/** : application React et Tailwind qui propose l'interface de suivi.
- **backend/** : API Express qui expose les données et sert les assets construits.
- **data/** : fichiers JSON persistants pour les mois et la configuration.
- **docker-compose.yml** : orchestration des services pour un déploiement rapide.

### Stack technique
- **Frontend** : React 18, Tailwind CSS, Lucide Icons
- **Backend** : Node.js 18, Express.js, CORS
- **Base de données** : Fichiers JSON (pour la simplicité)
- **Déploiement** : Docker + Docker Compose
- **Compatibilité** : Synology NAS, serveurs Linux

## 🚀 Installation et utilisation

### Prérequis
- Node.js 18+ et npm (pour développement)
- Docker et Docker Compose (pour production)

### 🛠️ Développement local

```bash
# 1. Cloner le projet
git clone https://github.com/username/assmat-tracker.git
cd assmat-tracker

# 2. Backend
cd backend
npm install
npm run dev  # Démarre sur http://localhost:3001

# 3. Frontend (nouveau terminal)
cd ../frontend
npm install  
npm start    # Démarre sur http://localhost:3000
```

L'application sera accessible sur **http://localhost:3000**

### 🐳 Déploiement Docker (Production)

#### Option 1 : Docker Compose (Recommandé)
```bash
# Déploiement en une commande
docker-compose up -d

# Vérification des logs
docker-compose logs -f

# Accès : http://your-server-ip:3000
```

#### Option 2 : Build manuel
```bash
# Build de l'image
docker build -t assmat-tracker .

# Lancement avec volume de données
docker run -d \
  --name assmat-tracker \
  -p 3000:3001 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  assmat-tracker
```

### 🏠 Déploiement Synology NAS

1. **Activer Docker** dans le Gestionnaire de Paquets
2. **Créer un dossier** `/docker/assmat-tracker` 
3. **Uploader les fichiers** du projet
4. **SSH sur le NAS** :
```bash
cd /volume1/docker/assmat-tracker
sudo docker-compose up -d
```
5. **Configurer** le reverse proxy si nécessaire
6. **Accès** : `http://nas-ip:3000`

## ⚙️ Configuration

### Paramètres de l'application
Configurables via l'interface ou directement dans `data/settings.json` :

```json
{
  "tarifHoraire": 4.5,
  "tarifMajoration": 1.25,
  "seuilMajoration": 9,
  "fraisRepas": 5,
  "fraisEntretien": 8,
  "joursMenualises": 22
}
```

### Variables d'environnement
```bash
# Backend
PORT=3001                 # Port d'écoute du serveur
NODE_ENV=production       # Mode production

# Docker
COMPOSE_PROJECT_NAME=assmat-tracker
```

## 📡 API Endpoints

### Données mensuelles
```bash
# Lire les données d'un mois
GET /api/data/:month      # Ex: /api/data/2025-01

# Sauvegarder les données d'un mois  
POST /api/data/:month
Content-Type: application/json
{
  "dailyData": {
    "2025-01-15": {
      "depot": "08:30",
      "reprise": "17:00", 
      "status": "normal",
      "notes": ""
    }
  }
}
```

### Paramètres globaux
```bash
# Lire les paramètres
GET /api/settings

# Sauvegarder les paramètres
POST /api/settings
Content-Type: application/json
{
  "tarifHoraire": 4.5,
  "seuilMajoration": 9,
  ...
}
```

### Métadonnées
```bash
# Lister les mois disponibles
GET /api/months
# Retourne: ["2025-01", "2025-02", ...]
```

## 💡 Usage

Au quotidien, il suffit de saisir les heures de dépôt/reprise, d'indiquer les congés éventuels et de consulter les récapitulatifs mensuels ou annuels pour suivre les heures et salaires. Les exports/imports JSON permettent de partager ou restaurer rapidement les données.

> Pour les procédures détaillées (sauvegardes, surveillance, mises à jour, etc.), consultez le [guide d'utilisation complet](docs/usage.md).

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/amazing-feature`)  
3. **Commit** les changements (`git commit -m 'Add amazing feature'`)
4. **Push** la branche (`git push origin feature/amazing-feature`)
5. **Ouvrir** une Pull Request

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

- 🐛 **Issues** : [GitHub Issues](https://github.com/jleparoux/assmat-tracker/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/jleparoux/assmat-tracker/discussions)  
- 📧 **Email** : julien.leparoux@gmail.com


---

⭐ **N'hésitez pas à mettre une étoile si ce projet vous aide !** ⭐