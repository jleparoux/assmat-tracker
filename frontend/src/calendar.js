// Calendar.js - Composant calendrier pour AssmatTracker
import React from 'react';
import { 
  formatDate, 
  getDaysInMonth, 
  isWeekend, 
  formatTimeRangeFrench, 
  calculateDayHours 
} from './utils';

export default function Calendar({ 
  currentDate,
  dailyData,
  selectedDays,
  multiSelectMode,
  duplicateSource,
  loading,
  settings,
  onDayClick,
  onGroupEdit,
  onDuplicateShow,
  onNavigation,
  onClearSelection,
  modifierKey,
  isHoliday,
  getHolidayName
}) {

  // Gestion sélection
  const isDateSelected = (date) => {
    const dateKey = formatDate(date);
    return selectedDays.includes(dateKey);
  };

  // Génération complète du calendrier (logique originale)
  const generateCalendar = () => {
    console.log('🗓️ generateCalendar appelée');
    console.log('📊 dailyData disponible:', dailyData);
    console.log('📊 Clés dailyData:', Object.keys(dailyData));

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() || 7) + 1);

    const days = [];
    const currentMonth = currentDate.getMonth();
    const maxDays = 42; // 6 semaines maximum pour affichage complet

    // Génération des jours du calendrier
    for (let i = 0; i < maxDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Arrêter si on dépasse le mois et qu'on n'est plus dans le mois courant
      if (date > lastDay && date.getMonth() !== currentMonth) break;
      
      const dateKey = formatDate(date);
      const dayData = dailyData[dateKey] || {};
      const isCurrentMonth = date.getMonth() === currentMonth;
      const isToday = date.toDateString() === new Date().toDateString();
      const isWeekendDay = isWeekend(date);
      const isSelected = isDateSelected(date);
      const isHolidayDay = isHoliday ? isHoliday(date) : false;
      const holidayName = getHolidayName ? getHolidayName(date) : '';
      const { total } = calculateDayHours(dayData, settings);
      
      let statusText = '';
      let statusColor = '';
      let cellClasses = '';
      
      // Détermination du style selon le type de jour
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
      } else if (dayData.status === 'ferie') {
        statusText = 'Férié';
        statusColor = 'text-purple-700';
        cellClasses = 'bg-purple-50 border-l-4 border-purple-400';
      } else if (dayData.depot && dayData.reprise) {
        statusColor = 'text-green-700';
        cellClasses = 'bg-green-50 border-l-4 border-green-400';
      }

      days.push(
        <div
          key={dateKey}
          onClick={(e) => !isWeekendDay && onDayClick(date, e)}
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
                  {dayData.fraisRepas && (
                    <div 
                      className="w-2 h-2 bg-green-500 rounded-full" 
                      title="Frais de repas"
                    ></div>
                  )}
                  {dayData.fraisEntretien && (
                    <div 
                      className="w-2 h-2 bg-blue-500 rounded-full" 
                      title="Frais d'entretien"
                    ></div>
                  )}
                </div>
              ) : null}

              {/* Badge de sélection */}
              {isSelected && (
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              )}

              {/* Bouton de duplication */}
              {dayData.depot && dayData.reprise && !isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateShow(dayData);
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

            {isHolidayDay && holidayName && (
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
    <div className="bg-white rounded-lg shadow-sm">
      {/* En-tête du calendrier avec navigation */}
      <div className="p-4 border-b flex items-center justify-between">
        <button
          onClick={() => onNavigation('prev')}
          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          disabled={loading}
        >
          ← Précédent
        </button>
        <h2 className="text-lg font-semibold">
          {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={() => onNavigation('next')}
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
                onClick={() => onGroupEdit(null)} // Ouvrir modal pour sélection groupée
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                🔧 Modifier
              </button>
            )}
            {duplicateSource && (
              <button
                onClick={() => {
                  // Cette logique sera gérée par le parent
                  console.log('Duplication demandée pour:', selectedDays);
                }}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                📋 Dupliquer
              </button>
            )}
          </div>
          <button
            onClick={onClearSelection}
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

      {/* Grille du calendrier - Utilise generateCalendar() */}
      <div className="grid grid-cols-7 gap-1 p-4 relative">
        {generateCalendar()}
        
        {/* Indicateur de chargement */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
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
                <div className="w-4 h-4 bg-purple-100 rounded border"></div>
                <span>Jour férié</span>
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
              <p>• Raccourci: Ctrl/Cmd+S pour sauvegarder</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}