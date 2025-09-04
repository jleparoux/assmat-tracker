import React, { useState, useEffect } from 'react';
import { Calendar, Settings, Download, Upload, BarChart3, Save, RefreshCw, ChevronDown } from 'lucide-react';

const AssistantMaternelTracker = () => {
  // États principaux
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dailyData, setDailyData] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAnnualView, setShowAnnualView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [annualStats, setAnnualStats] = useState(null);
  const [loadingAnnual, setLoadingAnnual] = useState(false);

  // Paramètres configurables
  const [settings, setSettings] = useState({
    tarifHoraire: 4.5,
    tarifMajoration: 1.25,
    seuilMajoration: 9,
    fraisRepas: 5,
    fraisEntretien: 8,
    joursMenualises: 22
  });

  // Détection de l'OS pour afficher le bon raccourci
  const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMacOS ? 'Cmd' : 'Ctrl';

  // API Functions
  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

  const saveMonthData = async (date, data) => {
    try {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`${API_BASE}/api/data/${monthKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyData: data })
      });
      
      if (!response.ok) throw new Error('Erreur sauvegarde');
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      return false;
    }
  };

  const loadMonthData = async (date) => {
    setLoading(true);
    try {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`${API_BASE}/api/data/${monthKey}`);
      
      if (response.ok) {
        const data = await response.json();
        setDailyData(data.dailyData || {});
      } else {
        setDailyData({});
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      setDailyData({});
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      
      if (!response.ok) throw new Error('Erreur sauvegarde paramètres');
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
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

  // Effects
  useEffect(() => {
    loadMonthData(currentDate);
    loadSettings();
  }, []);

  useEffect(() => {
    if (autoSave) {
      const timer = setTimeout(() => {
        saveMonthData(currentDate, dailyData);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [dailyData, autoSave, currentDate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearSelection();
        setShowActionsMenu(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        manualSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    loadMonthData(currentDate);
  }, [currentDate]);

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

  // Gestion sélection
  const isDateSelected = (date) => {
    const dateKey = formatDate(date);
    return selectedDays.includes(dateKey);
  };

  const toggleDaySelection = (date) => {
    const dateKey = formatDate(date);
    setSelectedDays(prev => {
      if (prev.includes(dateKey)) {
        return prev.filter(key => key !== dateKey);
      } else {
        return [...prev, dateKey];
      }
    });
  };

  const clearSelection = () => {
    setSelectedDays([]);
    setMultiSelectMode(false);
    setSelectedDay(null);
  };

  // Calculs
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

    Object.values(dailyData).forEach(dayData => {
      if (dayData.status === 'conge-assmat') {
        congeDays++;
      } else if (dayData.status === 'conge-parent') {
        congeParentDays++;
      } else if (dayData.depot && dayData.reprise) {
        workDays++;
        const { normal, majore, total } = calculateDayHours(dayData);
        totalNormalHours += normal;
        totalMajoredHours += majore;
        totalHours += total;
        totalSalary += calculateDaySalary(dayData);
      }
    });

    const fraisRepasTotal = (workDays / settings.joursMenualises) * settings.fraisRepas;
    const fraisEntretienTotal = (workDays / settings.joursMenualises) * settings.fraisEntretien;

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

      Object.values(data).forEach(dayData => {
        if (dayData.status === 'conge-assmat') {
          monthCongeDays++;
        } else if (dayData.status === 'conge-parent') {
          monthCongeParentDays++;
        } else if (dayData.depot && dayData.reprise) {
          monthWorkDays++;
          const { total } = calculateDayHours(dayData);
          monthHours += total;
          monthSalary += calculateDaySalary(dayData);
        }
      });

      const monthFraisRepas = (monthWorkDays / settings.joursMenualises) * settings.fraisRepas;
      const monthFraisEntretien = (monthWorkDays / settings.joursMenualises) * settings.fraisEntretien;

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

  // Actions
  const manualSave = async () => {
    const success = await saveMonthData(currentDate, dailyData);
    if (success) {
      alert('Données sauvegardées avec succès !');
    } else {
      alert('Erreur lors de la sauvegarde');
    }
  };

  const reloadData = () => {
    loadMonthData(currentDate);
  };

  const exportData = () => {
    const dataToExport = {
      month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
      data: dailyData,
      settings: settings,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assmat-${dataToExport.month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        if (imported.data) {
          setDailyData(imported.data);
          if (imported.settings) {
            setSettings(imported.settings);
          }
          alert('Données importées avec succès !');
        } else {
          alert('Format de fichier invalide');
        }
      } catch (error) {
        alert('Erreur lors de l\'importation');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const openDayModal = (date) => {
    setSelectedDay(date);
    setShowDayModal(true);
  };

  const handleDayClick = (date) => {
    if (multiSelectMode) {
      toggleDaySelection(date);
    } else {
      openDayModal(date);
    }
  };

  const saveDayData = (dayData) => {
    if (selectedDays.length > 0) {
      // Sauvegarder pour tous les jours sélectionnés
      const newData = { ...dailyData };
      selectedDays.forEach(dateKey => {
        newData[dateKey] = { ...dayData };
      });
      setDailyData(newData);
      clearSelection();
    } else if (selectedDay) {
      // Sauvegarder pour un seul jour
      const dateKey = formatDate(selectedDay);
      setDailyData(prev => ({
        ...prev,
        [dateKey]: { ...dayData }
      }));
    }
    setShowDayModal(false);
    setSelectedDay(null);
  };

  // Génération du calendrier
  const renderCalendar = () => {
    const { daysInMonth, startWeekday, year, month } = getDaysInMonth(currentDate);
    const days = [];
    
    // Jours vides du début
    for (let i = 0; i < startWeekday - 1; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>);
    }
    
    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayKey = formatDate(date);
      const dayData = dailyData[dayKey] || {};
      const isWeekendDay = isWeekend(date);
      const isSelected = isDateSelected(date);
      
      let bgColor = 'bg-white hover:bg-gray-50';
      let textColor = 'text-gray-900';
      let statusText = '';
      let borderStyle = 'border-gray-200';
      
      if (isWeekendDay) {
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-400';
      } else if (dayData.status === 'conge-assmat') {
        bgColor = 'bg-orange-100 hover:bg-orange-200';
        statusText = 'Congé AM';
        textColor = 'text-orange-800';
      } else if (dayData.status === 'conge-parent') {
        bgColor = 'bg-blue-100 hover:bg-blue-200';
        statusText = 'Congé parent';
        textColor = 'text-blue-800';
      } else if (dayData.depot && dayData.reprise) {
        bgColor = 'bg-green-50 hover:bg-green-100';
        borderStyle = 'border-green-200';
        textColor = 'text-green-900';
      }

      if (isSelected) {
        borderStyle = 'border-2 border-blue-500';
        bgColor += ' ring-2 ring-blue-200';
      }

      const { total } = calculateDayHours(dayData);

      days.push(
        <div
          key={day}
          className={`${bgColor} ${borderStyle} border rounded-lg p-2 h-24 cursor-pointer transition-all duration-200 flex flex-col justify-between ${textColor}`}
          onClick={() => handleDayClick(date)}
        >
          <div className="flex justify-between items-start">
            <span className="font-medium">{day}</span>
            {dayData.depot && dayData.reprise && (
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
          
          {statusText && (
            <div className="text-xs font-medium">{statusText}</div>
          )}
          
          {dayData.depot && dayData.reprise && (
            <div className="text-xs space-y-1">
              <div>{formatTimeRangeFrench(dayData.depot, dayData.reprise)}</div>
              <div className="font-medium">{total.toFixed(1)}h</div>
            </div>
          )}
        </div>
      );
    }
    
    return days;
  };

  // Composants modaux
  const DayModal = () => {
    const [depot, setDepot] = useState('');
    const [reprise, setReprise] = useState('');
    const [status, setStatus] = useState('travail');

    useEffect(() => {
      if (showDayModal) {
        if (selectedDay && !selectedDays.length) {
          const dayKey = formatDate(selectedDay);
          const dayData = dailyData[dayKey] || {};
          setDepot(dayData.depot || '');
          setReprise(dayData.reprise || '');
          setStatus(dayData.status || 'travail');
        } else {
          setDepot('');
          setReprise('');
          setStatus('travail');
        }
      }
    }, [showDayModal, selectedDay, selectedDays]);

    if (!showDayModal) return null;

    const handleSave = () => {
      const dayData = status === 'travail' ? { depot, reprise, status } : { status };
      saveDayData(dayData);
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
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          
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
                <option value="travail">Journée de travail</option>
                <option value="conge-assmat">Congé assistant maternel</option>
                <option value="conge-parent">Congé parent</option>
              </select>
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
                  <div className="bg-green-50 p-3 rounded-md">
                    <div className="text-sm font-medium text-green-900">
                      Aperçu des calculs
                    </div>
                    <div className="text-sm text-green-700 mt-1">
                      {(() => {
                        const tempData = { depot, reprise, status };
                        const { normal, majore, total } = calculateDayHours(tempData);
                        const salary = calculateDaySalary(tempData);
                        return (
                          <>
                            <div>Durée totale: {total.toFixed(1)}h</div>
                            {majore > 0 && (
                              <div>Dont majorées: {majore.toFixed(1)}h</div>
                            )}
                            <div>Salaire: {salary.toFixed(2)}€</div>
                          </>
                        );
                      })()}
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
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SettingsPanel = () => {
    if (!showSettings) return null;

    const handleSave = async () => {
      const success = await saveSettings(settings);
      if (success) {
        alert('Paramètres sauvegardés !');
      } else {
        alert('Erreur lors de la sauvegarde');
      }
      setShowSettings(false);
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
                value={settings.tarifHoraire}
                onChange={(e) => setSettings(prev => ({ ...prev, tarifHoraire: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jours mensualisés
              </label>
              <input
                type="number"
                value={settings.joursMenualises}
                onChange={(e) => setSettings(prev => ({ ...prev, joursMenualises: parseInt(e.target.value) || 0 }))}
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
                value={settings.seuilMajoration}
                onChange={(e) => setSettings(prev => ({ ...prev, seuilMajoration: parseFloat(e.target.value) || 0 }))}
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
                value={settings.tarifMajoration}
                onChange={(e) => setSettings(prev => ({ ...prev, tarifMajoration: parseFloat(e.target.value) || 0 }))}
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
                value={settings.fraisRepas}
                onChange={(e) => setSettings(prev => ({ ...prev, fraisRepas: parseFloat(e.target.value) || 0 }))}
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
                value={settings.fraisEntretien}
                onChange={(e) => setSettings(prev => ({ ...prev, fraisEntretien: parseFloat(e.target.value) || 0 }))}
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
            </div>
            
            <p className="text-sm text-gray-600">
              Cliquez sur "Continuer" puis sélectionnez les jours où vous souhaitez appliquer ces horaires.
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

  // Menu Actions
  const renderActionsMenu = () => {
    return (
      <div className={`absolute top-full right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-10 transition-all duration-200 ${
        showActionsMenu ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}>
        <button
          onClick={manualSave}
          disabled={loading}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Sauvegarder
        </button>
        
        <button
          onClick={reloadData}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Recharger
        </button>
        
        <hr className="my-1" />
        
        <button
          onClick={exportData}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exporter
        </button>
        
        <label className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
          <Upload className="h-4 w-4" />
          Importer
          <input
            type="file"
            accept=".json"
            onChange={importData}
            className="hidden"
          />
        </label>
        
        <hr className="my-1" />
        
        <label className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => setAutoSave(e.target.checked)}
            className="rounded mr-2"
          />
          Auto-sauvegarde
        </label>
      </div>
    );
  };

  const monthlyStats = calculateMonthlyStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🍼</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">AssmatTracker</h1>
              {loading && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnnualView(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                Vue annuelle
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Actions
                  <ChevronDown className="h-4 w-4" />
                </button>
                {renderActionsMenu()}
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
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
                          clearSelection();
                          setDuplicateSource(null);
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

              {/* En-têtes des jours */}
              <div className="grid grid-cols-7 gap-1 p-4 border-b bg-gray-50">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendrier */}
              <div className="grid grid-cols-7 gap-1 p-4">
                {renderCalendar()}
              </div>

              {/* Instructions et raccourcis */}
              <div className="p-4 border-t bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Légende :</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-50 rounded border"></div>
                        <span>Jour travaillé (avec heures)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-100 rounded border"></div>
                        <span>Congé assistant maternel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-100 rounded border"></div>
                        <span>Congé parent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 rounded border"></div>
                        <span>Week-end</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-200 rounded border-2 border-blue-500 relative">
                          <div className="absolute top-0 right-0 w-1 h-1 bg-blue-500 rounded-full"></div>
                        </div>
                        <span>Jour sélectionné</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-gray-900 mb-1">Fonctionnalités :</p>
                    <div className="ml-2 space-y-1 text-gray-600">
                      <p>• <span className="bg-purple-100 px-2 py-1 rounded text-xs">☑️ Sélection multiple</span> : Saisir plusieurs jours ensemble</p>
                      <p>• <span className="text-xs">📋</span> : Icône de duplication disponible</p>
                      <p>• Auto-sauvegarde après chaque modification</p>
                      <p>• Raccourci: {modifierKey}+S pour sauvegarder</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar avec statistiques */}
          <div className="space-y-6">
            {/* Récapitulatif mensuel */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">📊 Récapitulatif</h3>
              
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
                  <span className="font-medium">{monthlyStats.fraisRepasTotal.toFixed(2)}€</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais entretien:</span>
                  <span className="font-medium">{monthlyStats.fraisEntretienTotal.toFixed(2)}€</span>
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

            {/* Sélection multiple */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">🎯 Sélection multiple</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => setMultiSelectMode(!multiSelectMode)}
                  className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                    multiSelectMode 
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {multiSelectMode ? '✅ Mode sélection activé' : '☑️ Activer sélection multiple'}
                </button>
                
                {selectedDays.length > 0 && (
                  <>
                    <div className="text-sm text-gray-600">
                      {selectedDays.length} jour{selectedDays.length > 1 ? 's' : ''} sélectionné{selectedDays.length > 1 ? 's' : ''}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={clearSelection}
                        className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        ✕ Annuler
                      </button>
                    </div>
                  </>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  💡 Astuce : Cliquez sur les jours pour les sélectionner, puis modifiez-les en groupe
                </div>
              </div>
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
                
                <div className="text-xs text-gray-500">
                  {autoSave ? '✅ Sauvegarde automatique active' : '⚠️ Pensez à sauvegarder vos modifications'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modales */}
        <DayModal />
        <SettingsPanel />
        <AnnualView />
        <DuplicateModal />
      </div>
    </div>
  );
};

export default AssistantMaternelTracker;
