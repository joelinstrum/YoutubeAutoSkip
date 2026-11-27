const output = document.getElementById('status');
const errorOutput = document.getElementById('error');
const reconnect = document.getElementById('reconnect');
let busy = false;
async function update(repair = false) {
  if (busy) return;
  busy = true;
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab?.id) throw new Error('No active browser tab found.');
    let s;
    try {
      s = await chrome.tabs.sendMessage(tab.id, {type: 'auto-skip-status'}, {frameId: 0});
      if (!s) throw new Error('Page script returned no status.');
    } catch (connectionError) {
      if (!repair) throw connectionError;
      const url = new URL(tab.url || 'about:blank');
      if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
        throw new Error('Open this popup on an HTTPS YouTube page.');
      }
      await chrome.scripting.executeScript({target: {tabId: tab.id, frameIds: [0]}, files: ['content.js']});
      s = await chrome.tabs.sendMessage(tab.id, {type: 'auto-skip-status'}, {frameId: 0});
      if (!s) throw new Error('Injected page script returned no status.');
    }
    output.textContent = `Running: version ${s.version}\nSkip controls found: ${s.detected}\nAvailable now: ${s.ready}\nClick requests: ${s.attempts}\nTrusted clicks sent: ${s.trusted || 0}\nLast attempt: ${s.lastAttempt || 'None'}\nResult: ${s.outcome || 'Waiting'}`;
    errorOutput.textContent = s.error ? `Click error: ${s.error}` : '';
    reconnect.hidden = true;
  } catch (error) {
    output.textContent = 'Page script not connected. Try Reconnect. If it fails, check this extension’s site access and refresh YouTube.';
    errorOutput.textContent = `Browser error: ${error.message || String(error)}`;
    reconnect.hidden = false;
  } finally {
    busy = false;
  }
}
reconnect.addEventListener('click', () => update(true));
// Invoking the browser action grants activeTab access for this repair attempt.
update(true);
setInterval(() => update(false), 1000);
