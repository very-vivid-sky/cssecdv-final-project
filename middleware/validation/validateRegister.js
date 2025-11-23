const User = require('../../models/userSchema');
const auditLogger = require('../auditLogger');
const authMiddleware = require("../../controllers/authMiddleware.js");

module.exports = async function validateRegister(req, res, next) {
    const body = req.body;
    const email = body.email?.trim();
    const password = body.password;
    const password2 = body.password2;
    const username = body.username?.trim();

    //  Check email
    if (!authMiddleware.emailRegex.test(email)) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Email does not seem to be valid."
        });
    }

    // Check email uniqueness
    const oldUser = await User.findOne({ userEmail: email });
    if (oldUser) {
        await auditLogger?.logValidationFailure(
            'UNKNOWN',
            'User',
            'Email already registered',
            req.auditContext?.ipAddress,
            req.auditContext?.userAgent
        );

        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "We can't complete your registration with the provided details."
        });
    }

    //  Check password policy
    if (!authMiddleware.validatePassword(password)) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Password must be at least 8 characters, contain uppercase, lowercase letters, a number, and a special character."
        });
    }

    // Check confirm password
    if (password !== password2) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Passwords do not match."
        });
    }

    // Check username
    if (!username || username.length < 8 || username.length > 30) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Username must be at least 8 characters."
        });
    }

    // check username uniqueness
    const oldUsername = await User.findOne({ userName: username });
    if (oldUsername) {
        await auditLogger?.logValidationFailure(
            'UNKNOWN',
            'User', 
            'Username already taken',
            req.auditContext?.ipAddress,
            req.auditContext?.userAgent
        );
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "We can't complete your registration with the provided details."
        });
    }

    //limit description to 160 chars
    const description = body.bio || "";
    if (description.length > 160) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Description must be 160 characters or less."
        });
    }

    //limit photo to how many mbs and kind of file

const photo = req.file;

if (photo) {
    const allowedMimeTypes = ['image/jpeg', 'image/png'];

    const MIN_SIZE = 10 * 1024;       // 10 KB
    const MAX_SIZE = 1 * 1024 * 1024; // 1 MB

    // MIME type blocking
    if (!allowedMimeTypes.includes(photo.mimetype)) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Profile photo must be a JPEG or PNG image."
        });
    }

    // Minimum size
    if (photo.size < MIN_SIZE) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Profile photo is too small. Minimum size is 10 KB."
        });
    }

    // Maximum size
    if (photo.size > MAX_SIZE) {
        return res.render("register", {
            layout: "index",
            title: "Register",
            message: "Profile photo is too large. Maximum size is 1 MB."
        });
    }
}

    next();
};
