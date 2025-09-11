// utils.js - Toutes les fonctions utilitaires pour AssmatTracker

// ============================================
// FONCTIONS DE DATE
// ============================================

export const formatDate = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();
  
  return { daysInMonth, startWeekday, year, month };
};

export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// ============================================
// FONCTIONS DE FORMATAGE
// ============================================

export const formatTimeFrench = (time) => {
  if (!time) return '';
  return time.replace(':', 'h');
};

export const formatTimeRangeFrench = (start, end) => {
  if (!start || !end) return '';
  return `${formatTimeFrench(start)} - ${formatTimeFrench(end)}`;
};

// ============================================
// CALCULS DE SALAIRE
// ============================================

export const calculateDayHours = (dayData, settings) => {
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

export const calculateDaySalary = (dayData, settings) => {
  const { normal, majore } = calculateDayHours(dayData, settings);
  const normalSalary = normal * settings.tarifHoraire;
  const majoredSalary = majore * settings.tarifHoraire * settings.tarifMajoration;
  return normalSalary + majoredSalary;
};

export const calculateMonthlyStats = (dailyData, settings) => {
  let totalHours = 0;
  let totalNormalHours = 0;
  let totalMajoredHours = 0;
  let totalSalary = 0;
  let workDays = 0;
  let congeDays = 0;
  let congeParentDays = 0;

  let daysWithMeals = 0;
  let daysWithMaintenance = 0;

  Object.values(dailyData).forEach(dayData => {
    if (dayData.status === 'conge-assmat') {
      congeDays++;
      if (dayData.fraisRepas) daysWithMeals++;
      if (dayData.fraisEntretien) daysWithMaintenance++;
    } else if (dayData.status === 'conge-parent') {
      congeParentDays++;
      if (dayData.fraisRepas) daysWithMeals++;
      if (dayData.fraisEntretien) daysWithMaintenance++;
    } else if (dayData.depot && dayData.reprise) {
      workDays++;
      const { normal, majore, total } = calculateDayHours(dayData, settings);
      totalNormalHours += normal;
      totalMajoredHours += majore;
      totalHours += total;
      totalSalary += calculateDaySalary(dayData, settings);
      if (dayData.fraisRepas) daysWithMeals++;
      if (dayData.fraisEntretien) daysWithMaintenance++;
    }
  });

  const fraisRepasTotal = daysWithMeals * settings.fraisRepas;
  const fraisEntretienTotal = daysWithMaintenance * settings.fraisEntretien;

  return {
    totalHours,
    meanHoursPerDays: workDays > 0 ? totalHours / workDays : 0,
    totalNormalHours,
    totalMajoredHours,
    totalSalary,
    workDays,
    daysWithMeals,
    daysWithMaintenance,
    congeDays,
    congeParentDays,
    fraisRepasTotal,
    fraisEntretienTotal,
    totalWithFrais: totalSalary + fraisRepasTotal + fraisEntretienTotal
  };
};

export const calculateAnnualStats = (monthsData, year, settings) => {
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
    let monthFraisRepas = 0;
    let monthFraisEntretien = 0;

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
        const { total } = calculateDayHours(dayData, settings);
        monthHours += total;
        monthSalary += calculateDaySalary(dayData, settings);
        if (dayData.fraisRepas) monthWithMealsDays++;
        if (dayData.fraisEntretien) monthWithMaintenanceDays++;
      }
    });

    monthFraisRepas = monthWithMealsDays * settings.fraisRepas;
    monthFraisEntretien = monthWithMaintenanceDays * settings.fraisEntretien;

    totalHours += monthHours;
    totalSalary += monthSalary;
    totalWorkDays += monthWorkDays;
    totalCongeDays += monthCongeDays;
    totalCongeParentDays += monthCongeParentDays;
    totalFraisRepas += monthFraisRepas;
    totalFraisEntretien += monthFraisEntretien;

    return {
      month,
      monthName: new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long' }),
      hours: monthHours,
      salary: monthSalary,
      workDays: monthWorkDays,
      congeDays: monthCongeDays,
      congeParentDays: monthCongeParentDays,
      fraisRepas: monthFraisRepas,
      fraisEntretien: monthFraisEntretien,
      total: monthSalary + monthFraisRepas + monthFraisEntretien
    };
  });

  const grandTotal = totalSalary + totalFraisRepas + totalFraisEntretien;
  const averageHoursPerMonth = totalHours / 12;
  const averageSalaryPerMonth = totalSalary / 12;

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalSalary: Math.round(totalSalary * 100) / 100,
    totalWorkDays,
    totalCongeDays,
    totalCongeParentDays,
    totalFraisRepas: Math.round(totalFraisRepas * 100) / 100,
    totalFraisEntretien: Math.round(totalFraisEntretien * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    averageHoursPerMonth: Math.round(averageHoursPerMonth * 10) / 10,
    averageSalaryPerMonth: Math.round(averageSalaryPerMonth * 100) / 100,
    monthlyDetails
  };
};

