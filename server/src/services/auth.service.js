const userRepository = require('../repositories/user.repository');
const { ROLES } = require('../config/constants');
const env = require('../config/env');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/token.util');

class AuthService {
  async registerLearner({ name, email, password }) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      throw error;
    }

    const user = await userRepository.create({
      name,
      email,
      password,
      role: ROLES.LEARNER
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await userRepository.updateRefreshToken(user.id || user._id, refreshToken);

    return {
      user: user.toSafeObject ? user.toSafeObject() : { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken
    };
  }

  async registerMentor({ name, email, password, inviteSecret }) {
    if (inviteSecret !== env.MENTOR_SIGNUP_SECRET) {
      const error = new Error('Invalid or expired mentor authorization token.');
      error.statusCode = 403;
      throw error;
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      throw error;
    }

    const user = await userRepository.create({
      name,
      email,
      password,
      role: ROLES.MENTOR
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await userRepository.updateRefreshToken(user.id || user._id, refreshToken);

    return {
      user: user.toSafeObject ? user.toSafeObject() : { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken
    };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email, true);
    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await userRepository.updateRefreshToken(user.id || user._id, refreshToken);

    return {
      user: user.toSafeObject ? user.toSafeObject() : { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken
    };
  }

  async refreshTokens(refreshToken) {
    if (!refreshToken) {
      const error = new Error('Refresh token is required.');
      error.statusCode = 401;
      throw error;
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      const error = new Error('Invalid or expired refresh token.');
      error.statusCode = 401;
      throw error;
    }

    const user = await userRepository.findById(decoded.sub);
    if (!user) {
      const error = new Error('User no longer exists.');
      error.statusCode = 401;
      throw error;
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await userRepository.updateRefreshToken(user.id || user._id, newRefreshToken);

    return {
      user: user.toSafeObject ? user.toSafeObject() : { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(userId) {
    await userRepository.updateRefreshToken(userId, null);
    return true;
  }
}

module.exports = new AuthService();

