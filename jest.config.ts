import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^vitest$": "<rootDir>/tests/unit/__mocks__/vitestShim.ts",
    "\\.(css|less|sass|scss)$": "<rootDir>/tests/unit/__mocks__/styleMock.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "CommonJS",
          moduleResolution: "node",
        },
      },
    ],
  },
};

export default config;
