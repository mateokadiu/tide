import browser from 'webextension-polyfill';
import { saveCurrentTab } from './save';

async function init() {
  const status = document.getElementById('status')!;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    status.textContent = 'no active tab.';
    return;
  }
  status.textContent = 'saving…';
  const result = await saveCurrentTab({ url: tab.url, title: tab.title ?? undefined });
  if (result.ok) {
    status.textContent = result.deduplicated ? 'already saved.' : 'saved.';
    status.dataset.state = 'ok';
  } else {
    status.textContent = result.error;
    status.dataset.state = 'err';
  }
}

void init();
