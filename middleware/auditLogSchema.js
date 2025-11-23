const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema({
  userId: {
    type: String,
    default: 'SYSTEM' // For system-level events
  },
  
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGIN_ATTEMPT_BLOCKED',
      'REGISTRATION',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'ACCESS_DENIED',
      'INVALID_INPUT',
      'DELETE_USER',
      'EDIT_USER',
      'VIEW_LOGS'
    ]
  },
  
  resource: {
    type: String, // What was acted upon: 'User', 'Restaurant', 'Review', etc.
    default: null
  },
  
  resourceId: {
    type: String, // ID of the resource being accessed
    default: null
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Index for fast queries
  },
  
  ipAddress: {
    type: String,
    default: null
  },
  
  userAgent: {
    type: String, // Browser/client info
    default: null
  },
  
  result: {
    type: String,
    enum: ['success', 'failure'],
    required: true
  },
  
  errorMessage: {
    type: String, // If result is 'failure'
    default: null
  },
  
  details: {
    type: Object, // Additional contextual data
    default: {}
  }
}, {
  timestamps: false // We use custom timestamp
});

// Auto-delete logs older than 90 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const AuditLog = mongoose.model('auditLog', auditLogSchema);
module.exports = AuditLog;
