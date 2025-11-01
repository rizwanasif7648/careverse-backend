const express = require('express');
const { authenticate } = require('../middleware/auth');
const assessmentController = require('../controllers/assessment.controller');

const router = express.Router();

// Routes
router.get('/', authenticate, assessmentController.getUserAssessments);
router.get('/:assessmentId', authenticate, assessmentController.getAssessmentById);
router.post('/generate', authenticate, assessmentController.generateAssessment);

module.exports = router;
