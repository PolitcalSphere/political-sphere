// Express CSRF protection middleware setup
// Uses modern 'csrf' package (csurf is deprecated)
// See: https://www.npmjs.com/package/csrf
const { doubleCsrf } = require("csrf-csrf");

// Configure CSRF protection using double-submit cookie pattern
const { invalidCsrfTokenError, generateToken, doubleCsrfProtection } =
	doubleCsrf({
		getSecret: () =>
			process.env.CSRF_SECRET ||
			require("crypto").randomBytes(32).toString("hex"),
		cookieName: "x-csrf-token",
		cookieOptions: {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			path: "/",
		},
		size: 64,
		ignoredMethods: ["GET", "HEAD", "OPTIONS"],
		getTokenFromRequest: (req) => req.headers["x-csrf-token"],
	});

// Middleware to generate and attach CSRF token to response
const csrfTokenMiddleware = (req, res, next) => {
	const token = generateToken(req, res);
	res.locals.csrfToken = token;
	// Expose token in response header for SPA consumption
	res.setHeader("X-CSRF-Token", token);
	next();
};

module.exports = {
	csrfProtection: doubleCsrfProtection,
	csrfTokenMiddleware,
	invalidCsrfTokenError,
};
