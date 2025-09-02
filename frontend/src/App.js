import React, { useState, useEffect } from 'react';
import { Calendar, Settings, Download, Upload, BarChart3, Save, RefreshCw } from 'lucide-react';

const AssistantMaternelTracker = () => {
  // États principaux
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1); // Premier jour du mois actuel
  });
  const [dailyData, setDailyData] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAnnualView, setShowAnnualView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  // Paramètres configurables
  const [settings, setSettings] = useState({
    tarifHoraire: 4.5,
    tarifMajoration: 1.25,
    seuilMajoration: 9,
    fraisRepas: 5,
    fraisEntretien: 8,
    joursMenualises: 22
  });

  // API Functions - Détection automatique de l'environnement
  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

  const loadMonthData = async (date) => {
    setLoading(true);
    try {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`${API_BASE}/api/data/${monthKey}`);
      const data = await response.json();
      
      if (data.dailyData) {
        setDailyData(data.dailyData);
      }
      return data;
    } catch (error) {
      console.error('Erreur chargement données:', error);
      return { dailyData: {} };
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Erreur sauvegarde données:', error);
      return false;
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings`);
      const data = await response.json();
      setSettings(data);
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
      
      if (!response.ok) throw new Error('Erreur sauvegarde paramètres');
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      return false;
    }
  };

  // Chargement initial
  useEffect(() => {
    loadSettings();
    loadMonthData(currentDate);
  }, []);

  // Rechargement lors du changement de mois
  useEffect(() => {
    loadMonthData(currentDate);
  }, [currentDate]);

  // Auto-save lors des modifications
  useEffect(() => {
    if (autoSave && Object.keys(dailyData).length > 0) {
      const timeoutId = setTimeout(() => {
        saveMonthData(currentDate, dailyData);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [dailyData, currentDate, autoSave]);

  // Utilitaires dates
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
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    
    if (m === 0) {
      return `${h}h`;
    }
    return `${h}h${String(m).padStart(2, '0')}`;
  };

  const formatTimeRangeFrench = (depot, reprise) => {
    if (!depot || !reprise) return '';
    return `${formatTimeFrench(depot)}-${formatTimeFrench(reprise)}`;
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Calcul des heures pour un jour
  const calculateDayHours = (dayData) => {
    if (!dayData.depot || !dayData.reprise) return { total: 0, normales: 0, majorees: 0 };
    
    const [depotH, depotM] = dayData.depot.split(':').map(Number);
    const [repriseH, repriseM] = dayData.reprise.split(':').map(Number);
    
    const depotMinutes = depotH * 60 + depotM;
    const repriseMinutes = repriseH * 60 + repriseM;
    const totalMinutes = repriseMinutes - depotMinutes;
    const totalHours = totalMinutes / 60;
    
    if (totalHours <= settings.seuilMajoration) {
      return { total: totalHours, normales: totalHours, majorees: 0 };
    } else {
      return { 
        total: totalHours, 
        normales: settings.seuilMajoration, 
        majorees: totalHours - settings.seuilMajoration 
      };
    }
  };

  // Calcul du salaire d'un jour
  const calculateDaySalary = (dayData, date) => {
    if (dayData.status === 'conge-parent' || dayData.status === 'conge-assmat') {
      const avgHours = getMonthlyStats().moyenneHeuresJour || 8;
      return avgHours * settings.tarifHoraire;
    }
    
    if (!dayData.depot || !dayData.reprise) return 0;
    
    const hours = calculateDayHours(dayData);
    return (hours.normales * settings.tarifHoraire) + 
           (hours.majorees * settings.tarifHoraire * settings.tarifMajoration);
  };

  // Statistiques mensuelles
  const getMonthlyStats = () => {
    const { year, month } = getDaysInMonth(currentDate);
    
    let totalHours = 0;
    let totalSalary = 0;
    let joursTravailles = 0;
    let joursCongesAssmat = 0;
    let joursCongesParent = 0;
    let joursPresence = 0; // Pour calculer les vrais frais mensuels
    
    for (let day = 1; day <= getDaysInMonth(currentDate).daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (isWeekend(date)) continue;
      
      const dayKey = formatDate(date);
      const dayData = dailyData[dayKey] || {};
      
      if (dayData.status === 'conge-assmat') {
        joursCongesAssmat++;
        const avgHours = 8;
        totalSalary += avgHours * settings.tarifHoraire;
      } else if (dayData.status === 'conge-parent') {
        joursCongesParent++;
        const avgHours = 8;
        totalSalary += avgHours * settings.tarifHoraire;
      } else if (dayData.depot && dayData.reprise) {
        joursTravailles++;
        joursPresence++;
        const hours = calculateDayHours(dayData);
        totalHours += hours.total;
        totalSalary += calculateDaySalary(dayData, date);
      }
    }
    
    // Frais mensuels calculés sur les jours de présence réels du mois
    const fraisMensuels = (settings.fraisRepas + settings.fraisEntretien) * joursTravailles;
    totalSalary += fraisMensuels;
    
    return {
      totalHeures: totalHours,
      moyenneHeuresJour: joursTravailles > 0 ? totalHours / joursTravailles : 0,
      salaireHoraire: totalSalary - fraisMensuels,
      fraisMensuels,
      salaireTotal: totalSalary,
      joursTravailles,
      joursCongesAssmat,
      joursCongesParent,
      joursPresence
    };
  };

  // Calcul des stats pour un mois spécifique (utilisé par le récap annuel)
  const calculateMonthStats = (date, monthDailyData) => {
    const { year, month } = getDaysInMonth(date);
    
    let totalHours = 0;
    let totalSalary = 0;
    let joursTravailles = 0;
    let joursCongesAssmat = 0;
    let joursCongesParent = 0;
    let joursPresence = 0;
    
    for (let day = 1; day <= getDaysInMonth(date).daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      if (isWeekend(dayDate)) continue;
      
      const dayKey = formatDate(dayDate);
      const dayData = monthDailyData[dayKey] || {};
      
      if (dayData.status === 'conge-assmat') {
        joursCongesAssmat++;
        const avgHours = 8;
        totalSalary += avgHours * settings.tarifHoraire;
      } else if (dayData.status === 'conge-parent') {
        joursCongesParent++;
        const avgHours = 8;
        totalSalary += avgHours * settings.tarifHoraire;
      } else if (dayData.depot && dayData.reprise) {
        joursTravailles++;
        joursPresence++;
        const hours = calculateDayHours(dayData);
        totalHours += hours.total;
        totalSalary += calculateDaySalary(dayData, dayDate);
      }
    }
    
    const fraisMensuels = (settings.fraisRepas + settings.fraisEntretien) * joursTravailles;
    totalSalary += fraisMensuels;
    
    return {
      totalHeures: totalHours,
      salaireTotal: totalSalary,
      joursTravailles,
      joursCongesAssmat,
      joursCongesParent,
      fraisMensuels,
      joursPresence
    };
  };

  // Statistiques annuelles
  const getAnnualStats = async (year = null) => {
    const targetYear = year || currentDate.getFullYear();
    const monthlyData = [];
    let totalHeuresAnnuel = 0;
    let totalSalaireAnnuel = 0;
    let totalJoursTravailles = 0;
    let totalJoursCongesAssmat = 0;
    let totalJoursCongesParent = 0;
    let totalFraisAnnuel = 0;

    // Charger les données de chaque mois de l'année
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(targetYear, month, 1);
      const monthKey = `${targetYear}-${String(month + 1).padStart(2, '0')}`;
      
      try {
        const response = await fetch(`${API_BASE}/api/data/${monthKey}`);
        const data = await response.json();
        
        if (data.dailyData) {
          // Calculer les stats pour ce mois spécifique
          const monthStats = calculateMonthStats(monthDate, data.dailyData);
          monthlyData.push({
            month: monthDate.toLocaleDateString('fr-FR', { month: 'long' }),
            monthKey,
            ...monthStats
          });
          
          // Ajouter aux totaux annuels
          totalHeuresAnnuel += monthStats.totalHeures;
          totalSalaireAnnuel += monthStats.salaireTotal;
          totalJoursTravailles += monthStats.joursTravailles;
          totalJoursCongesAssmat += monthStats.joursCongesAssmat;
          totalJoursCongesParent += monthStats.joursCongesParent;
          totalFraisAnnuel += monthStats.fraisMensuels;
        } else {
          // Mois sans données
          monthlyData.push({
            month: monthDate.toLocaleDateString('fr-FR', { month: 'long' }),
            monthKey,
            totalHeures: 0,
            salaireTotal: 0,
            joursTravailles: 0,
            joursCongesAssmat: 0,
            joursCongesParent: 0,
            fraisMensuels: 0,
            joursPresence: 0
          });
        }
      } catch (error) {
        // Erreur de chargement, mois vide
        monthlyData.push({
          month: monthDate.toLocaleDateString('fr-FR', { month: 'long' }),
          monthKey,
          totalHeures: 0,
          salaireTotal: 0,
          joursTravailles: 0,
          joursCongesAssmat: 0,
          joursCongesParent: 0,
          fraisMensuels: 0,
          joursPresence: 0
        });
      }
    }

    return {
      year: targetYear,
      monthlyData,
      totalHeuresAnnuel,
      totalSalaireAnnuel,
      totalJoursTravailles,
      totalJoursCongesAssmat,
      totalJoursCongesParent,
      totalFraisAnnuel,
      moyenneHeuresAnnuel: totalJoursTravailles > 0 ? totalHeuresAnnuel / totalJoursTravailles : 0,
      moyenneSalaireAnnuel: totalSalaireAnnuel / 12
    };
  };

  // Composant Modal jour
  const DayModal = () => {
    const [formData, setFormData] = useState({
      depot: '',
      reprise: '',
      status: 'normal',
      notes: ''
    });

    useEffect(() => {
      if (selectedDay) {
        const dayKey = formatDate(selectedDay);
        const existingData = dailyData[dayKey] || {};
        setFormData({
          depot: existingData.depot || '',
          reprise: existingData.reprise || '',
          status: existingData.status || 'normal',
          notes: existingData.notes || ''
        });
      }
    }, [selectedDay]);

    const handleSave = () => {
      const dayKey = formatDate(selectedDay);
      setDailyData(prev => ({
        ...prev,
        [dayKey]: formData
      }));
      setShowDayModal(false);
    };

    if (!showDayModal || !selectedDay) return null;

    const hours = formData.depot && formData.reprise ? calculateDayHours(formData) : null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">
            {selectedDay.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Statut du jour</label>
              <select 
                value={formData.status} 
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Jour normal</option>
                <option value="conge-assmat">Congé assistant maternel</option>
                <option value="conge-parent">Pas de dépôt (congé parent)</option>
              </select>
            </div>

            {formData.status === 'normal' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Dépôt</label>
                    <input
                      type="time"
                      value={formData.depot}
                      onChange={(e) => setFormData(prev => ({ ...prev, depot: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reprise</label>
                    <input
                      type="time"
                      value={formData.reprise}
                      onChange={(e) => setFormData(prev => ({ ...prev, reprise: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {hours && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm"><strong>Total:</strong> {hours.total.toFixed(2)}h</p>
                    <p className="text-sm"><strong>Normales:</strong> {hours.normales.toFixed(2)}h</p>
                    {hours.majorees > 0 && (
                      <p className="text-sm text-orange-600"><strong>Majorées:</strong> {hours.majorees.toFixed(2)}h</p>
                    )}
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Enregistrer
            </button>
            <button
              onClick={() => setShowDayModal(false)}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Composant Paramètres
  const SettingsPanel = () => {
    const [tempSettings, setTempSettings] = useState(settings);

    if (!showSettings) return null;

    const handleSave = async () => {
      const success = await saveSettings(tempSettings);
      if (success) {
        setSettings(tempSettings);
        setShowSettings(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Paramètres</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tarif horaire (€)</label>
              <input
                type="number"
                step="0.01"
                value={tempSettings.tarifHoraire}
                onChange={(e) => setTempSettings(prev => ({ ...prev, tarifHoraire: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Seuil majoration (heures/jour)</label>
              <input
                type="number"
                step="0.5"
                value={tempSettings.seuilMajoration}
                onChange={(e) => setTempSettings(prev => ({ ...prev, seuilMajoration: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Taux majoration</label>
              <input
                type="number"
                step="0.01"
                value={tempSettings.tarifMajoration}
                onChange={(e) => setTempSettings(prev => ({ ...prev, tarifMajoration: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Frais repas/jour (€)</label>
              <input
                type="number"
                step="0.01"
                value={tempSettings.fraisRepas}
                onChange={(e) => setTempSettings(prev => ({ ...prev, fraisRepas: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Frais entretien/jour (€)</label>
              <input
                type="number"
                step="0.01"
                value={tempSettings.fraisEntretien}
                onChange={(e) => setTempSettings(prev => ({ ...prev, fraisEntretien: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Jours mensualisés</label>
              <input
                type="number"
                value={tempSettings.joursMenualises}
                onChange={(e) => setTempSettings(prev => ({ ...prev, joursMenualises: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Enregistrer
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Composant Vue Annuelle
  const AnnualView = () => {
    const [annualStats, setAnnualStats] = useState(null);
    const [loadingAnnual, setLoadingAnnual] = useState(false);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const loadAnnualData = async (year = null) => {
      setLoadingAnnual(true);
      try {
        const stats = await getAnnualStats(year || selectedYear);
        setAnnualStats(stats);
      } catch (error) {
        console.error('Erreur chargement données annuelles:', error);
      } finally {
        setLoadingAnnual(false);
      }
    };

    // Charger les données au montage et lors du changement d'année
    useEffect(() => {
      if (showAnnualView) {
        loadAnnualData(selectedYear);
      }
    }, [showAnnualView, selectedYear]);

    // Réinitialiser l'année sélectionnée quand on ouvre la vue
    useEffect(() => {
      if (showAnnualView) {
        setSelectedYear(currentDate.getFullYear());
      }
    }, [showAnnualView]);

    const changeYear = (direction) => {
      const newYear = selectedYear + direction;
      setSelectedYear(newYear);
    };

    if (!showAnnualView) return null;

    return (
      <div className="fixed inset-0 bg-white z-40 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Récapitulatif Annuel
                {loadingAnnual && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
              </h2>
              
              {/* Navigation années */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeYear(-1)}
                  disabled={loadingAnnual}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  ← 
                </button>
                <span className="font-semibold text-lg px-3 py-1 bg-gray-100 rounded">
                  {selectedYear}
                </span>
                <button
                  onClick={() => changeYear(1)}
                  disabled={loadingAnnual}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => loadAnnualData(selectedYear)}
                disabled={loadingAnnual}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingAnnual ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowAnnualView(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>

          {loadingAnnual ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
              <p className="text-gray-600">Chargement des données annuelles...</p>
            </div>
          ) : annualStats ? (
            <div className="space-y-6">
              {/* Totaux annuels */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Heures Totales</h3>
                  <p className="text-3xl font-bold">{annualStats.totalHeuresAnnuel.toFixed(1)}h</p>
                  <p className="text-blue-100 text-sm">Moy: {annualStats.moyenneHeuresAnnuel.toFixed(1)}h/jour</p>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Salaire Total</h3>
                  <p className="text-3xl font-bold">{annualStats.totalSalaireAnnuel.toFixed(0)} €</p>
                  <p className="text-green-100 text-sm">Moy: {annualStats.moyenneSalaireAnnuel.toFixed(0)} €/mois</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Jours Travaillés</h3>
                  <p className="text-3xl font-bold">{annualStats.totalJoursTravailles}</p>
                  <p className="text-purple-100 text-sm">Congés AM: {annualStats.totalJoursCongesAssmat}</p>
                </div>
                
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Frais Totaux</h3>
                  <p className="text-3xl font-bold">{annualStats.totalFraisAnnuel.toFixed(0)} €</p>
                  <p className="text-orange-100 text-sm">Repas + Entretien</p>
                </div>
              </div>

              {/* Indication de l'année affichée */}
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Données pour l'année <strong>{annualStats.year}</strong>
                  {annualStats.year !== currentDate.getFullYear() && 
                    <span className="text-blue-600"> (année différente de la consultation actuelle)</span>
                  }
                </p>
              </div>

              {/* Tableau mensuel détaillé */}
              <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Mois</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Heures</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Jours trav.</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Congés AM</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Congés Parent</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Frais</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Salaire Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualStats.monthlyData.map((monthData, index) => (
                      <tr key={monthData.monthKey} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{monthData.month}</td>
                        <td className="px-4 py-3 text-right">
                          {monthData.totalHeures > 0 ? `${monthData.totalHeures.toFixed(1)}h` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {monthData.joursTravailles > 0 ? monthData.joursTravailles : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600">
                          {monthData.joursCongesAssmat > 0 ? monthData.joursCongesAssmat : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600">
                          {monthData.joursCongesParent > 0 ? monthData.joursCongesParent : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {monthData.fraisMensuels > 0 ? `${monthData.fraisMensuels.toFixed(0)} €` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          {monthData.salaireTotal > 0 ? `${monthData.salaireTotal.toFixed(0)} €` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 font-semibold">
                      <td className="px-4 py-3 text-gray-900">TOTAUX ANNUELS</td>
                      <td className="px-4 py-3 text-right text-gray-900">{annualStats.totalHeuresAnnuel.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right text-gray-900">{annualStats.totalJoursTravailles}</td>
                      <td className="px-4 py-3 text-right text-orange-600">{annualStats.totalJoursCongesAssmat}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{annualStats.totalJoursCongesParent}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{annualStats.totalFraisAnnuel.toFixed(0)} €</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600 text-lg">{annualStats.totalSalaireAnnuel.toFixed(0)} €</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Impossible de charger les données annuelles</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Export/Import et Sauvegarde manuelle
  const exportData = async () => {
    try {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const data = {
        dailyData,
        settings,
        month: monthKey,
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assistant-maternel-${monthKey}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors de l\'export');
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.dailyData) {
          setDailyData(data.dailyData);
          await saveMonthData(currentDate, data.dailyData);
        }
        
        if (data.settings) {
          await saveSettings(data.settings);
          setSettings(data.settings);
        }
        
        alert('Données importées avec succès !');
      } catch (error) {
        alert('Erreur lors de l\'import des données');
      }
    };
    reader.readAsText(file);
    
    event.target.value = '';
  };

  const manualSave = async () => {
    setLoading(true);
    const success = await saveMonthData(currentDate, dailyData);
    if (success) {
      alert('Données sauvegardées !');
    }
    setLoading(false);
  };

  const reloadData = async () => {
    await loadMonthData(currentDate);
    await loadSettings();
    alert('Données rechargées !');
  };

  const stats = getMonthlyStats();

  // Génération du calendrier
  const renderCalendar = () => {
    const { daysInMonth, startWeekday, year, month } = getDaysInMonth(currentDate);
    const days = [];
    
    for (let i = 0; i < startWeekday - 1; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayKey = formatDate(date);
      const dayData = dailyData[dayKey] || {};
      const isWeekendDay = isWeekend(date);
      
      let bgColor = 'bg-white hover:bg-gray-50';
      let textColor = 'text-gray-900';
      let statusText = '';
      
      if (isWeekendDay) {
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-400';
      } else if (dayData.status === 'conge-assmat') {
        bgColor = 'bg-orange-100 hover:bg-orange-200';
        statusText = 'Congé AM';
      } else if (dayData.status === 'conge-parent') {
        bgColor = 'bg-blue-100 hover:bg-blue-200';
        statusText = 'Congé Parent';
      } else if (dayData.depot && dayData.reprise) {
        bgColor = 'bg-green-100 hover:bg-green-200';
        const hours = calculateDayHours(dayData);
        statusText = `${hours.total.toFixed(1)}h`;
      }
      
      days.push(
        <div
          key={day}
          onClick={() => !isWeekendDay && (setSelectedDay(date), setShowDayModal(true))}
          className={`h-24 border border-gray-200 p-2 cursor-pointer ${bgColor} ${textColor} ${isWeekendDay ? 'cursor-not-allowed' : ''}`}
        >
          <div className="font-semibold">{day}</div>
          <div className="text-xs mt-1">
            {formatTimeRangeFrench(dayData.depot, dayData.reprise)}
          </div>
          <div className="text-xs text-center mt-1 font-medium">
            {statusText}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Suivi Assistant Maternel
                {loading && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
              </h1>
              <p className="text-gray-600 mt-1">
                {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowAnnualView(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                Récap Annuel
              </button>

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                <input
                  type="checkbox"
                  id="autosave"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autosave" className="text-sm text-gray-700">Auto-save</label>
              </div>

              <button
                onClick={manualSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Sauvegarde...' : 'Sauver'}
              </button>

              <button
                onClick={reloadData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Recharger
              </button>
              
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Paramètres
              </button>
              
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              
              <label className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors cursor-pointer">
                <Upload className="h-4 w-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

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

              <div className="grid grid-cols-7 bg-gray-50">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className="p-3 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {renderCalendar()}
              </div>
            </div>
          </div>

          {/* Panneau statistiques */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Récap mensuel
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Heures totales</span>
                  <span className="font-medium">{stats.totalHeures.toFixed(1)}h</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Moyenne/jour</span>
                  <span className="font-medium">{stats.moyenneHeuresJour.toFixed(1)}h</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Jours travaillés</span>
                  <span className="font-medium">{stats.joursTravailles}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Jours de présence</span>
                  <span className="font-medium">{stats.joursPresence}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Congés AM</span>
                  <span className="font-medium">{stats.joursCongesAssmat}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Congés parent</span>
                  <span className="font-medium">{stats.joursCongesParent}</span>
                </div>
                
                <hr className="my-3" />
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Salaire horaire</span>
                  <span className="font-medium">{stats.salaireHoraire.toFixed(2)} €</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais repas</span>
                  <span className="font-medium">{(settings.fraisRepas * stats.joursPresence).toFixed(2)} € <span className="text-xs text-gray-500">({stats.joursPresence}j × {settings.fraisRepas}€)</span></span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Frais entretien</span>
                  <span className="font-medium">{(settings.fraisEntretien * stats.joursPresence).toFixed(2)} € <span className="text-xs text-gray-500">({stats.joursPresence}j × {settings.fraisEntretien}€)</span></span>
                </div>
                
                <div className="flex justify-between font-semibold text-lg border-t pt-3">
                  <span>Total à payer</span>
                  <span className="text-green-600">{stats.salaireTotal.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Légende</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded"></div>
                  <span>Jour travaillé</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-100 rounded"></div>
                  <span>Congé assistant maternel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded"></div>
                  <span>Congé parent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span>Week-end</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DayModal />
        <SettingsPanel />
        <AnnualView />
      </div>
    </div>
  );
};

function App() {
  return <AssistantMaternelTracker />;
}

export default App;