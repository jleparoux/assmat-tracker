// Modals.js - Toutes les modales de l'application AssmatTracker
import React, { useState, useEffect } from 'react';
import { Calculator, Euro, Calendar, Clock, Home, Utensils, Info, X } from 'lucide-react';

import { 
  calculateAnneeCompleteValues, 
  formatDate,
  formatTimeRangeFrench,
  calculateDayHours,
  calculateMonthlyStats,
  getCalculationFormulas,
  getSettingsFieldLabels,
  validateAnneeCompleteSettings, 
} from './utils';

// ============================================
// MODAL DE SAISIE D'UN JOUR
// ============================================

export function DayModal({ 
  showDayModal,
  selectedDay,
  selectedDays,
  dailyData,
  settings,
  autoSave,
  currentDate,
  onSave,
  onClose,
  onDataUpdate
}) {
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
    
    onSave(dayData);
  };

  const handleDelete = () => {
    if (selectedDay) {
      const dateKey = formatDate(selectedDay);
      if (window.confirm('Êtes-vous sûr de vouloir supprimer les données de ce jour ?')) {
        const newData = { ...dailyData };
        delete newData[dateKey];
        onDataUpdate(newData);
        if (autoSave) {
          // Logique de sauvegarde sera gérée par le parent
        }
        onClose();
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
              🗑️
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
              <option value="ferie">Jour férié</option>
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
                    {calculateDayHours({ depot, reprise }, settings).total.toFixed(1)}h
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
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
}

// ============================================
// MODAL VUE ANNUELLE
// ============================================

export function AnnualView({ 
  showAnnualView,
  selectedYear,
  loadingAnnual,
  annualStats,
  settings,
  onYearChange,
  onClose
}) {
  const changeYear = (direction) => {
    onYearChange(prev => prev + direction);
  };

  const handleClose = () => {
    onClose();
  };

  // Calcul du salaire mensualisé annuel
  const calculateAnnualMensualise = () => {
    if (!settings || !settings.salaireHoraireNet || !settings.nombreHeuresMensualisees) {
      return 0;
    }
    return settings.nombreHeuresMensualisees * settings.salaireHoraireNet * 12;
  };

  // Calcul du total mensualisé avec frais
  const calculateTotalMensualiseWithFrais = () => {
    const salaireMensualise = calculateAnnualMensualise();
    const totalFrais = annualStats ? (annualStats.totalFraisRepas + annualStats.totalFraisEntretien) : 0;
    return salaireMensualise + totalFrais;
  };

  // Fonction pour calculer le salaire mensualisé par mois
  const getMonthlySalaireMensualise = () => {
    if (!settings || !settings.salaireHoraireNet || !settings.nombreHeuresMensualisees) {
      return 0;
    }
    return settings.nombreHeuresMensualisees * settings.salaireHoraireNet;
  };

  if (!showAnnualView) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
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
              <div className="h-8 w-8 animate-spin text-blue-500">🔄</div>
              <span className="ml-2 text-gray-600">Chargement des données annuelles...</span>
            </div>
          ) : annualStats ? (
            <div className="space-y-6">
              
              {/* Résumé annuel avec comparaison réel vs mensualisé */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{annualStats.totalHours}h</div>
                  <div className="text-blue-700">Heures travaillées</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{annualStats.totalWorkDays}</div>
                  <div className="text-green-700">Jours travaillés</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-purple-900">{annualStats.totalSalary.toFixed(2)}€</div>
                  <div className="text-purple-700">Salaire réel</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-indigo-900">{calculateAnnualMensualise().toFixed(2)}€</div>
                  <div className="text-indigo-700">Salaire mensualisé</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-orange-900">{calculateTotalMensualiseWithFrais().toFixed(2)}€</div>
                  <div className="text-orange-700">Total mensualisé + frais</div>
                </div>
              </div>

              {/* Détail mensuel amélioré */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h4 className="font-semibold">📅 Détail par mois</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-900">Mois</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">Heures</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">Jours</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">CP AM</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">CP Parent</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">Salaire Réel</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">Salaire Mensuel.</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">Frais Repas</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">Frais Entretien</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">Total Réel</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-900">Total Mensuel.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {annualStats.monthlyDetails.map((month) => {
                        const salaireMensualise = getMonthlySalaireMensualise();
                        const totalMensualise = salaireMensualise + month.fraisRepas + month.fraisEntretien;
                        
                        return (
                          <tr key={month.month} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-sm text-gray-900 capitalize font-medium">{month.monthName}</td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-right">{month.hours.toFixed(1)}h</td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-right">{month.workDays}</td>
                            <td className="px-3 py-3 text-sm text-red-600 text-right font-medium">{month.congeDays}</td>
                            <td className="px-3 py-3 text-sm text-yellow-600 text-right font-medium">{month.congeParentDays}</td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-right">{month.salary.toFixed(2)}€</td>
                            <td className="px-3 py-3 text-sm text-indigo-600 text-right font-medium">{salaireMensualise.toFixed(2)}€</td>
                            <td className="px-3 py-3 text-sm text-gray-600 text-right">{month.fraisRepas.toFixed(2)}€</td>
                            <td className="px-3 py-3 text-sm text-gray-600 text-right">{month.fraisEntretien.toFixed(2)}€</td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-right font-medium">{month.total.toFixed(2)}€</td>
                            <td className="px-3 py-3 text-sm text-orange-600 text-right font-bold">{totalMensualise.toFixed(2)}€</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td className="px-3 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                        <td className="px-3 py-3 text-sm font-bold text-gray-900 text-right">{annualStats.totalHours}h</td>
                        <td className="px-3 py-3 text-sm font-bold text-gray-900 text-right">{annualStats.totalWorkDays}</td>
                        <td className="px-3 py-3 text-sm font-bold text-red-700 text-right">{annualStats.totalCongeDays}</td>
                        <td className="px-3 py-3 text-sm font-bold text-yellow-700 text-right">{annualStats.totalCongeParentDays}</td>
                        <td className="px-3 py-3 text-sm font-bold text-gray-900 text-right">{annualStats.totalSalary.toFixed(2)}€</td>
                        <td className="px-3 py-3 text-sm font-bold text-indigo-700 text-right">{calculateAnnualMensualise().toFixed(2)}€</td>
                        <td className="px-3 py-3 text-sm font-bold text-gray-700 text-right">{annualStats.totalFraisRepas.toFixed(2)}€</td>
                        <td className="px-3 py-3 text-sm font-bold text-gray-700 text-right">{annualStats.totalFraisEntretien.toFixed(2)}€</td>
                        <td className="px-3 py-3 text-sm font-bold text-gray-900 text-right">{annualStats.grandTotal.toFixed(2)}€</td>
                        <td className="px-3 py-3 text-sm font-bold text-orange-700 text-right">{calculateTotalMensualiseWithFrais().toFixed(2)}€</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Moyennes comparatives */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">📊 Moyennes mensuelles comparatives</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Heures :</span>
                    <span className="ml-2 font-medium">{annualStats.averageHoursPerMonth}h</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Jours :</span>
                    <span className="ml-2 font-medium">{Math.round(annualStats.totalWorkDays / 12)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Salaire réel :</span>
                    <span className="ml-2 font-medium">{annualStats.averageSalaryPerMonth.toFixed(2)}€</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Salaire mensualisé :</span>
                    <span className="ml-2 font-medium text-indigo-600">{getMonthlySalaireMensualise().toFixed(2)}€</span>
                  </div>
                  <div>
                    <span className="text-gray-600">CP AM moyen :</span>
                    <span className="ml-2 font-medium text-red-600">{Math.round(annualStats.totalCongeDays / 12 * 10) / 10}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">CP Parent moyen :</span>
                    <span className="ml-2 font-medium text-yellow-600">{Math.round(annualStats.totalCongeParentDays / 12 * 10) / 10}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total réel :</span>
                    <span className="ml-2 font-medium">{(annualStats.grandTotal / 12).toFixed(2)}€</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total mensualisé :</span>
                    <span className="ml-2 font-medium text-orange-600">{(calculateTotalMensualiseWithFrais() / 12).toFixed(2)}€</span>
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
}

// ============================================
// MODAL DES PARAMÈTRES
// ============================================

export function SettingsModal({ 
  showSettingsModal,
  settings,
  onSave,
  onClose
}) {
  const [tempSettings, setTempSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState('contract');
  const [calculatedValues, setCalculatedValues] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Labels des champs
  const fieldLabels = getSettingsFieldLabels();

  // Configuration des onglets
  const tabs = [
    { id: 'contract', label: 'Contrat', icon: Calendar },
    { id: 'tarifs', label: 'Tarifs', icon: Euro },
    { id: 'frais', label: 'Frais', icon: Home },
    { id: 'calculs', label: 'Calculs', icon: Calculator }
  ];

  // Initialisation
  useEffect(() => {
    if (showSettingsModal) {
      setTempSettings(settings);
      setActiveTab('contract');
      setValidationErrors([]);
    }
  }, [showSettingsModal, settings]);

  // Calculs automatiques quand les paramètres changent
  useEffect(() => {
    if (tempSettings && Object.keys(tempSettings).length > 0) {
      setIsCalculating(true);
      
      // Validation
      const validation = validateAnneeCompleteSettings(tempSettings);
      setValidationErrors(validation.errors);
      
      // Calculs
      if (validation.isValid) {
        const calculated = calculateAnneeCompleteValues(tempSettings);
        setCalculatedValues(calculated);
      } else {
        setCalculatedValues({});
      }
      
      setIsCalculating(false);
    }
  }, [tempSettings]);

  if (!showSettingsModal) return null;

  const handleSave = async () => {
    const validation = validateAnneeCompleteSettings(tempSettings);
    
    if (!validation.isValid) {
      alert(`Erreurs de validation:\n${validation.errors.join('\n')}`);
      return;
    }

    const success = await onSave(tempSettings);
    if (success) {
      onClose();
      alert('Paramètres sauvegardés avec succès !');
    } else {
      alert('Erreur lors de la sauvegarde');
    }
  };

  const updateSetting = (field, value) => {
    setTempSettings(prev => ({ ...prev, [field]: value }));
  };

  const renderInputField = (field, type = 'number', step = null, min = null, max = null) => {
    const hasError = validationErrors.some(error => error.includes(field));
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {fieldLabels[field]}
        </label>
        <input
          type={type}
          step={step}
          min={min}
          max={max}
          value={tempSettings[field] || ''}
          onChange={(e) => {
            const value = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            updateSetting(field, value);
          }}
          className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
        {hasError && (
          <p className="text-red-600 text-xs mt-1">
            {validationErrors.find(error => error.includes(field))}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">⚙️ Paramètres - Méthode année complète</h2>
              <p className="text-sm text-gray-600 mt-1">Configuration du contrat d'assistante maternelle</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu */}
        <div className="h-96 overflow-y-auto p-6">
          {/* Onglet Contrat */}
          {activeTab === 'contract' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-600 mt-0.5" size={16} />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Méthode année complète</p>
                    <p className="text-blue-700 mt-1">
                      La mensualisation lisse le salaire sur 12 mois en tenant compte de toutes les semaines de l'année.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">                  
                  {renderInputField('moisPourMensualisation', 'number', '1', 1, 12)}
                  {renderInputField('nbHeuresParSemaine', 'number', '0.5', 0.5, 168)}
                </div>

                <div className="space-y-4">
                  {renderInputField('semainesPourMensualisation', 'number', '1', 1, 53)}
                  {renderInputField('joursTravaillesParSemaine', 'number', '1', 1, 7)}
                </div>
              </div>
            </div>
          )}

          {/* Onglet Tarifs */}
          {activeTab === 'tarifs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Tarification horaire</h3>
                  
                  {renderInputField('salaireHoraireNet', 'number', '0.01', 0.01, 1000)}
                  {renderInputField('seuilMajoration', 'number', '0.5', 0, 24)}
                  {renderInputField('tarifMajoration', 'number', '0.01', 1, 10)}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Règles URSSAF</h3>
                  
                  {renderInputField('salaireNetPlafond', 'number', '0.01', 0.01, 1000)}
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <strong>Plafond URSSAF :</strong> Salaire net journalier maximum selon la réglementation en vigueur.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Frais */}
          {activeTab === 'frais' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Utensils size={16} />
                    Frais de repas
                  </h3>
                  
                  {renderInputField('fraisRepasParJournee', 'number', '0.1', 0, 100)}
                  
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      💡 Les frais de repas sont calculés au prorata des jours travaillés dans le mois.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Home size={16} />
                    Frais d'entretien
                  </h3>
                  
                  {renderInputField('fraisEntretienJournalier', 'number', '0.1', 0, 100)}
                  
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      💡 Les frais d'entretien couvrent l'usure du matériel et les produits d'hygiène.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Calculs */}
          {activeTab === 'calculs' && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Calculator className="text-green-600 mt-0.5" size={16} />
                  <div className="text-sm">
                    <p className="font-medium text-green-900">Calculs automatiques</p>
                    <p className="text-green-700 mt-1">
                      Ces valeurs sont calculées automatiquement selon la méthode année complète.
                    </p>
                  </div>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Erreurs de validation :</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Valeurs calculées</h3>
                  {isCalculating ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Calcul en cours...</p>
                    </div>
                  ) : Object.keys(calculatedValues).length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Nombre de jours mensualisés</span>
                        <span className="font-medium text-lg">{calculatedValues.nombreJoursMensualisation}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Heures mensualisées</span>
                        <span className="font-medium text-lg">{calculatedValues.nombreHeuresMensualisees}h</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Salaire net mensualisé</span>
                        <span className="font-medium text-lg text-green-600">{calculatedValues.salaireNetMensualise.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">Salaire net journalier</span>
                        <span className="font-medium text-lg text-blue-600">{calculatedValues.salaireNetJournalier.toFixed(2)}€</span>
                      </div>
                      
                      {/* Comparaison avec plafond URSSAF */}
                      {tempSettings.salaireNetPlafond && calculatedValues.salaireNetJournalier > tempSettings.salaireNetPlafond && (
                        <div className="bg-red-50 p-3 rounded-lg mt-4">
                          <p className="text-red-800 text-sm font-medium">
                            ⚠️ Attention : Le salaire journalier dépasse le plafond URSSAF
                          </p>
                          <p className="text-red-700 text-xs mt-1">
                            Dépassement : +{(calculatedValues.salaireNetJournalier - tempSettings.salaireNetPlafond).toFixed(2)}€
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Corrigez les erreurs pour voir les calculs
                    </div>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Formules utilisées</h3>
                  {Object.keys(calculatedValues).length > 0 && (
                    <div className="space-y-3 text-sm">
                      {(() => {
                        const formulas = getCalculationFormulas(tempSettings);
                        return Object.entries(formulas).map(([key, formula]) => {
                          const labels = {
                            nombreJoursMensualisation: 'Jours mensualisés',
                            heuresTravailParSemaine: 'Heures/semaine',
                            nombreHeuresMensualisees: 'Heures mensualisées',
                            salaireNetMensualise: 'Salaire mensualisé',
                            salaireNetJournalier: 'Salaire journalier'
                          };
                          
                          return (
                            <div key={key} className="bg-gray-50 p-3 rounded">
                              <strong>{labels[key]} : </strong>
                              <code className="text-xs">{formula}</code>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {validationErrors.length > 0 ? (
                <span className="text-red-600">⚠️ Corrigez les erreurs avant de sauvegarder</span>
              ) : (
                <span>✅ Configuration valide</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={validationErrors.length > 0}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  validationErrors.length > 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Sauvegarder les paramètres
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MODAL DE DUPLICATION
// ============================================

export function DuplicateModal({ 
  showDuplicateModal,
  duplicateSource,
  settings,
  onContinue,
  onClose
}) {
  if (!showDuplicateModal || !duplicateSource) return null;

  const handleDuplicate = () => {
    onContinue();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
              Durée : {calculateDayHours(duplicateSource, settings).total.toFixed(1)}h
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
            onClick={onClose}
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
}