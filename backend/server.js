// AssmatTracker Backend Server
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const { DATA_DIR } = require('./config');
const {
  DEFAULT_SETTINGS,
  calculateAnneeCompleteValues,
  loadSettings,
  persistSettings,
} = require('./services/settings');
const {
  computeMonthlyStats,
  computeAnnualStats,
} = require('./services/statistics');

const app = express();
const PORT = process.env.PORT || 3001;

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

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Format de mois invalide (attendu: YYYY-MM)' });
    }

    const settings = await loadSettings();
    const filePath = path.join(DATA_DIR, `${month}.json`);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsedData = JSON.parse(data);
      const dailyData = parsedData.dailyData || {};
      const monthlyStats = computeMonthlyStats(dailyData, settings);

      console.log(`📖 Données chargées pour ${month}`);

      res.json({
        month,
        dailyData,
        lastUpdated: parsedData.lastUpdated || null,
        stats: {
          monthly: monthlyStats,
        },
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📄 Nouveau mois: ${month}`);
        const monthlyStats = computeMonthlyStats({}, settings);

        res.json({
          month,
          dailyData: {},
          lastUpdated: null,
          stats: {
            monthly: monthlyStats,
          },
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Erreur lecture données:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Sauvegarder les données d'un mois
app.post('/api/data/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const { dailyData } = req.body;

    console.log('📥 POST reçu pour mois:', month);
    console.log('📦 Body reçu:', req.body);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      console.log('❌ Format mois invalide');
      return res.status(400).json({ error: 'Format de mois invalide (attendu: YYYY-MM)' });
    }

    if (!dailyData || typeof dailyData !== 'object') {
      console.log('❌ Données dailyData invalides');
      return res.status(400).json({ error: 'Données dailyData manquantes ou invalides' });
    }

    const settings = await loadSettings();
    const filePath = path.join(DATA_DIR, `${month}.json`);

    const dataToSave = {
      month,
      dailyData,
      lastUpdated: new Date().toISOString(),
    };

    await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');

    const monthlyStats = computeMonthlyStats(dailyData, settings);

    console.log(`💾 Données sauvegardées: ${month}`);
    res.json({
      success: true,
      message: 'Données sauvegardées avec succès',
      stats: {
        monthly: monthlyStats,
      },
      lastUpdated: dataToSave.lastUpdated,
    });
  } catch (error) {
    console.error('❌ Erreur sauvegarde données:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// API: Calculer les statistiques annuelles
// ========================================

app.get('/api/annual/:year', async (req, res) => {
  try {
    const { year } = req.params;

    // Validation de l'année
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ error: 'Année invalide' });
    }

    console.log(`📊 Calcul des statistiques annuelles pour ${year}`);

    const settings = await loadSettings();
    const monthsData = [];

    for (let month = 1; month <= 12; month++) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const filePath = path.join(DATA_DIR, `${monthKey}.json`);

      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const parsedData = JSON.parse(data);

        if (parsedData.dailyData && Object.keys(parsedData.dailyData).length > 0) {
          monthsData.push({
            monthKey,
            dailyData: parsedData.dailyData,
          });
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`📄 Pas de données pour ${monthKey}`);
        } else {
          console.error(`❌ Erreur lecture ${monthKey}:`, error.message);
        }
      }
    }

    const result = computeAnnualStats(monthsData, settings, yearNum);

    if (monthsData.length === 0) {
      console.log(`❌ Aucune donnée trouvée pour ${year}`);
    } else {
      console.log(`✅ Statistiques calculées pour ${year}:`, {
        totalHours: result.totalHours,
        totalWorkDays: result.totalWorkDays,
        monthsWithData: monthsData.length,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Erreur calcul statistiques annuelles:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Lire les paramètres
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await loadSettings();
    console.log('⚙️ Paramètres chargés');
    res.json(settings);
  } catch (error) {
    console.error('❌ Erreur lecture paramètres:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Sauvegarder les paramètres
app.post('/api/settings', async (req, res) => {
  try {
    const incomingSettings = req.body || {};
    const settings = { ...incomingSettings };

    if (settings.joursMensualises !== undefined && settings.joursMenualises === undefined) {
      settings.joursMenualises = settings.joursMensualises;
    }

    // Validation des paramètres requis (mise à jour)
    const requiredFields = [
      // Champs existants
      'tarifHoraire', 'tarifMajoration', 'seuilMajoration',
      'fraisRepas', 'fraisEntretien', 'joursMenualises',
      
      // Nouveaux champs année complète
      'moisPourMensualisation', 'semainesPourMensualisation', 
      'joursTravaillesParSemaine', 'semainesTravailAnnee', 
      'nbHeuresParSemaine', 'salaireHoraireNet', 
      'fraisEntretienJournalier', 'fraisRepasParJournee', 
      'salaireNetPlafond'
    ];
    
    const missingFields = requiredFields.filter(field => 
      settings[field] === undefined || settings[field] === null
    );
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Champs manquants: ${missingFields.join(', ')}` 
      });
    }
    
    // Validation des types numériques
    for (const field of requiredFields) {
      if (typeof settings[field] !== 'number' || isNaN(settings[field])) {
        return res.status(400).json({ 
          error: `Le champ ${field} doit être un nombre valide` 
        });
      }
    }
    
    // Validation des règles métier
    const validationRules = [
      {
        field: 'moisPourMensualisation',
        min: 1, max: 12,
        message: 'Le nombre de mois pour mensualisation doit être entre 1 et 12'
      },
      {
        field: 'semainesPourMensualisation',
        min: 1, max: 53,
        message: 'Le nombre de semaines pour mensualisation doit être entre 1 et 53'
      },
      {
        field: 'joursTravaillesParSemaine',
        min: 1, max: 7,
        message: 'Le nombre de jours travaillés par semaine doit être entre 1 et 7'
      },
      {
        field: 'semainesTravailAnnee',
        min: 1, max: 53,
        message: 'Le nombre de semaines de travail par année doit être entre 1 et 53'
      },
      {
        field: 'nbHeuresParSemaine',
        min: 0.5, max: 168,
        message: 'Le nombre d\'heures par semaine doit être entre 0.5 et 168'
      },
      {
        field: 'salaireHoraireNet',
        min: 0.01, max: 1000,
        message: 'Le salaire horaire net doit être entre 0.01 et 1000€'
      },
      {
        field: 'salaireNetPlafond',
        min: 0.01, max: 1000,
        message: 'Le salaire net plafond doit être entre 0.01 et 1000€'
      }
    ];

    for (const rule of validationRules) {
      const value = settings[rule.field];
      if (value < rule.min || value > rule.max) {
        return res.status(400).json({ error: rule.message });
      }
    }
    
    const { calculatedValues, storedSettings } = await persistSettings(settings);

    console.log('⚙️ Paramètres sauvegardés avec calculs automatiques');
    res.json({
      success: true,
      message: 'Paramètres sauvegardés avec succès',
      calculatedValues,
      settings: storedSettings,
    });
  } catch (error) {
    console.error('❌ Erreur sauvegarde paramètres:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calculations', async (req, res) => {
  try {
    const settings = req.body;
    
    // Validation des champs requis pour les calculs
    const requiredForCalculation = [
      'moisPourMensualisation', 'semainesPourMensualisation', 
      'joursTravaillesParSemaine', 'semainesTravailAnnee', 
      'nbHeuresParSemaine', 'salaireHoraireNet'
    ];
    
    const missingFields = requiredForCalculation.filter(field => 
      settings[field] === undefined || settings[field] === null || isNaN(settings[field])
    );
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Champs manquants pour le calcul: ${missingFields.join(', ')}` 
      });
    }
    
    const calculations = calculateAnneeCompleteValues(settings);
    
    console.log('🧮 Calculs temps réel générés');
    res.json(calculations);
  } catch (error) {
    console.error('❌ Erreur calculs temps réel:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calculations', async (req, res) => {
  try {
    const settings = await loadSettings();
    const calculations = calculateAnneeCompleteValues(settings);

    console.log('🧮 Calculs récupérés depuis les paramètres sauvegardés');
    res.json(calculations);
  } catch (error) {
    console.error('❌ Erreur récupération calculs:', error.message);
    const fallback = calculateAnneeCompleteValues(DEFAULT_SETTINGS);
    res.status(500).json({ error: error.message, fallback });
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
      exportData.settings = await loadSettings();
    } catch (error) {
      console.log('⚠️ Impossible de charger les paramètres pour l\'export:', error.message);
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

    const settings = await loadSettings();

    for (const file of dataFiles) {
      const monthKey = file.replace('.json', '');
      const filePath = path.join(DATA_DIR, file);

      try {
        const monthData = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(monthData);
        const dailyData = parsed.dailyData || {};

        if (Object.keys(dailyData).length > 0) {
          const monthDays = Object.keys(dailyData).length;
          const monthStats = computeMonthlyStats(dailyData, settings);

          totalDays += monthDays;
          totalHours += monthStats.totalHours;

          monthsData.push({
            month: monthKey,
            days: monthDays,
            hours: Math.round(monthStats.totalHours * 10) / 10,
            salary: monthStats.totalSalary,
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