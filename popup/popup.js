document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Load experiments
    const cookies = await chrome.cookies.getAll({ url: tab.url });
    const vwoCookies = cookies.filter(c => c.name.startsWith('_vis_opt_exp_'));
    
    const container = document.getElementById('experiments');
    vwoCookies.forEach(cookie => {
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
  