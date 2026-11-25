import { describe, expect, it } from 'vitest';
import { parseClientEnv } from '@/config/env-schema';

const parse = (value: unknown, production = false) =>
  parseClientEnv({ VITE_API_BASE_URL: value }, { production });

describe('parseClientEnv', () => {
  it('normalizes trailing slashes', () => {
    expect(parse('http://localhost:3000/api/v1///').apiBaseUrl).toBe(
      'http://localhost:3000/api/v1',
    );
  });

  it('fails clearly when the variable is missing', () => {
    expect(() => parseClientEnv({}, { production: false })).toThrow(
      'Invalid frontend environment configuration: VITE_API_BASE_URL',
    );
  });

  it('rejects base URLs without or with duplicated API path segments', () => {
    expect(() => parse('http://localhost:3000')).toThrow('must end with /api/v1');
    expect(() => parse('http://localhost:3000/api/v1/api/v1')).toThrow('only once');
  });

  it('rejects credentials, query strings, and non-http protocols', () => {
    expect(() => parse('http://user:pass@localhost:3000/api/v1')).toThrow('credentials');
    expect(() => parse('http://localhost:3000/api/v1?x=1')).toThrow('query string');
    expect(() => parse('ftp://localhost/api/v1')).toThrow('http or https');
  });

  it('requires https for remote hosts in production builds', () => {
    expect(() => parse('http://api.example.com/api/v1', true)).toThrow('https in production');
    expect(parse('https://api.example.com/api/v1', true).apiBaseUrl).toBe(
      'https://api.example.com/api/v1',
    );
    expect(parse('http://localhost:3000/api/v1', true).apiBaseUrl).toBe(
      'http://localhost:3000/api/v1',
    );
  });
});
