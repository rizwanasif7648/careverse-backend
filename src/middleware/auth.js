const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      const error = new Error('No token provided. Authorization denied.');
      error.statusCode = 401;
      throw error;
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Get user from database
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      const error = new Error('User not found or inactive.');
      error.statusCode = 401;
      throw error;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      error.message = 'Token expired. Please login again.';
      error.statusCode = 401;
    } else if (error.name === 'JsonWebTokenError') {
      error.message = 'Invalid token. Authorization denied.';
      error.statusCode = 401;
    }
    next(error);
  }
};

module.exports = { authenticate };
