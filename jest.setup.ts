import '@testing-library/jest-dom';

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = mockLocalStorage as unknown as Storage;

global.window = global.window || {};
global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();
global.window.dispatchEvent = jest.fn();

global.fetch = jest.fn();