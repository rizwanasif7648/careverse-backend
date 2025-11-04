const Redis = require('ioredis');
const config = require('../../config/config');
const logger = require('../../config/logger');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryStrategy: (times) => {
          if (times > this.maxReconnectAttempts) {
            logger.error('Redis max reconnection attempts reached');
            return null;
          }
          const delay = Math.min(times * this.reconnectDelay, 10000);
          logger.info(`Redis reconnecting in ${delay}ms (attempt ${times})`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false
      });

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('Redis client connected and ready');
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        this.reconnectAttempts++;
        logger.info(`Redis reconnecting... (attempt ${this.reconnectAttempts})`);
      });

      // Wait for connection to be ready
      await this.client.ping();
      
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Get value from Redis
   * @param {string} key - Cache key
   * @returns {Promise<string|null>} - Cached value or null
   */
  async get(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping get operation');
        return null;
      }

      const value = await this.client.get(key);
      
      if (value) {
        logger.debug(`Cache hit for key: ${key}`);
        return value;
      }
      
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      return null; // Graceful degradation
    }
  }

  /**
   * Set value in Redis without expiration
   * @param {string} key - Cache key
   * @param {string} value - Value to cache
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping set operation');
        return false;
      }

      await this.client.set(key, value);
      logger.debug(`Cache set for key: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set value in Redis with expiration
   * @param {string} key - Cache key
   * @param {number} seconds - TTL in seconds
   * @param {string} value - Value to cache
   * @returns {Promise<boolean>} - Success status
   */
  async setex(key, seconds, value) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping setex operation');
        return false;
      }

      await this.client.setex(key, seconds, value);
      logger.debug(`Cache set with TTL ${seconds}s for key: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Redis setex error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from Redis
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping del operation');
        return false;
      }

      const result = await this.client.del(key);
      logger.debug(`Cache deleted for key: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error(`Redis del error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., 'providers:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  async delPattern(pattern) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping delPattern operation');
        return 0;
      }

      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(...keys);
      logger.debug(`Cache deleted ${result} keys matching pattern: ${pattern}`);
      return result;
    } catch (error) {
      logger.error(`Redis delPattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Existence status
   */
  async exists(key) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} - TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
   */
  async ttl(key) {
    try {
      if (!this.isConnected) {
        return -2;
      }

      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Redis ttl error for key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis client disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  /**
   * Get connection status
   * @returns {boolean} - Connection status
   */
  getStatus() {
    return this.isConnected;
  }

  /**
   * Ping Redis to check connection
   * @returns {Promise<boolean>} - Connection status
   */
  async ping() {
    try {
      if (!this.client) {
        return false;
      }

      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping error:', error);
      return false;
    }
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService;
