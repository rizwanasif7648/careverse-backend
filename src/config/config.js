const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'careverse_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
    // Without Remember Me (short-lived)
    expiresIn: process.env.JWT_EXPIRE || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '1d',
    // With Remember Me (long-lived)
    expiresInLong: process.env.JWT_EXPIRE_LONG || '7d',
    refreshExpiresInLong: process.env.JWT_REFRESH_EXPIRE_LONG || '30d'
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 2000
  },

  // Pinecone Configuration
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    indexName: process.env.PINECONE_INDEX_NAME || 'careverse-medical-knowledge'
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },

  // Google Maps
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY
  },

  // Google Places API
  googlePlaces: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY
  },

  // Web Search APIs
  webSearch: {
    serperApiKey: process.env.SERPER_API_KEY,
    braveApiKey: process.env.BRAVE_SEARCH_API_KEY,
    timeoutMs: parseInt(process.env.WEB_SEARCH_TIMEOUT_MS, 10) || 10000,
    maxRetries: parseInt(process.env.WEB_SEARCH_MAX_RETRIES, 10) || 2,
    cacheEnabled: process.env.WEB_SEARCH_CACHE_ENABLED === 'true',
    cacheTtlHours: parseInt(process.env.WEB_SEARCH_CACHE_TTL_HOURS, 10) || 6,
    maxResults: parseInt(process.env.WEB_SEARCH_MAX_RESULTS, 10) || 5
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};
