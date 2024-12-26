const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Invoice = require('../models/invoiceModel');
const Transaction = require('../models/transactionModel');
const moment = require('moment');
const excel = require('exceljs');
const Appointment = require('../models/appointmentModel');
const Patient = require('../models/Patient');
const mongoose = require('mongoose');
const Payment = require('../models/paymentModel');
const Service = require('../models/serviceModel');
const Doctor = require('../models/doctorModel');
const Report = require('../models/reportModel');
const Medicine = require('../models/medicineModel');
const PurchaseOrder = require('../models/purchaseOrderModel');
const Bill = require('../models/billModel');
const Stock = require('../models/stockModel');

// @desc    Generate reports
// @route   GET /api/v1/admin/reports/generate
// @access  Private/Admin
exports.generateReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, type } = req.query;

  // Validate dates
  if (!startDate || !endDate) {
    return next(new ErrorResponse('Please provide start and end dates', 400));
  }

  const start = moment(startDate).startOf('day');
  const end = moment(endDate).endOf('day');

  let reportData = {};

  switch (type) {
    case 'revenue':
      reportData = await generateRevenueReport(start, end);
      break;
    case 'payments':
      reportData = await generatePaymentsReport(start, end);
      break;
    case 'outstanding':
      reportData = await generateOutstandingReport(start, end);
      break;
    default:
      return next(new ErrorResponse('Invalid report type', 400));
  }

  res.status(200).json({
    success: true,
    data: reportData
  });
});

// Generate Revenue Report
const generateRevenueReport = async (startDate, endDate) => {
  // Get all invoices in date range
  const invoices = await Invoice.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('patientId', 'name');

  // Calculate daily revenue
  const revenueData = [];
  const dailyRevenue = {};

  invoices.forEach(invoice => {
    const date = moment(invoice.createdAt).format('YYYY-MM-DD');
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = {
        amount: 0,
        invoiceCount: 0,
        totalAmount: 0
      };
    }
    dailyRevenue[date].amount += invoice.paidAmount;
    dailyRevenue[date].totalAmount += invoice.totalAmount;
    dailyRevenue[date].invoiceCount++;
  });

  // Format data for chart and table
  Object.entries(dailyRevenue).forEach(([date, data]) => {
    revenueData.push({
      date,
      amount: data.amount,
      invoiceCount: data.invoiceCount,
      averageValue: data.totalAmount / data.invoiceCount
    });
  });

  // Calculate totals
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalTransactions = invoices.length;
  const averageTransactionValue = totalTransactions ? totalRevenue / totalTransactions : 0;

  return {
    revenueData: revenueData.sort((a, b) => moment(a.date).diff(moment(b.date))),
    totalRevenue,
    totalTransactions,
    averageTransactionValue,
    tableData: revenueData
  };
};

// Generate Payments Report
const generatePaymentsReport = async (startDate, endDate) => {
  // Get all transactions in date range
  const transactions = await Transaction.find({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  // Group by payment method
  const paymentMethods = {};
  const total = transactions.reduce((sum, trans) => sum + trans.amount, 0);

  transactions.forEach(trans => {
    if (!paymentMethods[trans.paymentMethod]) {
      paymentMethods[trans.paymentMethod] = {
        amount: 0,
        count: 0
      };
    }
    paymentMethods[trans.paymentMethod].amount += trans.amount;
    paymentMethods[trans.paymentMethod].count++;
  });

  // Format data for charts and table
  const paymentMethodData = Object.entries(paymentMethods).map(([method, data]) => ({
    type: method,
    value: data.amount,
    percentage: (data.amount / total) * 100
  }));

  const tableData = Object.entries(paymentMethods).map(([method, data]) => ({
    method: method.replace('_', ' ').toUpperCase(),
    amount: data.amount,
    count: data.count,
    percentage: (data.amount / total) * 100
  }));

  return {
    paymentMethodData,
    totalTransactions: transactions.length,
    totalAmount: total,
    averageTransactionValue: total / transactions.length,
    tableData
  };
};

// Generate Outstanding Report
const generateOutstandingReport = async (startDate, endDate) => {
  const outstandingInvoices = await Invoice.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $in: ['pending', 'partial'] }
  }).populate('patientId', 'name email phone');

  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => 
    sum + (inv.totalAmount - inv.paidAmount), 0);

  const agingBuckets = {
    '0-30': { count: 0, amount: 0 },
    '31-60': { count: 0, amount: 0 },
    '61-90': { count: 0, amount: 0 },
    '90+': { count: 0, amount: 0 }
  };

  outstandingInvoices.forEach(invoice => {
    const daysOverdue = moment().diff(moment(invoice.dueDate), 'days');
    const outstandingAmount = invoice.totalAmount - invoice.paidAmount;

    if (daysOverdue <= 30) {
      agingBuckets['0-30'].count++;
      agingBuckets['0-30'].amount += outstandingAmount;
    } else if (daysOverdue <= 60) {
      agingBuckets['31-60'].count++;
      agingBuckets['31-60'].amount += outstandingAmount;
    } else if (daysOverdue <= 90) {
      agingBuckets['61-90'].count++;
      agingBuckets['61-90'].amount += outstandingAmount;
    } else {
      agingBuckets['90+'].count++;
      agingBuckets['90+'].amount += outstandingAmount;
    }
  });

  return {
    totalOutstanding,
    totalInvoices: outstandingInvoices.length,
    agingBuckets,
    tableData: outstandingInvoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      patient: inv.patientId.name,
      totalAmount: inv.totalAmount,
      outstandingAmount: inv.totalAmount - inv.paidAmount,
      dueDate: inv.dueDate,
      daysOverdue: moment().diff(moment(inv.dueDate), 'days')
    }))
  };
};

