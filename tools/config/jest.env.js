// Minimal environment setup for Jest before modules are imported
// Security: Use environment variables for secrets, fallback to test values only
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test_jwt_secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXX';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'sqlite://:memory:';

// Additional test environment variables for comprehensive testing
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.API_PORT = process.env.API_PORT || '3001';
