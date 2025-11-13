module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/content', '<rootDir>/popup', '<rootDir>/options'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      isolatedModules: true
    }]
  },
  collectCoverageFrom: [
    'content/**/*.ts',
    'popup/**/*.ts',
    'options/**/*.ts',
    'background.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  // Coverage thresholds disabled for Phase 1 - will be enforced in Phase 2
  // coverageThreshold: {
  //   global: {
  //     branches: 30,
  //     functions: 30,
  //     lines: 30,
  //     statements: 30
  //   }
  // },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/content/$1',
    '^@config/(.*)$': '<rootDir>/config/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ]
};
