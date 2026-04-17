/**
 * Purpose: Configure Jest to run TypeScript tests in the API workspace.
 * Why important: Enables deterministic phase validation for integration/unit test slices.
 * Used by: pnpm test command and targeted jest executions.
 */
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup-jest.ts'],
  testMatch: [
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.e2e-spec.ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
};

export default config;
