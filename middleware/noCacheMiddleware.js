/**
 * Middleware to prevent caching of authenticated pages
 * This ensures that after logout, users cannot use the back button
 * to access previously viewed protected pages
 */
const noCacheMiddleware = (req, res, next) => {
    // Only apply no-cache headers to authenticated users
    if (req.session && req.session.userId) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
};

module.exports = noCacheMiddleware;
