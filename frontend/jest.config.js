module.exports = {
  testEnvironment: "jsdom",
  moduleDirectories: ["node_modules", "src"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|svg|json)$": "<rootDir>/__mocks__/fileMock.js",
    "^exceljs$": "<rootDir>/__mocks__/exceljs.js",
    "^@lottiefiles/react-lottie-player$": "<rootDir>/__mocks__/lottie-player.js",
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!uuid|exceljs)/"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/test_participant/",
    "/playwright-report/",
    "/test-results/",
    "\\.spec\\.[jt]sx?$"
  ]
};
