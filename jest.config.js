/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/**/__tests__/**'
  ],
  testMatch: ['**/__tests__/**/*.test.js']
};
