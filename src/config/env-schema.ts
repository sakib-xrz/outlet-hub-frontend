import { z } from 'zod';

const API_PATH = '/api/v1';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type ClientEnv = { apiBaseUrl: string };

function apiBaseUrlSchema(production: boolean) {
  return z
    .string({ error: 'is required' })
    .trim()
    .min(1, 'is required')
    .transform((value, context) => {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        context.addIssue({ code: 'custom', message: 'must be an absolute URL' });
        return z.NEVER;
      }

      const path = url.pathname.replace(/\/+$/, '');
      const problems = [
        !['http:', 'https:'].includes(url.protocol) && 'must use http or https',
        (url.username || url.password) && 'must not contain credentials',
        (url.search || url.hash) && 'must not contain a query string or fragment',
        !path.endsWith(API_PATH) && `must end with ${API_PATH}`,
        path.split(API_PATH).length > 2 && `must contain ${API_PATH} only once`,
        production &&
          url.protocol !== 'https:' &&
          !LOCAL_HOSTS.has(url.hostname) &&
          'must use https in production',
      ].filter((problem): problem is string => typeof problem === 'string' && problem !== '');

      for (const message of problems) context.addIssue({ code: 'custom', message });
      return problems.length ? z.NEVER : `${url.origin}${path}`;
    });
}

export function parseClientEnv(
  source: Record<string, unknown>,
  options: { production: boolean },
): ClientEnv {
  const result = z
    .object({ VITE_API_BASE_URL: apiBaseUrlSchema(options.production) })
    .safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')} ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid frontend environment configuration: ${details}`);
  }
  return { apiBaseUrl: result.data.VITE_API_BASE_URL };
}
