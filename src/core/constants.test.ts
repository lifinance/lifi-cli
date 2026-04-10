import { describe, it, expect } from 'vitest';
import {
  API_BASE_URL,
  INTEGRATOR_ID,
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  AUTH_HEADER,
  ENV_API_KEY,
  ExitCode,
} from './constants.js';

describe('constants', () => {
  it('API_BASE_URL points to li.quest v1', () => {
    expect(API_BASE_URL).toBe('https://li.quest/v1');
  });

  it('INTEGRATOR_ID is lifi-cli', () => {
    expect(INTEGRATOR_ID).toBe('lifi-cli');
  });

  it('CONFIG_DIR_NAME is lifi', () => {
    expect(CONFIG_DIR_NAME).toBe('lifi');
  });

  it('CONFIG_FILE_NAME is config.json', () => {
    expect(CONFIG_FILE_NAME).toBe('config.json');
  });

  it('AUTH_HEADER is X-LiFi-Api-Key', () => {
    expect(AUTH_HEADER).toBe('X-LiFi-Api-Key');
  });

  it('ENV_API_KEY is LIFI_API_KEY', () => {
    expect(ENV_API_KEY).toBe('LIFI_API_KEY');
  });

  describe('ExitCode', () => {
    it('Success is 0', () => {
      expect(ExitCode.Success).toBe(0);
    });

    it('General is 1', () => {
      expect(ExitCode.General).toBe(1);
    });

    it('InvalidArgs is 2', () => {
      expect(ExitCode.InvalidArgs).toBe(2);
    });

    it('AuthError is 3', () => {
      expect(ExitCode.AuthError).toBe(3);
    });

    it('ApiError is 4', () => {
      expect(ExitCode.ApiError).toBe(4);
    });

    it('NetworkError is 5', () => {
      expect(ExitCode.NetworkError).toBe(5);
    });
  });
});
