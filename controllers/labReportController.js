const asyncHandler = require('express-async-handler');
const LabReport = require('../models/labReportModel');
const ErrorResponse = require('../utils/errorResponse');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// @desc    Create lab report
// @route   POST /api/v1/lab-reports
// @access  Private (Admin/Doctor)
exports.createLabReport = asyncHandler(async (req, res) => {
    const report = await LabReport.create({
        ...req.body,
        reportFile: req.file ? {
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            filePath: req.file.path,
            uploadDate: Date.now()
        } : undefined,
        uploadedBy: req.user._id
    });

    await report.populate(['patientId', 'doctorId', 'technician', 'verifiedBy']);

    res.status(201).json({
        success: true,
        data: report
    });
});

// @desc    Get all lab reports
// @route   GET /api/v1/lab-reports
// @access  Private (Admin/Doctor)
exports.getLabReports = asyncHandler(async (req, res) => {
    const reports = await LabReport.find()
        .populate('patientId', 'name')
        .populate('doctorId', 'name specialization')
        .populate('technician', 'name')
        .populate('verifiedBy', 'name specialization')
        .sort('-testDate');

    res.status(200).json({
        success: true,
        count: reports.length,
        data: reports
    });
});

// @desc    Get single lab report
// @route   GET /api/v1/lab-reports/:id
// @access  Private
exports.getLabReportById = asyncHandler(async (req, res) => {
    const report = await LabReport.findById(req.params.id)
        .populate('patientId')
        .populate('doctorId')
        .populate('technician')
        .populate('verifiedBy');

    if (!report) {
        throw new ErrorResponse(`Lab report not found with id of ${req.params.id}`, 404);
    }

    res.status(200).json({
        success: true,
        data: report
    });
});

// @desc    Update lab report
// @route   PUT /api/v1/lab-reports/:id
// @access  Private (Admin/Doctor)
exports.updateLabReport = asyncHandler(async (req, res) => {
    let report = await LabReport.findById(req.params.id);

    if (!report) {
        throw new ErrorResponse(`Lab report not found with id of ${req.params.id}`, 404);
    }

    // Check authorization
    if (report.doctorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ErrorResponse('Not authorized to update this report', 401);
    }

    if (req.file) {
        req.body.reportFile = {
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            filePath: req.file.path,
            uploadDate: Date.now()
        };
    }

    report = await LabReport.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate(['patientId', 'doctorId', 'technician', 'verifiedBy']);

    res.status(200).json({
        success: true,
        data: report
    });
});

