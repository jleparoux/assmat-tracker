// Modals.js - Toutes les modales de l'application AssmatTracker
import React, { useState, useEffect } from 'react';
import { formatDate, formatTimeRangeFrench, calculateDayHours, calculateMonthlyStats } from './utils';

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
  onYearChange,
  onClose
}) {
  const changeYear = (direction) => {
    onYearChange(prev => prev + direction);
  };

  const handleClose = () => {
    onClose();
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
              <div className="h-8 w-8 animate-spin text-blue-500">🔄</div>
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

  useEffect(() => {
    if (showSettingsModal) {
      setTempSettings(settings);
    }
  }, [showSettingsModal, settings]);

  if (!showSettingsModal) return null;

  const handleSave = async () => {
    const success = await onSave(tempSettings);
    if (success) {
      onClose();
      alert('Paramètres sauvegardés avec succès !');
    } else {
      alert('Erreur lors de la sauvegarde des paramètres');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
            onClick={onClose}
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