// ============================================
// CALCULS ANNÉE COMPLÈTE
// ============================================

/**
 * Calcule les valeurs selon la méthode année complète
 * @param {Object} settings - Paramètres de configuration
 * @returns {Object} Valeurs calculées
 */
export const calculateAnneeCompleteValues = (settings) => {
  const {
    moisPourMensualisation = 12,
    semainesPourMensualisation = 52,
    joursTravaillesParSemaine = 5,
    semainesTravailAnnee = 52,
    nbHeuresParSemaine = 9,
    salaireHoraireNet = 5.06
  } = settings;

  // Validation des entrées
  if (!moisPourMensualisation || !semainesPourMensualisation || !joursTravaillesParSemaine) {
    return {
      nombreJoursMensualisation: 0,
      heuresTravailParSemaine: 0,
      nombreHeuresMensualisees: 0,
      salaireNetMensualise: 0,
      salaireNetJournalier: 0
    };
  }

  // Calculs selon la méthode année complète
  const nombreJoursMensualisation = Math.round(
    (semainesTravailAnnee * joursTravaillesParSemaine) / moisPourMensualisation
  );

  const heuresTravailParSemaine = semainesTravailAnnee * nbHeuresParSemaine;

  const nombreHeuresMensualisees = Math.round(
    (nbHeuresParSemaine * semainesTravailAnnee) / moisPourMensualisation
  );

  const salaireNetMensualise = nombreHeuresMensualisees * salaireHoraireNet;
  const salaireNetJournalier = nombreJoursMensualisation > 0 
    ? salaireNetMensualise / nombreJoursMensualisation 
    : 0;

  return {
    nombreJoursMensualisation,
    heuresTravailParSemaine,
    nombreHeuresMensualisees,
    salaireNetMensualise: Math.round(salaireNetMensualise * 100) / 100,
    salaireNetJournalier: Math.round(salaireNetJournalier * 100) / 100
  };
};

/**
 * Valide les paramètres année complète
 * @param {Object} settings - Paramètres à valider
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateAnneeCompleteSettings = (settings) => {
  const errors = [];
  
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
    }
  ];

  validationRules.forEach(rule => {
    const value = settings[rule.field];
    if (value === undefined || value === null || isNaN(value)) {
      errors.push(`Le champ ${rule.field} est requis`);
    } else if (value < rule.min || value > rule.max) {
      errors.push(rule.message);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Formate les valeurs calculées pour l'affichage
 * @param {Object} calculatedValues - Valeurs calculées
 * @returns {Object} Valeurs formatées
 */
export const formatCalculatedValues = (calculatedValues) => {
  return {
    nombreJoursMensualisation: calculatedValues.nombreJoursMensualisation,
    heuresTravailParSemaine: `${calculatedValues.heuresTravailParSemaine}h`,
    nombreHeuresMensualisees: `${calculatedValues.nombreHeuresMensualisees}h`,
    salaireNetMensualise: `${calculatedValues.salaireNetMensualise.toFixed(2)}€`,
    salaireNetJournalier: `${calculatedValues.salaireNetJournalier.toFixed(2)}€`
  };
};

/**
 * Génère les formules utilisées pour les calculs
 * @param {Object} settings - Paramètres utilisés
 * @returns {Object} Formules formatées
 */
export const getCalculationFormulas = (settings) => {
  const {
    moisPourMensualisation = 12,
    joursTravaillesParSemaine = 5,
    semainesTravailAnnee = 52,
    nbHeuresParSemaine = 9,
    salaireHoraireNet = 5.06
  } = settings;

  return {
    nombreJoursMensualisation: `(${semainesTravailAnnee} × ${joursTravaillesParSemaine}) ÷ ${moisPourMensualisation}`,
    nombreHeuresMensualisees: `(${nbHeuresParSemaine} × ${semainesTravailAnnee}) ÷ ${moisPourMensualisation}`,
    salaireNetMensualise: `Heures mensualisées × ${salaireHoraireNet}€`,
    salaireNetJournalier: 'Salaire mensualisé ÷ Jours mensualisés'
  };
};

