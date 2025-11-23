const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'REGISTRATION_SUCCESS', 'REGISTRATION_FAILED', 'ACCESS_DENIED', 'VALIDATION_FAILED', 'FLAG_REVIEW', 'UNFLAG_REVIEW', 'REMOVE_REVIEW', 'LOGOUT', 'PASSWORD_CHANGE'],
    required: true
  },
  resource: {
    type: String,
    default: null
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  result: {
    type: String,
    enum: ['success', 'failure'],
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
