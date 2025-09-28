const { normalizeSettings, calculateAnneeCompleteValues } = require('./settings');

const round = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const computeDayHours = (dayData = {}, settings = {}) => {
  if (!dayData.depot || !dayData.reprise) {
    return { normal: 0, majore: 0, total: 0 };
  }

  const [startH, startM] = dayData.depot.split(':').map(Number);
  const [endH, endM] = dayData.reprise.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  let totalMinutes = endMinutes - startMinutes;

  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  const totalHours = totalMinutes / 60;

  const seuilMajoration = settings.seuilMajoration ?? 0;

  if (totalHours <= seuilMajoration) {
    return {
      normal: Math.max(totalHours, 0),
      majore: 0,
      total: Math.max(totalHours, 0),
    };
  }

  const normalHours = Math.max(seuilMajoration, 0);
  const majoredHours = Math.max(totalHours - seuilMajoration, 0);

  return {
    normal: normalHours,
    majore: majoredHours,
    total: Math.max(totalHours, 0),
  };
};

const computeDaySalary = (dayData = {}, settings = {}) => {
  const hours = computeDayHours(dayData, settings);
  const tarifHoraire = settings.tarifHoraire ?? 0;
  const tarifMajoration = settings.tarifMajoration ?? 1;

  const normalSalary = hours.normal * tarifHoraire;
  const majoredSalary = hours.majore * tarifHoraire * tarifMajoration;

  return normalSalary + majoredSalary;
};

const buildDailyBreakdown = (dailyData = {}, settings = {}) => {
  return Object.entries(dailyData || {}).reduce((acc, [date, dayData]) => {
    const hours = computeDayHours(dayData, settings);
    const salary = computeDaySalary(dayData, settings);

    acc[date] = {
      status: dayData.status || null,
      heures: {
        normal: round(hours.normal, 2),
        majore: round(hours.majore, 2),
        total: round(hours.total, 2),
      },
      salaire: round(salary, 2),
      fraisRepas: Boolean(dayData.fraisRepas),
      fraisEntretien: Boolean(dayData.fraisEntretien),
    };

    return acc;
  }, {});
};

const computeMonthlyStats = (dailyData = {}, rawSettings = {}) => {
  const settings = normalizeSettings(rawSettings);
  const anneeComplete = calculateAnneeCompleteValues(settings);

  let totalHours = 0;
  let totalNormalHours = 0;
  let totalMajoredHours = 0;
  let totalSalary = 0;
  let workDays = 0;
  let congeDays = 0;
  let congeParentDays = 0;
  let daysWithMeals = 0;
  let daysWithMaintenance = 0;

  Object.values(dailyData || {}).forEach((dayData = {}) => {
    const status = dayData.status || '';
    const hasWorkPeriod = Boolean(dayData.depot && dayData.reprise);

    if (status === 'conge-assmat') {
      congeDays += 1;
    } else if (status === 'conge-parent') {
      congeParentDays += 1;
    } else if (hasWorkPeriod) {
      workDays += 1;
      const hours = computeDayHours(dayData, settings);
      totalHours += hours.total;
      totalNormalHours += hours.normal;
      totalMajoredHours += hours.majore;
      totalSalary += computeDaySalary(dayData, settings);
    }

    if (dayData.fraisRepas) {
      daysWithMeals += 1;
    }
    if (dayData.fraisEntretien) {
      daysWithMaintenance += 1;
    }
  });

  const fraisRepasTotal = daysWithMeals * (settings.fraisRepas ?? 0);
  const fraisEntretienTotal = daysWithMaintenance * (settings.fraisEntretien ?? 0);
  const meanHoursPerDay = workDays > 0 ? totalHours / workDays : 0;

  const joursTravaillesParSemaine = settings.joursTravaillesParSemaine ?? 0;
  const nbHeuresParSemaine = settings.nbHeuresParSemaine ?? 0;
  const hourlyRate = settings.tarifHoraire ?? 0;
  const majorationRate = settings.tarifMajoration ?? 0;

  const contractDailyHours =
    joursTravaillesParSemaine > 0 ? nbHeuresParSemaine / joursTravaillesParSemaine : 0;
  const theoreticalHours = contractDailyHours * workDays;
  const hoursDelta = totalHours - theoreticalHours;
  const majoredSalary = hoursDelta > 0 ? hoursDelta * hourlyRate * majorationRate : 0;
  const totalWithFrais = totalSalary + majoredSalary + fraisRepasTotal + fraisEntretienTotal;

  return {
    totalHours: round(totalHours, 2),
    totalNormalHours: round(totalNormalHours, 2),
    totalMajoredHours: round(totalMajoredHours, 2),
    meanHoursPerDay: round(meanHoursPerDay, 2),
    totalSalary: round(totalSalary, 2),
    workDays,
    congeDays,
    congeParentDays,
    daysWithMeals,
    daysWithMaintenance,
    fraisRepasTotal: round(fraisRepasTotal, 2),
    fraisEntretienTotal: round(fraisEntretienTotal, 2),
    totalWithFrais: round(totalWithFrais, 2),
    heuresTheoriques: round(Math.max(theoreticalHours, 0), 2),
    ecartHeures: round(hoursDelta, 2),
    majorationSalaire: round(Math.max(majoredSalary, 0), 2),
    anneeComplete,
    ecartMensualise: {
      joursTravailles: workDays,
      joursTheorique: anneeComplete.nombreJoursMensualisation,
      ecartJours: workDays - anneeComplete.nombreJoursMensualisation,
      salaireReel: round(totalSalary, 2),
      salaireMensualise: anneeComplete.salaireNetMensualise,
      ecartSalaire: round(totalSalary - anneeComplete.salaireNetMensualise, 2),
    },
    dailyBreakdown: buildDailyBreakdown(dailyData, settings),
  };
};