// @desc    Export report to Excel
// @route   GET /api/v1/admin/reports/export
// @access  Private/Admin
exports.exportReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, type } = req.query;

  // Get report data
  const reportData = await generateReport(startDate, endDate, type);

  // Create workbook
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // Add headers and styling based on report type
  switch (type) {
    case 'revenue':
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Revenue', key: 'amount', width: 15 },
        { header: 'Invoices', key: 'invoiceCount', width: 15 },
        { header: 'Average Value', key: 'averageValue', width: 15 }
      ];
      break;
    case 'payments':
      worksheet.columns = [
        { header: 'Payment Method', key: 'method', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Count', key: 'count', width: 15 },
        { header: 'Percentage', key: 'percentage', width: 15 }
      ];
      break;
    case 'outstanding':
      worksheet.columns = [
        { header: 'Invoice Number', key: 'invoiceNumber', width: 15 },
        { header: 'Patient', key: 'patient', width: 20 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Outstanding', key: 'outstandingAmount', width: 15 },
        { header: 'Due Date', key: 'dueDate', width: 15 },
        { header: 'Days Overdue', key: 'daysOverdue', width: 15 }
      ];
      break;
  }

  // Add data
  worksheet.addRows(reportData.tableData);

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=report_${type}_${moment().format('YYYY-MM-DD')}.xlsx`
  );

  // Send workbook
  await workbook.xlsx.write(res);
  res.end();
});

// @desc    Get daily patient count
// @route   GET /api/reports/daily-patient-count
// @access  Private (Admin/Receptionist)
exports.getDailyPatientCount = asyncHandler(async (req, res) => {
  const { startDate, endDate, viewType = 'daily' } = req.query;

  // Validate dates
  const start = moment(startDate).startOf('day');
  const end = moment(endDate).endOf('day');

  if (!start.isValid() || !end.isValid()) {
    throw new ErrorResponse('Invalid date range', 400);
  }

  // Base query for appointments
  const appointmentQuery = {
    appointmentDate: {
      $gte: start.toDate(),
      $lte: end.toDate()
    }
  };

  // Get appointments
  const appointments = await Appointment.find(appointmentQuery)
    .populate('patientId', 'createdAt')
    .lean();

  // Get daily counts
  const dailyCounts = [];
  let currentDate = moment(start);

  while (currentDate.isSameOrBefore(end, 'day')) {
    const dayAppointments = appointments.filter(apt => 
      moment(apt.appointmentDate).isSame(currentDate, 'day')
    );

    const newPatients = dayAppointments.filter(apt => 
      moment(apt.patientId.createdAt).isSame(currentDate, 'day')
    ).length;

    dailyCounts.push({
      date: currentDate.toDate(),
      totalPatients: dayAppointments.length,
      newPatients,
      followUps: dayAppointments.length - newPatients,
      walkIns: dayAppointments.filter(apt => apt.appointmentType === 'walk-in').length
    });

    currentDate.add(1, 'day');
  }

  // Calculate aggregated stats based on viewType
  let aggregatedStats;
  if (viewType === 'weekly') {
    aggregatedStats = aggregateByWeek(dailyCounts);
  } else if (viewType === 'monthly') {
    aggregatedStats = aggregateByMonth(dailyCounts);
  } else {
    aggregatedStats = dailyCounts;
  }

  // Calculate overall statistics
  const totalStats = aggregatedStats.reduce((acc, day) => {
    acc.totalPatients += day.totalPatients;
    acc.newPatients += day.newPatients;
    acc.followUps += day.followUps;
    acc.walkIns += day.walkIns;
    return acc;
  }, { totalPatients: 0, newPatients: 0, followUps: 0, walkIns: 0 });

  totalStats.averageDailyPatients = totalStats.totalPatients / aggregatedStats.length;

  res.status(200).json({
    success: true,
    data: {
      ...totalStats,
      dailyCounts: aggregatedStats
    }
  });
});

// @desc    Export daily patient count
// @route   GET /api/reports/daily-patient-count/export
// @access  Private (Admin/Receptionist)
exports.exportDailyPatientCount = asyncHandler(async (req, res) => {
  const { startDate, endDate, viewType = 'daily' } = req.query;

  // Get patient count data
  const patientData = await getDailyPatientCount(startDate, endDate, viewType);

  // Create workbook
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Patient Count Report');

  // Add headers
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Total Patients', key: 'totalPatients', width: 15 },
    { header: 'New Patients', key: 'newPatients', width: 15 },
    { header: 'Follow-ups', key: 'followUps', width: 15 },
    { header: 'Walk-ins', key: 'walkIns', width: 15 }
  ];

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data
  patientData.dailyCounts.forEach(record => {
    worksheet.addRow({
      date: moment(record.date).format('DD/MM/YYYY'),
      totalPatients: record.totalPatients,
      newPatients: record.newPatients,
      followUps: record.followUps,
      walkIns: record.walkIns
    });
  });

  // Add summary
  worksheet.addRow({}); // Empty row
  worksheet.addRow({
    date: 'Total',
    totalPatients: patientData.totalPatients,
    newPatients: patientData.newPatients,
    followUps: patientData.followUps,
    walkIns: patientData.walkIns
  }).font = { bold: true };

  worksheet.addRow({
    date: 'Daily Average',
    totalPatients: patientData.averageDailyPatients.toFixed(2)
  }).font = { bold: true };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=patient_count_report_${moment().format('YYYY-MM-DD')}.xlsx`
  );

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
});

