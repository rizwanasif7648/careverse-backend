const express = require('express');
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/user.controller');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);

// User location routes
router.get('/location', userController.getLocation);
router.patch('/location', userController.updateLocation);

module.exports = router;
