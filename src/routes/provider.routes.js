const express = require('express');
const { query } = require('express-validator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const providerController = require('../controllers/provider.controller');

const router = express.Router();

// Validation rules
const searchValidation = [
  query('specialty').optional().trim(),
  query('lat').optional().isFloat().withMessage('Latitude must be a valid number'),
  query('lng').optional().isFloat().withMessage('Longitude must be a valid number'),
  query('radius').optional().isInt({ min: 1, max: 100 }).withMessage('Radius must be between 1 and 100 miles'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

// Routes
router.get('/search', authenticate, searchValidation, validate, providerController.searchProviders);
router.get('/:providerId', authenticate, providerController.getProviderById);

module.exports = router;