// Helper function to aggregate by week
const aggregateByWeek = (dailyCounts) => {
  const weeklyData = {};
  
  dailyCounts.forEach(day => {
    const weekKey = moment(day.date).startOf('week').format('YYYY-MM-DD');
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        date: moment(weekKey).toDate(),
        totalPatients: 0,
        newPatients: 0,
        followUps: 0,
        walkIns: 0
      };
    }
    weeklyData[weekKey].totalPatients += day.totalPatients;
    weeklyData[weekKey].newPatients += day.newPatients;
    weeklyData[weekKey].followUps += day.followUps;
    weeklyData[weekKey].walkIns += day.walkIns;
  });

  return Object.values(weeklyData);
};

// Helper function to aggregate by month
const aggregateByMonth = (dailyCounts) => {
  const monthlyData = {};
  
  dailyCounts.forEach(day => {
    const monthKey = moment(day.date).startOf('month').format('YYYY-MM-DD');
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        date: moment(monthKey).toDate(),
        totalPatients: 0,
        newPatients: 0,
        followUps: 0,
        walkIns: 0
      };
    }
    monthlyData[monthKey].totalPatients += day.totalPatients;
    monthlyData[monthKey].newPatients += day.newPatients;
    monthlyData[monthKey].followUps += day.followUps;
    monthlyData[monthKey].walkIns += day.walkIns;
  });

  return Object.values(monthlyData);
};

// @desc    Get appointment statistics
// @route   GET /api/reports/appointment-stats
// @access  Private (Admin/Receptionist)
exports.getAppointmentStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, viewType = 'daily', doctorId } = req.query;

  // Validate dates
  const start = moment(startDate).startOf('day');
  const end = moment(endDate).endOf('day');

  if (!start.isValid() || !end.isValid()) {
    throw new ErrorResponse('Invalid date range', 400);
  }

  // Build base query
  let query = {
    appointmentDate: {
      $gte: start.toDate(),
      $lte: end.toDate()
    }
  };

  // Add doctor filter if specified
  if (doctorId && doctorId !== 'all') {
    query.doctorId = mongoose.Types.ObjectId(doctorId);
  }

  // Get appointments
  const appointments = await Appointment.find(query)
    .populate('doctorId', 'name department')
    .populate('patientId', 'firstName lastName')
    .lean();

  // Calculate daily statistics
  const dailyStats = [];
  let currentDate = moment(start);

  while (currentDate.isSameOrBefore(end, 'day')) {
    const dayAppointments = appointments.filter(apt => 
      moment(apt.appointmentDate).isSame(currentDate, 'day')
    );

    const completed = dayAppointments.filter(apt => apt.status === 'completed').length;
    const cancelled = dayAppointments.filter(apt => apt.status === 'cancelled').length;
    const noShows = dayAppointments.filter(apt => apt.status === 'no-show').length;
    const total = dayAppointments.length;

    dailyStats.push({
      date: currentDate.toDate(),
      totalAppointments: total,
      completed,
      cancelled,
      noShows,
      completionRate: total > 0 ? completed / total : 0
    });

    currentDate.add(1, 'day');
  }

  // Aggregate stats based on viewType
  let aggregatedStats;
  if (viewType === 'weekly') {
    aggregatedStats = aggregateByWeek(dailyStats);
  } else if (viewType === 'monthly') {
    aggregatedStats = aggregateByMonth(dailyStats);
  } else {
    aggregatedStats = dailyStats;
  }

  // Calculate overall statistics
  const totalStats = appointments.reduce((acc, apt) => {
    acc.totalAppointments++;
    if (apt.status === 'completed') acc.completed++;
    if (apt.status === 'cancelled') acc.cancelled++;
    if (apt.status === 'no-show') acc.noShows++;
    return acc;
  }, { totalAppointments: 0, completed: 0, cancelled: 0, noShows: 0 });

  totalStats.completionRate = totalStats.totalAppointments > 0 
    ? totalStats.completed / totalStats.totalAppointments 
    : 0;

  // Calculate status distribution for pie chart
  const statusDistribution = [
    { type: 'Completed', value: totalStats.completed },
    { type: 'Cancelled', value: totalStats.cancelled },
    { type: 'No-Shows', value: totalStats.noShows }
  ];

  // Calculate time slot distribution
  const timeSlotDistribution = calculateTimeSlotDistribution(appointments);

  res.status(200).json({
    success: true,
    data: {
      ...totalStats,
      dailyStats: aggregatedStats,
      statusDistribution,
      timeSlotDistribution
    }
  });
});

