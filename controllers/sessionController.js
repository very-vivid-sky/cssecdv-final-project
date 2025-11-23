const User = require('../models/userSchema.js');
const express = require('express');
const helper = require('./controllerHelper.js');
const bcrypt = require('bcryptjs');
const lockoutMiddleware = require('../middleware/accountLockoutMiddleware.js');
const auditLogger = require('../middleware/auditLogger.js');

// tune these if needed
const MAX_ATTEMPTS = 5;     // lock after 5 bad attempts
const LOCK_MINUTES = 15;    // lock for 15 minutes

function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
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
	login: function(req, resp) {
		// TODO encryption
        let searchQuery = { userEmail: req.body.email, password: req.body.password };
        // get data
		helper.getUserFromData("userEmail", searchQuery.userEmail, function (user) {
            // check if user exists
            if (user != undefined) {
                // Check if account is active
                if (!user.isActive) {
                    resp.render('login', {
                        layout: 'index',
                        title: 'Result page',
                        message: 'Your account has been disabled. Please contact an administrator.'
                    });
                    return;
                }

                // hash pass
                bcrypt.compare(req.body.password, user.password, function(e, res) {
                    if (res) {
                        // email matches password
                        req.session.userId = user._id
                        req.session.role = user.clientType;
                        resp.redirect("/");
                    } else {
                        // email or password are incorrect
                        resp.render('login', {
                            layout: 'index',
                            title: 'Result page',
                            // message: 'Email and password do not match!'
                            message: 'Invalid username and/or password'
                        });
                    }
                })
            } else {
                // user undefined
                resp.render('login', {
                    layout: 'index',
                    title: 'Result page',
                    //  message: 'Email and password do not match!'
                    message: 'Invalid username and/or password'
                });
            }
        })
	},

    logout: function(req, resp) {
        // check if logged in
        if (helper.getClientType(req)) {
            // destroy session, log out
            req.session.destroy(function() {
                resp.redirect("/");
            })
        }
 
  login: async function (req, resp) {
    // deny if logged in already
    if (helper.isLoggedIn(req)) {
      helper.get403Page(req, resp);
      return;
    }

    try {
      const email = (req.body.email || '').trim();
      const password = req.body.password || '';

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
        } catch (e) { /* no-op */ }

        return resp.render('login', {
          layout: 'index',
          title: 'Result page',
          message: 'Invalid username and/or password'
        });
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil((user.lockedUntil - new Date()) / (1000 * 60));
        try {
          await auditLogger.logAccountLockout(
            user.userEmail,
            req.auditContext?.ipAddress || 'UNKNOWN',
            req.auditContext?.userAgent || 'UNKNOWN'
          );
        } catch (e) { /* no-op */ }

        return resp.render('login', {
          layout: 'index',
          title: 'Result page',
          message: `Account temporarily locked due to multiple failed login attempts. Try again in ${minutesRemaining} minute(s).`
        });
      }

      const ok = await comparePassword(password, user.password);

      if (!ok) {
        await lockoutMiddleware.recordFailedAttempt(email, MAX_ATTEMPTS, LOCK_MINUTES);
        try {
          await auditLogger.logLoginAttempt(
            email,
            false,
            req.auditContext?.ipAddress || 'UNKNOWN',
            req.auditContext?.userAgent || 'UNKNOWN',
            'Invalid password'
          );
        } catch (e) { /* no-op */ }

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
      } catch (e) { /* no-op */ }

      req.session.userId = user._id;
      req.session.role = user.clientType || 'user';

      return resp.redirect('/');

    } catch (error) {
      console.error('Login error:', error);
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
      } catch (e) { /* no-op */ }

      return resp.status(500).render('login', {
        layout: 'index',
        title: 'Result page',
        message: 'An error occurred during login. Please try again.'
      });
    }
  },

  logout: function (req, resp) {
    if (!helper.isLoggedIn(req)) {
      // not logged in
      helper.get403Page(req, resp);
      return;
    }

    // destroy session, then redirect home
    req.session.destroy((err) => {
      // optionally clear cookie:
      // resp.clearCookie('connect.sid');
      return resp.redirect('/');
    });
  }
};

module.exports = sessionController;
