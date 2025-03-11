document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveApiKey');
    const statusMessage = document.getElementById('statusMessage');
  
    // Load saved API key from storage
    chrome.storage.sync.get(['vwoApiKey'], (result) => {
      if (result.vwoApiKey) apiKeyInput.value = result.vwoApiKey;
    });
  
    // Save API key to storage with validation
    saveButton.addEventListener('click', async () => {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        statusMessage.textContent = 'Please enter a valid API Key.';
        return;
      }
  
      try {
        // Validate API Key by making a test request to VWO API
        const response = await fetch(`https://app.vwo.com/api/v1/tests`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          method: 'GET'
        });
  
        if (response.ok) {
          chrome.storage.sync.set({ vwoApiKey: apiKey }, () => {
            statusMessage.textContent = 'API Key saved successfully!';
          });
        } else {
          statusMessage.textContent = 'Invalid API Key. Please try again.';
          console.error('API validation failed:', response.statusText);
        }
      } catch (error) {
        statusMessage.textContent = 'Network error. Please try again.';
        console.error('Error validating API Key:', error);
      }
      
      setTimeout(() => (statusMessage.textContent = ''), 3000);
    });
  });
  