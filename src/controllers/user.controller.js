const { User } = require('../models');
const logger = require('../config/logger');

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Error fetching user profile', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      medicalHistory
    } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (gender !== undefined) user.gender = gender;
    if (phone !== undefined) user.phone = phone;
    if (medicalHistory !== undefined) user.medicalHistory = medicalHistory;

    await user.save();

    logger.info('User profile updated', {
      userId,
      updatedFields: Object.keys(req.body)
    });

    // Return user without password
    const updatedUser = user.toJSON();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    logger.error('Error updating user profile', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update user location
 */
const updateLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, city, state, country, countryCode } = req.body;

    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Validate latitude and longitude ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build location object
    const location = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude)
    };

    // Add optional fields if provided
    if (city) location.city = city;
    if (state) location.state = state;
    if (country) location.country = country;
    if (countryCode) location.countryCode = countryCode;

    // Update user location
    user.location = location;
    await user.save();

    logger.info('User location updated', {
      userId,
      location: {
        lat: location.lat,
        lng: location.lng,
        city: location.city,
        country: location.country
      }
    });

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: { location }
    });
  } catch (error) {
    logger.error('Error updating user location', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get user location
 */
const getLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'location']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { location: user.location || null }
    });
  } catch (error) {
    logger.error('Error fetching user location', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateLocation,
  getLocation
};