export const calculateTotalAnneeComplete = (monthlyStats) => {
  return monthlyStats.anneeComplete.salaireNetMensualise + 
         monthlyStats.fraisRepasTotal + 
         monthlyStats.fraisEntretienTotal;
};

// ============================================
// calculateMonthlyStatsExtended
// ============================================

/**
 * Version étendue de calculateMonthlyStats avec support année complète
 * @param {Object} dailyData - Données journalières
 * @param {Object} settings - Paramètres (avec nouveaux champs année complète)
 * @returns {Object} Statistiques mensuelles
 */
export const calculateMonthlyStatsExtended = (dailyData, settings) => {
  // Calculs existants (garder la logique actuelle)
  const existingStats = calculateMonthlyStats(dailyData, settings);
  
  // Ajout des calculs année complète
  const anneeCompleteValues = calculateAnneeCompleteValues(settings);
  
  return {
    ...existingStats,
    anneeComplete: anneeCompleteValues,
    // Comparaison avec les valeurs réelles vs mensualisées
    ecartMensualise: {
      joursTravailles: existingStats.workDays,
      joursTheorique: anneeCompleteValues.nombreJoursMensualisation,
      ecartJours: existingStats.workDays - anneeCompleteValues.nombreJoursMensualisation,
      salaireReel: existingStats.totalSalary,
      salaireMensualise: anneeCompleteValues.salaireNetMensualise,
    }
  };
};

/**
 * Hook personnalisé pour les calculs temps réel (pour React)
 * @param {Object} settings - Paramètres actuels
 * @returns {Object} Valeurs calculées en temps réel
 */
export const useAnneeCompleteCalculations = (settings) => {
  // Cette fonction sera utilisée dans un useEffect React
  return calculateAnneeCompleteValues(settings);
};

// ============================================
// UTILITAIRES POUR L'INTERFACE
// ============================================

/**
 * Génère les options de configuration pour l'interface
 * @returns {Object} Options de configuration
 */
export const getSettingsTabsConfig = () => {
  return {
    contract: {
      id: 'contract',
      label: 'Contrat',
      icon: 'Calendar',
      fields: [
        'moisPourMensualisation',
        'semainesPourMensualisation', 
        'joursTravaillesParSemaine',
        'semainesTravailAnnee',
        'nbHeuresParSemaine'
      ]
    },
    tarifs: {
      id: 'tarifs',
      label: 'Tarifs',
      icon: 'Euro',
      fields: [
        'salaireHoraireNet',
        'seuilMajoration',
        'tarifMajoration',
        'salaireNetPlafond'
      ]
    },
    frais: {
      id: 'frais',
      label: 'Frais',
      icon: 'Home',
      fields: [
        'fraisRepasParJournee',
        'fraisEntretienJournalier'
      ]
    },
    calculs: {
      id: 'calculs',
      label: 'Calculs',
      icon: 'Calculator',
      readonly: true
    }
  };
};

/**
 * Génère les labels pour les champs de paramètres
 * @returns {Object} Labels des champs
 */
export const getSettingsFieldLabels = () => {
  return {
    // Existants
    tarifHoraire: 'Tarif horaire (€)',
    tarifMajoration: 'Taux majoration (multiplicateur)',
    seuilMajoration: 'Seuil majoration (heures)',
    fraisRepas: 'Frais repas mensuels (€)',
    fraisEntretien: 'Frais entretien mensuels (€)',
    joursMenualises: 'Jours mensualisés',
    
    // Nouveaux année complète
    moisPourMensualisation: 'Mois pris en compte pour mensualisation',
    semainesPourMensualisation: 'Semaines prises en compte pour mensualisation',
    joursTravaillesParSemaine: 'Jours travaillés par semaine',
    semainesTravailAnnee: 'Semaines de travail sur l\'année',
    nbHeuresParSemaine: 'Nombre d\'heures par semaine',
    salaireHoraireNet: 'Salaire horaire net (€)',
    fraisEntretienJournalier: 'Frais d\'entretien journalier (€)',
    fraisRepasParJournee: 'Frais de repas par journée (€)',
    salaireNetPlafond: 'Salaire net plafond (€)'
  };
};