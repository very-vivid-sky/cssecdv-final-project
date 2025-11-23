const User = require('../../models/userSchema');
const auditLogger = require('../auditLogger');

module.exports = async function validateLogin(req, res, next) {
    const body = req.body;
    const email = body.email?.trim();
    const password = body.password;

    //check if email and password are not empty
    if (!email || !password) {
        return res.render("login", {
            layout: "index",
            title: "Login",
            message: "Email and password cannot be empty."
        });
    }
    
    next();
};
