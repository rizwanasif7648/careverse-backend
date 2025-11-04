const { app, initializeDatabase } = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const { syncDatabase } = require('./models');

const PORT = config.PORT;

// Start server
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Note: We use migrations instead of sync for database schema management
    // To run migrations: npm run db:migrate

    // Start listening
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 API: http://localhost:${PORT}/api/${config.API_VERSION}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();
