import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Settings, Save, RefreshCw, Calendar, BarChart3, Plus, X, Copy, Trash2, Upload, Download } from 'lucide-react';

import { formatDate, calculateDayHours, calculateMonthlyStats, calculateAnnualStats, getDaysInMonth, isWeekend, formatTimeRangeFrench } from './utils';
import { DayModal, SettingsModal, DuplicateModal, AnnualView } from './modals';

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
    joursMensualises: 22
  });
  
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
      } else if (response.status === 404) {
        setDailyData({});
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setDailyData({});
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

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Détails erreur 400:', errorData);
      }
      
      return response.ok;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      return false;
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      return response.ok;
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      return false;
    }
  };

  const loadAnnualData = async (year) => {
    setLoadingAnnual(true);
    try {
      const months = [];
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        try {
          const response = await fetch(`${API_BASE}/api/data/${monthKey}`);
          if (response.ok) {
            const data = await response.json();
            months.push({ month, data: data.dailyData || {} });
          } else {
            months.push({ month, data: {} });
          }
        } catch (error) {
          months.push({ month, data: {} });
        }
      }
      
      // Calculer les statistiques annuelles
      const stats = calculateAnnualStats(months, year, settings);
      setAnnualStats(stats);
    } catch (error) {
      console.error('Erreur chargement données annuelles:', error);
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
    loadMonthData(currentDate);
    loadSettings();
  }, []);

  useEffect(() => {
    console.log('📅 Changement de mois détecté:', currentDate);
    loadMonthData(currentDate);
    loadHolidays(currentDate.getFullYear());
  }, [currentDate]);

  const monthlyStats = calculateMonthlyStats(dailyData, settings);
  console.log('📊 dailyData utilisé pour stats:', Object.keys(dailyData).length, 'jours');
  console.log('📅 Mois affiché:', currentDate.toLocaleDateString('fr-FR', { month: 'long' }));

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

    const isDateSelected = (date) => {
      const dateKey = formatDate(date);
      return selectedDays.includes(dateKey);
    };
  

  // Actions manuelles
  const manualSave = async () => {
    const success = await saveMonthData(currentDate, dailyData);
    if (success) {
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

  // Génération du calendrier
  const generateCalendar = () => {
    console.log('🗓️ generateCalendar appelée');
    console.log('📊 dailyData disponible:', dailyData);
    console.log('📊 Clés dailyData:', Object.keys(dailyData));

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() || 7) + 1);

    const { daysInMonth, startWeekday, year, month } = getDaysInMonth(currentDate);
    const days = [];
    const currentMonth = currentDate.getMonth();

    // Jour du mois
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      if (date > lastDay && date.getMonth() !== currentMonth) break;
      
      const dateKey = formatDate(date);
      const dayData = dailyData[dateKey] || {};
      const isCurrentMonth = date.getMonth() === currentMonth;
      const isToday = date.toDateString() === new Date().toDateString();
      const isWeekendDay = isWeekend(date);
      const isSelected = isDateSelected(date);
      // const isSelected = selectedDays.includes(dateKey);
      const isHolidayDay = isHoliday(date);
      const holidayName = getHolidayName(date);
      const { total } = calculateDayHours(dayData, settings);
      
      let statusText = '';
      let statusColor = '';
      let cellClasses = '';
      
      if (isWeekendDay) {
        cellClasses = 'bg-gray-100';
        statusColor = 'text-gray-400';
      } else if (isHolidayDay) {
        cellClasses = 'bg-red-50 border-red-200';
        statusColor = 'text-red-400';
      } else if (dayData.status === 'conge-assmat') {
        statusText = 'Congé AM';
        statusColor = 'text-orange-700';
        cellClasses = 'bg-orange-50 border-l-4 border-orange-400';
      } else if (dayData.status === 'conge-parent') {
        statusText = 'Congé parent';
        statusColor = 'text-blue-700';
        cellClasses = 'bg-blue-50 border-l-4 border-blue-400';
      } else if (dayData.depot && dayData.reprise) {
        statusColor = 'text-green-700';
        cellClasses = 'bg-green-50 border-l-4 border-green-400';
      }

      days.push(
        <div
          key={dateKey}
          onClick={(e) => !isWeekendDay && handleDayClick(date, e)}
          className={`
            calendar-cell relative p-2 h-20 border border-gray-200 cursor-pointer 
            transition-all duration-200 flex flex-col
            ${isCurrentMonth ? 'hover:bg-blue-50' : 'text-gray-400 bg-gray-50'} 
            ${isToday ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-200' : ''} 
            ${isSelected ? 'bg-purple-100 border-purple-300 ring-2 ring-purple-200' : ''}
            ${cellClasses}
          `}
        >
          {/* <div className="flex justify-between items-start">
            <span className={`text-sm font-medium ${isHolidayDay ? 'text-red-700' : 'text-gray-900'}`}>
              {i}
            </span>
            {isHolidayDay && (
              <span className="text-xs text-red-600" title={holidayName}>
                🎉
              </span>
            )}
          </div> */}          

          {/* En-tête avec numéro du jour et indicateurs */}
          <div className="flex justify-between items-start w-full mb-1">
            <span className={`text-sm font-medium ${isToday ? 'text-blue-800' : statusColor || ''}`}>
              {date.getDate()}
            </span>
            
            <div className="flex items-center gap-1">
              {/* Indicateurs de frais */}
              {(dayData.depot && dayData.reprise) || dayData.status ? (
                <div className="flex gap-1">
                  {dayData.fraisRepas && <div className="fee-dot meals" title="Frais de repas"></div>}
                  {dayData.fraisEntretien && <div className="fee-dot maintenance" title="Frais d'entretien"></div>}
                </div>
              ) : null}

              {/* Badge de sélection */}
              {isSelected && (
                <div className="selection-badge"></div>
              )}

              {/* Bouton de duplication */}
              {dayData.depot && dayData.reprise && !isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDuplicateSource(dayData);
                    setShowDuplicateModal(true);
                  }}
                  className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                  title="Dupliquer ces horaires"
                >
                  📋
                </button>
              )}
            </div>
          </div>
          
          {/* Contenu principal */}
          <div className="flex-1 flex flex-col justify-center">
            {statusText && (
              <div className={`text-xs font-semibold ${statusColor} text-center`}>
                {statusText}
              </div>
            )}

            {isHolidayDay && (
              <div className={`text-xs font-semibold ${statusColor} text-center`}>
                {holidayName}
              </div>
            )}
            
            {dayData.depot && dayData.reprise && (
              <div className="text-xs space-y-1">
                <div className={`${statusColor} text-center font-medium`}>
                  {formatTimeRangeFrench(dayData.depot, dayData.reprise)}
                </div>
                <div className={`font-bold ${statusColor} text-center`}>
                  {total.toFixed(1)}h
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
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
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                  disabled={loading}
                >
                  ← Précédent
                </button>
                <h2 className="text-lg font-semibold">
                  {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                  disabled={loading}
                >
                  Suivant →
                </button>
              </div>

              {/* Barre d'outils de sélection */}
              {(multiSelectMode || selectedDays.length > 0) && (
                <div className="px-4 py-2 bg-blue-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedDays.length} jour{selectedDays.length > 1 ? 's' : ''} sélectionné{selectedDays.length > 1 ? 's' : ''}
                    </span>
                    {selectedDays.length > 0 && (
                      <button
                        onClick={() => {
                          setShowDayModal(true);
                          setSelectedDay(null);
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        🔧 Modifier
                      </button>
                    )}
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
                        }}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        📋 Dupliquer
                      </button>
                    )}
                  </div>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-white rounded transition-colors"
                  >
                    ✕ Annuler
                  </button>
                </div>
              )}

              {/* Instructions d'usage */}
              {multiSelectMode && (
                <div className="px-4 py-2 bg-yellow-50 border-b text-sm text-yellow-800">
                  💡 <strong>{modifierKey}+Clic</strong> pour sélection multiple • <strong>Shift+Clic</strong> pour duplication • <strong>ESC</strong> pour annuler
                </div>
              )}

              {/* En-têtes des jours */}
              <div className="grid grid-cols-7 gap-1 p-4 border-b bg-gray-50">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grille du calendrier */}
              <div className="grid grid-cols-7 gap-1 p-4">
                {generateCalendar()}
              </div>

              {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {/* Instructions d'utilisation */}
            <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">💡 Guide d'utilisation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p className="font-medium text-gray-900 mb-1">Raccourcis :</p>
                  <div className="ml-2 space-y-1">
                    <p>• <strong>{modifierKey}+Clic</strong> : Démarrer la sélection multiple</p>
                    <p>• <strong>Shift+Clic</strong> : Duplication sans sélection de texte</p>
                    <p>• <strong>📋</strong> : Icône de duplication sur chaque jour</p>
                    <p>• <strong>{modifierKey}+S</strong> : Sauvegarde manuelle</p>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Fonctionnalités :</p>
                  <div className="ml-2 space-y-1">
                    <p>• Cases à cocher pour frais repas et entretien</p>
                    <p>• Suppression via option vide ou bouton</p>
                    <p>• Auto-sauvegarde après chaque modification</p>
                    <p>• Sélection et modification groupée</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar avec statistiques */}
          <div className="space-y-6">
            {/* Récapitulatif mensuel */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">📊 Récapitulatif {currentDate.toLocaleDateString('fr-FR', { month: 'long' })}</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Heures totales:</span>
                  <span className="font-medium">{monthlyStats.totalHours.toFixed(1)}h</span>
                </div>
                
                {monthlyStats.totalMajoredHours > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dont majorées:</span>
                    <span className="font-medium text-orange-600">{monthlyStats.totalMajoredHours.toFixed(1)}h</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Moyenne/jour</span>
                  <span className="font-medium">{monthlyStats.meanHoursPerDays.toFixed(1)}h</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Jours travaillés:</span>
                  <span className="font-medium">{monthlyStats.workDays}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Congés AM:</span>
                  <span className="font-medium text-orange-600">{monthlyStats.congeDays}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Congés parent:</span>
                  <span className="font-medium text-blue-600">{monthlyStats.congeParentDays}</span>
                </div>
                
                <hr className="my-3" />
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Salaire brut:</span>
                  <span className="font-medium">{monthlyStats.totalSalary.toFixed(2)}€</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais repas:</span>
                  <span className="font-medium">{monthlyStats.fraisRepasTotal.toFixed(2)}€ <span className="text-xs text-gray-500">({monthlyStats.workDays}j × {settings.fraisRepas}€)</span></span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais entretien:</span>
                  <span className="font-medium">{monthlyStats.fraisEntretienTotal.toFixed(2)}€ <span className="text-xs text-gray-500">({monthlyStats.workDays}j × {settings.fraisEntretien}€)</span></span>
                </div>
                
                <hr className="my-3" />
                
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-green-600">{monthlyStats.totalWithFrais.toFixed(2)}€</span>
                </div>
              </div>
            </div>

            {/* Paramètres rapides */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">⚙️ Paramètres actuels</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tarif horaire:</span>
                  <span>{settings.tarifHoraire}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seuil majoration:</span>
                  <span>{settings.seuilMajoration}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taux majoration:</span>
                  <span>×{settings.tarifMajoration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais repas:</span>
                  <span>{settings.fraisRepas}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais entretien:</span>
                  <span>{settings.fraisEntretien}€</span>
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
        showSettingsModal={showSettings}  // Attention au nom de la prop
        settings={settings}
        onSave={async (newSettings) => {
          const success = await saveSettings(newSettings);
          if (success) {
            setSettings(newSettings);
          }
          return success;
        }}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default App;