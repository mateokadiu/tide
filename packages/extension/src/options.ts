import browser from 'webextension-polyfill';

async function init() {
  const baseURLInput = document.getElementById('baseURL') as HTMLInputElement;
  const tokenInput = document.getElementById('token') as HTMLInputElement;
  const form = document.getElementById('form') as HTMLFormElement;
  const status = document.getElementById('status')!;

  const stored = await browser.storage.local.get(['tideBaseURL', 'tideToken']);
  if (typeof stored.tideBaseURL === 'string') baseURLInput.value = stored.tideBaseURL;
  if (typeof stored.tideToken === 'string') tokenInput.value = stored.tideToken;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await browser.storage.local.set({
      tideBaseURL: baseURLInput.value.trim(),
      tideToken: tokenInput.value.trim(),
    });
    status.textContent = 'saved.';
    setTimeout(() => (status.textContent = ''), 1500);
  });
}

void init();
