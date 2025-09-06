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

    console.log(`📖 Données chargées pour ${month}:`, parsedData);

    // console.log(`📖 Lecture des données: ${month}`);
    res.json(parsedData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Fichier n'existe pas, retourner données vides avec structure correcte
      console.log(`📄 Nouveau mois: ${req.params.month}`);
      res.json({ dailyData: {} });
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
    const { dailyData } = req.body;

    // debug log
    console.log('📥 POST reçu pour mois:', month);
    console.log('📦 Body reçu:', req.body);
    console.log('📊 dailyData extraite:', dailyData);
    console.log('📊 Type dailyData:', typeof dailyData);
    
    // Validation du format mois
    if (!/^\d{4}-\d{2}$/.test(month)) {
        console.log('❌ Format mois invalide');
        return res.status(400).json({ error: 'Format de mois invalide (attendu: YYYY-MM)' });
    }
    
    // Validation des données
    if (!dailyData || typeof dailyData !== 'object') {
        console.log('❌ Données dailyData invalides');
        return res.status(400).json({ error: 'Données dailyData manquantes ou invalides' });
    }
    
    const filePath = path.join(DATA_DIR, `${month}.json`);
    
    // Structure des données à sauvegarder
    const dataToSave = {
      month,
      dailyData,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    
    console.log(`💾 Données sauvegardées: ${month}`);
    res.json({ success: true, message: 'Données sauvegardées avec succès' });
  } catch (error) {
    console.error('❌ Erreur sauvegarde données:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Lire les paramètres
app.get('/api/settings', async (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'settings.json');
    
    const data = await fs.readFile(filePath, 'utf-8');
    const settings = JSON.parse(data);
    
    console.log('⚙️ Paramètres chargés');
    res.json(settings);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Fichier n'existe pas, retourner paramètres par défaut
      const defaultSettings = {
        tarifHoraire: 4.5,
        tarifMajoration: 1.25,
        seuilMajoration: 9,
        fraisRepas: 5,
        fraisEntretien: 8,
        joursMenualises: 22
      };
      
      console.log('📄 Paramètres par défaut');
      res.json(defaultSettings);
    } else {
      console.error('❌ Erreur lecture paramètres:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
});

// API: Sauvegarder les paramètres
app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Validation des paramètres requis
    const requiredFields = ['tarifHoraire', 'tarifMajoration', 'seuilMajoration', 'fraisRepas', 'fraisEntretien', 'joursMenualises'];
    const missingFields = requiredFields.filter(field => settings[field] === undefined || settings[field] === null);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Champs manquants: ${missingFields.join(', ')}` 
      });
    }
    
    // Validation des types
    const numericFields = requiredFields;
    for (const field of numericFields) {
      if (typeof settings[field] !== 'number' || isNaN(settings[field])) {
        return res.status(400).json({ 
          error: `Le champ ${field} doit être un nombre valide` 
        });
      }
    }
    
    const filePath = path.join(DATA_DIR, 'settings.json');
    
    // Ajouter métadonnées
    const settingsData = {
      ...settings,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(settingsData, null, 2), 'utf-8');
    
    console.log('⚙️ Paramètres sauvegardés');
    res.json({ success: true, message: 'Paramètres sauvegardés avec succès' });
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

// API: Supprimer les données d'un mois
app.delete('/api/data/:month', async (req, res) => {
  try {
    const { month } = req.params;
    
    // Validation du format mois
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Format de mois invalide (attendu: YYYY-MM)' });
    }
    
    const filePath = path.join(DATA_DIR, `${month}.json`);
    
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Données supprimées: ${month}`);
      res.json({ success: true, message: `Données du mois ${month} supprimées` });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: `Aucune donnée trouvée pour le mois ${month}` });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Erreur suppression données:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Export complet des données
