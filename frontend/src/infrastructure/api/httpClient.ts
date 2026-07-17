import { getApiBaseUrl } from '../../config/env';

export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

export async function httpGet(path: string): Promise<unknown> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = await parseJsonSafe(response);
  if (!response.ok) {
    throw new HttpError(response.status, body, `GET ${path} failed (${response.status})`);
  }
  return body;
}

export async function httpPost(path: string, payload: unknown): Promise<unknown> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafe(response);
  if (!response.ok) {
    throw new HttpError(response.status, body, `POST ${path} failed (${response.status})`);
  }
  return body;
}
