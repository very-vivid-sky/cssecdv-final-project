const User = require('../../models/userSchema');
const auditLogger = require('../auditLogger');
const bcrypt = require("bcryptjs");
const helper = require('../../controllers/controllerHelper.js');
const authMiddleware = require('../../controllers/authMiddleware');

// Password policy
const validatePassword_settings = {
    minLength: 8,
    uppercaseReq: true,
    lowercaseReq: true,
    numberReq: true,
    specialReq: true,
};

function validatePassword(password) { 
    if (password.length < validatePassword_settings.minLength) return false;
    if (validatePassword_settings.uppercaseReq && !(/[A-Z]/.test(password))) return false;
    if (validatePassword_settings.lowercaseReq && !(/[a-z]/.test(password))) return false;
    if (validatePassword_settings.numberReq && !(/[0-9]/.test(password))) return false;
    if (validatePassword_settings.specialReq && !(/[!@#$%^&*()\-_\\\/~`{}[\]|:;"'<>,.?+=]/.test(password))) return false;
    return true;
}

module.exports = async function validateAccountEdit(req, res, next) {
    try {
        const user = req.userData;  
        const { username, bio, password_old, password_new, password_retype } = req.body;

        const renderObject = {
            layout: 'index',
            title: "Profile",
            clientType: helper.getClientType(req),
            userName: user.userName,
            joined: user.createdAt.toDateString(),
            totalReviews: user.totalReviews,
            bio: user.userDetails,
            image: user.userPicture,
            userId: user._id,
        };

        if (username) {
            if (username.length < 8 || username.length > 30) {
                renderObject.message_warning = "Username must be between 8 and 30 characters.";
                return res.render("edit-user", renderObject);
            }

            const existingUser = await User.findOne({ userName: username });

            if (existingUser && existingUser._id.toString() !== user._id.toString()) {
                renderObject.message_warning = "Username unavailable.";
                return res.render("edit-user", renderObject);
            }

            if (!password_old) {
                renderObject.message_warning = "Please enter your current password to change username.";
                return res.render("edit-user", renderObject);
            }

            const correct = await bcrypt.compare(password_old, user.password);
            if (!correct) {
                renderObject.message_warning = "Current password is incorrect.";
                return res.render("edit-user", renderObject);
            }
        }

      
        if (password_new) {
            if (!password_old) {
                renderObject.message_warning = "Current password required to change your password.";
                return res.render("edit-user", renderObject);
            }

            const correct = await bcrypt.compare(password_old, user.password);
            if (!correct) {
                renderObject.message_warning = "Current password is incorrect.";
                return res.render("edit-user", renderObject);
            }

            if (password_new !== password_retype) {
                renderObject.message_warning = "New passwords do not match.";
                return res.render("edit-user", renderObject);
            }

            if (!validatePassword(password_new)) {
                renderObject.message_warning = "New password should be at least 8 characters, contain uppercase, lowercase letters, a number, and a special character.";
                return res.render("edit-user", renderObject);
            }

            const ONE_DAY = 24 * 60 * 60 * 1000;
            const now = Date.now();

            if (user.passwordLastChanged && (now - user.passwordLastChanged.getTime()) < ONE_DAY) {
                const hoursLeft = Math.ceil((ONE_DAY - (now - user.passwordLastChanged.getTime())) / (60 * 60 * 1000))
                renderObject.message_warning = `You must wait ${hoursLeft} more hour(s) before changing your password again.`;
                return res.render("edit-user", renderObject);
            }

            const reused = await authMiddleware.checkForPasswordReuse(user, password_new);
            if (reused) {
                renderObject.message_warning = "You cannot reuse your previous passwords.";
                return res.render("edit-user", renderObject);
            }
        }

        
        if (bio && bio.length > 160) {
            renderObject.message_warning = "Bio should be less than 160 characters.";
            return res.render("edit-user", renderObject);
        }

        if (req.file) {
            const allowed = ["image/jpeg", "image/png"];
            if (!allowed.includes(req.file.mimetype)) {
                renderObject.message_warning = "Avatar must be a JPEG or PNG image.";
                return res.render("edit-user", renderObject);
            }
            if (req.file.size > 1024 * 1024) {
                renderObject.message_warning = "Avatar must be under 1 MB.";
                return res.render("edit-user", renderObject);
            }
        }

        next();

    } catch (err) {
        console.error("Validation error:", err);
        return res.status(500).render("edit-user", {
            layout: "index",
            title: "Profile",
            message_warning: "An unexpected error occurred."
        });
    }
};