// @desc    Export appointment statistics
// @route   GET /api/reports/appointment-stats/export
// @access  Private (Admin/Receptionist)
exports.exportAppointmentStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, viewType, doctorId } = req.query;

  // Get appointment stats
  const stats = await getAppointmentStats(startDate, endDate, viewType, doctorId);

  // Create workbook
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Appointment Statistics');

  // Add headers
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Total Appointments', key: 'totalAppointments', width: 20 },
    { header: 'Completed', key: 'completed', width: 15 },
    { header: 'Cancelled', key: 'cancelled', width: 15 },
    { header: 'No-Shows', key: 'noShows', width: 15 },
    { header: 'Completion Rate', key: 'completionRate', width: 18 }
  ];

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data
  stats.dailyStats.forEach(record => {
    worksheet.addRow({
      date: moment(record.date).format('DD/MM/YYYY'),
      totalAppointments: record.totalAppointments,
      completed: record.completed,
      cancelled: record.cancelled,
      noShows: record.noShows,
      completionRate: `${(record.completionRate * 100).toFixed(1)}%`
    });
  });

  // Add summary
  worksheet.addRow({}); // Empty row
  worksheet.addRow({
    date: 'Total',
    totalAppointments: stats.totalAppointments,
    completed: stats.completed,
    cancelled: stats.cancelled,
    noShows: stats.noShows,
    completionRate: `${(stats.completionRate * 100).toFixed(1)}%`
  }).font = { bold: true };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=appointment_stats_${moment().format('YYYY-MM-DD')}.xlsx`
  );

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
});

// Helper function to calculate time slot distribution
const calculateTimeSlotDistribution = (appointments) => {
  const slots = {
    'Morning (8-11)': 0,
    'Mid-Day (11-2)': 0,
    'Afternoon (2-5)': 0,
    'Evening (5-8)': 0
  };

  appointments.forEach(apt => {
    const hour = moment(apt.appointmentDate).hour();
    if (hour >= 8 && hour < 11) slots['Morning (8-11)']++;
    else if (hour >= 11 && hour < 14) slots['Mid-Day (11-2)']++;
    else if (hour >= 14 && hour < 17) slots['Afternoon (2-5)']++;
    else if (hour >= 17 && hour < 20) slots['Evening (5-8)']++;
  });

  return Object.entries(slots).map(([timeSlot, count]) => ({
    timeSlot,
    count
  }));
};

// @desc    Get revenue statistics
// @route   GET /api/reports/revenue-stats
// @access  Private (Admin/Receptionist)
exports.getRevenueStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, viewType = 'daily', department } = req.query;

  // Validate dates
  const start = moment(startDate).startOf('day');
  const end = moment(endDate).endOf('day');

  if (!start.isValid() || !end.isValid()) {
    throw new ErrorResponse('Invalid date range', 400);
  }

  // Build base query
  let query = {
    paymentDate: {
      $gte: start.toDate(),
      $lte: end.toDate()
    },
    status: 'completed'
  };

  // Add department filter if specified
  if (department && department !== 'all') {
    query['departmentId'] = mongoose.Types.ObjectId(department);
  }

  // Get payments
  const payments = await Payment.find(query)
    .populate({
      path: 'billId',
      populate: {
        path: 'items',
        model: 'Service'
      }
    })
    .populate('departmentId', 'name')
    .lean();

  // Calculate daily revenue statistics
  const dailyStats = [];
  let currentDate = moment(start);

  while (currentDate.isSameOrBefore(end, 'day')) {
    const dayPayments = payments.filter(payment => 
      moment(payment.paymentDate).isSame(currentDate, 'day')
    );

    const dayStats = calculateDayRevenue(dayPayments);
    const previousDayStats = dailyStats[dailyStats.length - 1];
    
    dailyStats.push({
      date: currentDate.toDate(),
      ...dayStats,
      growth: previousDayStats 
        ? ((dayStats.totalRevenue - previousDayStats.totalRevenue) / previousDayStats.totalRevenue) * 100 
        : 0
    });

    currentDate.add(1, 'day');
  }

  // Aggregate stats based on viewType
  let aggregatedStats;
  if (viewType === 'weekly') {
    aggregatedStats = aggregateRevenueByWeek(dailyStats);
  } else if (viewType === 'monthly') {
    aggregatedStats = aggregateRevenueByMonth(dailyStats);
  } else {
    aggregatedStats = dailyStats;
  }

  // Calculate department-wise revenue
  const departmentRevenue = calculateDepartmentRevenue(payments);

  // Calculate overall statistics
  const totalStats = calculateTotalRevenue(payments);
  const outstandingAmount = await calculateOutstandingAmount();
  const growthRate = calculateGrowthRate(aggregatedStats);

  // Prepare revenue trend data
  const revenueTypes = ['Consultations', 'Procedures', 'Medications'];
  const dailyRevenue = revenueTypes.flatMap(type => 
    aggregatedStats.map(day => ({
      date: moment(day.date).format('DD/MM/YYYY'),
      type,
      amount: day[`${type.toLowerCase()}Revenue`]
    }))
  );

  res.status(200).json({
    success: true,
    data: {
      totalRevenue: totalStats.totalRevenue,
      averageDailyRevenue: totalStats.totalRevenue / aggregatedStats.length,
      growthRate,
      outstandingAmount,
      departmentRevenue,
      dailyRevenue
    }
  });
});

// Helper function to calculate day revenue
const calculateDayRevenue = (payments) => {
  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalConsultations = payments.filter(payment => payment.item.type === 'Consultation').length;
  const totalProcedures = payments.filter(payment => payment.item.type === 'Procedure').length;
  const totalMedications = payments.filter(payment => payment.item.type === 'Medication').length;

  return {
    totalRevenue,
    totalConsultations,
    totalProcedures,
    totalMedications
  };
};

// Helper function to aggregate revenue by week
const aggregateRevenueByWeek = (dailyStats) => {
  const weeklyData = {};
  
  dailyStats.forEach(day => {
    const weekKey = moment(day.date).startOf('week').format('YYYY-MM-DD');
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        date: moment(weekKey).toDate(),
        totalRevenue: 0,
        totalConsultations: 0,
        totalProcedures: 0,
        totalMedications: 0
      };
    }
    weeklyData[weekKey].totalRevenue += day.totalRevenue;
    weeklyData[weekKey].totalConsultations += day.totalConsultations;
    weeklyData[weekKey].totalProcedures += day.totalProcedures;
    weeklyData[weekKey].totalMedications += day.totalMedications;
  });

  return Object.values(weeklyData);
};

// Helper function to aggregate revenue by month
const aggregateRevenueByMonth = (dailyStats) => {
  const monthlyData = {};
  
  dailyStats.forEach(day => {
    const monthKey = moment(day.date).startOf('month').format('YYYY-MM-DD');
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        date: moment(monthKey).toDate(),
        totalRevenue: 0,
        totalConsultations: 0,
        totalProcedures: 0,
        totalMedications: 0
      };
    }
    monthlyData[monthKey].totalRevenue += day.totalRevenue;
    monthlyData[monthKey].totalConsultations += day.totalConsultations;
    monthlyData[monthKey].totalProcedures += day.totalProcedures;
    monthlyData[monthKey].totalMedications += day.totalMedications;
  });

  return Object.values(monthlyData);
};

// Helper function to calculate department-wise revenue
const calculateDepartmentRevenue = (payments) => {
  const departmentRevenue = {};

  payments.forEach(payment => {
    const departmentId = payment.departmentId._id.toString();
    if (!departmentRevenue[departmentId]) {
      departmentRevenue[departmentId] = {
        totalRevenue: 0,
        totalConsultations: 0,
        totalProcedures: 0,
        totalMedications: 0
      };
    }
    departmentRevenue[departmentId].totalRevenue += payment.amount;
    if (payment.item.type === 'Consultation') departmentRevenue[departmentId].totalConsultations++;
    if (payment.item.type === 'Procedure') departmentRevenue[departmentId].totalProcedures++;
    if (payment.item.type === 'Medication') departmentRevenue[departmentId].totalMedications++;
  });

  return Object.entries(departmentRevenue).map(([departmentId, data]) => ({
    departmentId,
    totalRevenue: data.totalRevenue,
    totalConsultations: data.totalConsultations,
    totalProcedures: data.totalProcedures,
    totalMedications: data.totalMedications
  }));
};

// Helper function to calculate total revenue
const calculateTotalRevenue = (payments) => {
  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalConsultations = payments.filter(payment => payment.item.type === 'Consultation').length;
  const totalProcedures = payments.filter(payment => payment.item.type === 'Procedure').length;
  const totalMedications = payments.filter(payment => payment.item.type === 'Medication').length;

  return {
    totalRevenue,
    totalConsultations,
    totalProcedures,
    totalMedications
  };
};

// Helper function to calculate outstanding amount
const calculateOutstandingAmount = async () => {
  const outstandingInvoices = await Invoice.find({
    createdAt: { $gte: moment().startOf('day'), $lte: moment().endOf('day') },
    status: { $in: ['pending', 'partial'] }
  }).populate('patientId', 'name email phone');

  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => 
    sum + (inv.totalAmount - inv.paidAmount), 0);

  return totalOutstanding;
};

// Helper function to calculate growth rate
const calculateGrowthRate = (dailyStats) => {
  const totalRevenue = dailyStats.reduce((sum, day) => sum + day.totalRevenue, 0);
  const totalConsultations = dailyStats.reduce((sum, day) => sum + day.totalConsultations, 0);
  const totalProcedures = dailyStats.reduce((sum, day) => sum + day.totalProcedures, 0);
  const totalMedications = dailyStats.reduce((sum, day) => sum + day.totalMedications, 0);

  const growthRate = {
    totalRevenue: 0,
    totalConsultations: 0,
    totalProcedures: 0,
    totalMedications: 0
  };

  for (let i = 1; i < dailyStats.length; i++) {
    growthRate.totalRevenue += (dailyStats[i].totalRevenue - dailyStats[i - 1].totalRevenue) / dailyStats[i - 1].totalRevenue;
    growthRate.totalConsultations += (dailyStats[i].totalConsultations - dailyStats[i - 1].totalConsultations) / dailyStats[i - 1].totalConsultations;
    growthRate.totalProcedures += (dailyStats[i].totalProcedures - dailyStats[i - 1].totalProcedures) / dailyStats[i - 1].totalProcedures;
    growthRate.totalMedications += (dailyStats[i].totalMedications - dailyStats[i - 1].totalMedications) / dailyStats[i - 1].totalMedications;
  }

  return {
    totalRevenue: growthRate.totalRevenue / (dailyStats.length - 1),
    totalConsultations: growthRate.totalConsultations / (dailyStats.length - 1),
    totalProcedures: growthRate.totalProcedures / (dailyStats.length - 1),
    totalMedications: growthRate.totalMedications / (dailyStats.length - 1)
  };
};

// @desc    Get queue analytics
// @route   GET /api/reports/queue-analytics
// @access  Private (Admin/Receptionist)
exports.getQueueAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, department } = req.query;

  // Validate dates
  const start = moment(startDate).startOf('day');
  const end = moment(endDate).endOf('day');

  if (!start.isValid() || !end.isValid()) {
    throw new ErrorResponse('Invalid date range', 400);
  }

  // Build base query
  let query = {
    appointmentDate: {
      $gte: start.toDate(),
      $lte: end.toDate()
    }
  };

  // Add department filter if specified
  if (department && department !== 'all') {
    query.departmentId = mongoose.Types.ObjectId(department);
  }

  // Get appointments with queue data
  const appointments = await Appointment.find(query)
    .populate('patientId', 'firstName lastName')
    .populate('doctorId', 'name department')
    .lean();

  // Calculate daily queue statistics
  const dailyStats = [];
  let currentDate = moment(start);

  while (currentDate.isSameOrBefore(end, 'day')) {
    const dayAppointments = appointments.filter(apt => 
      moment(apt.appointmentDate).isSame(currentDate, 'day')
    );

    if (dayAppointments.length > 0) {
      const stats = calculateDayQueueStats(dayAppointments);
      dailyStats.push({
        date: currentDate.toDate(),
        ...stats
      });
    }

    currentDate.add(1, 'day');
  }

  // Calculate overall statistics
  const overallStats = calculateOverallQueueStats(appointments);

  // Generate wait time trend data
  const waitTimeTrend = generateWaitTimeTrend(appointments);

  // Generate queue density heatmap data
  const queueDensity = generateQueueDensity(appointments);

  res.status(200).json({
    success: true,
    data: {
      averageWaitTime: overallStats.averageWaitTime,
      // Add other queue analytics data here
    }
  });
});

// @desc    Get doctor statistics
// @route   GET /api/reports/doctor-stats
// @access  Private (Admin/Receptionist)
exports.getDoctorStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, doctorId } = req.query;

  // Validate dates
  const start = moment(startDate).startOf('day');
  const end = moment(endDate).endOf('day');

  if (!start.isValid() || !end.isValid()) {
    throw new ErrorResponse('Invalid date range', 400);
  }

  // Build base query
  let query = {
    appointmentDate: {
      $gte: start.toDate(),
      $lte: end.toDate()
    },
    status: 'completed'
  };

  // Add doctor filter if specified
  if (doctorId && doctorId !== 'all') {
    query.doctorId = mongoose.Types.ObjectId(doctorId);
  }

  // Get appointments with related data
  const appointments = await Appointment.find(query)
    .populate('doctorId', 'name department specialty')
    .populate('patientId')
    .populate({
      path: 'billId',
      populate: {
        path: 'items',
        model: 'Service'
      }
    })
    .populate('feedback')
    .lean();

  // Calculate doctor-wise statistics
  const doctorStats = await calculateDoctorStats(appointments);

  // Calculate overall statistics
  const overallStats = calculateOverallStats(appointments);

  // Generate performance trend data
  const performanceTrend = await generatePerformanceTrend(appointments);

  // Generate specialty distribution
  const specialtyDistribution = calculateSpecialtyDistribution(appointments);

  res.status(200).json({
    success: true,
    data: {
      totalPatients: overallStats.totalPatients,
      avgConsultationTime: overallStats.avgConsultationTime,
      totalRevenue: overallStats.totalRevenue,
      avgRating: overallStats.avgRating,
      performanceTrend,
      specialtyDistribution,
      doctorStats
    }
  });
});

// Helper function to calculate doctor-wise statistics
const calculateDoctorStats = async (appointments) => {
  const doctorStatsMap = {};

  appointments.forEach(apt => {
    const doctorId = apt.doctorId._id.toString();
    
    if (!doctorStatsMap[doctorId]) {
      doctorStatsMap[doctorId] = {
        doctorId,
        doctorName: apt.doctorId.name,
        department: apt.doctorId.department,
        specialty: apt.doctorId.specialty,
        patientsSeen: 0,
        consultationTimes: [],
        revenue: 0,
        ratings: []
      };
    }

    const stats = doctorStatsMap[doctorId];
    stats.patientsSeen++;

    // Calculate consultation time
    if (apt.consultationStartTime && apt.consultationEndTime) {
      const duration = moment(apt.consultationEndTime).diff(moment(apt.consultationStartTime), 'minutes');
      stats.consultationTimes.push(duration);
    }

    // Calculate revenue
    if (apt.billId) {
      stats.revenue += apt.billId.totalAmount;
    }

    // Collect ratings
    if (apt.feedback && apt.feedback.rating) {
      stats.ratings.push(apt.feedback.rating);
    }
  });

  // Calculate averages and format data
  return Object.values(doctorStatsMap).map(stats => ({
    doctorId: stats.doctorId,
    doctorName: stats.doctorName,
    department: stats.department,
    specialty: stats.specialty,
    patientsSeen: stats.patientsSeen,
    avgConsultationTime: stats.consultationTimes.length > 0
      ? stats.consultationTimes.reduce((a, b) => a + b, 0) / stats.consultationTimes.length
      : 0,
    revenueGenerated: stats.revenue,
    patientSatisfaction: stats.ratings.length > 0
      ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
      : 0
  }));
};

// Helper function to calculate overall statistics
const calculateOverallStats = (appointments) => {
  const consultationTimes = [];
  let totalRevenue = 0;
  const ratings = [];

  appointments.forEach(apt => {
    if (apt.consultationStartTime && apt.consultationEndTime) {
      consultationTimes.push(
        moment(apt.consultationEndTime).diff(moment(apt.consultationStartTime), 'minutes')
      );
    }

    if (apt.billId) {
      totalRevenue += apt.billId.totalAmount;
    }

    if (apt.feedback && apt.feedback.rating) {
      ratings.push(apt.feedback.rating);
    }
  });

  return {
    totalPatients: appointments.length,
    avgConsultationTime: consultationTimes.length > 0
      ? consultationTimes.reduce((a, b) => a + b, 0) / consultationTimes.length
      : 0,
    totalRevenue,
    avgRating: ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0
  };
};

// Helper function to generate performance trend data
const generatePerformanceTrend = async (appointments) => {
  const trend = [];
  let currentDate = moment(appointments[0]?.appointmentDate);
  const endDate = moment(appointments[appointments.length - 1]?.appointmentDate);

  while (currentDate.isSameOrBefore(endDate, 'day')) {
    const dayAppointments = appointments.filter(apt => 
      moment(apt.appointmentDate).isSame(currentDate, 'day')
    );

    const metrics = {
      patients: dayAppointments.length,
      revenue: dayAppointments.reduce((sum, apt) => sum + (apt.billId?.totalAmount || 0), 0),
      satisfaction: calculateDayAvgRating(dayAppointments)
    };

    Object.entries(metrics).forEach(([metric, value]) => {
      trend.push({
        date: currentDate.format('YYYY-MM-DD'),
        metric,
        value: metric === 'satisfaction' ? value * 20 : value // Scale satisfaction to 0-100
      });
    });

    currentDate.add(1, 'day');
  }

  return trend;
};

// Helper function to calculate specialty distribution
const calculateSpecialtyDistribution = (appointments) => {
  const specialtyCounts = {};

  appointments.forEach(apt => {
    const specialty = apt.doctorId.specialty || 'Unspecified';
    specialtyCounts[specialty] = (specialtyCounts[specialty] || 0) + 1;
  });

  return Object.entries(specialtyCounts).map(([specialty, count]) => ({
    specialty,
    value: count
  }));
};

// Helper function to calculate daily average rating
const calculateDayAvgRating = (appointments) => {
  const ratings = appointments
    .filter(apt => apt.feedback && apt.feedback.rating)
    .map(apt => apt.feedback.rating);

  return ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;
};

// @desc    Export doctor statistics
// @route   GET /api/reports/doctor-stats/export
// @access  Private (Admin/Receptionist)
exports.exportDoctorStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, doctorId } = req.query;

  // Get doctor stats
  const stats = await getDoctorStats(startDate, endDate, doctorId);

  // Create workbook
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Doctor Statistics');

  // Add headers
  worksheet.columns = [
    { header: 'Doctor Name', key: 'doctorName', width: 20 },
    { header: 'Department', key: 'department', width: 15 },
    { header: 'Specialty', key: 'specialty', width: 15 },
    { header: 'Patients Seen', key: 'patientsSeen', width: 15 },
    { header: 'Avg. Consultation Time (mins)', key: 'avgConsultationTime', width: 25 },
    { header: 'Revenue Generated', key: 'revenueGenerated', width: 20 },
    { header: 'Patient Satisfaction', key: 'patientSatisfaction', width: 20 }
  ];

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data
  stats.doctorStats.forEach(record => {
    worksheet.addRow({
      doctorName: record.doctorName,
      department: record.department,
      specialty: record.specialty,
      patientsSeen: record.patientsSeen,
      avgConsultationTime: record.avgConsultationTime.toFixed(1),
      revenueGenerated: `$${record.revenueGenerated.toFixed(2)}`,
      patientSatisfaction: `${(record.patientSatisfaction).toFixed(1)}/5`
    });
  });

  // Add summary
  worksheet.addRow({}); // Empty row
  worksheet.addRow({
    doctorName: 'Overall Statistics',
    patientsSeen: stats.totalPatients,
    avgConsultationTime: stats.avgConsultationTime.toFixed(1),
    revenueGenerated: `$${stats.totalRevenue.toFixed(2)}`,
    patientSatisfaction: `${stats.avgRating.toFixed(1)}/5`
  }).font = { bold: true };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=doctor_stats_${moment().format('YYYY-MM-DD')}.xlsx`
  );

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
});

