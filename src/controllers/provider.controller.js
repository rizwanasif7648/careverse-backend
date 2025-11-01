const { Provider } = require('../models');
const { Sequelize } = require('sequelize');
const logger = require('../config/logger');

// Search for providers
const searchProviders = async (req, res, next) => {
  try {
    const {
      specialty,
      lat,
      lng,
      radius = 25, // miles
      limit = 10
    } = req.query;

    let whereClause = {};

    // Filter by specialty
    if (specialty) {
      whereClause.specialty = {
        [Sequelize.Op.iLike]: `%${specialty}%`
      };
    }

    let providers;

    // If location provided, calculate distance using Haversine formula
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      // Get all providers matching specialty filter
      let query = {
        where: whereClause,
        attributes: {
          include: [
            // Calculate distance using Haversine formula
            [
              Sequelize.literal(`
                6371 * 0.621371 * ACOS(
                  COS(RADIANS(${userLat})) * 
                  COS(RADIANS(latitude)) * 
                  COS(RADIANS(longitude) - RADIANS(${userLng})) + 
                  SIN(RADIANS(${userLat})) * 
                  SIN(RADIANS(latitude))
                )
              `),
              'distance_miles'
            ]
          ]
        },
        having: Sequelize.where(
          Sequelize.literal('distance_miles'),
          '<=',
          radius
        ),
        order: [[Sequelize.literal('distance_miles'), 'ASC']],
        limit: parseInt(limit)
      };

      providers = await Provider.findAll(query);
    } else {
      // Search without location
      providers = await Provider.findAll({
        where: whereClause,
        limit: parseInt(limit),
        order: [['rating', 'DESC']]
      });
    }

    res.status(200).json({
      success: true,
      data: {
        providers,
        count: providers.length
      }
    });
  } catch (error) {
    logger.error('Error searching providers:', error);
    next(error);
  }
};

// Get provider by ID
const getProviderById = async (req, res, next) => {
  try {
    const { providerId } = req.params;

    const provider = await Provider.findByPk(providerId);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { provider }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchProviders,
  getProviderById
};
