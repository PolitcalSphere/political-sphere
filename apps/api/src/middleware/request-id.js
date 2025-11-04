const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to add request ID for correlation and tracing
 * Adds a unique request ID to each request for tracking through the system
 */
function requestId(req, res, next) {
  // Check for existing request ID from upstream services
  const existingId = req.headers['x-request-id'] ||
                     req.headers['x-correlation-id'] ||
                     req.headers['request-id'];

  // Generate new ID if none exists
  const requestId = existingId || uuidv4();

  // Add to request object
  req.requestId = requestId;

  // Add to response headers for client visibility
  res.setHeader('x-request-id', requestId);

  next();
}

module.exports = requestId;