// @desc    Get doctors list
// @route   GET /api/reports/doctors
// @access  Private (Admin/Receptionist)
exports.getDoctorsList = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find()
    .select('name department specialty')
    .sort('name');

  res.status(200).json({
    success: true,
    data: doctors
  });
});

// @desc    Generate custom report
// @route   POST /api/reports/generate
// @access  Private (Admin/Receptionist)
exports.generateCustomReport = asyncHandler(async (req, res) => {
  const { type, dateRange, format, includeCharts } = req.body;
  
  let reportData;
  const [startDate, endDate] = dateRange;

  switch (type) {
    case 'patient':
      reportData = await generatePatientReport(startDate, endDate);
      break;
    case 'appointment':
      reportData = await generateAppointmentReport(startDate, endDate);
      break;
    case 'financial':
      reportData = await generateFinancialReport(startDate, endDate);
      break;
    case 'inventory':
      reportData = await generateInventoryReport(startDate, endDate);
      break;
    default:
      return next(new ErrorResponse(`Invalid report type: ${type}`, 400));
  }

  // Generate charts if requested
  if (includeCharts && includeCharts.length > 0) {
    reportData.charts = await generateCharts(reportData, includeCharts);
  }

  // Format report based on requested format
  const formattedReport = await formatReport(reportData, format);

  // Save report to database
  const report = await Report.create({
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
    type,
    format,
    generatedBy: req.user._id,
    dateRange: {
      start: startDate,
      end: endDate
    },
    data: reportData,
    status: 'completed'
  });

  res.status(200).json({
    success: true,
    data: report
  });
});

