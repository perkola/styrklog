/**
 * Everything under src/core is plain TypeScript with no React Native imports,
 * so it runs in a normal Node environment — no simulator, no RN test harness.
 */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/core/**/*.ts'],
};
