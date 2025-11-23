const userModel = require('../models/userSchema.js')
const express = require('express');
const User = require('../models/userSchema.js');
const helper = require('./controllerHelper.js');
const bcrypt = require('bcryptjs');
const saltRounds = 5;
const lockoutMiddleware = require('../middleware/accountLockoutMiddleware.js');
const auditLogger = require('../middleware/auditLogger.js');

const sessionController = {
    login: async function(req, resp) {
        try {
            // Promisify the callback to use async/await properly
            const user = await new Promise((resolve, reject) => {
                helper.getUserFromData("userEmail", req.body.email, function(userData) {
                    resolve(userData);
                });
            });

            // IMPORTANT: Check if user exists FIRST
            if (user === null || user === undefined) {
                // user not found - record failed attempt anyway (to prevent account enumeration)
                await lockoutMiddleware.recordFailedAttempt(req.body.email, 5, 15);
                
                // Log failed login attempt (user not found)
                try {
                    await auditLogger.logLoginAttempt(
                        req.body.email,
                        false,
                        req.auditContext?.ipAddress || 'UNKNOWN',
                        req.auditContext?.userAgent || 'UNKNOWN',
                        'User not found'
                    );
                } catch (auditErr) {
                    console.error('Audit logging error:', auditErr);
                }
                
                resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    message: 'Invalid username and/or password'
                });
                return;
            }

            // Check if account is locked
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                const minutesRemaining = Math.ceil(
                    (user.lockedUntil - new Date()) / (1000 * 60)
                );
                
                // Log account locked attempt
                try {
                    await auditLogger.logAccountLockout(
                        user.userEmail,
                        req.auditContext?.ipAddress || 'UNKNOWN',
                        req.auditContext?.userAgent || 'UNKNOWN'
                    );
                } catch (auditErr) {
                    console.error('Audit logging error:', auditErr);
                }
                
                resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    message: `Account temporarily locked due to multiple failed login attempts. Try again in ${minutesRemaining} minute(s).`
                });
                return;
            }

            // User exists - now check password with proper async/await
            const passwordMatch = await new Promise((resolve, reject) => {
                bcrypt.compare(req.body.password, user.password, function(err, res) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            if (passwordMatch) {
                // password matches - successful login
                
                // Reset failed login attempts
                await lockoutMiddleware.resetFailedAttempts(user._id);
                
                // Log successful login
                try {
                    await auditLogger.logLoginAttempt(
                        req.body.email,
                        true,
                        req.auditContext?.ipAddress || 'UNKNOWN',
                        req.auditContext?.userAgent || 'UNKNOWN'
                    );
                } catch (auditErr) {
                    console.error('Audit logging error:', auditErr);
                }
                
                req.session.userId = user._id;
                resp.redirect("/");
            } else {
                // password mismatch - record failed attempt
                await lockoutMiddleware.recordFailedAttempt(req.body.email, 5, 15);
                
                // Log failed login attempt (invalid password)
                try {
                    await auditLogger.logLoginAttempt(
                        req.body.email,
                        false,
                        req.auditContext?.ipAddress || 'UNKNOWN',
                        req.auditContext?.userAgent || 'UNKNOWN',
                        'Invalid password'
                    );
                } catch (auditErr) {
                    console.error('Audit logging error:', auditErr);
                }
                
                resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    message: 'Invalid username and/or password'
                });
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Log unexpected error
            try {
                await auditLogger.logAuditEvent(
                    'LOGIN_FAILED',
                    'failure',
                    {
                        userId: req.body.email || 'UNKNOWN',
                        resource: 'User',
                        ipAddress: req.auditContext?.ipAddress || 'UNKNOWN',
                        userAgent: req.auditContext?.userAgent || 'UNKNOWN',
                        errorMessage: error.message
                    }
                );
            } catch (auditErr) {
                console.error('Audit logging error:', auditErr);
            }
            
            resp.status(500).render('login', {
                layout: 'index',
                title: 'Result page',
                message: 'An error occurred during login. Please try again.'
            });
        }
    },

    logout: function (req, resp) {
        // check if logged in
        if (helper.isLoggedIn(req)) {
            // destroy session, log out
            req.session.destroy(function () {
                resp.redirect('/');
            });
        }
    }
};

module.exports = sessionController;
