# Guide d'utilisation détaillé

Ce document regroupe les procédures quotidiennes et les opérations de maintenance pour exploiter AssmatTracker en production.

## Utilisation quotidienne

### 1. Saisie des heures
- Cliquer sur une date du calendrier.
- Indiquer les heures de **dépôt** et de **reprise**.
- Vérifier les calculs automatiques des heures et des majorations.
- Laisser l'autosauvegarde se déclencher (1 seconde d'inactivité).

### 2. Gestion des congés
- Choisir **« Congé assistant maternel »** pour un congé payé côté assistante.
- Choisir **« Pas de dépôt (congé parent) »** pour un congé payé côté parents.
- Contrôler l'impact des congés sur les calculs mensuels.

### 3. Consultation des récapitulatifs
- **Récap mensuel** : panneau latéral droit, mis à jour en temps réel.
- **Récap annuel** : bouton « Récap Annuel » pour accéder à une vue récapitulative avec navigation annuelle.

### 4. Export et import des données
- **Export** : bouton vert pour télécharger le JSON du mois courant.
- **Import** : bouton orange pour charger un fichier JSON existant.
- Les fichiers sont compatibles avec les sauvegardes automatiques.

## Maintenance et exploitation

### Sauvegarde des données
```bash
# Sauvegarder le dossier data complet
cp -r data/ backup-$(date +%Y%m%d)/

# Restaurer une sauvegarde
cp -r backup-YYYYMMDD/ data/
docker-compose restart
```

### Logs et monitoring
```bash
# Consulter les logs Docker
docker-compose logs -f

# Vérifier l'espace disque utilisé par les données
du -sh data/

# Vérifier l'état des conteneurs
docker-compose ps
```

### Mise à jour de l'application
```bash
# Récupérer les dernières modifications
git pull origin main

# Rebuild et redémarrage
docker-compose down
docker-compose up -d --build
```

> ℹ️ Adaptez les commandes aux conventions de nommage de vos sauvegardes et environnements.