app.get('/api/export', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const dataFiles = files.filter(file => file.match(/^\d{4}-\d{2}\.json$/));
    
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      months: {}
    };
    
    // Charger les paramètres
    try {
      const settingsPath = path.join(DATA_DIR, 'settings.json');
      const settingsData = await fs.readFile(settingsPath, 'utf-8');
      exportData.settings = JSON.parse(settingsData);
    } catch (error) {
      console.log('⚠️ Aucun paramètre trouvé pour l\'export');
    }
    
    // Charger tous les mois
    for (const file of dataFiles) {
      const monthKey = file.replace('.json', '');
      const filePath = path.join(DATA_DIR, file);
      
      try {
        const monthData = await fs.readFile(filePath, 'utf-8');
        exportData.months[monthKey] = JSON.parse(monthData);
      } catch (error) {
        console.error(`❌ Erreur lecture ${file}:`, error.message);
      }
    }
    
    console.log(`📦 Export complet: ${Object.keys(exportData.months).length} mois`);
    res.json(exportData);
  } catch (error) {
    console.error('❌ Erreur export:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Import complet des données
app.post('/api/import', async (req, res) => {
  try {
    const { months, settings } = req.body;
    
    if (!months || typeof months !== 'object') {
      return res.status(400).json({ error: 'Données de mois manquantes ou invalides' });
    }
    
    let importedMonths = 0;
    let errors = [];
    
    // Importer les paramètres
    if (settings) {
      try {
        const settingsPath = path.join(DATA_DIR, 'settings.json');
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        console.log('⚙️ Paramètres importés');
      } catch (error) {
        errors.push(`Erreur import paramètres: ${error.message}`);
      }
    }
    
    // Importer les données de chaque mois
    for (const [monthKey, monthData] of Object.entries(months)) {
      if (!/^\d{4}-\d{2}$/.test(monthKey)) {
        errors.push(`Format de mois invalide: ${monthKey}`);
        continue;
      }
      
      try {
        const filePath = path.join(DATA_DIR, `${monthKey}.json`);
        await fs.writeFile(filePath, JSON.stringify(monthData, null, 2), 'utf-8');
        importedMonths++;
        console.log(`📥 Mois importé: ${monthKey}`);
      } catch (error) {
        errors.push(`Erreur import ${monthKey}: ${error.message}`);
      }
    }
    
    const response = {
      success: true,
      importedMonths,
      totalMonths: Object.keys(months).length,
      message: `Import terminé: ${importedMonths} mois importés`
    };
    
    if (errors.length > 0) {
      response.errors = errors;
      response.message += ` avec ${errors.length} erreur(s)`;
    }
    
    res.json(response);
  } catch (error) {
    console.error('❌ Erreur import:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Santé du serveur
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    dataDir: DATA_DIR,
    uptime: process.uptime()
  });
});

// API: Statistiques générales
app.get('/api/stats', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const dataFiles = files.filter(file => file.match(/^\d{4}-\d{2}\.json$/));
    
    let totalDays = 0;
    let totalHours = 0;
    const monthsData = [];
    
    for (const file of dataFiles) {
      const monthKey = file.replace('.json', '');
      const filePath = path.join(DATA_DIR, file);
      
      try {
        const monthData = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(monthData);
        
        if (parsed.dailyData) {
          const monthDays = Object.keys(parsed.dailyData).length;
          totalDays += monthDays;
          
          // Calculer les heures pour ce mois
          let monthHours = 0;
          Object.values(parsed.dailyData).forEach(day => {
            if (day.depot && day.reprise) {
              // Calcul des heures
              const [startH, startM] = day.depot.split(':').map(Number);
              const [endH, endM] = day.reprise.split(':').map(Number);
              const startMinutes = startH * 60 + startM;
              const endMinutes = endH * 60 + endM;
              let totalMinutes = endMinutes - startMinutes;
              if (totalMinutes < 0) totalMinutes += 24 * 60;
              monthHours += totalMinutes / 60;
            }
          });
          
          totalHours += monthHours;
          monthsData.push({
            month: monthKey,
            days: monthDays,
            hours: Math.round(monthHours * 10) / 10
          });
        }
      } catch (error) {
        console.error(`❌ Erreur stats ${file}:`, error.message);
      }
    }
    
    const stats = {
      totalMonths: dataFiles.length,
      totalDays,
      totalHours: Math.round(totalHours * 10) / 10,
      averageHoursPerDay: totalDays > 0 ? Math.round((totalHours / totalDays) * 10) / 10 : 0,
      monthsData,
      dataDirectory: DATA_DIR
    };
    
    console.log(`📊 Statistiques: ${stats.totalMonths} mois, ${stats.totalDays} jours, ${stats.totalHours}h`);
    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur statistiques:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Récupérer les jours fériés d'une année
app.get('/api/holidays/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validation de l'année
    if (!/^\d{4}$/.test(year) || year < 2020 || year > 2030) {
      return res.status(400).json({ error: 'Année invalide (2020-2030)' });
    }
    
    // Vérifier le cache local
    const cacheFile = path.join(DATA_DIR, `holidays-${year}.json`);
    
    try {
      const cached = await fs.readFile(cacheFile, 'utf-8');
      const cachedData = JSON.parse(cached);
      
      // Vérifier si le cache n'est pas trop ancien (30 jours)
      const cacheAge = Date.now() - new Date(cachedData.cachedAt).getTime();
      if (cacheAge < 30 * 24 * 60 * 60 * 1000) {
        console.log(`🎉 Jours fériés ${year} (cache)`);
        return res.json(cachedData.holidays);
      }
    } catch (error) {
      // Cache n'existe pas ou invalide, on continue
    }
    
    // Récupérer depuis l'API gouvernementale
    const fetch = require('node-fetch');
    const apiUrl = `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`;
    
    const apiResponse = await fetch(apiUrl);
    if (!apiResponse.ok) {
      throw new Error(`Erreur API: ${apiResponse.status}`);
    }
    
    const holidays = await apiResponse.json();
    
    // Sauvegarder dans le cache
    const cacheData = {
      holidays,
      year: parseInt(year),
      cachedAt: new Date().toISOString()
    };
    
    await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2), 'utf-8');
    
    console.log(`🎉 Jours fériés ${year} récupérés`);
    res.json(holidays);
    
  } catch (error) {
    console.error('❌ Erreur jours fériés:', error.message);
    
    // Fallback avec jours fériés fixes si l'API échoue
    const fallbackHolidays = {
      [`${req.params.year}-01-01`]: "Jour de l'An",
      [`${req.params.year}-05-01`]: "Fête du Travail", 
      [`${req.params.year}-05-08`]: "Fête de la Victoire",
      [`${req.params.year}-07-14`]: "Fête Nationale",
      [`${req.params.year}-08-15`]: "Assomption",
      [`${req.params.year}-11-01`]: "Toussaint",
      [`${req.params.year}-11-11`]: "Armistice",
      [`${req.params.year}-12-25`]: "Noël"
    };
    
    res.json(fallbackHolidays);
  }
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
      console.log(`📡 Serveur: http://localhost:${PORT}`);
      console.log(`📁 Données: ${DATA_DIR}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('📋 API disponibles:');
      console.log('  GET  /api/health           - Santé du serveur');
      console.log('  GET  /api/stats            - Statistiques générales');
      console.log('  GET  /api/months           - Liste des mois disponibles');
      console.log('  GET  /api/data/:month      - Données d\'un mois');
      console.log('  POST /api/data/:month      - Sauvegarder un mois');
      console.log('  DEL  /api/data/:month      - Supprimer un mois');
      console.log('  GET  /api/settings         - Paramètres');
      console.log('  POST /api/settings         - Sauvegarder paramètres');
      console.log('  GET  /api/export           - Export complet');
      console.log('  POST /api/import           - Import complet');
      console.log('');
      console.log('✅ Prêt à recevoir des requêtes !');
    });
  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error);
    process.exit(1);
  }
};

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur en cours...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur demandé...');
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  console.error('  Promise:', promise);
  process.exit(1);
});

// Démarrer le serveur
startServer();

module.exports = app;