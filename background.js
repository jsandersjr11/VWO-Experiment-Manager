// VWO Configuration
const VWO_ACCOUNT_ID = '894940';
const VWO_API_KEY = 'd0914962ef2b552363166068cb4d1c10557f5fbb9ba87ef6597d80dc8c949898';
const VWO_SETTINGS_BASE_URL = 'https://dev.visualwebsiteoptimizer.com/dcdn/settings.js';
const VWO_REPORT_URL = 'https://app.vwo.com/#/test/ab/';
const VWO_COOKIE_PREFIX = '_vis_opt_';
const VWO_EXP_PREFIX = '_vis_opt_exp_';
const VWO_TEST_DATA_PREFIX = '_vis_opt_test_';
const COOKIE_EXPIRY = 365 * 24 * 60 * 60; // 1 year in seconds

// Cache for VWO settings
let vwoSettingsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch VWO settings
async function fetchVWOSettings() {
  try {
    // Return cached settings if they're still valid
    const now = Date.now();
    if (vwoSettingsCache && (now - lastFetchTime) < CACHE_DURATION) {
      return vwoSettingsCache;
    }
    
    // Build settings URL with current timestamp
    const params = new URLSearchParams({
      a: VWO_ACCOUNT_ID,
      settings_type: 4,
      ts: Math.floor(now / 1000),
      dt: 'desktop',
      cc: 'US'
    });
    const settingsUrl = `${VWO_SETTINGS_BASE_URL}?${params.toString()}`;
    
    const response = await fetch(settingsUrl, {
      headers: {
        'Authorization': `Bearer ${VWO_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch VWO settings: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    // The response is JSONP, extract the settings object
    const match = text.match(/allSettings\(\)\s*{\s*return\s*({[\s\S]*?});?\s*}\)/);
    if (!match) {
      console.error('Raw VWO response:', text);
      throw new Error('Could not extract settings from VWO response');
    }
    
    const jsonStr = match[1];
    try {
      vwoSettingsCache = JSON.parse(jsonStr);
      lastFetchTime = now;
      return vwoSettingsCache;
    } catch (parseError) {
      console.error('Failed to parse VWO settings JSON:', jsonStr);
      throw parseError;
    }
  } catch (error) {
    console.error('Error fetching VWO settings:', error);
    return null;
  }
}

// Get experiment details from VWO settings
async function getExperimentDetails(testId) {
  try {
    const settings = await fetchVWOSettings();
    if (!settings?.campaigns) {
      throw new Error('No campaigns found in VWO settings');
    }
    
    const campaign = settings.campaigns[testId];
    if (!campaign) {
      return null; // Return null if campaign not found
    }
    
    return {
      name: campaign.name,
      status: campaign.status,
      type: campaign.type,
      reportUrl: `${VWO_REPORT_URL}${testId}/report`,
      variations: Object.entries(campaign.variations || {}).map(([id, variation]) => ({
        id: parseInt(id, 10),
        name: variation.name || (id === '1' ? 'Control' : `Variation ${id}`)
      }))
    };
  } catch (error) {
    console.error('Error getting experiment details:', error);
    return null;
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
    
    // Get VWO settings first
    const settings = await fetchVWOSettings();
    if (!settings?.campaigns) {
      throw new Error('No campaigns found in VWO settings');
    }
    
    // Get all cookies
    const allCookies = await chrome.cookies.getAll({});
    console.log('All cookies for domain:', domain, allCookies);
    
    // Filter for domain cookies (including subdomains)
    const domainCookies = allCookies.filter(c => {
      const cookieDomain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
      return domain === cookieDomain || domain.endsWith('.' + cookieDomain);
    });
    console.log('Domain cookies:', domainCookies);
    
    // Filter for VWO experiment cookies for this domain
    const experimentCookies = domainCookies.filter(c => {
      const isVWOExperiment = c.name.startsWith(VWO_EXP_PREFIX);
      const isDebugExperiment = c.name.startsWith('debug_vis_opt_exp_');
      
      if (!isVWOExperiment && !isDebugExperiment) return false;
      if (c.name.includes('test_data')) return false;
      
      // Extract test ID and verify it's numeric
      const parts = c.name.split('_');
      const testId = isVWOExperiment ? parts[4] : parts[5]; // Handle both regular and debug cookies
      
      // Log cookie details for debugging
      console.debug('Processing cookie:', {
        name: c.name,
        value: c.value,
        testId,
        hasSettings: settings.campaigns?.[testId] ? true : false
      });
      
      // Verify test ID is numeric and campaign exists in settings
      // Note: Removed strict cookie value check as VWO can use other variation IDs
      return !isNaN(testId) && settings.campaigns?.[testId];
    });
    console.log('VWO experiment cookies:', experimentCookies);
    
    // Map cookies to experiment details from settings
    const experimentsWithDetails = experimentCookies.map(c => {
      const testId = c.name.split('_').pop().split('_')[0]; // Handle both debug and regular cookies
      const campaign = settings.campaigns[testId];
      
      return {
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        testId,
        experimentName: campaign.name,
        status: campaign.status,
        type: campaign.type,
        reportUrl: `${VWO_REPORT_URL}${testId}/report`,
        variations: Object.entries(campaign.variations || {}).map(([id, variation]) => ({
          id: parseInt(id, 10),
          name: variation.name || (id === '1' ? 'Control' : `Variation ${id}`)
        }))
      };
    });
    
    console.log('VWO experiment cookies with details:', experimentsWithDetails);
    return { experiments: experimentsWithDetails };
  } catch (error) {
    console.error('Error getting VWO cookies:', error);
    return { experiments: [] };
  }
}

// Set VWO experiment variation
async function setExperimentVariation(url, testId, variationId) {
  try {
    // Get VWO settings first
    const settings = await fetchVWOSettings();
    if (!settings?.campaigns) {
      throw new Error('No campaigns found in VWO settings');
    }
    
    const campaign = settings.campaigns[testId];
    if (!campaign) {
      throw new Error(`Campaign ${testId} not found in VWO settings`);
    }
    
    const expDate = Math.floor(Date.now() / 1000) + COOKIE_EXPIRY;
    
    // Set experiment cookie
    await chrome.cookies.set({
      url,
      name: `${VWO_EXP_PREFIX}${testId}`,
      value: variationId.toString(),
      expirationDate: expDate
    });
    
    // Set test data cookie with experiment details
    const variation = Object.entries(campaign.variations || {}).find(([id]) => parseInt(id, 10) === variationId)?.[1];
    await chrome.cookies.set({
      url,
      name: `${VWO_TEST_DATA_PREFIX}${testId}`,
      value: JSON.stringify({
        testId,
        variationId,
        variationName: variation?.name || (variationId === 1 ? 'Control' : `Variation ${variationId}`),
        experimentName: campaign.name,
        status: campaign.status,
        type: campaign.type,
        timestamp: Date.now()
      }),
      expirationDate: expDate
    });
  } catch (error) {
    console.error('Error setting experiment variation:', error);
    throw error;
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

  //background.js
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs && tabs.length > 0) {
    chrome.tabs.sendMessage(tabs[0].id, { message: 'check_for_vwo' }, (response) => {
      if(response){
        if(response.message === 'vwo_found'){
          //vwo is found!
          console.log('vwo found', response.data)
        } else {
          console.log('vwo not found')
        }
      }
    });
  }
});
