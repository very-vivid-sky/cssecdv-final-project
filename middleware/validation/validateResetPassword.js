const User = require('../../models/userSchema');
const auditLogger = require('../auditLogger');
const bcrypt = require("bcryptjs");
const helper = require('../../controllers/controllerHelper.js');
const authMiddleware = require("../../controllers/authMiddleware.js");

module.exports = async function validateResetPassword(req, res, next) {
    try {
        if (req.body.step == "identify") {
            //  Check email
            if (!authMiddleware.emailRegex.test(req.body.email)) {
                return res.render("reset-password", {
                    layout: "index",
                    title: "Reset password",
                    step: "identify",
                    message_warning: "Email does not seem to be valid."
                });
            }

            next();
        } else if (req.body.step == "verify") {
            //  Check email
            if (!authMiddleware.emailRegex.test(req.body.email)) {
                return res.render("reset-password", {
                    layout: "index",
                    title: "Reset password",
                    step: "identify",
                    message_warning: "An unexpected error occured while processing your request. Please try again.",
                });
            }
            
            //  Check password policy
            if (!authMiddleware.validatePassword(req.body.newPassword)) {
                return res.render("reset-password", {
                    layout: "index",
                    title: "Reset password",
                    step: "verify",
                    email: req.body.email,
                    securityQuestion1: req.body.question1,
                    securityQuestion2: req.body.question2,
                    message_warning: "Password must be at least 8 characters, contain uppercase, lowercase letters, a number, and a special character."
                });
            }

            // Check confirm password
            if (req.body.newPassword !== req.body.confirmPassword) {
                return res.render("reset-password", {
                    layout: "index",
                    title: "Reset password",
                    step: "verify",
                    email: req.body.email,
                    securityQuestion1: req.body.question1,
                    securityQuestion2: req.body.question2,
                    message_warning: "Passwords do not match."
                });
            }

            next();
        } else {
          return resp.render('reset-password', {
            layout: 'index',
            title: "Reset password",
            step: "identify",
            message_warning: "An unexpected error occured while processing your request. Please try again.",
          });
        }

    } catch (err) {
        console.error("Validation error:", err);
        return res.status(500).render("reset-password", {
            layout: "index",
            title: "Profile",
            step: "identify",
            message_warning: "An unexpected error occured while processing your request. Please try again.",
        });
    }
};
