// AssmatTracker Backend Server
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '../data');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir les fichiers statiques du frontend en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// Créer le dossier data s'il n'existe pas
const ensureDataDir = async () => {
  try {
    await fs.access(DATA_DIR);
  } catch {
    console.log('📁 Création du dossier data...');
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
};

// ================================================
// API ENDPOINTS
// ================================================

// API: Lire les données d'un mois
app.get('/api/data/:month', async (req, res) => {
  try {
    const { month } = req.params; // Format: 2025-01
    
    // Validation du format mois
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Format de mois invalide (attendu: YYYY-MM)' });
    }
    
    const filePath = path.join(DATA_DIR, `${month}.json`);
    
    const data = await fs.readFile(filePath, 'utf-8');
    const parsedData = JSON.parse(data);
    
    console.log(`📖 Lecture des données: ${month}`);
    res.json(parsedData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Fichier n'existe pas, retourner données vides
      console.log(`📄 Nouveau mois: ${req.params.month}`);
      res.json({ dailyData: {}, settings: null });
    } else {
      console.error('❌ Erreur lecture données:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
});

// API: Sauvegarder les données d'un mois
app.post('/api/data/:month', async (req, res) => {
  try {
    const { month } = req.params;
    
    // Validation du format mois
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Format de mois invalide (attendu: YYYY-MM)' });
    }
    
    const filePath = path.join(DATA_DIR, `${month}.json`);
    
    const data = {
      ...req.body,
      lastModified: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log(`💾 Sauvegarde: ${month}`);
    res.json({ success: true, message: 'Données sauvegardées' });
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Lire les paramètres globaux
app.get('/api/settings', async (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'settings.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const settings = JSON.parse(data);
    
    console.log('⚙️ Lecture des paramètres');
    res.json(settings);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Paramètres par défaut si le fichier n'existe pas
      const defaultSettings = {
        tarifHoraire: 4.5,
        tarifMajoration: 1.25,
        seuilMajoration: 9,
        fraisRepas: 5,
        fraisEntretien: 8,
        joursMenualises: 22
      };
      
      console.log('📋 Paramètres par défaut');
      res.json(defaultSettings);
    } else {
      console.error('❌ Erreur lecture paramètres:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
});

// API: Sauvegarder les paramètres globaux
app.post('/api/settings', async (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'settings.json');
    const settingsData = {
      ...req.body,
      lastModified: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(settingsData, null, 2), 'utf-8');
    
    console.log('⚙️ Paramètres sauvegardés');
    res.json({ success: true, message: 'Paramètres sauvegardés' });
  } catch (error) {
    console.error('❌ Erreur sauvegarde paramètres:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Lister tous les fichiers de données disponibles
app.get('/api/months', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const months = files
      .filter(file => file.match(/^\d{4}-\d{2}\.json$/))
      .map(file => file.replace('.json', ''))
      .sort();
    
    console.log(`📅 Mois disponibles: ${months.length}`);
    res.json(months);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Dossier data n'existe pas encore
      res.json([]);
    } else {
      console.error('❌ Erreur listage mois:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
});

// API: Santé du serveur
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    dataDir: DATA_DIR
  });
});

// ================================================
// FRONTEND (Production seulement)
// ================================================

// Route catch-all pour React Router (production seulement)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// ================================================
// GESTION D'ERREURS
// ================================================

// Middleware de gestion d'erreur globale
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// ================================================
// DÉMARRAGE DU SERVEUR
// ================================================

const startServer = async () => {
  try {
    // Créer le dossier data
    await ensureDataDir();
    
    // Démarrer le serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🍼 AssmatTracker Backend démarré !');
      console.log(`🚀 Serveur: http://localhost:${PORT}`);
      console.log(`📁 Dossier data: ${DATA_DIR}`);
      console.log(`🔧 Mode: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('💡 Frontend dev: http://localhost:3000');
      }
    });
  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error.message);
    process.exit(1);
  }
};

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Arrêt du serveur...');
  process.exit(0);
});

// Démarrer le serveur
startServer();