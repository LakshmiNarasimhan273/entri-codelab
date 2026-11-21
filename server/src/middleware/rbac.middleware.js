const { sendError } = require('../utils/response.util');

/**
 * Role-Based Access Control Middleware
 * @param  {...string} roles Allowed roles ('MENTOR', 'LEARNER')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized access.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: Role '${req.user.role}' does not possess clearance for this operation.`,
        403
      );
    }

    next();
  };
};

module.exports = {
  requireRole
};

