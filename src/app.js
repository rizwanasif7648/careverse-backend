const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const logger = require('./config/logger');
const { testConnection } = require('./config/database');

// Import routes (we'll create these next)
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const assessmentRoutes = require('./routes/assessment.routes');
const providerRoutes = require('./routes/provider.routes');
const embeddingRoutes = require('./routes/embedding.routes');

// Import error handling middleware
const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(config.cors));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// API routes
app.use(`/api/${config.API_VERSION}/auth`, authRoutes);
app.use(`/api/${config.API_VERSION}/chat`, chatRoutes);
app.use(`/api/${config.API_VERSION}/assessments`, assessmentRoutes);
app.use(`/api/${config.API_VERSION}/providers`, providerRoutes);
app.use(`/api/${config.API_VERSION}/embeddings`, embeddingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database connection
const initializeDatabase = async () => {
  await testConnection();
};

module.exports = { app, initializeDatabase };
