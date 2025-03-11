// Track experiment count in badge
async function updateBadge() {
    const cookies = await chrome.cookies.getAll({});
    const count = cookies.filter(c => c.name.startsWith('_vis_opt_exp_')).length;
    chrome.action.setBadgeText({ text: count ? `${count}` : '' });
  }
  
  // Block VWO tracking endpoints using declarativeNetRequest
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],  // Remove existing rule if any
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: 'block'
      },
      condition: {
        urlFilter: '*://dev.visualwebsiteoptimizer.com/*',
        resourceTypes: ['xmlhttprequest', 'script', 'image', 'other']
      }
    }]
  });
  
  // Toggle tracking
  let trackingDisabled = false;
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleTracking') {
      trackingDisabled = !trackingDisabled;
      chrome.cookies.set({
        url: sender.url,
        name: '_vwo_disable',
        value: trackingDisabled ? '1' : '0',
        expirationDate: Date.now() + 31536000
      });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getExperiments') {
      chrome.cookies.getAll({ url: sender.url }, (cookies) => {
        const experiments = cookies.filter((c) => c.name.startsWith('_vis_opt_exp_'));
        const uniqueExperiments = Array.from(
          new Map(experiments.map((exp) => [exp.name.split('_')[4], exp])).values()
        );
        sendResponse({ experiments: uniqueExperiments });
      });
      return true; // Keep port open for async response
    }
  });
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkVWOCookies") {
      chrome.cookies.getAll({ url: request.url }, cookies => {
        const experiments = cookies
          .filter(cookie => cookie.name.startsWith('_vis_opt_exp_'))
          .map(cookie => ({
            name: cookie.name,
            value: cookie.value
          }));
        sendResponse({ experiments });
      });
      return true; // Required for async response
    }
  });
  
  // Initial setup
  chrome.cookies.onChanged.addListener(updateBadge);
  updateBadge();
  