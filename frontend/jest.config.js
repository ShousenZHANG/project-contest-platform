module.exports = {
  testEnvironment: "jsdom",
  moduleDirectories: ["node_modules", "src"],
  transform: {
    "^.+\\.tsx?$": "<rootDir>/jest.ts-transformer.cjs",
    "^.+\\.jsx?$": "babel-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|svg|json)$": "<rootDir>/__mocks__/fileMock.js",
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/e2e/",
    "/playwright-report/",
    "/test-results/",
    "\\.spec\\.[jt]sx?$"
  ]
};