// @desc    Delete lab report
// @route   DELETE /api/v1/lab-reports/:id
// @access  Private (Admin/Doctor)
exports.deleteLabReport = asyncHandler(async (req, res) => {
    const report = await LabReport.findById(req.params.id);

    if (!report) {
        throw new ErrorResponse(`Lab report not found with id of ${req.params.id}`, 404);
    }

    // Check authorization
    if (report.doctorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new ErrorResponse('Not authorized to delete this report', 401);
    }

    // Delete file if exists
    if (report.reportFile && report.reportFile.filePath) {
        if (fs.existsSync(report.reportFile.filePath)) {
            fs.unlinkSync(report.reportFile.filePath);
        }
    }

    await report.remove();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Get patient's lab reports
// @route   GET /api/v1/lab-reports/patients/:patientId/lab-reports
// @access  Private (Admin/Doctor)
exports.getPatientLabReports = asyncHandler(async (req, res) => {
    const reports = await LabReport.find({ patientId: req.params.patientId })
        .populate('doctorId', 'name specialization')
        .populate('technician', 'name')
        .populate('verifiedBy', 'name specialization')
        .sort('-testDate');

    res.status(200).json({
        success: true,
        count: reports.length,
        data: reports
    });
});

// @desc    Verify lab report
// @route   PUT /api/v1/lab-reports/:id/verify
// @access  Private (Doctors only)
exports.verifyLabReport = asyncHandler(async (req, res) => {
    const report = await LabReport.findById(req.params.id);

    if (!report) {
        throw new ErrorResponse('Lab report not found', 404);
    }

    if (req.user.role !== 'doctor') {
        throw new ErrorResponse('Only doctors can verify lab reports', 401);
    }

    report.verifiedBy = req.user._id;
    report.verifiedAt = Date.now();
    report.status = 'Completed';
    report.interpretation = req.body.interpretation;

    await report.save();
    await report.populate(['patientId', 'doctorId', 'technician', 'verifiedBy']);

    res.status(200).json({
        success: true,
        data: report
    });
});

// @desc    Download lab report
// @route   GET /api/v1/lab-reports/:id/download
// @access  Private
exports.downloadLabReport = asyncHandler(async (req, res) => {
    const report = await LabReport.findById(req.params.id);

    if (!report || !report.reportFile) {
        throw new ErrorResponse('Report file not found', 404);
    }

    res.download(report.reportFile.filePath, report.reportFile.fileName);
});

// @desc    Get my lab reports (Patient)
// @route   GET /api/v1/lab-reports/my-reports
// @access  Private (Patient)
exports.getMyLabReports = asyncHandler(async (req, res) => {
    const reports = await LabReport.find({ patientId: req.user._id })
        .populate('doctorId', 'name specialization')
        .populate('technician', 'name')
        .sort('-testDate');

    res.status(200).json({
        success: true,
        count: reports.length,
        data: reports
    });
});

// @desc    Get my lab report detail (Patient)
// @route   GET /api/v1/lab-reports/my-reports/:id
// @access  Private (Patient)
exports.getMyLabReportDetail = asyncHandler(async (req, res) => {
    const report = await LabReport.findOne({
        _id: req.params.id,
        patientId: req.user._id
    })
    .populate('doctorId', 'name specialization')
    .populate('technician', 'name')
    .populate('verifiedBy', 'name specialization');

    if (!report) {
        throw new ErrorResponse('Lab report not found', 404);
    }

    res.status(200).json({
        success: true,
        data: report
    });
});

// @desc    Download my lab report (Patient)
// @route   GET /api/v1/lab-reports/my-reports/:id/download
// @access  Private (Patient)
exports.downloadMyLabReport = asyncHandler(async (req, res) => {
    const report = await LabReport.findOne({
        _id: req.params.id,
        patientId: req.user._id
    });

    if (!report || !report.reportFile) {
        throw new ErrorResponse('Report file not found', 404);
    }

    res.download(report.reportFile.filePath, report.reportFile.fileName);
});

// @desc    Get pending reports
// @route   GET /api/v1/lab-reports/pending
// @access  Private (Patient)
exports.getPendingReports = asyncHandler(async (req, res) => {
    const reports = await LabReport.find({
        patientId: req.user._id,
        status: { $in: ['Pending', 'Processing', 'Sample Collected'] }
    })
    .populate('doctorId', 'name specialization profileImage')
    .populate('technician', 'name')
    .sort('-testDate')
    .limit(5);

    const enhancedReports = reports.map(report => ({
        ...report._doc,
        requestedOn: moment(report.testDate).format('MMMM DD, YYYY'),
        daysInProcess: moment().diff(moment(report.testDate), 'days'),
        statusColor: getStatusColor(report.status),
        isUrgent: report.priority === 'Urgent',
        canCancel: ['Pending', 'Sample Collected'].includes(report.status)
    }));

    res.status(200).json({
        success: true,
        count: enhancedReports.length,
        data: enhancedReports
    });
});

// Helper function
const getStatusColor = (status) => {
    const colors = {
        'Pending': '#faad14',
        'Processing': '#1890ff',
        'Sample Collected': '#52c41a',
        'Completed': '#52c41a',
        'Cancelled': '#ff4d4f'
    };
    return colors[status] || '#000000';
};

// @desc    Add test results to lab report
// @route   PUT /api/v1/lab-reports/:patientId/:id/add-test-results
// @access  Private (Lab technicians only)
exports.addTestResults = asyncHandler(async (req, res) => {
    const { patientId, id } = req.params;
    const { results, status } = req.body;

    // Find the lab report
    const labReport = await LabReport.findOne({
        _id: id,
        patient: patientId
    });

    if (!labReport) {
        throw new ErrorResponse('Lab report not found', 404);
    }

    // Update the results
    labReport.results = results;
    labReport.status = status || 'Completed';
    labReport.completedAt = Date.now();
    labReport.completedBy = req.user.id;

    await labReport.save();

    res.json({
        success: true,
        data: labReport
    });
});

// @desc    Upload lab report
// @route   POST /api/v1/lab-reports/upload
// @access  Private (Admin/Doctor)
exports.uploadLabReport = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ErrorResponse('Please upload a file', 400);
    }

    const labReport = await LabReport.create({
        patient: req.body.patientId,
        doctor: req.user.id,
        testType: req.body.testType,
        reportFile: {
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            filePath: req.file.path,
            uploadDate: Date.now()
        },
        notes: req.body.notes,
        status: 'Pending'
    });

    res.status(201).json({
        success: true,
        data: labReport
    });
});

module.exports = {
    createLabReport: exports.createLabReport,
    getLabReports: exports.getLabReports,
    getLabReportById: exports.getLabReportById,
    updateLabReport: exports.updateLabReport,
    deleteLabReport: exports.deleteLabReport,
    getPatientLabReports: exports.getPatientLabReports,
    verifyLabReport: exports.verifyLabReport,
    downloadLabReport: exports.downloadLabReport,
    getMyLabReports: exports.getMyLabReports,
    getMyLabReportDetail: exports.getMyLabReportDetail,
    downloadMyLabReport: exports.downloadMyLabReport,
    getPendingReports: exports.getPendingReports,
    addTestResults: exports.addTestResults,
    uploadLabReport: exports.uploadLabReport
};