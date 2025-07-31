// jest.config.js
module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  setupFilesAfterEnv: ['./jest-setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@rneui/.*)',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/navigation/**',
    '!src/localization/languages/**',
    '!src/assets/**',
    // Exclude App.tsx and index.ts from coverage as they are entry points
    '!App.tsx',
    '!index.ts',
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  moduleDirectories: ['node_modules', 'src'], // Added to help resolve paths

  // Add moduleNameMapper to fix the "Cannot find module" error.
  // This is the definitive fix for the jest-expo/Expo SDK 52 incompatibility.
  // It intercepts the call for the missing module at the resolver level
  // and provides a valid substitute file, preventing the test runner from crashing.
  moduleNameMapper: {
    '^expo-modules-core/build/Refs$': '<rootDir>/jest.config.js',
  },
};