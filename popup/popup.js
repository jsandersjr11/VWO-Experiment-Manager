// Get experiment details from background script
async function getExperimentDetails(url) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getExperiments',
      url
    });
    return response;
  } catch (error) {
    console.error('Error getting experiment details:', error);
    return null;
  }
}

// Create variation options HTML
function getVariationOptions(variations, currentValue) {
  return variations.map(v => `
    <option value="${v.id}" ${parseInt(currentValue) === v.id ? 'selected' : ''}>
      ${v.name || `Variation ${v.id}`}
    </option>
  `).join('');
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('experiments');
  const disableTrackingBtn = document.getElementById('disableTracking');

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Active tab:', tab);
    
    if (!tab) {
      throw new Error('No active tab found');
    }

    if (!tab.url) {
      throw new Error('Cannot access page URL');
    }

    // Parse the URL to get domain
    const url = new URL(tab.url);
    const domain = url.hostname;
    console.log('Current domain:', domain);
    
    // Load experiments - search in all domain cookies
    const allCookies = await chrome.cookies.getAll({});
    console.log('All cookies:', allCookies);
    
    // Find all VWO cookies first
    const allVwoCookies = allCookies.filter(c => c.name.startsWith('_vis_opt_'));
    console.log('All VWO cookies found:', allVwoCookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path
    })));
    
    // Filter for domain cookies (including subdomains)
    const domainCookies = allCookies.filter(c => 
      c.domain === domain || 
      c.domain === '.' + domain || 
      domain.endsWith(c.domain.startsWith('.') ? c.domain : '.' + c.domain)
    );
    console.log('Domain cookies:', domainCookies.map(c => ({
      name: c.name,
      domain: c.domain,
      path: c.path
    })));
    
    // Find VWO cookies for this domain (including debug cookies)
    const vwoCookies = domainCookies.filter(c => 
      c.name.startsWith('_vis_opt_exp_') || 
      c.name.startsWith('debug_vis_opt_exp_')
    );
    console.log('VWO experiment cookies:', vwoCookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      testId: c.name.split('_').pop()
    })));
    
    if (vwoCookies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          No active VWO experiments found on ${domain}<br>
          <small style="color: #999; margin-top: 8px; display: block;">
            Make sure VWO is properly integrated on this page
          </small>
        </div>`;
    } else {
      // Get experiment details from background script
      const response = await getExperimentDetails(tab.url);
      
      if (!response?.experiments || response.experiments.length === 0) {
        throw new Error('No experiments found');
      }
      
      // Process each experiment
      for (const experiment of response.experiments) {
        try {
          const div = document.createElement('div');
          div.className = 'experiment';
          
          div.innerHTML = `
            <h4>${experiment.experimentName}</h4>
            <div style="display: flex; gap: 10px; align-items: center;">
              <select data-test-id="${experiment.testId}" class="variation-select">
                ${experiment.variations.map(v => `
                  <option value="${v.id}" ${experiment.value === v.id.toString() ? 'selected' : ''}>
                    ${v.name}
                  </option>
                `).join('')}
              </select>
              <a href="${experiment.reportUrl}" 
                 target="_blank"
                 class="view-report">
                 View Report ↗️
              </a>
            </div>
          `;
          
          container.appendChild(div);
        } catch (experimentError) {
          console.error('Error processing experiment:', experimentError);
          // Continue with next experiment if one fails
          continue;
        }
      }

      // Variation switcher
      document.querySelectorAll('.variation-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          try {
            const testId = e.target.dataset.testId;
            const response = await chrome.runtime.sendMessage({
              action: 'setVariation',
              url: tab.url,
              testId,
              variationId: parseInt(e.target.value, 10)
            });
            
            if (response?.success) {
              chrome.tabs.reload(tab.id);
            } else {
              throw new Error('Failed to set variation');
            }
          } catch (error) {
            console.error('Error setting variation:', error);
            alert('Failed to set variation. Please try again.');
          }
        });
      });
    }

    // Tracking toggle
    const trackingCookie = domainCookies.find(c => c.name === '_vwo_disable');
    const isDisabled = trackingCookie?.value === '1';
    
    disableTrackingBtn.textContent = `${isDisabled ? 'Enable' : 'Disable'} VWO Tracking`;
    disableTrackingBtn.style.background = isDisabled ? '#4CAF50' : '#f44336';
    
    disableTrackingBtn.addEventListener('click', async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'toggleTracking',
          url: tab.url
        });
        
        if (response?.success) {
          chrome.tabs.reload(tab.id);
        } else {
          throw new Error('Failed to toggle tracking');
        }
      } catch (error) {
        console.error('Error toggling tracking:', error);
        alert('Failed to toggle tracking. Please try again.');
      }
    });

  } catch (error) {
    console.error('Error initializing popup:', error);
    container.innerHTML = `
      <div class="empty-state" style="color: #dc3545;">
        Error: ${error.message}<br>
        <small style="color: #999; margin-top: 8px; display: block;">
          Please try again or contact support
        </small>
      </div>`;
    
    // Disable tracking button in error state
    if (disableTrackingBtn) {
      disableTrackingBtn.disabled = true;
      disableTrackingBtn.style.opacity = '0.5';
    }
  }
});