// Helper function for patient reports
const generatePatientReport = async (startDate, endDate) => {
  const patients = await Patient.find({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const appointments = await Appointment.find({
    date: { $gte: startDate, $lte: endDate }
  });

  return {
    totalPatients: patients.length,
    newPatients: patients.filter(p => p.createdAt >= startDate).length,
    appointmentsScheduled: appointments.length,
    patientDemographics: calculateDemographics(patients),
    appointmentStats: calculateAppointmentStats(appointments)
  };
};

// Helper function for appointment reports
const generateAppointmentReport = async (startDate, endDate) => {
  const appointments = await Appointment.find({
    date: { $gte: startDate, $lte: endDate }
  })
  .populate('doctor', 'name department')
  .populate('patient', 'name');

  return {
    totalAppointments: appointments.length,
    byStatus: calculateAppointmentsByStatus(appointments),
    byDoctor: calculateAppointmentsByDoctor(appointments),
    byDepartment: calculateAppointmentsByDepartment(appointments),
    timeSlotAnalysis: analyzeTimeSlots(appointments)
  };
};

// Helper function for financial reports
const generateFinancialReport = async (startDate, endDate) => {
  const payments = await Payment.find({
    date: { $gte: startDate, $lte: endDate }
  });

  const bills = await Bill.find({
    date: { $gte: startDate, $lte: endDate }
  });

  return {
    totalRevenue: calculateTotalRevenue(payments),
    revenueByService: calculateRevenueByService(payments),
    outstandingPayments: calculateOutstandingPayments(bills),
    dailyRevenue: calculateDailyRevenue(payments),
    paymentMethods: analyzePaymentMethods(payments)
  };
};

// Helper function for inventory reports
const generateInventoryReport = async (startDate, endDate) => {
  const inventory = await Medicine.find();
  const purchases = await PurchaseOrder.find({
    date: { $gte: startDate, $lte: endDate }
  });

  return {
    currentStock: calculateCurrentStock(inventory),
    lowStockItems: findLowStockItems(inventory),
    purchaseHistory: analyzePurchaseHistory(purchases),
    expiryAnalysis: analyzeExpiryDates(inventory),
    stockValue: calculateStockValue(inventory)
  };
};

// Helper function to generate charts
const generateCharts = async (data, chartTypes) => {
  const charts = {};

  for (const type of chartTypes) {
    switch (type) {
      case 'bar':
        charts.bar = await generateBarChart(data);
        break;
      case 'line':
        charts.line = await generateLineChart(data);
        break;
      case 'pie':
        charts.pie = await generatePieChart(data);
        break;
    }
  }

  return charts;
};

// Helper function to format report
const formatReport = async (data, format) => {
  switch (format) {
    case 'pdf':
      return await generatePDF(data);
    case 'excel':
      return await generateExcel(data);
    case 'csv':
      return await generateCSV(data);
    default:
      return data;
  }
};

// @desc    Generate inventory report
// @route   GET /api/reports/inventory
// @access  Private (Admin/Pharmacist)
exports.generateInventoryReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, category, format } = req.query;

  // Get stock data
  const stockData = await Stock.find({
    createdAt: { $gte: startDate, $lte: endDate }
  })
  .populate('medicine', 'name category price stock')
  .populate('updatedBy', 'name');

  // Get medicines data
  const medicines = await Medicine.find();

  // Calculate statistics
  const stats = {
    totalProducts: medicines.length,
    totalStock: medicines.reduce((sum, med) => sum + med.stock, 0),
    totalValue: medicines.reduce((sum, med) => sum + (med.stock * med.price), 0),
    lowStockItems: medicines.filter(med => med.stock <= med.minStockLevel).length,
    stockMovements: stockData.length
  };

  // Calculate category-wise distribution
  const categoryDistribution = medicines.reduce((acc, med) => {
    acc[med.category] = (acc[med.category] || 0) + 1;
    return acc;
  }, {});

  // Get stock movement trends
  const stockTrends = await Stock.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        inward: {
          $sum: {
            $cond: [{ $eq: ["$type", "add"] }, "$quantity", 0]
          }
        },
        outward: {
          $sum: {
            $cond: [{ $eq: ["$type", "remove"] }, "$quantity", 0]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Get expiring products
  const expiringProducts = await Medicine.find({
    expiryDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Next 90 days
    }
  }).sort('expiryDate');

  const reportData = {
    stats,
    categoryDistribution,
    stockTrends,
    expiringProducts,
    stockMovements: stockData
  };

  if (format === 'excel') {
    // Generate Excel report
    const workbook = new excel.Workbook();
    
    // Overview sheet
    const overviewSheet = workbook.addWorksheet('Overview');
    overviewSheet.columns = [
      { header: 'Metric', key: 'metric', width: 20 },
      { header: 'Value', key: 'value', width: 15 }
    ];
    
    Object.entries(stats).forEach(([metric, value]) => {
      overviewSheet.addRow({
        metric: metric.replace(/([A-Z])/g, ' $1').trim(),
        value: typeof value === 'number' ? value.toFixed(2) : value
      });
    });

    // Stock Movements sheet
    const movementsSheet = workbook.addWorksheet('Stock Movements');
    movementsSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Product', key: 'product', width: 20 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Updated By', key: 'updatedBy', width: 20 }
    ];

    stockData.forEach(movement => {
      movementsSheet.addRow({
        date: moment(movement.createdAt).format('YYYY-MM-DD'),
        product: movement.medicine.name,
        type: movement.type,
        quantity: movement.quantity,
        updatedBy: movement.updatedBy.name
      });
    });

    // Expiring Products sheet
    const expirySheet = workbook.addWorksheet('Expiring Products');
    expirySheet.columns = [
      { header: 'Product', key: 'name', width: 20 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Expiry Date', key: 'expiryDate', width: 15 },
      { header: 'Days Until Expiry', key: 'daysLeft', width: 15 }
    ];

    expiringProducts.forEach(product => {
      expirySheet.addRow({
        name: product.name,
        stock: product.stock,
        expiryDate: moment(product.expiryDate).format('YYYY-MM-DD'),
        daysLeft: moment(product.expiryDate).diff(moment(), 'days')
      });
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=inventory_report_${moment().format('YYYY-MM-DD')}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } else {
    // Return JSON response
    res.status(200).json({
      success: true,
      data: reportData
    });
  }
});

// @desc    Generate stock valuation report
// @route   GET /api/reports/stock-valuation
// @access  Private (Admin)
exports.generateStockValuation = asyncHandler(async (req, res) => {
  const valuation = await Medicine.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        totalValue: { $sum: { $multiply: ['$stock', '$price'] } },
        averagePrice: { $avg: '$price' }
      }
    },
    { $sort: { totalValue: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: valuation
  });
});

// Add these to your existing exports
module.exports = {
  // ... your existing exports ...
  generateCustomReport
};