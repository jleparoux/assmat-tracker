const fs = require('fs').promises;
const path = require('path');

const { DATA_DIR } = require('../config');

const DEFAULT_SETTINGS = {
  tarifHoraire: 4.5,
  tarifMajoration: 1.25,
  seuilMajoration: 9,
  fraisRepas: 5,
  fraisEntretien: 8,
  joursMenualises: 22,
  moisPourMensualisation: 12,
  semainesPourMensualisation: 52,
  joursTravaillesParSemaine: 5,
  semainesTravailAnnee: 52,
  nbHeuresParSemaine: 9,
  salaireHoraireNet: 5.06,
  fraisEntretienJournalier: 5.0,
  fraisRepasParJournee: 0.0,
  salaireNetPlafond: 45.51,
};

const round = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const normalizeSettings = (settings = {}) => {
  const merged = { ...DEFAULT_SETTINGS, ...settings };

  // Harmonise les propriétés avec et sans faute de frappe
  if (merged.joursMensualises === undefined && merged.joursMenualises !== undefined) {
    merged.joursMensualises = merged.joursMenualises;
  }
  if (merged.joursMenualises === undefined && merged.joursMensualises !== undefined) {
    merged.joursMenualises = merged.joursMensualises;
  }

  return merged;
};

const calculateAnneeCompleteValues = (settings) => {
  const {
    moisPourMensualisation,
    semainesPourMensualisation,
    joursTravaillesParSemaine,
    semainesTravailAnnee,
    nbHeuresParSemaine,
    salaireHoraireNet,
  } = settings;

  if (
    !moisPourMensualisation ||
    !semainesPourMensualisation ||
    !joursTravaillesParSemaine ||
    !semainesTravailAnnee ||
    !nbHeuresParSemaine ||
    !salaireHoraireNet
  ) {
    return {
      nombreJoursMensualisation: 0,
      heuresTravailParSemaine: 0,
      nombreHeuresMensualisees: 0,
      salaireNetMensualise: 0,
      salaireNetJournalier: 0,
    };
  }

  const nombreJoursMensualisation = Math.round(
    (semainesTravailAnnee * joursTravaillesParSemaine) / moisPourMensualisation
  );

  const heuresTravailParSemaine = semainesTravailAnnee * nbHeuresParSemaine;

  const nombreHeuresMensualisees = Math.round(
    (nbHeuresParSemaine * semainesTravailAnnee) / moisPourMensualisation
  );

  const salaireNetMensualise = round(nombreHeuresMensualisees * salaireHoraireNet);
  const salaireNetJournalier = nombreJoursMensualisation > 0
    ? round(salaireNetMensualise / nombreJoursMensualisation)
    : 0;

  return {
    nombreJoursMensualisation,
    heuresTravailParSemaine,
    nombreHeuresMensualisees,
    salaireNetMensualise,
    salaireNetJournalier,
  };
};

const buildSettingsWithCalculated = (settings = {}) => {
  const normalized = normalizeSettings(settings);
  const calculatedValues = calculateAnneeCompleteValues(normalized);
  const combined = { ...normalized, ...calculatedValues };

  return {
    normalized,
    calculatedValues,
    combined,
  };
};

const loadSettings = async () => {
  const settingsPath = path.join(DATA_DIR, 'settings.json');

  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    const parsed = JSON.parse(data);
    return buildSettingsWithCalculated(parsed).combined;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    return buildSettingsWithCalculated(DEFAULT_SETTINGS).combined;
  }
};

const persistSettings = async (settings) => {
  const settingsPath = path.join(DATA_DIR, 'settings.json');
  const { normalized, calculatedValues, combined } = buildSettingsWithCalculated(settings);

  const payload = {
    ...combined,
    lastUpdated: new Date().toISOString(),
  };

  await fs.writeFile(settingsPath, JSON.stringify(payload, null, 2), 'utf-8');

  return {
    settings: { ...normalized },
    calculatedValues,
    storedSettings: payload,
  };
};

module.exports = {
  DEFAULT_SETTINGS,
  calculateAnneeCompleteValues,
  normalizeSettings,
  buildSettingsWithCalculated,
  loadSettings,
  persistSettings,
};
