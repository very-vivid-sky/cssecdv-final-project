const auditLogger = require('../middleware/auditLogger.js');
const User = require('../models/userSchema.js');

const adminController = {
 // Get audit logs page for admin
  getAuditLogs: async (req, resp) => {
    try {
      // Check if user is admin
      const user = await User.findById(req.session.userId);
      
      if (!user || user.clientType !== 'admin') {
        // Log unauthorized access attempt
        await auditLogger.logAccessDenied(
          req.session.userId,
          'AuditLogs',
          null,
          req.auditContext?.ipAddress,
          req.auditContext?.userAgent,
          'User is not admin'
        );
        
        return resp.status(403).render('forbidden', {
          layout: 'index',
          title: 'Access Denied',
          message: 'You do not have permission to view audit logs.'
        });
      }

      // Get query parameters
      const page = parseInt(req.query.page) || 1;
      const action = req.query.action || null;
      const userId = req.query.userId || null;
      const result = req.query.result || null;
      const daysBack = parseInt(req.query.daysBack) || 30;
      const limit = 50;
      const skip = (page - 1) * limit;

      // Get audit logs
      const { logs, total, pages } = await auditLogger.getAuditLogs({
        action,
        userId,
        result,
        daysBack,
        limit,
        skip
      });

      // Log that admin viewed the logs
      await auditLogger.logAuditEvent(
        'VIEW_LOGS',
        'success',
        {
          userId: req.session.userId,
          resource: 'AuditLogs',
          ipAddress: req.auditContext?.ipAddress,
          userAgent: req.auditContext?.userAgent
        }
      );

      return resp.status(200).render('admin/audit-logs', {
        layout: 'index',
        title: 'Audit Logs',
        logs,
        total,
        page,
        pages,
        filters: { action, userId, result, daysBack },
        isAdmin: true
      });

    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      resp.status(500).render('error', {
        layout: 'index',
        title: 'Error',
        message: 'An error occurred while retrieving audit logs.'
      });
    }
  },

  //Export audit logs as JSON (admin only)

  exportAuditLogs: async (req, resp) => {
    try {
      // Check if user is admin
      const user = await User.findById(req.session.userId);
      
      if (!user || user.clientType !== 'admin') {
        return resp.status(403).json({
          error: 'Unauthorized - Admin access required'
        });
      }

      const daysBack = parseInt(req.query.daysBack) || 30;
      
      const { logs } = await auditLogger.getAuditLogs({
        daysBack,
        limit: 10000 // Allow larger export
      });

      // Set response headers for download
      resp.setHeader('Content-Type', 'application/json');
      resp.setHeader('Content-Disposition', 'attachment; filename="audit-logs.json"');
      
      resp.json(logs);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      resp.status(500).json({
        error: 'An error occurred while exporting audit logs.'
      });
    }
  }
};

module.exports = adminController;
