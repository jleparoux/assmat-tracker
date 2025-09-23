import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, Save, BarChart3, Plus, X, Copy, Trash2, Upload, Download } from 'lucide-react';

import {
  formatDate,
  calculateTotalAnneeComplete,
  calculateAnneeCompleteValues,
  validateAnneeCompleteSettings
} from './utils';
import { DayModal, SettingsModal, DuplicateModal, AnnualView } from './modals';
import Calendar from './calendar';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

const App = () => {
  // États de base
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dailyData, setDailyData] = useState({});
  const [settings, setSettings] = useState({
    tarifHoraire: 4.50,
    tarifMajoration: 1.25,
    seuilMajoration: 9.0,
    fraisRepas: 30.0,
    fraisEntretien: 15.0,
    joursMensualises: 22,
    moisPourMensualisation: 12,
    semainesPourMensualisation: 52,
    joursTravaillesParSemaine: 5,
    semainesTravailAnnee: 52,
    nbHeuresParSemaine: 9,
    salaireHoraireNet: 5.06,
    fraisEntretienJournalier: 5.00,
    fraisRepasParJournee: 0.00,
    salaireNetPlafond: 45.51
  });
  const [calculatedValues, setCalculatedValues] = useState({
    nombreJoursMensualisation: 22,
    heuresTravailParSemaine: 468,
    nombreHeuresMensualisees: 195,
    salaireNetMensualise: 987.07,
    salaireNetJournalier: 44.87
  });
  const [monthlyStats, setMonthlyStats] = useState(null);
  
  // États UI
  const [loading, setLoading] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAnnualView, setShowAnnualView] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [annualStats, setAnnualStats] = useState(null);
  const [loadingAnnual, setLoadingAnnual] = useState(false);
  const [holidays, setHolidays] = useState({});
  
  // États sélection multiple
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [duplicateSource, setDuplicateSource] = useState(null);

  // Détection OS pour les raccourcis
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'Cmd' : 'Ctrl';

  const getEcartBadgeClasses = (value) => {
    if (!Number.isFinite(value)) {
      return 'bg-gray-100 text-gray-500';
    }
    if (value > 0) {
      return 'bg-green-100 text-green-700';
    }
    if (value < 0) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const formatSignedValue = (value, digits = 0, suffix = '') => {
    if (!Number.isFinite(value)) {
      const zeroValue = (0).toFixed(digits);
      return `${zeroValue}${suffix}`;
    }

    const formatted = value.toFixed(digits);
    const sign = value > 0 ? '+' : '';

    return `${sign}${formatted}${suffix}`;
  };

  // get holidays
  const loadHolidays = async (year) => {
    try {
      const response = await fetch(`${API_BASE}/api/holidays/${year}`);
      if (response.ok) {
        const holidaysData = await response.json();
        setHolidays(holidaysData);
        return holidaysData;
      }
    } catch (error) {
      console.error('Erreur chargement jours fériés:', error);
    }
    return {};
  };

  // Fonction pour vérifier si une date est fériée
  const isHoliday = (date) => {
    if (!holidays || typeof holidays !== 'object') return false;
    const dateKey = formatDate(date);
    return holidays[dateKey] !== undefined;
  };

  // Fonction pour obtenir le nom du jour férié
  const getHolidayName = (date) => {
    if (!holidays || typeof holidays !== 'object') return null;
    const dateKey = formatDate(date);
    return holidays[dateKey] || null;
  };

  const updateHolidaysStatus = async (monthData, holidays) => {
    if (!holidays || typeof holidays !== 'object') return monthData;
    
    const updatedData = { ...monthData };
    let hasChanges = false;
    
    Object.keys(holidays).forEach(dateKey => {
      // Vérifier si la date est dans le mois courant
      const [year, month] = dateKey.split('-');
      const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const dataMonthKey = `${year}-${month}`;
      
      if (dataMonthKey === currentMonthKey) {
        // Si le jour existe dans les données mais n'est pas marqué comme férié
        if (updatedData[dateKey] && updatedData[dateKey].status !== 'ferie') {
          updatedData[dateKey] = { ...updatedData[dateKey], status: 'ferie' };
          hasChanges = true;
        }
        // Si le jour n'existe pas dans les données, le créer comme jour férié
        else if (!updatedData[dateKey]) {
          updatedData[dateKey] = { status: 'ferie' };
          hasChanges = true;
        }
      }
    });
    
    return hasChanges ? updatedData : monthData;
  };

  // API calls
  const loadMonthData = async (date) => {
    setLoading(true);
    try {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`${API_BASE}/api/data/${monthKey}`);

      if (response.ok) {
        const data = await response.json();
        setDailyData(data.dailyData || {});
        setMonthlyStats(data.stats?.monthly || null);
      } else if (response.status === 404) {
        setDailyData({});
        setMonthlyStats(null);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setDailyData({});
      setMonthlyStats(null);
    } finally {
      setLoading(false);
    }
  };

  const saveMonthData = async (date, data) => {
    console.log('💾 Données à sauvegarder:', data);
    console.log('📦 Payload envoyé:', { dailyData: data });

    try {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`${API_BASE}/api/data/${monthKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyData: data })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (payload?.error) {
          console.error('❌ Détails erreur 400:', payload);
        }
        return null;
      }

      if (payload?.stats?.monthly) {
        setMonthlyStats(payload.stats.monthly);
      }

      return payload;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      return null;
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings`);
      if (response.ok) {
        const loadedSettings = await response.json();
        console.log('⚙️ Paramètres chargés:', loadedSettings);
        
        // Séparer les paramètres des valeurs calculées
        const { 
          nombreJoursMensualisation, 
          heuresTravailParSemaine,
          nombreHeuresMensualisees,
          salaireNetMensualise,
          salaireNetJournalier,
          lastUpdated,
          ...settingsOnly 
        } = loadedSettings;
        
        setSettings(settingsOnly);
        
        // Si des valeurs calculées sont présentes, les utiliser
        if (nombreJoursMensualisation !== undefined) {
          setCalculatedValues({
            nombreJoursMensualisation,
            heuresTravailParSemaine,
            nombreHeuresMensualisees,
            salaireNetMensualise,
            salaireNetJournalier
          });
        }
        
        return true;
      } else {
        console.error('❌ Erreur chargement paramètres');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
      return false;
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      // Validation côté client
      const validation = validateAnneeCompleteSettings(newSettings);
      if (!validation.isValid) {
        console.error('Validation échouée:', validation.errors);
        alert(`Erreurs de validation:\n${validation.errors.join('\n')}`);
        return false;
      }

      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Paramètres sauvegardés:', result);
        
        // Mettre à jour les états locaux
        setSettings(newSettings);
        if (result.calculatedValues) {
          setCalculatedValues(result.calculatedValues);
        }
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur sauvegarde:', errorData);
        alert(`Erreur: ${errorData.error}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
      alert('Erreur de connexion au serveur');
      return false;
    }
  };

  const loadAnnualData = async (year) => {
    setLoadingAnnual(true);
    try {
      const response = await fetch(`${API_BASE}/api/annual/${year}`);
      if (response.ok) {
        const data = await response.json();

        setAnnualStats(data);

        console.log('📊 Données annuelles chargées:', data);
      } else {
        console.error('❌ Erreur chargement données annuelles');
        setAnnualStats(null);
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
      setAnnualStats(null);
    } finally {
      setLoadingAnnual(false);
    }
  };

  // Import/Export fonctions
  const exportToJSON = () => {
    const exportData = {
      month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
      data: dailyData,
      settings: settings,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assmat-${exportData.month}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        if (importData.data) {
          console.log('📊 Données import:', importData.data);
          setDailyData(importData.data);
          if (autoSave) {
            saveMonthData(currentDate, importData.data);
          }
        }
        
        if (importData.settings) {
          setSettings(importData.settings);
          saveSettings(importData.settings);
        }
        
        alert('Données importées avec succès !');
      } catch (error) {
        alert('Erreur lors de l\'import : fichier JSON invalide');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Gestion des clics avec modificateurs
  const handleDayClick = (date, event) => {
    const dateKey = formatDate(date);
    
    if (event.metaKey || event.ctrlKey) {
      // Cmd/Ctrl+Clic → Mode sélection multiple
      setMultiSelectMode(true);
      setSelectedDays(prev => 
        prev.includes(dateKey) 
          ? prev.filter(d => d !== dateKey)
          : [...prev, dateKey]
      );
    } else if (event.shiftKey) {
      // Shift+Clic → Duplication sans sélection de texte
      event.preventDefault();
      const dayData = dailyData[dateKey];
      if (dayData && dayData.depot && dayData.reprise) {
        setDuplicateSource(dayData);
        setShowDuplicateModal(true);
      }
    } else {
      // Clic normal
      if (multiSelectMode) {
        setSelectedDays(prev => 
          prev.includes(dateKey) 
            ? prev.filter(d => d !== dateKey)
            : [...prev, dateKey]
        );
      } else {
        setSelectedDay(date);
        setShowDayModal(true);
      }
    }
  };

  // Actions de sélection multiple
  const clearSelection = () => {
    setSelectedDays([]);
    setMultiSelectMode(false);
    setDuplicateSource(null);
  };

  const deleteSelectedDays = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer les données de ${selectedDays.length} jour(s) ?`)) {
      const newData = { ...dailyData };
      selectedDays.forEach(dateKey => {
        delete newData[dateKey];
      });
      setDailyData(newData);
      if (autoSave) {
        saveMonthData(currentDate, newData);
      }
      clearSelection();
    }
  };

  // Sauvegarde des données d'un jour
  const saveDayData = (dayData) => {
    if (selectedDays.length > 0) {
      // Modification groupée
      const newData = { ...dailyData };
      selectedDays.forEach(dateKey => {
        newData[dateKey] = { ...dayData };
      });
      setDailyData(newData);
      if (autoSave) {
        saveMonthData(currentDate, newData);
      }
      clearSelection();
    } else if (selectedDay) {
      // Modification d'un seul jour
      const dateKey = formatDate(selectedDay);
      const newData = {
        ...dailyData,
        [dateKey]: dayData
      };
      setDailyData(newData);
      if (autoSave) {
        saveMonthData(currentDate, newData);
      }
    }
    setShowDayModal(false);
  };

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!autoSave) {
          manualSave();
        }
      }
      if (e.key === 'Escape') {
        setShowDayModal(false);
        setShowSettings(false);
        setShowDuplicateModal(false);
        setShowActionsMenu(false);
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [autoSave, currentDate, dailyData]);

  // Chargement initial
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      
      // Charger les paramètres en premier
      await loadSettings();
      
      // Puis charger les données du mois
      await loadMonthData(currentDate);
      
      // Charger les jours fériés
      await loadHolidays(currentDate.getFullYear());
      
      setLoading(false);
    };

    initializeApp();
  }, []); 

  useEffect(() => {
    console.log('📅 Changement de mois détecté:', currentDate);
    loadMonthData(currentDate);
    loadHolidays(currentDate.getFullYear());
  }, [currentDate]);

  console.log('📊 dailyData utilisé pour stats:', Object.keys(dailyData).length, 'jours');
  console.log('📅 Mois affiché:', currentDate.toLocaleDateString('fr-FR', { month: 'long' }));
  console.log('📈 Statistiques mensuelles (backend):', monthlyStats);

  const weeklyHours = Number(settings?.nbHeuresParSemaine) || 0;
  const daysPerWeek = Number(settings?.joursTravaillesParSemaine) || 0;
  const totalHours = Number(monthlyStats?.totalHours) || 0;
  const workDays = Number(monthlyStats?.workDays) || 0;
  const contractDailyHours = daysPerWeek > 0 ? weeklyHours / daysPerWeek : 0;
  const rawContractMonthlyHours = Number(monthlyStats?.anneeComplete?.nombreHeuresMensualisees);
  const contractMonthlyDays = Number(monthlyStats?.anneeComplete?.nombreJoursMensualisation) || 0;
  const contractMonthlyHours = Number.isFinite(rawContractMonthlyHours)
    ? rawContractMonthlyHours
    : contractMonthlyDays > 0
      ? contractDailyHours * contractMonthlyDays
      : 0;
  const hoursDelta = totalHours - contractMonthlyHours;
  const workedWeeks = monthlyStats && daysPerWeek > 0 ? workDays / daysPerWeek : 0;
  const meanHoursPerWeek = workedWeeks > 0 ? totalHours / workedWeeks : 0;
  const meanHoursPerDay = Number(monthlyStats?.meanHoursPerDay) || 0;

  useEffect(() => {
    if (showAnnualView) {
      loadAnnualData(selectedYear);
    }
  }, [showAnnualView, selectedYear]);
  
  useEffect(() => {
    if (showAnnualView) {
      setSelectedYear(currentDate.getFullYear());
    }
  }, [showAnnualView]);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      const validation = validateAnneeCompleteSettings(settings);
      if (validation.isValid) {
        const newCalculations = calculateAnneeCompleteValues(settings);
        setCalculatedValues(newCalculations);
      }
    }
  }, [settings]);

  // Actions manuelles
  const manualSave = async () => {
    const result = await saveMonthData(currentDate, dailyData);
    if (result?.success) {
      alert('Données sauvegardées avec succès !');
    } else {
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Rendu du menu Actions amélioré
  const renderActionsMenu = () => {
    if (!showActionsMenu) return null;

    return (
      <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-md shadow-lg border z-10">
        <div className="py-1">
          {/* Sélection multiple */}
          <button
            onClick={() => {
              setMultiSelectMode(!multiSelectMode);
              setShowActionsMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            {multiSelectMode ? '✅ Désactiver sélection' : '☑️ Sélection multiple'}
          </button>
          
          {/* Actions sur sélection */}
          {selectedDays.length > 0 && (
            <>
              <button
                onClick={() => {
                  setShowDayModal(true);
                  setSelectedDay(null);
                  setShowActionsMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                🔧 Modifier sélection
              </button>
              
              <button
                onClick={() => {
                  deleteSelectedDays();
                  setShowActionsMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                🗑️ Supprimer sélection
              </button>
              
              {duplicateSource && (
                <button
                  onClick={() => {
                    const newData = { ...dailyData };
                    selectedDays.forEach(dateKey => {
                      newData[dateKey] = { ...duplicateSource };
                    });
                    setDailyData(newData);
                    if (autoSave) {
                      saveMonthData(currentDate, newData);
                    }
                    clearSelection();
                    setShowActionsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  📋 Appliquer duplication
                </button>
              )}
            </>
          )}
          
          <hr className="my-1" />
          
          {/* Import/Export */}
          <button
            onClick={() => {
              exportToJSON();
              setShowActionsMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            📤 Exporter JSON
          </button>
          
          <label className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            📥 Importer JSON
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                importFromJSON(e);
                setShowActionsMenu(false);
              }}
              className="hidden"
            />
          </label>
          
          <hr className="my-1" />
          
          {/* Autres actions */}
          <button
            onClick={() => {
              clearSelection();
              setShowActionsMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            ✕ Annuler sélection
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">👶 AssmatTracker</h1>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAnnualView(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                disabled={loading}
              >
                <BarChart3 className="h-4 w-4" />
                Vue annuelle
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Actions
                </button>
                
                {renderActionsMenu()}
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Settings className="h-4 w-4" />
                Paramètres
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendrier */}
          <div className="lg:col-span-3">
            <Calendar
              currentDate={currentDate}
              dailyData={dailyData}
              selectedDays={selectedDays}
              multiSelectMode={multiSelectMode}
              duplicateSource={duplicateSource}
              loading={loading}
              settings={settings}
              autoSave={autoSave}
              modifierKey={modifierKey}
              isHoliday={isHoliday}
              getHolidayName={getHolidayName}
              onDayClick={handleDayClick}
              onGroupEdit={() => {
                setSelectedDay(null);
                setShowDayModal(true);
              }}
              onDuplicateShow={(dayData) => {
                setDuplicateSource(dayData);
                setShowDuplicateModal(true);
              }}
              onNavigation={(direction) => {
                if (direction === 'prev') {
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
                } else {
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
                }
              }}
              onClearSelection={clearSelection}
              onDataUpdate={setDailyData}
              onSaveData={saveMonthData}
            />
          </div>

          {/* Sidebar avec statistiques */}
          <div className="space-y-6">
            {/* Récapitulatif mensuel */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">📊 Récapitulatif mensuel</h3>
              
              {monthlyStats ? (
                <div className="space-y-3">
                  {/* Stats mensuelles */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heures réelles:</span>
                      <span className="font-medium">{totalHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heures contractuelles:</span>
                      <span className="font-medium">{contractMonthlyHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Écart:</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full ${getEcartBadgeClasses(hoursDelta)}`}
                      >
                        {formatSignedValue(hoursDelta, 1, '\u00a0h')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Moyenne réelle / jour:</span>
                      <span className="font-medium">{meanHoursPerDay.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Moyenne réelle / semaine:</span>
                      <span className="font-medium">{meanHoursPerWeek.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Salaire mensualisé:</span>
                      <span className="font-medium">
                        {(Number(monthlyStats?.anneeComplete?.salaireNetMensualise) || 0).toFixed(2)}€
                      </span>
                    </div>

                    <hr className="my-3" />

                    {/* infos année complète */}
                    {monthlyStats.anneeComplete && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Méthode année complète</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Jours mensualisés:</span>
                            <span className="font-medium text-blue-900">
                              {monthlyStats.anneeComplete.nombreJoursMensualisation}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Salaire mensualisé:</span>
                            <span className="font-medium text-blue-900">
                              {monthlyStats.anneeComplete.salaireNetMensualise.toFixed(2)}€
                            </span>
                          </div>
                        </div>

                        {monthlyStats.ecartMensualise && (
                          <div className="mt-3 space-y-1 text-xs border-t border-blue-100 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">Écart jours vs mensu:</span>
                              <span
                                className={`font-semibold px-2 py-0.5 rounded-full ${getEcartBadgeClasses(
                                  monthlyStats.ecartMensualise.ecartJours
                                )}`}
                              >
                                {formatSignedValue(monthlyStats.ecartMensualise.ecartJours, 0, '\u00a0j')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">Écart salaire:</span>
                              <span
                                className={`font-semibold px-2 py-0.5 rounded-full ${getEcartBadgeClasses(
                                  monthlyStats.ecartMensualise.ecartSalaire
                                )}`}
                              >
                                {formatSignedValue(monthlyStats.ecartMensualise.ecartSalaire, 2, '\u00a0€')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <hr className="my-3" />

                    {/* Autres stats mensuelles */}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frais repas:</span>
                      <span className="font-medium">{monthlyStats.fraisRepasTotal.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frais entretien:</span>
                      <span className="font-medium">{monthlyStats.fraisEntretienTotal.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total (mensualisé + frais):</span>
                      <span className="font-bold text-green-600">
                        {calculateTotalAnneeComplete(monthlyStats).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Aucune statistique disponible pour ce mois.
                </div>
              )}
            </div>

            {/* Paramètres rapides */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">⚙️ Paramètres actuels</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Salaire horaire net:</span>
                  <span>{settings.salaireHoraireNet}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Heures / mois:</span>
                  <span>{calculatedValues.nombreHeuresMensualisees}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Jours/semaine:</span>
                  <span>{settings.joursTravaillesParSemaine}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Heures/semaine:</span>
                  <span>{settings.nbHeuresParSemaine}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seuil majoration:</span>
                  <span>{settings.seuilMajoration}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taux majoration:</span>
                  <span>×{settings.tarifMajoration}</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowSettings(true)}
                className="w-full mt-4 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Modifier
              </button>
            </div>

            {/* État de sauvegarde */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">💾 Sauvegarde</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Auto-sauvegarde</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                {!autoSave && (
                  <button
                    onClick={manualSave}
                    disabled={loading}
                    className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DayModal
        showDayModal={showDayModal}
        selectedDay={selectedDay}
        selectedDays={selectedDays}
        dailyData={dailyData}
        settings={settings}
        autoSave={autoSave}
        currentDate={currentDate}
        onSave={saveDayData}
        onClose={() => setShowDayModal(false)}
        onDataUpdate={(newData) => {
          setDailyData(newData);
          if (autoSave) {
            saveMonthData(currentDate, newData);
          }
        }}
      />

      <AnnualView
        showAnnualView={showAnnualView}
        selectedYear={selectedYear}
        loadingAnnual={loadingAnnual}
        annualStats={annualStats}
        settings={settings}
        calculatedValues={calculatedValues}
        onYearChange={setSelectedYear}
        onClose={() => setShowAnnualView(false)}
      />

      <DuplicateModal
        showDuplicateModal={showDuplicateModal}
        duplicateSource={duplicateSource}
        settings={settings}  // Nouveau paramètre requis
        onContinue={() => {
          setMultiSelectMode(true);
          setShowDuplicateModal(false);
          setDuplicateSource(null);
        }}
        onClose={() => setShowDuplicateModal(false)}
      />

      <SettingsModal
        showSettingsModal={showSettings}
        settings={settings}
        onSave={async (newSettings) => {
          const success = await saveSettings(newSettings);
          return success;
        }}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default App;