const express = require('express');
const { validate } = require('../middleware/validation');
const { registerValidator, loginValidator } = require('../validators/auth.validator');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Routes
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
