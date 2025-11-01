const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');
const logger = require('../config/logger');

// Generate JWT token
const generateToken = (userId, rememberMe = false) => {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: rememberMe ? config.jwt.expiresInLong : config.jwt.expiresIn
  });
};

// Generate refresh token
const generateRefreshToken = (userId, rememberMe = false) => {
  return jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: rememberMe ? config.jwt.refreshExpiresInLong : config.jwt.refreshExpiresIn
  });
};

// Register new user
const register = async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 409; // Conflict
      throw error;
    }

    // Create new user
    const user = await User.create({
      email,
      password
    });

    // Generate tokens based on rememberMe flag
    const token = generateToken(user.id, rememberMe);
    const refreshToken = generateRefreshToken(user.id, rememberMe);

    logger.info(`New user registered: ${email} (Remember Me: ${rememberMe})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
        refreshToken,
        rememberMe
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Check if user is active
    if (!user.isActive) {
      const error = new Error('Your account has been deactivated');
      error.statusCode = 403;
      throw error;
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate tokens based on rememberMe flag
    const token = generateToken(user.id, rememberMe);
    const refreshToken = generateRefreshToken(user.id, rememberMe);

    logger.info(`User logged in: ${email} (Remember Me: ${rememberMe})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken,
        rememberMe
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh access token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const error = new Error('Refresh token is required');
      error.statusCode = 400;
      throw error;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    // Generate new access token
    const newToken = generateToken(decoded.userId);

    res.status(200).json({
      success: true,
      data: {
        token: newToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error.message = 'Invalid or expired refresh token';
      error.statusCode = 401;
    }
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken
};
