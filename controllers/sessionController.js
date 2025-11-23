const userModel = require('../models/userSchema.js')
const express = require('express');
const User = require('../models/userSchema.js');
const helper = require('./controllerHelper.js');
const bcrypt = require('bcryptjs');
const saltRounds = 5;

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
    }

}

module.exports = sessionController;