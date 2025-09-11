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
    
    // Charger toutes les données de l'année
    const monthsData = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const filePath = path.join(DATA_DIR, `${monthKey}.json`);
      
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const parsedData = JSON.parse(data);
        
        if (parsedData.dailyData && Object.keys(parsedData.dailyData).length > 0) {
          monthsData.push({
            month,
            data: parsedData.dailyData
          });
        }
      } catch (error) {
        // Fichier n'existe pas pour ce mois, continuer
        console.log(`📄 Pas de données pour ${monthKey}`);
      }
    }
    
    if (monthsData.length === 0) {
      console.log(`❌ Aucune donnée trouvée pour ${year}`);
      return res.json({
        year: yearNum,
        totalHours: 0,
        totalSalary: 0,
        totalWorkDays: 0,
        totalCongeDays: 0,
        totalCongeParentDays: 0,
        totalFraisRepas: 0,
        totalFraisEntretien: 0,
        grandTotal: 0,
        monthlyDetails: [],
        averageHoursPerMonth: 0,
        averageSalaryPerMonth: 0
      });
    }
    
    // Charger les paramètres pour les calculs
    let settings;
    try {
      const settingsPath = path.join(DATA_DIR, 'settings.json');
      const settingsData = await fs.readFile(settingsPath, 'utf-8');
      settings = JSON.parse(settingsData);
    } catch (error) {
      // Utiliser les paramètres par défaut
      settings = {
        tarifHoraire: 4.5,
        tarifMajoration: 1.25,
        seuilMajoration: 9,
        fraisRepas: 5,
        fraisEntretien: 8,
        joursMenualises: 22
      };
    }
    
    console.log(`⚙️ Utilisation des paramètres:`, settings);
    
    // Fonction de calcul des heures d'un jour
    const calculateDayHours = (dayData) => {
      if (!dayData.depot || !dayData.reprise) return { normal: 0, majore: 0, total: 0 };
      
      const [startH, startM] = dayData.depot.split(':').map(Number);
      const [endH, endM] = dayData.reprise.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const totalMinutes = endMinutes - startMinutes;
      const totalHours = totalMinutes / 60;
      
      if (totalHours <= settings.seuilMajoration) {
        return { normal: totalHours, majore: 0, total: totalHours };
      } else {
        const normalHours = settings.seuilMajoration;
        const majoredHours = totalHours - settings.seuilMajoration;
        return { normal: normalHours, majore: majoredHours, total: totalHours };
      }
    };
    
    // Fonction de calcul du salaire d'un jour
    const calculateDaySalary = (dayData) => {
      const { normal, majore } = calculateDayHours(dayData);
      const normalSalary = normal * settings.tarifHoraire;
      const majoredSalary = majore * settings.tarifHoraire * settings.tarifMajoration;
      return normalSalary + majoredSalary;
    };
    
    // Calculer les statistiques
    let totalHours = 0;
    let totalSalary = 0;
    let totalWorkDays = 0;
    let totalCongeDays = 0;
    let totalCongeParentDays = 0;
    let totalFraisRepas = 0;
    let totalFraisEntretien = 0;
    
    const monthlyDetails = monthsData.map(({ month, data }) => {
      let monthHours = 0;
      let monthSalary = 0;
      let monthWorkDays = 0;
      let monthCongeDays = 0;
      let monthCongeParentDays = 0;
      let monthWithMealsDays = 0;
      let monthWithMaintenanceDays = 0;
      
      Object.values(data).forEach(dayData => {
        if (dayData.status === 'conge-assmat') {
          monthCongeDays++;
          if (dayData.fraisRepas) monthWithMealsDays++;
          if (dayData.fraisEntretien) monthWithMaintenanceDays++;
        } else if (dayData.status === 'conge-parent') {
          monthCongeParentDays++;
          if (dayData.fraisRepas) monthWithMealsDays++;
          if (dayData.fraisEntretien) monthWithMaintenanceDays++;
        } else if (dayData.depot && dayData.reprise) {
          monthWorkDays++;
          const { total } = calculateDayHours(dayData);
          monthHours += total;
          monthSalary += calculateDaySalary(dayData);
          if (dayData.fraisRepas) monthWithMealsDays++;
          if (dayData.fraisEntretien) monthWithMaintenanceDays++;
        }
      });
      
      const monthFraisRepas = monthWithMealsDays * settings.fraisRepas;
      const monthFraisEntretien = monthWithMaintenanceDays * settings.fraisEntretien;
      
      totalHours += monthHours;
      totalSalary += monthSalary;
      totalWorkDays += monthWorkDays;
      totalCongeDays += monthCongeDays;
      totalCongeParentDays += monthCongeParentDays;
      totalFraisRepas += monthFraisRepas;
      totalFraisEntretien += monthFraisEntretien;
      
      return {
        month,
        monthName: new Date(yearNum, month - 1).toLocaleDateString('fr-FR', { month: 'long' }),
        hours: Math.round(monthHours * 100) / 100,
        salary: Math.round(monthSalary * 100) / 100,
        workDays: monthWorkDays,
        congeDays: monthCongeDays,
        congeParentDays: monthCongeParentDays,
        fraisRepas: Math.round(monthFraisRepas * 100) / 100,
        fraisEntretien: Math.round(monthFraisEntretien * 100) / 100,
        total: Math.round((monthSalary + monthFraisRepas + monthFraisEntretien) * 100) / 100
      };
    });
    
    const result = {
      year: yearNum,
      totalHours: Math.round(totalHours * 100) / 100,
      totalSalary: Math.round(totalSalary * 100) / 100,
      totalWorkDays,
      totalCongeDays,
      totalCongeParentDays,
      totalFraisRepas: Math.round(totalFraisRepas * 100) / 100,
      totalFraisEntretien: Math.round(totalFraisEntretien * 100) / 100,
      grandTotal: Math.round((totalSalary + totalFraisRepas + totalFraisEntretien) * 100) / 100,
      monthlyDetails,
      averageHoursPerMonth: Math.round((totalHours / 12) * 100) / 100,
      averageSalaryPerMonth: Math.round((totalSalary / 12) * 100) / 100
    };
    
    console.log(`✅ Statistiques calculées pour ${year}:`, {
      totalHours: result.totalHours,
      totalWorkDays: result.totalWorkDays,
      monthsWithData: monthsData.length
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur calcul statistiques annuelles:', error.message);
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
      // Nouveaux paramètres par défaut avec méthode année complète
      const defaultSettings = {
        // Paramètres existants
        tarifHoraire: 4.5,
        tarifMajoration: 1.25,
        seuilMajoration: 9,
        fraisRepas: 5,
        fraisEntretien: 8,
        joursMenualises: 22,
        
        // Nouveaux paramètres pour la méthode année complète
        moisPourMensualisation: 12,
        semainesPourMensualisation: 52,
        joursTravaillesParSemaine: 5,
        semainesTravailAnnee: 52,
        nbHeuresParSemaine: 9,
        salaireHoraireNet: 5.06,
        fraisEntretienJournalier: 5.00,
        fraisRepasParJournee: 0.00,
        salaireNetPlafond: 45.51
      };
      
      console.log('📄 Paramètres par défaut avec méthode année complète');
      res.json(defaultSettings);
    } else {
      console.error('❌ Erreur lecture paramètres:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
});

// 2. FONCTIONS DE CALCUL ANNÉE COMPLÈTE
const calculateAnneeCompleteValues = (settings) => {
  const {
    moisPourMensualisation,
    semainesPourMensualisation,
    joursTravaillesParSemaine,
    semainesTravailAnnee,
    nbHeuresParSemaine,
    salaireHoraireNet
  } = settings;

  // Calculs selon la méthode année complète
  const nombreJoursMensualisation = Math.round(
    (semainesTravailAnnee * joursTravaillesParSemaine) / moisPourMensualisation
  );

  const nombreHeuresMensualisees = Math.round(
    (nbHeuresParSemaine * semainesTravailAnnee) / moisPourMensualisation
  );

  const salaireNetMensualise = nombreHeuresMensualisees * salaireHoraireNet;
  const salaireNetJournalier = salaireNetMensualise / nombreJoursMensualisation;

  return {
    nombreJoursMensualisation,
    nombreHeuresMensualisees,
    salaireNetMensualise: Math.round(salaireNetMensualise * 100) / 100,
    salaireNetJournalier: Math.round(salaireNetJournalier * 100) / 100
  };
};

// API: Sauvegarder les paramètres
app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    
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
    
    const filePath = path.join(DATA_DIR, 'settings.json');
    
    // Calculs automatiques
    const calculatedValues = calculateAnneeCompleteValues(settings);
    
    // Ajouter métadonnées et calculs automatiques
    const settingsData = {
      ...settings,
      ...calculatedValues,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(settingsData, null, 2), 'utf-8');
    
    console.log('⚙️ Paramètres sauvegardés avec calculs automatiques');
    res.json({ 
      success: true, 
      message: 'Paramètres sauvegardés avec succès', 
      calculatedValues 
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
    const filePath = path.join(DATA_DIR, 'settings.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const settings = JSON.parse(data);
    
    const calculations = calculateAnneeCompleteValues(settings);
    
    console.log('🧮 Calculs récupérés depuis les paramètres sauvegardés');
    res.json(calculations);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Utiliser les paramètres par défaut pour les calculs
      const defaultSettings = {
        moisPourMensualisation: 12,
        semainesPourMensualisation: 52,
        joursTravaillesParSemaine: 5,
        semainesTravailAnnee: 52,
        nbHeuresParSemaine: 9,
        salaireHoraireNet: 5.06
      };
      
      const calculations = calculateAnneeCompleteValues(defaultSettings);
      console.log('🧮 Calculs avec paramètres par défaut');
      res.json(calculations);
    } else {
      console.error('❌ Erreur récupération calculs:', error.message);
      res.status(500).json({ error: error.message });
    }
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