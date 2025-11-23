/**
 * Middleware to check if user is an admin
 * Use this middleware to protect admin routes
 */
const isAdmin = (req, resp, next) => {
    if (!req.session.userId) {
        return resp.status(401).redirect('/login');
    }

    if (req.session.role !== 'admin') {
        return resp.status(403).send({ message: "Access denied. Admin privileges required." });
    }

    next();
};

/**
 * Middleware to check if user is logged in
 */
const isLoggedIn = (req, resp, next) => {
    if (!req.session.userId) {
        return resp.status(401).redirect('/login');
    }

    next();
};

/**
 * Middleware to check if user is a manager (or admin)
 */
const isManager = (req, resp, next) => {
    if (!req.session.userId) {
        return resp.status(401).redirect('/login');
    }

    if (req.session.role !== 'manager' && req.session.role !== 'admin') {
        return resp.status(403).send({ message: "Access denied. Manager privileges required." });
    }

    next();
};

/**
 * Middleware to check if user is strictly a manager (admins excluded)
 */
const isStrictManager = (req, resp, next) => {
    if (!req.session.userId) {
        return resp.status(401).redirect('/login');
    }

    if (req.session.role !== 'manager') {
        return resp.status(403).send({ message: "Access denied. Manager privileges required." });
    }

    next();
};

/**
 * Middleware to check if user account is active
 * Call this before any protected routes to ensure disabled users can't perform actions
 */
const isAccountActive = (req, resp, next) => {
    if (!req.session.userId) {
        return next();
    }

    const User = require('../models/userSchema.js');

    User.findById(req.session.userId)
        .then((user) => {
            if (!user || !user.isActive) {
                // Destroy session and redirect to login
                req.session.destroy((err) => {
                    if (err) console.log('Session destroy error:', err);
                    return resp.redirect('/login?message=Your account has been disabled');
                });
            } else {
                next();
            }
        })
        .catch((error) => {
            console.error('Error checking account status:', error);
            next();
        });
};

module.exports = {
    isAdmin,
    isLoggedIn,
    isAccountActive,
    isManager,
    isStrictManager
};
