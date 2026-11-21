const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Do not return password by default
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.LEARNER,
      required: true
    },
    refreshToken: {
      type: String,
      select: false
    }
  },
  {
    timestamps: true
  }
);

// High-speed indices
userSchema.index({ role: 1 });

// Pre-save bcrypt hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to check password validity
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization (strip sensitive fields)
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id ? this._id.toString() : this.id,
    name: this.name,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
