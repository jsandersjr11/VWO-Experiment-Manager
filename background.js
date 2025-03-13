// VWO API and Cookie Configuration
const VWO_API_KEY = 'd0914962ef2b552363166068cb4d1c10557f5fbb9ba87ef6597d80dc8c949898';
const VWO_API_BASE = 'https://app.vwo.com/api/v2';
const VWO_REPORT_URL = 'https://app.vwo.com/#/test/ab/';
const VWO_COOKIE_PREFIX = '_vis_opt_';
const VWO_EXP_PREFIX = '_vis_opt_exp_';
const VWO_TEST_DATA_PREFIX = '_vis_opt_test_';
const COOKIE_EXPIRY = 365 * 24 * 60 * 60; // 1 year in seconds

// Fetch experiment details from VWO API
async function fetchExperimentDetails(testId) {
  try {
    // For now, return a default response since API authentication needs to be configured
    return {
      name: `Test ${testId}`,
      status: 'running',
      type: 'ab',
      reportUrl: `${VWO_REPORT_URL}${testId}/report`,
      variations: [
        { id: 1, name: 'Control' },
        { id: 2, name: 'Variation' }
      ]
    };
  } catch (error) {
    console.error('Error fetching experiment details:', error);
    return {
      name: `Test ${testId}`,
      status: 'unknown',
      type: 'ab',
      reportUrl: `${VWO_REPORT_URL}${testId}/report`,
      variations: [
        { id: 1, name: 'Control' },
        { id: 2, name: 'Variation' }
      ]
    };
  }
}

// Update badge with experiment count
async function updateBadge(tab) {
  try {
    if (!tab?.url) return;
    
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // Get all cookies
    const allCookies = await chrome.cookies.getAll({});
    
    // Filter for domain cookies
    const domainCookies = allCookies.filter(c => {
      const cookieDomain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
      return domain === cookieDomain || domain.endsWith('.' + cookieDomain);
    });
    
    // Count VWO experiment cookies
    const count = domainCookies.filter(c => 
      (c.name.startsWith(VWO_EXP_PREFIX) || c.name.startsWith('debug_vis_opt_exp_')) &&
      !c.name.includes('test_data')
    ).length;
    
    chrome.action.setBadgeText({ 
      text: count ? `${count}` : '' 
    });
    
    chrome.action.setBadgeBackgroundColor({ 
      color: count ? '#4CAF50' : '#666666' 
    });
  } catch (error) {
    console.error('Error updating badge:', error);
    chrome.action.setBadgeText({ text: '' });
  }
}

// Get all VWO cookies for a domain
async function getVWOCookies(url) {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    // Get all cookies first
    const allCookies = await chrome.cookies.getAll({});
    console.log('All cookies for domain:', domain, allCookies);
    
    // Filter for domain cookies (including subdomains)
    const domainCookies = allCookies.filter(c => {
      // Remove leading dot from cookie domain if present
      const cookieDomain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
      // Check if cookie domain matches or is a subdomain of the current domain
      return domain === cookieDomain || domain.endsWith('.' + cookieDomain);
    });
    console.log('Domain cookies:', domainCookies);
    
    // Filter for VWO experiment cookies for this domain
    const experimentCookies = domainCookies.filter(c => {
      // Only include cookies that start with _vis_opt_exp_ and have a numeric test ID
      const isVWOExperiment = c.name.startsWith(VWO_EXP_PREFIX);
      const isDebugExperiment = c.name.startsWith('debug_vis_opt_exp_');
      
      if (!isVWOExperiment && !isDebugExperiment) return false;
      if (c.name.includes('test_data')) return false;
      
      // Extract test ID and verify it's numeric
      const parts = c.name.split('_');
      const testId = isVWOExperiment ? parts[4] : parts[5]; // Handle both regular and debug cookies
      
      // Verify test ID is numeric and the cookie value is either 1 or 2
      return !isNaN(testId) && (c.value === '1' || c.value === '2');
    });
    console.log('VWO experiment cookies:', experimentCookies);
    
    // Get experiment details for each test
    const experimentsWithDetails = await Promise.all(
      experimentCookies.map(async (c) => {
        const testId = c.name.split('_').pop().split('_')[0]; // Handle both debug and regular cookies
        const details = await fetchExperimentDetails(testId);
        return {
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          testId,
          experimentName: details.name,
          reportUrl: details.reportUrl,
          variations: details.variations
        };
      })
    );
    
    console.log('VWO experiment cookies with details:', experimentsWithDetails);
    return { experiments: experimentsWithDetails };
  } catch (error) {
    console.error('Error getting VWO cookies:', error);
    return { experiments: [] };
  }
}

// Set VWO experiment variation
async function setExperimentVariation(url, testId, variationId) {
  const expDate = Math.floor(Date.now() / 1000) + COOKIE_EXPIRY;
  const experimentDetails = await fetchExperimentDetails(testId);
  
  // Set experiment cookie
  await chrome.cookies.set({
    url,
    name: `${VWO_EXP_PREFIX}${testId}`,
    value: variationId.toString(),
    expirationDate: expDate
  });

  // Set test data cookie with experiment details
  if (experimentDetails) {
    const variation = experimentDetails.variations.find(v => v.id === variationId);
    await chrome.cookies.set({
      url,
      name: `${VWO_TEST_DATA_PREFIX}${testId}`,
      value: JSON.stringify({
        testId,
        variationId,
        variationName: variation?.name,
        experimentName: experimentDetails.name,
        timestamp: Date.now()
      }),
      expirationDate: expDate
    });
  }
}

// Message handlers
const messageHandlers = {
  async toggleTracking(request) {
    const { url } = request;
    const cookies = await getVWOCookies(url);
    const isDisabled = cookies.some(c => c.name === '_vwo_disable' && c.value === '1');
    
    await chrome.cookies.set({
      url,
      name: '_vwo_disable',
      value: isDisabled ? '0' : '1',
      expirationDate: Math.floor(Date.now() / 1000) + COOKIE_EXPIRY
    });
    
    return { success: true, disabled: !isDisabled };
  },

  async getExperiments(request) {
    return await getVWOCookies(request.url);
  },

  async setVariation(request) {
    const { url, testId, variationId } = request;
    await setExperimentVariation(url, testId, variationId);
    return { success: true };
  },

  async removeExperiment(request) {
    const { url, testId } = request;
    await chrome.cookies.remove({
      url,
      name: `${VWO_EXP_PREFIX}${testId}`
    });
    await chrome.cookies.remove({
      url,
      name: `${VWO_TEST_DATA_PREFIX}${testId}`
    });
    return { success: true };
  }
};

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handler = messageHandlers[request.action];
  
  if (!handler) {
    console.warn(`No handler for action: ${request.action}`);
    return false;
  }
  
  handler(request)
    .then(response => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError });
      } else {
        sendResponse(response);
      }
    })
    .catch(error => {
      console.error('Handler error:', error);
      sendResponse({ error: error.message });
    });
  
  return true;
});

// Update badge when a tab is activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateBadge(tab);
});

// Update badge when a tab is updated
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateBadge(tab);
  }
});

// Watch for cookie changes
chrome.cookies.onChanged.addListener(async ({ cookie, removed }) => {
  if (cookie.name.startsWith(VWO_COOKIE_PREFIX)) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      updateBadge(tabs[0]);
    }
  }
});

// Initial badge update
chrome.tabs.query({ active: true, currentWindow: true })
  .then(tabs => {
    if (tabs[0]) updateBadge(tabs[0]);
  });