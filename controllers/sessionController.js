const User = require('../models/userSchema.js');
const helper = require('./controllerHelper.js');
const bcrypt = require('bcryptjs');
const lockoutMiddleware = require('../middleware/accountLockoutMiddleware.js');
const auditLogger = require('../middleware/auditLogger.js');

// Lockout settings
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Helper functions
function findUserByEmail(email) {
    return new Promise((resolve) => {
        helper.getUserFromData("userEmail", email, (user) => resolve(user));
    });
}

function comparePassword(plain, hash) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(plain, hash, (err, same) => {
            if (err) return reject(err);
            resolve(same);
        });
    });
}

const sessionController = {

    login: async function (req, resp) {

        if (helper.isLoggedIn(req)) {
            helper.get403Page(req, resp);
            return;
        }

        try {
            const email = (req.body.email || '').trim();
            const password = (req.body.password || '').trim();

       
            const user = await findUserByEmail(email);

            if (!user) {
       
                await lockoutMiddleware.recordFailedAttempt(email, MAX_ATTEMPTS, LOCK_MINUTES);

                try {
                    await auditLogger.logLoginAttempt(
                        email,
                        false,
                        req.auditContext?.ipAddress || 'UNKNOWN',
                        req.auditContext?.userAgent || 'UNKNOWN',
                        'User not found'
                    );
                } catch { }

                return resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    message: 'Invalid username and/or password'
                });
            }

            if (user.isActive === false) {
                return resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    message: 'Invalid username and/or password'
                });
            }

            if (user.lockedUntil && user.lockedUntil > new Date()) {
                const minutesRemaining = Math.ceil((user.lockedUntil - new Date()) / 60000);

                try {
                    await auditLogger.logAccountLockout(
                        user.userEmail,
                        req.auditContext?.ipAddress || 'UNKNOWN',
                        req.auditContext?.userAgent || 'UNKNOWN'
                    );
                } catch { }

                return resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    message: `Account temporarily locked. Try again in ${minutesRemaining} minute(s).`
                });
            }

            const passwordOk = await comparePassword(password, user.password);

            if (!passwordOk) {
                await lockoutMiddleware.recordFailedAttempt(email, MAX_ATTEMPTS, LOCK_MINUTES);

                try {
                    await auditLogger.logLoginAttempt(
                        email,
                        false,
                        req.auditContext?.ipAddress || 'UNKNOWN',
                        req.auditContext?.userAgent || 'UNKNOWN',
                        'Invalid password'
                    );
                } catch { }

                return resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    message: 'Invalid username and/or password'
                });
            }

            await lockoutMiddleware.resetFailedAttempts(user._id);

            try {
                await auditLogger.logLoginAttempt(
                    email,
                    true,
                    req.auditContext?.ipAddress || 'UNKNOWN',
                    req.auditContext?.userAgent || 'UNKNOWN'
                );
            } catch { }

            // Save session
            req.session.userId = user._id;
            req.session.role = user.clientType || 'user';

            return resp.redirect('/');

        } catch (error) {
            console.error("Login error:", error);

            try {
                await auditLogger.logAuditEvent(
                    'LOGIN_FAILED',
                    'failure',
                    {
                        userId: req.body?.email || 'UNKNOWN',
                        resource: 'User',
                        ipAddress: req.auditContext?.ipAddress || 'UNKNOWN',
                        userAgent: req.auditContext?.userAgent || 'UNKNOWN',
                        errorMessage: error.message
                    }
                );
            } catch { }

            return resp.status(500).render('login', {
                layout: 'index',
                title: 'Result page',
                message: 'An error occurred during login. Please try again.'
            });
        }
    },

    logout: function (req, resp) {
        if (!helper.isLoggedIn(req)) {
            return helper.get403Page(req, resp);
        }

        req.session.destroy(() => {
            return resp.redirect('/');
        });
    }
};

module.exports = sessionController;
