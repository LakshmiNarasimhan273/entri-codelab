const authService = require('../services/auth.service');
const { sendSuccess, sendError } = require('../utils/response.util');
const { getRefreshCookieOptions } = require('../utils/token.util');

class AuthController {
  async registerLearner(req, res, next) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return sendError(res, 'Name, email, and password are required', 400);
      }

      const result = await authService.registerLearner({ name, email, password });
      res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());

      return sendSuccess(
        res,
        { user: result.user, accessToken: result.accessToken },
        'Learner account registered successfully',
        201
      );
    } catch (err) {
      next(err);
    }
  }

  async registerMentor(req, res, next) {
    try {
      const { name, email, password, inviteSecret } = req.body;
      if (!name || !email || !password) {
        return sendError(res, 'Name, email, and password are required', 400);
      }

      // Check if secret provided in body or route param
      const secret = inviteSecret || req.params.secretToken;
      const result = await authService.registerMentor({ name, email, password, inviteSecret: secret });
      res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());

      return sendSuccess(
        res,
        { user: result.user, accessToken: result.accessToken },
        'Mentor credential verified and registered successfully',
        201
      );
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 'Email and password are required', 400);
      }

      const result = await authService.login({ email, password });
      res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());

      return sendSuccess(
        res,
        { user: result.user, accessToken: result.accessToken },
        'Authenticated successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        return sendError(res, 'Refresh token cookie not provided', 401);
      }

      const result = await authService.refreshTokens(refreshToken);
      res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());

      return sendSuccess(
        res,
        { user: result.user, accessToken: result.accessToken },
        'Session token refreshed successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      return sendSuccess(res, { user: req.user }, 'Current session profile fetched');
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      if (req.user) {
        await authService.logout(req.user.id);
      }
      res.clearCookie('refreshToken', getRefreshCookieOptions());
      return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();

