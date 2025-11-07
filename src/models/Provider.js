const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Provider = sequelize.define('Provider', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  specialty: {
    type: DataTypes.STRING,
    allowNull: false
    // e.g., 'Neurologist', 'Dermatologist', 'General Practitioner'
  },
  description: {
    type: DataTypes.TEXT
  },
  address: {
    type: DataTypes.STRING
  },
  city: {
    type: DataTypes.STRING
  },
  state: {
    type: DataTypes.STRING
  },
  zipCode: {
    type: DataTypes.STRING,
    field: 'zip_code'
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'USA'
  },
  latitude: {
    type: DataTypes.FLOAT,
    // Latitude coordinate
  },
  longitude: {
    type: DataTypes.FLOAT,
    // Longitude coordinate
  },
  phone: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  website: {
    type: DataTypes.STRING
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'review_count'
  },
  isAcceptingNewPatients: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_accepting_new_patients'
  },
  insuranceAccepted: {
    type: DataTypes.JSON,
    // Array of insurance providers
    field: 'insurance_accepted',
    defaultValue: []
  },
  languages: {
    type: DataTypes.JSON,
    // Array of languages spoken
    defaultValue: ['English']
  },
  distanceMiles: {
    type: DataTypes.VIRTUAL,
    // Virtual field for distance calculations
    field: 'distance_miles'
  }
}, {
  tableName: 'providers',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Provider;
