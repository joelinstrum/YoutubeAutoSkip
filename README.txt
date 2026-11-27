YouTube Auto Skip 1.4

Reload the extension in chrome://extensions, accept the new debugger permission
if Chrome requests it, and refresh YouTube. Version 1.4 sends browser-level
mouse input instead of JavaScript .click() events. The popup displays trusted
clicks separately from requests and reports attachment or input errors.

Chrome's debugger permission is broad and may trigger a debugging notice.
This extension uses it only to send mouse input to an available Skip control
in the ACTIVE main-frame HTTPS YouTube tab, then detaches in a finally block.
It does not collect network traffic or send data anywhere. Host permissions
are restricted to youtube.com, www.youtube.com, and m.youtube.com.
No analytics, remote code, stored browsing data, or network requests.

The control is measured and hit-tested after attachment, so a covered button
will not be clicked. Background tabs are not clicked. Keep YouTube active.
An attachment failure may require closing DevTools or another debugger.
Errors are shown in the popup and retries are delayed by ten seconds.

Refresh YouTube after updates to remove the previous version's page script.
The popup's Reconnect function can inject a missing script on YouTube.
Cannot bypass countdowns or skip unskippable advertisements.

Validation: real Chrome extension test verified a fixture that ignores
synthetic clicks accepted browser-level input with event.isTrusted === true.
Disabled controls and covering overlays were not clicked. Extension debugger
detachment was verified. This is stronger than prior fixture checks, but
acceptance on live YouTube advertisements has not yet been verified.
