const audit = require('../middleware/auditLogger.js');
const helper = require('./controllerHelper.js');

function wantJson(req) {
    const accept = req.get && req.get('accept');
    return req.xhr || (accept && accept.indexOf('application/json') !== -1);
}

async function respondUnauthorized(req, res) {
    if (wantJson(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(401).redirect('/login');
}

async function respondForbidden(req, res, reason = 'Insufficient permissions') {
    // Log the denied attempt for auditing
    try {
        const userId = req.session && req.session.userId ? req.session.userId : 'ANONYMOUS';
        const ip = req.auditContext && req.auditContext.ipAddress ? req.auditContext.ipAddress : (req.ip || req.socket?.remoteAddress || null);
        const ua = req.auditContext && req.auditContext.userAgent ? req.auditContext.userAgent : req.get && req.get('user-agent');
        await audit.logAccessDenied(userId, req.path, null, ip, ua, reason);
    } catch (e) {
        // ensure logging failures don't change control flow
        console.error('Audit log failure on access denied:', e);
    }

    if (wantJson(req)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    return helper.get403Page(req, res);
}

/**
 * Middleware to check if user is an admin
 * Use this middleware to protect admin routes
 */
const isAdmin = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return respondUnauthorized(req, resp);
        }

        if (req.session.role !== 'admin') {
            return respondForbidden(req, resp, 'Admin role required');
        }

        next();
    } catch (err) {
        console.error('Authorization error in isAdmin:', err);
        return respondForbidden(req, resp);
    }
};

/**
 * Middleware to check if user is logged in
 */
const isLoggedIn = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return respondUnauthorized(req, resp);
        }
        next();
    } catch (err) {
        console.error('Authorization error in isLoggedIn:', err);
        return respondForbidden(req, resp);
    }
};

/**
 * Middleware to check if user is a manager (or admin)
 */
const isManager = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return respondUnauthorized(req, resp);
        }

        if (req.session.role !== 'manager' && req.session.role !== 'admin') {
            return respondForbidden(req, resp, 'Manager role required');
        }

        next();
    } catch (err) {
        console.error('Authorization error in isManager:', err);
        return respondForbidden(req, resp);
    }
};

/**
 * Middleware to check if user is strictly a manager (admins excluded)
 */
const isStrictManager = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return respondUnauthorized(req, resp);
        }

        if (req.session.role !== 'manager') {
            return respondForbidden(req, resp, 'Manager role required (strict)');
        }

        next();
    } catch (err) {
        console.error('Authorization error in isStrictManager:', err);
        return respondForbidden(req, resp);
    }
};

/**
 * Middleware to check if user account is active
 * Call this before any protected routes to ensure disabled users can't perform actions
 */
const isAccountActive = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return next();
        }

        const User = require('../models/userSchema.js');
        const user = await User.findById(req.session.userId).exec();
        if (!user || !user.isActive) {
            // Log disabled access attempt
            try {
                const ip = req.auditContext && req.auditContext.ipAddress ? req.auditContext.ipAddress : (req.ip || req.socket?.remoteAddress || null);
                const ua = req.auditContext && req.auditContext.userAgent ? req.auditContext.userAgent : req.get && req.get('user-agent');
                await audit.logAccessDenied(req.session.userId || 'ANONYMOUS', 'User', req.session.userId, ip, ua, 'ACCOUNT_DISABLED');
            } catch (e) {
                console.error('Failed to audit disabled account access:', e);
            }

            // Destroy session and redirect to login with neutral message
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                return resp.redirect('/login');
            });
            return;
        }
        return next();
    } catch (error) {
        console.error('Error checking account status:', error);
        // Fail secure: block access if account status cannot be confirmed
        return respondForbidden(req, resp, 'Account status check failed');
    }
};

module.exports = {
    isAdmin,
    isLoggedIn,
    isAccountActive,
    isManager,
    isStrictManager
};
