const DEFAULT_MAX_JSON_BYTES = 1024 * 1024; // 1 MiB
const DEFAULT_ALLOWED_CONTENT_TYPES = ['application/json', 'application/merge-patch+json'];

function isAllowedJsonContentType(contentType, allowedTypes) {
  return allowedTypes.some((type) => contentType.startsWith(type));
}

async function readJsonBody(req, options = {}) {
  const { limit = DEFAULT_MAX_JSON_BYTES, allowedContentTypes = DEFAULT_ALLOWED_CONTENT_TYPES } =
    options;

  const contentTypeHeader = req.headers['content-type'];
  if (
    contentTypeHeader &&
    typeof contentTypeHeader === 'string' &&
    !isAllowedJsonContentType(contentTypeHeader.toLowerCase(), allowedContentTypes)
  ) {
    const unsupported = new Error('Unsupported content type');
    unsupported.code = 'UNSUPPORTED_MEDIA_TYPE';
    throw unsupported;
  }

  const chunks = [];
  let totalLength = 0;

  for await (const chunk of req) {
    totalLength += chunk.length;
    if (totalLength > limit) {
      const tooLarge = new Error('Request entity too large');
      tooLarge.code = 'PAYLOAD_TOO_LARGE';
      // Don't forcibly destroy the request stream here; throwing allows the
      // caller to handle the error and respond cleanly. Forcibly destroying
      // the socket can produce EPIPE errors on the client.
      throw tooLarge;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    const parseError = new Error('Invalid JSON payload');
    parseError.code = 'INVALID_JSON';
    throw parseError;
  }
}

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function sendError(res, statusCode, message, details, headers = {}) {
  sendJson(
    res,
    statusCode,
    {
      error: message,
      details,
    },
    {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...headers,
    }
  );
}

function notFound(res, path) {
  sendError(res, 404, `Route ${path} not found`);
}

function methodNotAllowed(res) {
  sendError(res, 405, 'Method not allowed');
}

module.exports = {
  readJsonBody,
  sendJson,
  sendError,
  notFound,
  methodNotAllowed,
};
