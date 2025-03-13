// VWO API endpoints
const VWO_API_BASE = 'https://app.vwo.com/api/v2';

// UI Constants
const UI_COLORS = {
  control: '#2196F3',
  variation: '#4CAF50',
  disabled: '#9E9E9E',
  hover: '#1976D2'
};

class VWOManager {
  constructor() {
    this.apiKey = null;
    this.experiments = new Map();
    this.overlay = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    this.apiKey = await this.getApiKey();
    await this.fetchExperiments();
    
    if (this.experiments.size > 0) {
      this.createOverlay();
    }
    
    this.initialized = true;
  }

  async getApiKey() {
    return 'd0914962ef2b552363166068cb4d1c10557f5fbb9ba87ef6597d80dc8c949898';
  }

  async fetchExperiments() {
    const response = await chrome.runtime.sendMessage({
      action: 'getExperiments',
      url: window.location.href
    });

    if (response?.experiments) {
      for (const exp of response.experiments) {
        const testId = exp.testId;
        if (!this.experiments.has(testId)) {
          const details = await this.fetchExperimentDetails(testId);
          this.experiments.set(testId, {
            ...exp,
            ...details
          });
        }
      }
    }
  }

  async fetchExperimentDetails(testId) {
    if (!this.apiKey) return { name: `Test ${testId}`, variations: [0, 1] };

    try {
      const response = await fetch(`${VWO_API_BASE}/experiments/${testId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: data.name,
          variations: data.variations.map(v => ({
            id: v.id,
            name: v.name,
            weight: v.weight
          }))
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch experiment ${testId} details:`, error);
    }

    return { name: `Test ${testId}`, variations: [0, 1] };
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'vwo-overlay vwo-minimized';
    
    const minimizedView = this.createMinimizedView();
    const expandedView = this.createExpandedView();
    
    this.overlay.appendChild(minimizedView);
    this.overlay.appendChild(expandedView);
    document.body.appendChild(this.overlay);
  }

  createMinimizedView() {
    const view = document.createElement('div');
    view.className = 'vwo-minimized-view';
    view.innerHTML = `
      <div class="vwo-header">
        <img src="${chrome.runtime.getURL('icons/icon16.png')}" alt="VWO" />
        <span>${this.experiments.size} Active Tests</span>
      </div>
    `;

    view.addEventListener('click', () => this.toggleOverlay());
    return view;
  }

  createExpandedView() {
    const view = document.createElement('div');
    view.className = 'vwo-expanded-view';
    
    for (const [testId, exp] of this.experiments) {
      view.appendChild(this.createExperimentCard(testId, exp));
    }

    return view;
  }

  createExperimentCard(testId, exp) {
    const card = document.createElement('div');
    card.className = 'vwo-experiment-card';
    
    const variationOptions = exp.variations.map((v, i) => `
      <option value="${v.id}" ${exp.variationId === v.id ? 'selected' : ''}>
        ${v.name || `Variation ${i}`}
      </option>
    `).join('');

    card.innerHTML = `
      <div class="vwo-exp-header">
        <h3>${exp.name}</h3>
        <div class="vwo-exp-actions">
          <select class="vwo-variation-select" data-test-id="${testId}">
            ${variationOptions}
          </select>
          <button class="vwo-disable-btn" data-test-id="${testId}" title="Turn off experiment">
            ⏻
          </button>
          <a href="https://app.vwo.com/#/test/${testId}/report" 
             target="_blank" 
             class="vwo-dashboard-link"
             title="Open in VWO Dashboard">
            ↗️
          </a>
        </div>
      </div>
    `;

    this.attachExperimentListeners(card, testId);
    return card;
  }

  attachExperimentListeners(card, testId) {
    const select = card.querySelector('.vwo-variation-select');
    const disableBtn = card.querySelector('.vwo-disable-btn');

    select?.addEventListener('change', (e) => {
      this.setVariation(testId, parseInt(e.target.value, 10));
    });

    disableBtn?.addEventListener('click', () => {
      this.removeExperiment(testId);
    });
  }

  async setVariation(testId, variationId) {
    await chrome.runtime.sendMessage({
      action: 'setVariation',
      url: window.location.href,
      testId,
      variationId
    });
    window.location.reload();
  }

  async removeExperiment(testId) {
    await chrome.runtime.sendMessage({
      action: 'removeExperiment',
      url: window.location.href,
      testId
    });
    window.location.reload();
  }

  toggleOverlay() {
    const isMinimized = this.overlay.classList.contains('vwo-minimized');
    this.overlay.className = `vwo-overlay ${isMinimized ? 'vwo-expanded' : 'vwo-minimized'}`;
  }
}

// Initialize VWO Manager
const vwoManager = new VWOManager();
vwoManager.init();