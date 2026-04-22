"use strict";

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",

  // Run the source-loader before any test suite
  setupFiles: ["./jest.setup.js"],

  // Pick up plain-JS test files from __tests__/
  testMatch: ["**/__tests__/**/*.test.js"],
};
