const userModel = require('../models/userSchema.js')
const express = require('express');
const User = require('../models/userSchema.js');
const helper = require('./controllerHelper.js');
const bcrypt = require('bcryptjs');
const saltRounds = 5;
const lockoutMiddleware = require('../middleware/accountLockoutMiddleware.js');


const sessionController = {
    login: async function(req, resp) {
  try {
    // get user data - this will call the callback with user (or null if not found)
    helper.getUserFromData("userEmail", req.body.email, async function (user) {
      
      // IMPORTANT: Check if user exists FIRST
      if (user === null || user === undefined) {
        // user not found - record failed attempt anyway (to prevent account enumeration)
        await lockoutMiddleware.recordFailedAttempt(req.body.email, 5, 15);
        
        resp.render('login', {
          layout: 'index',
          title: 'Result page',
          message: 'Invalid username and/or password'
        });
        return; // EXIT early
      }

      // User exists - now check password
      bcrypt.compare(req.body.password, user.password, async function(err, res) {
        if (err) {
          console.error('Bcrypt error:', err);
          resp.status(500).render('login', {
            layout: 'index',
            title: 'Result page',
            message: 'An error occurred during login. Please try again.'
          });
          return;
        }

        if (res) {
          // password matches - successful login
          
          // Reset failed login attempts
          await lockoutMiddleware.resetFailedAttempts(user._id);
          
          req.session.userId = user._id;
          resp.redirect("/");
        } else {
          // password mismatch - record failed attempt
          await lockoutMiddleware.recordFailedAttempt(req.body.email, 5, 15);
          
          resp.render('login', {
            layout: 'index',
            title: 'Result page',
            message: 'Invalid username and/or password'
          });
        }
      })
    })
  } catch (error) {
    console.error('Login error:', error);
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