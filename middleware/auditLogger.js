const AuditLog = require('../models/auditLogSchema.js');

/**
 * Log an audit event to the database
 * @param {string} action - The action performed (see enum in schema)
 * @param {string} result - 'success' or 'failure'
 * @param {object} options - Additional options
 */
const logAuditEvent = async (action, result, options = {}) => {
  try {
    const {
      userId = 'SYSTEM',
      resource = null,
      resourceId = null,
      ipAddress = null,
      userAgent = null,
      errorMessage = null,
      details = {}
    } = options;

    const auditLog = new AuditLog({
      userId,
      action,
      resource,
      resourceId,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      result,
      errorMessage,
      details
    });

    await auditLog.save();
    console.log(`[AUDIT] ${action} - ${result}`);
    return auditLog;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging shouldn't crash the app
  }
};


 // Middleware to extract IP and User-Agent for logging

const auditContextMiddleware = (req, res, next) => {
  // Attach audit context to request for use in controllers
  req.auditContext = {
    ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent: req.get('user-agent')
  };
  next();
};

// Log login attempt

const logLoginAttempt = async (email, success, ipAddress, userAgent, errorMessage = null) => {
    try {
            await logAuditEvent(
        success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        success ? 'success' : 'failure',
        {
        userId: email,
        resource: 'User',
        ipAddress,
        userAgent,
        errorMessage,
        details: { email }
        }
  );    } catch (error) {
        console.error('Failed to log login attempt:', error);
    }
};

// Log account lockout

const logAccountLockout = async (userId, ipAddress, userAgent) => {
  try {
    await logAuditEvent(
      'ACCOUNT_LOCKED',
      'success',
      {
        userId,
        resource: 'User',
      resourceId: userId,
      ipAddress,
      userAgent,
      details: { reason: 'Multiple failed login attempts' }
    }
  );
    } catch (error) {
        console.error('Failed to log account lockout:', error);
    }
};

/**
 * Log registration
 */
const logRegistration = async (userId, email, ipAddress, userAgent) => {
  await logAuditEvent(
    'REGISTRATION',
    'success',
    {
      userId,
      resource: 'User',
      resourceId: userId,
      ipAddress,
      userAgent,
      details: { email }
    }
  );
};


// Log access denied

const logAccessDenied = async (userId, resource, resourceId, ipAddress, userAgent, reason = 'Insufficient permissions') => {
  await logAuditEvent(
    'ACCESS_DENIED',
    'failure',
    {
      userId,
      resource,
      resourceId,
      ipAddress,
      userAgent,
      errorMessage: reason,
      details: { reason }
    }
  );
};


 // Log input validation failure
 
const logValidationFailure = async (userId, resource, failureReason, ipAddress, userAgent) => {
  await logAuditEvent(
    'INVALID_INPUT',
    'failure',
    {
      userId,
      resource,
      ipAddress,
      userAgent,
      errorMessage: failureReason,
      details: { failureReason }
    }
  );
};

 // Log password change
 
 const logDetailsEdit = async (userId, changed, resourceId, ipAddress, userAgent) => {
  await logAuditEvent(
    'USER_DETAILS_EDIT',
    'success',
    {
      userId,
      resource: "EditDetails",
      resourceId: resourceId,
      ipAddress,
      userAgent,
      details: {reason: `changed ${changed}`},
    }
  );
};

/**
 * Get audit logs (admin only)
 */
const getAuditLogs = async (filters = {}) => {
  try {
    const {
      action = null,
      userId = null,
      result = null,
      daysBack = 30,
      limit = 100,
      skip = 0
    } = filters;

    const query = {};
    
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (result) query.result = result;
    
    // Get logs from the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    query.timestamp = { $gte: startDate };

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    throw error;
  }
};

// gets the user from a req object
const getUser = function(req) {
  return req.session && req.session.userId ? req.session.userId : 'ANONYMOUS';
}

// gets the IP from a req object
const getIp = function(req) {
  return req.auditContext && req.auditContext.ipAddress ? req.auditContext.ipAddress : (req.ip || req.socket?.remoteAddress || null);
}

// gets the user-agent from a req object
const getUa = function(req) {
  return req.auditContext && req.auditContext.userAgent ? req.auditContext.userAgent : req.get && req.get('user-agent');
}

module.exports = {
  logAuditEvent,
  auditContextMiddleware,
  logLoginAttempt,
  logAccountLockout,
  logRegistration,
  logAccessDenied,
  logValidationFailure,
  logDetailsEdit,
  getAuditLogs,

  getUser,
  getIp,
  getUa,
};
