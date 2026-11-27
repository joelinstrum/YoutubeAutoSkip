(() => {
  'use strict';
  if (globalThis.__youtubeAutoSkipStarted) return;
  globalThis.__youtubeAutoSkipStarted = true;
  const selector = 'button.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button, .ytp-skip-ad button';
  const clicks = new WeakMap();
  const status = {version: '1.4.0', detected: 0, ready: 0, attempts: 0, trusted: 0, lastAttempt: null, outcome: 'Waiting for Skip', error: null};
  function ready(button) {
    if (!button.isConnected || button.matches(':disabled') ||
        button.getAttribute('aria-disabled') === 'true' || button.closest('[inert]')) return false;
    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (button.checkVisibility && !button.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) return false;
    const style = getComputedStyle(button);
    return style.visibility !== 'hidden' && style.visibility !== 'collapse' && style.display !== 'none';
  }
  let inFlight = false;
  let retryAfter = 0;
  function scan() {
    const buttons = [...document.querySelectorAll(selector)];
    status.detected = buttons.length;
    status.ready = 0;
    for (const button of buttons) {
      if (!ready(button)) continue;
      status.ready++;
      if (inFlight || performance.now() < retryAfter) continue;
      const now = performance.now();
      if (now - (clicks.get(button) ?? -Infinity) < 700) continue;
      clicks.set(button, now);
      status.attempts++;
      status.lastAttempt = new Date().toLocaleTimeString();
      status.outcome = 'Sending trusted browser click';
      inFlight = true;
      chrome.runtime.sendMessage({type: 'auto-skip-click'}).then(result => {
        status.error = result?.error || null;
        status.trusted += result?.trusted || 0;
        if (status.error) retryAfter = performance.now() + 10000;
        status.outcome = result?.outcome || 'No click result';
      }).catch(error => { status.error = error.message; retryAfter = performance.now() + 10000; }).finally(() => { inFlight = false; });
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type === 'auto-skip-status') respond({...status});
  });
  new MutationObserver(scan).observe(document, {subtree: true, childList: true,
    attributes: true, attributeFilter: ['class', 'style', 'hidden', 'disabled', 'aria-disabled', 'inert']});
  scan();
  setInterval(scan, 100);
})();
