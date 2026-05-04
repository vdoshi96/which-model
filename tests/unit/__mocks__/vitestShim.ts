const vitestAfterEach = afterEach;
const vitestBeforeEach = beforeEach;
const vitestDescribe = describe;
const vitestExpect = expect;
const vitestIt = it;
const vitestTest = test;

const vi = {
  clearAllMocks: jest.clearAllMocks,
  fn: jest.fn,
  mock: (moduleName: string, factory?: () => unknown) =>
    jest.mock(normalizeModuleName(moduleName), factory),
  resetAllMocks: jest.resetAllMocks,
  resetModules: jest.resetModules,
  restoreAllMocks: jest.restoreAllMocks,
  spyOn: jest.spyOn,
};

function normalizeModuleName(moduleName: string): string {
  return moduleName.replace(/^(\.\.\/)+src\//, "@/");
}

export {
  vitestAfterEach as afterEach,
  vitestBeforeEach as beforeEach,
  vitestDescribe as describe,
  vitestExpect as expect,
  vitestIt as it,
  vitestTest as test,
  vi,
};
