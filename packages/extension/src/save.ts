import browser from 'webextension-polyfill';

export type SaveResult =
  | { ok: true; canonicalUrl: string; deduplicated: boolean }
  | { ok: false; error: string };

export interface Settings {
  baseURL: string;
  token: string;
}

export async function getSettings(): Promise<Settings | null> {
  const stored = (await browser.storage.local.get(['tideBaseURL', 'tideToken'])) as Record<
    string,
    unknown
  >;
  const baseURL = typeof stored.tideBaseURL === 'string' ? stored.tideBaseURL : '';
  const token = typeof stored.tideToken === 'string' ? stored.tideToken : '';
  if (!baseURL || !token) return null;
  return { baseURL: baseURL.replace(/\/$/, ''), token };
}

export async function saveCurrentTab(input: {
  url: string;
  title?: string | undefined;
}): Promise<SaveResult> {
  const settings = await getSettings();
  if (!settings) {
    return { ok: false, error: 'configure your tide URL + token in the extension options' };
  }
  try {
    const res = await fetch(`${settings.baseURL}/api/v1/articles`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${settings.token}`,
      },
      body: JSON.stringify({ url: input.url, title: input.title }),
    });
    if (!res.ok) {
      return { ok: false, error: `${res.status}: ${await res.text()}` };
    }
    const json = (await res.json()) as { canonicalUrl: string; deduplicated: boolean };
    return { ok: true, canonicalUrl: json.canonicalUrl, deduplicated: json.deduplicated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}
