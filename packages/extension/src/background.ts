import browser from 'webextension-polyfill';
import { saveCurrentTab, type SaveResult } from './save';

const MENU_ID = 'tide-save-link';

browser.runtime.onInstalled.addListener(() => {
  void browser.contextMenus.create({
    id: MENU_ID,
    title: 'save link to tide',
    contexts: ['link', 'selection', 'page'],
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = info.linkUrl ?? tab?.url;
  if (!url) return;
  const result = await saveCurrentTab({ url });
  notify(result);
});

browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-current-tab') return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  const result = await saveCurrentTab({ url: tab.url, title: tab.title ?? undefined });
  notify(result);
});

browser.action.onClicked.addListener(async (tab) => {
  if (!tab.url) return;
  const result = await saveCurrentTab({ url: tab.url, title: tab.title ?? undefined });
  notify(result);
});

function notify(result: SaveResult) {
  const title = result.ok ? (result.deduplicated ? 'already saved' : 'saved to tide') : 'tide — save failed';
  const message = result.ok ? result.canonicalUrl : result.error;
  void browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('icons/icon-128.png'),
    title,
    message,
  });
}
