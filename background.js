const pending = new Set();
function youtubeUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && ['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname); }
  catch { return false; }
}
// Runs in the isolated world of the requesting document. No coordinates from messages.
function locateSkip() {
  const selector = 'button.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button, .ytp-skip-ad button';
  for (const b of document.querySelectorAll(selector)) {
    if (b.matches(':disabled') || b.getAttribute('aria-disabled') === 'true' || b.closest('[inert]')) continue;
    if (b.checkVisibility && !b.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) continue;
    const r = b.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x,y);
    if (hit && (hit === b || b.contains(hit))) return {x,y};
  }
  return null;
}
async function trustedSkip(sender) {
  const tabId = sender.tab.id, target = {tabId};
  const locate = async () => {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active || !youtubeUrl(tab.url)) throw new Error('Trusted clicks require the active YouTube tab.');
    const results = await chrome.scripting.executeScript({target:{tabId, documentIds:[sender.documentId]}, func:locateSkip});
    return results[0]?.result;
  };
  if (!await locate()) return {outcome:'Skip is hidden, covered, or unavailable', trusted:0};
  let attached = false;
  try {
    await chrome.debugger.attach(target,'1.3');
    attached = true;
    // Attaching can resize the viewport. Measure and hit-test again afterward.
    const point = await locate();
    if (!point) return {outcome:'Skip moved or became unavailable', trusted:0};
    await chrome.debugger.sendCommand(target,'Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await chrome.debugger.sendCommand(target,'Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
    await chrome.debugger.sendCommand(target,'Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1});
    await new Promise(resolve=>setTimeout(resolve,250));
    const remaining = await locate();
    return {trusted:1, outcome:remaining ? 'Trusted click sent; Skip still present' : 'Trusted click sent; Skip no longer available'};
  } finally {
    if (attached) await chrome.debugger.detach(target).catch(()=>{});
  }
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if (message.type !== 'auto-skip-click') return;
  if (!sender.tab || sender.frameId !== 0 || !sender.documentId || !youtubeUrl(sender.url)) {
    respond({error:'Trusted clicking is restricted to the main YouTube frame.'}); return;
  }
  if (pending.has(sender.tab.id)) {respond({outcome:'Click already in progress',trusted:0});return;}
  pending.add(sender.tab.id);
  trustedSkip(sender).then(respond).catch(error=>respond({error:error.message}))
    .finally(()=>pending.delete(sender.tab.id));
  return true;
});
