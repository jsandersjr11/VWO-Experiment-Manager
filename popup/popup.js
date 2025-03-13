document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Only run on VWO app or when specifically needed
    if (!tab.url.includes('vwo.com')) {
        // Load experiments more efficiently
        const cookies = await chrome.cookies.getAll({ 
            url: tab.url,
            name: '_vis_opt_exp_' // Only get VWO experiment cookies
        });
        
        const container = document.getElementById('experiments');
        cookies.forEach(cookie => {
          // Extract test ID from cookie name (e.g., "_vis_opt_exp_123_" -> "123")
          const testId = cookie.name.match(/_vis_opt_exp_(\d+)/)?.[1];
          
          const div = document.createElement('div');
          div.className = 'experiment';
          div.innerHTML = `
            <h4>Test ${testId}</h4>
            <div style="display: flex; gap: 10px; align-items: center;">
                <select data-name="${cookie.name}">
                ${getVariationOptions(cookie.value)}
                </select>
                <a href="https://app.vwo.com/#/test/ab/${testId}/report" 
                target="_blank"
                style="font-size: 0.8em;">
                View Report
                </a>
            </div>
            `;
          container.appendChild(div);
        });
    } else {
        // Display message when on VWO app
        const container = document.getElementById('experiments');
        container.innerHTML = '<p>Extension disabled on VWO app to prevent interference</p>';
    }
  
    // Variation switcher
    document.querySelectorAll('select').forEach(select => {
      select.addEventListener('change', async (e) => {
        await chrome.cookies.set({
          url: tab.url,
          name: e.target.dataset.name,
          value: e.target.value
        });
        chrome.tabs.reload(tab.id);
      });
    });
  
    // Tracking toggle
    document.getElementById('disableTracking').addEventListener('click', async () => {
      chrome.runtime.sendMessage({ action: 'toggleTracking' });
    });
  });
  