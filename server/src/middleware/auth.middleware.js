const { verifyAccessToken } = require('../utils/token.util');
const { sendError } = require('../utils/response.util');
const userRepository = require('../repositories/user.repository');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token required. Please sign in.', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Access token expired. Please refresh your session.', 401, { code: 'TOKEN_EXPIRED' });
      }
      return sendError(res, 'Invalid authentication token.', 401);
    }

    const user = await userRepository.findById(decoded.sub);
    if (!user) {
      return sendError(res, 'User session no longer valid.', 401);
    }

    req.user = {
      id: user.id || user._id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  authenticate
};