const computeAnnualStats = (months = [], rawSettings = {}, year) => {
  const settings = normalizeSettings(rawSettings);
  const anneeComplete = calculateAnneeCompleteValues(settings);

  let totalHours = 0;
  let totalSalary = 0;
  let totalWorkDays = 0;
  let totalCongeDays = 0;
  let totalCongeParentDays = 0;
  let totalFraisRepas = 0;
  let totalFraisEntretien = 0;
  let totalMajorationSalaire = 0;
  let totalPositiveHoursDelta = 0;

  const monthlyDetails = months.map(({ monthKey, dailyData }) => {
    const stats = computeMonthlyStats(dailyData, settings);

    const [yearStr, monthStr] = monthKey.split('-');
    const monthNumber = parseInt(monthStr, 10);
    const monthName = new Date(Number(yearStr), monthNumber - 1).toLocaleDateString('fr-FR', {
      month: 'long',
    });

    totalHours += stats.totalHours;
    totalSalary += stats.totalSalary;
    totalWorkDays += stats.workDays;
    totalCongeDays += stats.congeDays;
    totalCongeParentDays += stats.congeParentDays;
    totalFraisRepas += stats.fraisRepasTotal;
    totalFraisEntretien += stats.fraisEntretienTotal;
    const monthlyPositiveHoursDelta = stats.ecartHeures > 0 ? stats.ecartHeures : 0;
    totalMajorationSalaire += stats.majorationSalaire || 0;
    totalPositiveHoursDelta += monthlyPositiveHoursDelta;

    return {
      month: monthNumber,
      monthKey,
      monthName,
      hours: stats.totalHours,
      positiveHoursDelta: round(monthlyPositiveHoursDelta, 2),
      salary: stats.totalSalary,
      workDays: stats.workDays,
      congeDays: stats.congeDays,
      congeParentDays: stats.congeParentDays,
      fraisRepas: stats.fraisRepasTotal,
      fraisEntretien: stats.fraisEntretienTotal,
      total: stats.totalWithFrais,
      majorationSalaire: stats.majorationSalaire,
      stats,
    };
  });

  const grandTotal =
    totalSalary + totalMajorationSalaire + totalFraisRepas + totalFraisEntretien;

  return {
    year: year ? Number(year) : undefined,
    totalHours: round(totalHours, 2),
    totalSalary: round(totalSalary, 2),
    totalWorkDays,
    totalCongeDays,
    totalCongeParentDays,
    totalFraisRepas: round(totalFraisRepas, 2),
    totalFraisEntretien: round(totalFraisEntretien, 2),
    totalMajorationSalaire: round(totalMajorationSalaire, 2),
    totalPositiveHoursDelta: round(totalPositiveHoursDelta, 2),
    grandTotal: round(grandTotal, 2),
    monthlyDetails,
    averageHoursPerMonth: round(totalHours / 12, 2),
    averageSalaryPerMonth: round(totalSalary / 12, 2),
    mensualise: {
      salaireMensuel: anneeComplete.salaireNetMensualise,
      salaireAnnuel: round(anneeComplete.salaireNetMensualise * 12, 2),
      totalWithFrais: round(
        anneeComplete.salaireNetMensualise * 12 +
          totalMajorationSalaire +
          totalFraisRepas +
          totalFraisEntretien,
        2
      ),
      ecartSalaire: round(anneeComplete.salaireNetMensualise * 12 - totalSalary, 2),
    },
  };
};

module.exports = {
  computeDayHours,
  computeDaySalary,
  computeMonthlyStats,
  computeAnnualStats,
};
