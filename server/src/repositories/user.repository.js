const User = require('../models/User');
const { isInMemoryFallback, memoryStore } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class UserRepository {
  async findByEmail(email, includePassword = false) {
    if (isInMemoryFallback()) {
      for (const user of memoryStore.users.values()) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
          const cloned = { ...user };
          if (!includePassword) delete cloned.password;
          // attach helper methods
          cloned.comparePassword = async (candidate) => bcrypt.compare(candidate, user.password);
          cloned.toSafeObject = () => ({
            id: user.id || user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
          });
          return cloned;
        }
      }
      return null;
    }

    const query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  async findById(id) {
    if (isInMemoryFallback()) {
      const user = memoryStore.users.get(id);
      if (!user) return null;
      const cloned = { ...user };
      delete cloned.password;
      cloned.toSafeObject = () => ({
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      });
      return cloned;
    }

    return User.findById(id).exec();
  }

  async create(userData) {
    if (isInMemoryFallback()) {
      const id = uuidv4();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const user = {
        _id: id,
        id,
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      user.comparePassword = async (candidate) => bcrypt.compare(candidate, user.password);
      user.toSafeObject = () => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      });
      memoryStore.users.set(id, user);
      return user;
    }

    const user = new User(userData);
    return user.save();
  }

  async updateRefreshToken(id, refreshToken) {
    if (isInMemoryFallback()) {
      const user = memoryStore.users.get(id);
      if (user) {
        user.refreshToken = refreshToken;
        memoryStore.users.set(id, user);
      }
      return;
    }

    return User.findByIdAndUpdate(id, { refreshToken }, { new: true });
  }
}

module.exports = new UserRepository();

