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

    const fraisRepasTotal = monthWithMealsDays * settings.fraisRepas;
    const fraisEntretienTotal = monthWithMaintenanceDays * settings.fraisEntretien;

    totalHours += monthHours;
    totalSalary += monthSalary;
    totalWorkDays += monthWorkDays;
    totalCongeDays += monthCongeDays;
    totalCongeParentDays += monthCongeParentDays;
    totalFraisRepas += fraisRepasTotal;
    totalFraisEntretien += fraisEntretienTotal;

    return {
      month,
      monthName: new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long' }),
      hours: monthHours,
      salary: monthSalary,
      workDays: monthWorkDays,
      congeDays: monthCongeDays,
      congeParentDays: monthCongeParentDays,
      fraisRepas: fraisRepasTotal,
      fraisEntretien: fraisEntretienTotal,
      total: monthSalary + fraisRepasTotal + fraisEntretienTotal
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