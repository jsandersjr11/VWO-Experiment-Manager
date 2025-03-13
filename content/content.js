const createOverlay = async (experiments) => {
    const overlay = document.createElement('div');
    overlay.className = 'vwo-overlay vwo-minimized';
  
    const experimentMap = new Map(); // To ensure unique experiments
  
    for (const exp of experiments) {
      const testId = exp.name.split('_')[4];
      if (!experimentMap.has(testId)) {
        experimentMap.set(testId, exp);
      }
    }
  
    // Minimized view
    const minimizedView = document.createElement('div');
    minimizedView.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: bold;">VWO</span>
        <span>${experimentMap.size} active</span>
      </div>
    `;
  
    // Expanded view
    const expandedView = document.createElement('div');
    expandedView.className = 'vwo-expanded';
    expandedView.style.display = 'none';
  
    for (const [testId, exp] of experimentMap.entries()) {
      const experimentName = await getExperimentName(testId); // Fetch the experiment name dynamically
      const variationCount = await getVariationCount(testId); // Fetch the actual number of variations
      const currentVariation = parseInt(exp.value, 10); // Current variation assigned by VWO
  
      const expDiv = document.createElement('div');
      expDiv.className = 'experiment-item';
      expDiv.innerHTML = `
        <div style="margin-bottom: 8px;">
          <span class="variation-indicator" style="background: ${getVariationColor(currentVariation)}"></span>
          <strong>${experimentName || `Test ${testId}`}:</strong> Variation ${currentVariation}
        </div>
        <select class="variation-select" data-name="${exp.name}">
          ${Array.from({ length: variationCount }, (_, i) =>
            `<option value="${i + 1}" ${currentVariation === i + 1 ? 'selected' : ''}>
              Variation ${i + 1}
            </option>`
          ).join('')}
        </select>
        <button class="disable-exp" data-name="${exp.name}" style="margin-left:10px;">Turn Off</button>
        <a class="vwo-link"
           href="https://app.vwo.com/#/test/ab/${testId}/report"
           target="_blank"
           rel="noopener">
          Open in VWO →
        </a>
      `;
      expandedView.appendChild(expDiv);
    }
  
    // Toggle functionality
    minimizedView.addEventListener('click', () => {
      expandedView.style.display = expandedView.style.display === 'none' ? 'block' : 'none';
      overlay.className =
        expandedView.style.display === 'none'
          ? 'vwo-overlay vwo-minimized'
          : 'vwo-overlay vwo-expanded';
    });
  
    overlay.appendChild(minimizedView);
    overlay.appendChild(expandedView);
    document.body.appendChild(overlay);
  
    // Add event listeners for variation switching and disabling experiments
    document.querySelectorAll('.variation-select').forEach((select) => {
      select.addEventListener('change', async (e) => {
        await chrome.cookies.set({
          url: window.location.origin,
          name: e.target.dataset.name,
          value: e.target.value,
        });
        window.location.reload();
      });
    });
  
    document.querySelectorAll('.disable-exp').forEach((button) => {
      button.addEventListener('click', async (e) => {
        await chrome.cookies.remove({
          url: window.location.origin,
          name: e.target.dataset.name,
        });
        window.location.reload();
      });
    });
  };
  
  // Fetch experiment name dynamically using VWO API or fallback to test ID
  async function getExperimentName(testId) {
    const apiKey = await getApiKey();
    if (!apiKey) return `Test ${testId}`;
  
    try {
      const response = await fetch(`https://app.vwo.com/api/v1/tests/${testId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data.name || `Test ${testId}`;
      }
      return `Test ${testId}`;
    } catch (error) {
      console.error('Failed to fetch experiment name:', error);
      return `Test ${testId}`;
    }
  }
  
  async function getVariationCount(testId) {
    const apiKey = await getApiKey();
    if (!apiKey) return 2; // Default to Control + Variation
  
    try {
      const response = await fetch(`https://app.vwo.com/api/v1/tests/${testId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data.variations.length; // Total number of variations in the experiment
      }
      return 2; // Default to Control + Variation if API fails
    } catch (error) {
      console.error('Failed to fetch variation count:', error);
      return 2; // Default to Control + Variation if API fails
    }
  }
  
  async function getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['vwoApiKey'], (result) => resolve(result.vwoApiKey));
    });
  }
  
  
  function getVariationColor(value) {
    const colors = ['#E74C3C', '#2ECC71', '#3498DB', '#F1C40F'];
    return colors[value % colors.length];
  }
  
  // Add debugging to help track the flow
  function checkForVWOCookies() {
    console.log('Checking for VWO cookies...');
    chrome.runtime.sendMessage(
        { 
            action: "checkVWOCookies", 
            url: window.location.origin // Changed from location.href to ensure correct cookie domain
        }, 
        response => {
            console.log('Received response:', response);
            if (response && response.experiments && response.experiments.length > 0) {
                console.log('Found VWO experiments:', response.experiments);
                createOverlay(response.experiments);
            } else {
                console.log('No VWO experiments found');
            }
        }
    );
  }

  // Ensure the check runs after the page is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    checkForVWOCookies();
  });

  // Also check when the page state changes (for SPAs)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        checkForVWOCookies();
    }
  }).observe(document, { subtree: true, childList: true });
  