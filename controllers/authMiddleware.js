const bcrypt = require('bcryptjs');
const audit = require('../middleware/auditLogger.js');
const helper = require('./controllerHelper.js');

const saltRounds = 5;


// source: https://emailregex.com/
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Password policy
const validatePassword_settings = {
    minLength: 8,
    uppercaseReq: true,
    lowercaseReq: true,
    numberReq: true,
    specialReq: true,
};

const validatePassword = function(password) { 
    if (password.length < validatePassword_settings.minLength) return false;
    if (validatePassword_settings.uppercaseReq && !(/[A-Z]/.test(password))) return false;
    if (validatePassword_settings.lowercaseReq && !(/[a-z]/.test(password))) return false;
    if (validatePassword_settings.numberReq && !(/[0-9]/.test(password))) return false;
    if (validatePassword_settings.specialReq && !(/[!@#$%^&*()\-_\\\/~`{}[\]|:;"'<>,.?+=]/.test(password))) return false;
    return true;
}



const comparePassword = async function(plain, hash) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(plain, hash, (err, same) => {
            if (err) return reject(err);
            resolve(same);
        });
    });
}

function wantJson(req) {
    const accept = req.get && req.get('accept');
    return req.xhr || (accept && accept.indexOf('application/json') !== -1);
}

async function respondUnauthorized(req, res) {
    if (wantJson(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(401).redirect('/login');
}

async function respondForbidden(req, res, reason = 'Insufficient permissions') {
    // Log the denied attempt for auditing
    try {
        const userId = audit.getUser()
        const ip = audit.getIp();
        const ua = audit.getUa();
        await audit.logAccessDenied(userId, req.path, null, ip, ua, reason);
    } catch (e) {
        // ensure logging failures don't change control flow
        console.error('Audit log failure on access denied:', e);
    }

    if (wantJson(req)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    return helper.get403Page(req, res);
}

/**
 * Middleware to check if user is an admin
 * Use this middleware to protect admin routes
 */
const isAdmin = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return respondUnauthorized(req, resp);
        }

        if (req.session.role !== 'admin') {
            return respondForbidden(req, resp, 'Admin role required');
        }

        next();
    } catch (err) {
        console.error('Authorization error in isAdmin:', err);
        return respondForbidden(req, resp);
    }
};

/**
 * Middleware to check if user is logged in
 */
const isLoggedIn = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return respondUnauthorized(req, resp);
        }
        next();
    } catch (err) {
        console.error('Authorization error in isLoggedIn:', err);
        return respondForbidden(req, resp);
    }
};

/**
 * Middleware to check if user is a manager (or admin)
 */
const isManager = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return respondUnauthorized(req, resp);
        }

        if (req.session.role !== 'manager' && req.session.role !== 'admin') {
            return respondForbidden(req, resp, 'Manager role required');
        }

        next();
    } catch (err) {
        console.error('Authorization error in isManager:', err);
        return respondForbidden(req, resp);
    }
};

/**
 * Middleware to check if user is strictly a manager (admins excluded)
 */
const isStrictManager = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return respondUnauthorized(req, resp);
        }

        if (req.session.role !== 'manager') {
            return respondForbidden(req, resp, 'Manager role required (strict)');
        }

        next();
    } catch (err) {
        console.error('Authorization error in isStrictManager:', err);
        return respondForbidden(req, resp);
    }
};

/**
 * Middleware to check if user account is active
 * Call this before any protected routes to ensure disabled users can't perform actions
 */
const isAccountActive = async (req, resp, next) => {
    try {
        if (!req.session.userId) {
            return next();
        }

        const User = require('../models/userSchema.js');
        const user = await User.findById(req.session.userId).exec();
        if (!user || !user.isActive) {
            // Log disabled access attempt
            try {
                const ip = audit.getIp(req);
                const ua = audit.getUa(req);
                await audit.logAccessDenied(req.session.userId || 'ANONYMOUS', 'User', req.session.userId, ip, ua, 'ACCOUNT_DISABLED');
            } catch (e) {
                console.error('Failed to audit disabled account access:', e);
            }

            // Destroy session and redirect to login with neutral message
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                return resp.redirect('/login');
            });
            return;
        }
        return next();
    } catch (error) {
        console.error('Error checking account status:', error);
        // Fail secure: block access if account status cannot be confirmed
        return respondForbidden(req, resp, 'Account status check failed');
    }
};

// Checks to see if this password has already been used before by this user
// Call before changing the password for a user
const checkForPasswordReuse = async (user, newPassword) => {
    let wasPasswordReused = false;

    // quickfail -- safer to assume it is than it isn't;
    if (user == undefined) { return true; }

    try {
        // check the current password first
        wasPasswordReused = await comparePassword(newPassword, user.password);
        if (wasPasswordReused) { return true; }


        // if oldPasswords is empty, don't bother looping
        if (user.oldPasswords == undefined || user.oldPasswords.length == 0) { return false; }

        // loop through the list of passwords
        for (let hashedPass of user.oldPasswords) {
            wasPasswordReused = await comparePassword(newPassword, hashedPass);
            if (wasPasswordReused) {
                // yes, one of them was
                return true;
            }
        }

        // no, none of them were
        return false;


    } catch(error) {
        console.error("Error with checking for password reuse");
        wasPasswordReused = true;
        return true; // fail securely -- safer to assume it is than it isn't
    }
}

// Encrypts a password and returns it
const encryptPassword = async function(password) {
   salt = await bcrypt.genSalt(saltRounds);
   hashedPassword = await bcrypt.hash(password, salt);
   return hashedPassword;
}

// Sets new password to user
const setNewPassword = async function (req, user, newPassword) {
    // check for validity
    if (!validatePassword(newPassword)) { return false; }

    // check for password reuse
    let isPasswordReused = await checkForPasswordReuse(user, newPassword);
    if (isPasswordReused) { return false; }

    // salt and hash
    try {
        let hashedPassword = await encryptPassword(newPassword);
        oldPassword = user.password;
        
        if (user.oldPasswords == undefined) { user.oldPasswords = [oldPassword]; }
        else { user.oldPasswords.push(oldPassword); }
        user.password = hashedPassword;

        // documentation for audit
        const user_id = audit.getUser(req);
        const ip = audit.getIp(req);
        const ua = audit.getUa(req);
        audit.logPasswordChange(user_id, ip, ua);
        await user.save();
        return true;

    } catch(e) {
        // catch exceptions in the hashing process
        console.error(e);
        return false;
    }
}

module.exports = {
    emailRegex,

    comparePassword,
    isAdmin,
    isLoggedIn,
    isAccountActive,
    isManager,
    isStrictManager,
    validatePassword,
    checkForPasswordReuse,
    setNewPassword,
    encryptPassword,
};
