// jest.config.js
export default {
  testEnvironment: "node",
  injectGlobals: true,
  verbose: true,
  testTimeout: 30000,

  // ES Modules support
  transform: {},

  // Test patterns
  testMatch: ["**/__tests__/**/*.test.js", "**/*.test.js"],

  // Coverage
  collectCoverageFrom: [
    "controllers/**/*.js",
    "models/**/*.js",
    "utils/**/*.js",
    "middleware/**/*.js",
    "!**/*.test.js",
  ],

  // Clear mocks automatically
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Maximum workers (parallel tests)
  maxWorkers: "50%",

  // Fail tests on console.error
  errorOnDeprecated: true,

  // Detect open handles (DB connections not closed)
  detectOpenHandles: true,

  // Force exit after tests
  forceExit: true,

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
