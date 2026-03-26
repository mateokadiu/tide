import browser from 'webextension-polyfill';
import { saveCurrentTab } from './save';

async function init() {
  const status = document.getElementById('status');
  if (!status) return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    status.textContent = 'no active tab.';
    return;
  }
  status.textContent = 'saving…';
  const title = tab.title ?? undefined;
  const result = await saveCurrentTab(title ? { url: tab.url, title } : { url: tab.url });
  if (result.ok) {
    status.textContent = result.deduplicated ? 'already saved.' : 'saved.';
    status.dataset.state = 'ok';
  } else {
    status.textContent = result.error;
    status.dataset.state = 'err';
  }
}

void init();
