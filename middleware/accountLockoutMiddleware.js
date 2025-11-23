const User = require('../models/userSchema.js');
const { logAccountLockout } = require('./auditLogger');


// Middleware to check if user account is locked due to failed login attempts
// Prevents login if account is currently locked

const checkAccountLockout = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return next();
        }

        const user = await User.findOne({ userEmail: email });

        if (user && user.lockedUntil) {
            const now = new Date();
            
            // Check if lockout period has expired
            if (user.lockedUntil > now) {
                // Account is still locked
                const minutesRemaining = Math.ceil(
                    (user.lockedUntil - now) / (1000 * 60)
                );
                
                return res.status(403).render('login', {
                    layout: 'index',
                    title: 'Login',
                    message: `Account temporarily locked due to multiple failed login attempts. Try again in ${minutesRemaining} minute(s).`
                });
            } else {
                // Lockout period has expired, unlock the account
                await User.findByIdAndUpdate(user._id, {
                    lockedUntil: null,
                    failedLoginAttempts: 0
                });

                // Log the account unlock
                try {
                    await logAccountLockout(
                        user._id, 
                        req?.ip || 'unknown', 
                        (req && req.get('user-agent')) || 'unknown'
                    );
                } catch (auditError) {
                    console.error('Failed to log account unlock:', auditError);
                }
            }
        }

        next();
    } catch (error) {
        console.error('Account lockout check error:', error);
        next();
    }
};

// Reset failed login attempts after successful login

const resetFailedAttempts = async (userId) => {
    try {
        await User.findByIdAndUpdate(userId, {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastFailedLoginAttempt: null
        });
    } catch (error) {
        console.error('Failed to reset login attempts:', error);
    }
};

/**
 * Increment failed login attempts and lock account if threshold reached
 * @param {string} email - User email
 * @param {object} req - Express request object (for IP and user-agent logging)
 * @param {number} maxAttempts - Maximum allowed failed attempts (default: 5)
 * @param {number} lockoutDurationMinutes - How long to lock account (default: 15)
 */
const recordFailedAttempt = async (
    email,
    req,
    maxAttempts = 5,
    lockoutDurationMinutes = 15
) => {
    try {
        const user = await User.findOne({ userEmail: email });

        if (!user) {
            return; // User doesn't exist, don't reveal this
        }

        let updates = {
            lastFailedLoginAttempt: new Date()
        };

        // If not currently locked, increment attempts
        if (!user.lockedUntil || new Date() > user.lockedUntil) {
            updates.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

            // Lock account if max attempts reached
            if (updates.failedLoginAttempts >= maxAttempts) {
                const lockoutUntil = new Date(
                    Date.now() + lockoutDurationMinutes * 60 * 1000
                );
                updates.lockedUntil = lockoutUntil;

                // Log the account lockout
                try {
                    await logAccountLockout(
                        user._id, 
                        req?.ip || 'unknown', 
                        (req && req.get('user-agent')) || 'unknown'
                    );
                } catch (auditError) {
                    console.error('Failed to log account lockout:', auditError);
                    // Don't throw - continue with the account lock even if audit log fails
                }
            }
        }

        await User.findByIdAndUpdate(user._id, updates);

        // Return attempt count for logging purposes
        return updates.failedLoginAttempts;
    } catch (error) {
        console.error('Failed to record login attempt:', error);
    }
};

module.exports = {
    checkAccountLockout,
    resetFailedAttempts,
    recordFailedAttempt
};
