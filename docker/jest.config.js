module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  verbose: false,
  bail: false,
  testTimeout: 5000,
  maxWorkers: 1,
  cache: false,
  reporters: ['default']
};

