import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Settings, Save, RefreshCw, Calendar, BarChart3, Plus, X, Copy, Trash2, Upload, Download } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

const App = () => {
  // États de base
  const [currentDate, setCurrentDate] = useState(new Date());
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
  
  // États sélection multiple
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [duplicateSource, setDuplicateSource] = useState(null);

  // Détection OS pour les raccourcis
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'Cmd' : 'Ctrl';

  // Utilitaires
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  const calculateDayHours = (dayData) => {
    if (!dayData.depot || !dayData.reprise) {
      return { normal: 0, majore: 0, total: 0 };
    }

    const depotMinutes = parseTimeToMinutes(dayData.depot);
    const repriseMinutes = parseTimeToMinutes(dayData.reprise);
    const totalMinutes = repriseMinutes - depotMinutes;
    const totalHours = totalMinutes / 60;

    if (totalHours <= settings.seuilMajoration) {
      return { normal: totalHours, majore: 0, total: totalHours };
    } else {
      const normalHours = settings.seuilMajoration;
      const majoredHours = totalHours - settings.seuilMajoration;
      return { normal: normalHours, majore: majoredHours, total: totalHours };
    }
  };

  const calculateDaySalary = (dayData) => {
    const { normal, majore } = calculateDayHours(dayData);
    const normalSalary = normal * settings.tarifHoraire;
    const majoredSalary = majore * settings.tarifHoraire * settings.tarifMajoration;
    return normalSalary + majoredSalary;
  };

  const calculateMonthlyStats = () => {
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
        const { normal, majore, total } = calculateDayHours(dayData);
        totalNormalHours += normal;
        totalMajoredHours += majore;
        totalHours += total;
        totalSalary += calculateDaySalary(dayData);
        if (dayData.fraisRepas) daysWithMeals++;
        if (dayData.fraisEntretien) daysWithMaintenance++;
      }
    });

    const fraisRepasTotal = daysWithMeals * settings.fraisRepas;
    const fraisEntretienTotal = daysWithMaintenance * settings.fraisEntretien;

    return {
      totalHours,
      totalNormalHours,
      totalMajoredHours,
      totalSalary,
      workDays,
      congeDays,
      congeParentDays,
      fraisRepasTotal,
      fraisEntretienTotal,
      totalWithFrais: totalSalary + fraisRepasTotal + fraisEntretienTotal
    };
  };

  const calculateAnnualStats = (monthsData, year) => {
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
      let monthDaysWithMeals = 0;
      let monthDaysWithMaintenance = 0;

      Object.values(data).forEach(dayData => {
        if (dayData.status === 'conge-assmat') {
          monthCongeDays++;
          if (dayData.fraisRepas) monthDaysWithMeals++;
          if (dayData.fraisEntretien) monthDaysWithMaintenance++;
        } else if (dayData.status === 'conge-parent') {
          monthCongeParentDays++;
          if (dayData.fraisRepas) monthDaysWithMeals++;
          if (dayData.fraisEntretien) monthDaysWithMaintenance++;
        } else if (dayData.depot && dayData.reprise) {
          monthWorkDays++;
          const { total } = calculateDayHours(dayData);
          monthHours += total;
          monthSalary += calculateDaySalary(dayData);
          if (dayData.fraisRepas) monthDaysWithMeals++;
          if (dayData.fraisEntretien) monthDaysWithMaintenance++;
        }
      });

      const monthFraisRepas = monthDaysWithMeals * settings.fraisRepas;
      const monthFraisEntretien = monthDaysWithMaintenance * settings.fraisEntretien;

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

    return {
      year,
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
      const stats = calculateAnnualStats(months, year);
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
  }, [currentDate]);

  const monthlyStats = calculateMonthlyStats();
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
  
    // Utilitaires
    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startWeekday = firstDay.getDay();
      
      return { daysInMonth, startWeekday, year, month };
    };
  
    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
  
    const formatTimeFrench = (time) => {
      if (!time) return '';
      return time.replace(':', 'h');
    };
  
    const formatTimeRangeFrench = (start, end) => {
      if (!start || !end) return '';
      return `${formatTimeFrench(start)} - ${formatTimeFrench(end)}`;
    };
  
    const isWeekend = (date) => {
      const day = date.getDay();
      return day === 0 || day === 6;
    };

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
      const { total } = calculateDayHours(dayData);
      
      let statusText = '';
      let statusColor = '';
      let cellClasses = '';
      
      if (isWeekendDay) {
        cellClasses = 'bg-gray-100';
        statusColor = 'text-gray-400';
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
  
  // Modal de saisie d'un jour
  const DayModal = () => {
    const [depot, setDepot] = useState('');
    const [reprise, setReprise] = useState('');
    const [status, setStatus] = useState('travail');
    const [fraisRepas, setFraisRepas] = useState(false);
    const [fraisEntretien, setFraisEntretien] = useState(false);

    useEffect(() => {
      if (showDayModal) {
        if (selectedDay && !selectedDays.length) {
          const dayKey = formatDate(selectedDay);
          const dayData = dailyData[dayKey] || {};

          console.log('🔧 Ouverture modal pour:', dayKey);
          console.log('📊 Données du jour:', dayData);
          console.log('📝 Status détecté:', dayData.status);
          
          setDepot(dayData.depot || '');
          setReprise(dayData.reprise || '');
          setStatus(dayData.status || 'travail');
          setFraisRepas(dayData.fraisRepas || false);
          setFraisEntretien(dayData.fraisEntretien || false);
        } else {
          setDepot('');
          setReprise('');
          setStatus('travail');
          setFraisRepas(false);
          setFraisEntretien(false);
        }
      }
    }, [showDayModal, selectedDay, selectedDays, dailyData]);

    if (!showDayModal) return null;

    const handleSave = () => {
      const dayData = { 
        status,
        fraisRepas,
        fraisEntretien
      };
      
      if (status === 'travail') {
        dayData.depot = depot;
        dayData.reprise = reprise;
      }
      
      saveDayData(dayData);
    };

    const handleDelete = () => {
      if (selectedDay) {
        const dateKey = formatDate(selectedDay);
        if (window.confirm('Êtes-vous sûr de vouloir supprimer les données de ce jour ?')) {
          const newData = { ...dailyData };
          delete newData[dateKey];
          setDailyData(newData);
          if (autoSave) {
            saveMonthData(currentDate, newData);
          }
          setShowDayModal(false);
        }
      }
    };

    const title = selectedDays.length > 0 
      ? `Modification groupée (${selectedDays.length} jours)`
      : selectedDay 
        ? `${selectedDay.getDate()} ${selectedDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
        : 'Nouveau jour';

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={(e) => e.target === e.currentTarget && setShowDayModal(false)}
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            {selectedDay && selectedDays.length === 0 && (
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800 transition-colors"
                title="Supprimer les données"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de journée
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">- Supprimer les données -</option>
                <option value="travail">Journée de travail</option>
                <option value="conge-assmat">Congé assistant maternel</option>
                <option value="conge-parent">Congé parent</option>
              </select>
            </div>

            {/* Cases à cocher pour les frais (toujours visibles) */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fraisRepas"
                  checked={fraisRepas}
                  onChange={(e) => setFraisRepas(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="fraisRepas" className="ml-2 text-sm text-gray-700">
                  Frais de repas
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fraisEntretien"
                  checked={fraisEntretien}
                  onChange={(e) => setFraisEntretien(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="fraisEntretien" className="ml-2 text-sm text-gray-700">
                  Frais d'entretien
                </label>
              </div>
            </div>

            {status === 'travail' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure de dépôt
                  </label>
                  <input
                    type="time"
                    value={depot}
                    onChange={(e) => setDepot(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure de reprise
                  </label>
                  <input
                    type="time"
                    value={reprise}
                    onChange={(e) => setReprise(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {depot && reprise && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">Aperçu :</div>
                    <div className="text-sm font-medium">
                      {formatTimeRangeFrench(depot, reprise)} 
                      {' - '}
                      {calculateDayHours({ depot, reprise }).total.toFixed(1)}h
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowDayModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {status === '' ? 'Supprimer' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Annual view
  const AnnualView = () => {
      const changeYear = (direction) => {
        setSelectedYear(prev => prev + direction);
      };
  
      const handleClose = () => {
        setShowAnnualView(false);
      };
  
      if (!showAnnualView) return null;
  
      return (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">📊 Récapitulatif Annuel {selectedYear}</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeYear(-1)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    ←
                  </button>
                  <span className="font-medium min-w-[4rem] text-center">{selectedYear}</span>
                  <button
                    onClick={() => changeYear(1)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    →
                  </button>
                </div>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  ✕ Fermer
                </button>
              </div>
            </div>
  
            <div className="flex-1 overflow-y-auto p-6">
              {loadingAnnual ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Chargement des données annuelles...</span>
                </div>
              ) : annualStats ? (
                <div className="space-y-6">
                  {/* Résumé annuel */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{annualStats.totalHours}h</div>
                      <div className="text-blue-700">Heures totales</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{annualStats.totalSalary.toFixed(2)}€</div>
                      <div className="text-green-700">Salaire total</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-900">{annualStats.totalWorkDays}</div>
                      <div className="text-purple-700">Jours travaillés</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-900">{annualStats.grandTotal.toFixed(2)}€</div>
                      <div className="text-orange-700">Total avec frais</div>
                    </div>
                  </div>

                  {/* Moyennes */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Moyennes mensuelles</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Heures:</span>
                        <span className="ml-2 font-medium">{annualStats.averageHoursPerMonth}h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Salaire:</span>
                        <span className="ml-2 font-medium">{annualStats.averageSalaryPerMonth.toFixed(2)}€</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Jours:</span>
                        <span className="ml-2 font-medium">{Math.round(annualStats.totalWorkDays / 12)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-2 font-medium">{(annualStats.grandTotal / 12).toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
  
                  {/* Détail mensuel */}
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h4 className="font-semibold">Détail par mois</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Mois</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Heures</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Jours</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Salaire</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Frais</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {annualStats.monthlyDetails.map((month) => (
                            <tr key={month.month} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900 capitalize">{month.monthName}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{month.hours.toFixed(1)}h</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{month.workDays}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{month.salary.toFixed(2)}€</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                {(month.fraisRepas + month.fraisEntretien).toFixed(2)}€
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                {month.total.toFixed(2)}€
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{annualStats.totalHours}h</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{annualStats.totalWorkDays}</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{annualStats.totalSalary.toFixed(2)}€</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                              {(annualStats.totalFraisRepas + annualStats.totalFraisEntretien).toFixed(2)}€
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{annualStats.grandTotal.toFixed(2)}€</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Aucune donnée disponible pour {selectedYear}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

  // Modal de duplication
  const DuplicateModal = () => {
    if (!showDuplicateModal || !duplicateSource) return null;

    const handleDuplicate = () => {
      setMultiSelectMode(true);
      setShowDuplicateModal(false);
      setDuplicateSource(null);
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={(e) => e.target === e.currentTarget && setShowDuplicateModal(false)}
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">📋 Dupliquer les horaires</h3>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-900">Horaires à dupliquer :</div>
              <div className="text-sm text-gray-700 mt-1">
                {formatTimeRangeFrench(duplicateSource.depot, duplicateSource.reprise)}
              </div>
              <div className="text-sm text-gray-700">
                Durée : {calculateDayHours(duplicateSource).total.toFixed(1)}h
              </div>
              {(duplicateSource.fraisRepas || duplicateSource.fraisEntretien) && (
                <div className="text-sm text-gray-700 mt-1">
                  Frais : {duplicateSource.fraisRepas && 'Repas'} {duplicateSource.fraisRepas && duplicateSource.fraisEntretien && '+ '} {duplicateSource.fraisEntretien && 'Entretien'}
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-600">
              Cliquez sur "Continuer" puis sélectionnez les jours où vous souhaitez appliquer ces horaires et frais.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowDuplicateModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDuplicate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Continuer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal des paramètres
  const SettingsModal = () => {
    const [tempSettings, setTempSettings] = useState(settings);

    useEffect(() => {
      if (showSettings) {
        setTempSettings(settings);
      }
    }, [showSettings, settings]);

    if (!showSettings) return null;

    const handleSave = async () => {
      const success = await saveSettings(tempSettings);
      if (success) {
        setSettings(tempSettings);
        setShowSettings(false);
        alert('Paramètres sauvegardés avec succès !');
      } else {
        alert('Erreur lors de la sauvegarde des paramètres');
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">⚙️ Paramètres</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarif horaire (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={tempSettings.tarifHoraire}
                onChange={(e) => setTempSettings(prev => ({ ...prev, tarifHoraire: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seuil majoration (heures)
              </label>
              <input
                type="number"
                step="0.5"
                value={tempSettings.seuilMajoration}
                onChange={(e) => setTempSettings(prev => ({ ...prev, seuilMajoration: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taux majoration (multiplicateur)
              </label>
              <input
                type="number"
                step="0.01"
                value={tempSettings.tarifMajoration}
                onChange={(e) => setTempSettings(prev => ({ ...prev, tarifMajoration: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frais repas mensuels (€)
              </label>
              <input
                type="number"
                step="0.1"
                value={tempSettings.fraisRepas}
                onChange={(e) => setTempSettings(prev => ({ ...prev, fraisRepas: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frais d'entretien (€)
              </label>
              <input
                type="number"
                step="0.1"
                value={tempSettings.fraisEntretien}
                onChange={(e) => setTempSettings(prev => ({ ...prev, fraisEntretien: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jours mensualisés
              </label>
              <input
                type="number"
                value={tempSettings.joursMensualises}
                onChange={(e) => setTempSettings(prev => ({ ...prev, joursMensualises: parseInt(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Sauvegarder
            </button>
          </div>
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
      <DayModal />
      <AnnualView />
      <DuplicateModal />
      <SettingsModal />
    </div>
  );
};

export default App;