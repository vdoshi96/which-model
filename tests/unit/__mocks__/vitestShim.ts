const vitestAfterEach = afterEach;
const vitestBeforeEach = beforeEach;
const vitestDescribe = describe;
const vitestExpect = expect;
const vitestIt = it;
const vitestTest = test;

const vi = {
  clearAllMocks: jest.clearAllMocks,
  fn: jest.fn,
  mock: jest.mock,
  resetAllMocks: jest.resetAllMocks,
  resetModules: jest.resetModules,
  restoreAllMocks: jest.restoreAllMocks,
  spyOn: jest.spyOn,
};

export {
  vitestAfterEach as afterEach,
  vitestBeforeEach as beforeEach,
  vitestDescribe as describe,
  vitestExpect as expect,
  vitestIt as it,
  vitestTest as test,
  vi,
};
