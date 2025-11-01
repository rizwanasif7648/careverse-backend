// Sample seed script for healthcare providers
// Run with: node src/utils/seedProviders.js

const { Provider } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../config/logger');

const sampleProviders = [
  {
    name: 'Dr. Sarah Johnson',
    specialty: 'Neurologist',
    description: 'Board-certified neurologist specializing in headaches and migraines',
    address: '123 Medical Plaza',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'USA',
    latitude: 37.7749,
    longitude: -122.4194,
    phone: '(415) 555-0100',
    email: 'dr.johnson@example.com',
    website: 'https://drjohnson.example.com',
    rating: 4.8,
    reviewCount: 128,
    isAcceptingNewPatients: true,
    insuranceAccepted: ['Blue Cross', 'Aetna', 'United Healthcare'],
    languages: ['English', 'Spanish']
  },
  {
    name: 'Dr. Michael Chen',
    specialty: 'Dermatologist',
    description: 'Expert in skin conditions, acne treatment, and cosmetic dermatology',
    address: '456 Health Center Dr',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94103',
    country: 'USA',
    latitude: 37.7699,
    longitude: -122.4089,
    phone: '(415) 555-0200',
    email: 'dr.chen@example.com',
    rating: 4.9,
    reviewCount: 210,
    isAcceptingNewPatients: true,
    insuranceAccepted: ['Blue Cross', 'Kaiser', 'Cigna'],
    languages: ['English', 'Mandarin']
  },
  {
    name: 'Dr. Emily Rodriguez',
    specialty: 'General Practitioner',
    description: 'Family medicine specialist providing comprehensive primary care',
    address: '789 Wellness Ave',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94110',
    country: 'USA',
    latitude: 37.7510,
    longitude: -122.4147,
    phone: '(415) 555-0300',
    email: 'dr.rodriguez@example.com',
    rating: 4.7,
    reviewCount: 95,
    isAcceptingNewPatients: true,
    insuranceAccepted: ['Blue Cross', 'Aetna', 'Medicare'],
    languages: ['English', 'Spanish']
  }
];

const seedProviders = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');

    // Sync Provider model
    await Provider.sync({ alter: true });
    logger.info('Provider model synced');

    // Clear existing providers (optional)
    // await Provider.destroy({ where: {}, truncate: true });

    // Create providers
    for (const providerData of sampleProviders) {
      const provider = await Provider.create(providerData);
      logger.info(`Created provider: ${provider.name}`);
    }

    logger.info('✅ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

// Run seed
seedProviders();
