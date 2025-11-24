const VWO_SETTINGS_URL = 'https://dev.visualwebsiteoptimizer.com/dcdn/settings.js';

interface VWOSettingsParams {
  a: string;          // account ID
  settings_type: number;
  ts: number;         // timestamp
  dt: string;         // device type
  cc: string;         // country code
}

export class VWOService {
  private static async fetchSettings(params: VWOSettingsParams) {
    const queryString = new URLSearchParams({
      ...params
    }).toString();
    
    const response = await fetch(`${VWO_SETTINGS_URL}?${queryString}`);
    if (!response.ok) {
      throw new Error('Failed to fetch VWO settings');
    }
    
    return response.json();
  }

  public static async getActiveExperiments() {
    const params: VWOSettingsParams = {
      a: '894940',
      settings_type: 4,
      ts: Math.floor(Date.now() / 1000),
      dt: 'desktop',
      cc: 'US'
    };

    try {
      const settings = await this.fetchSettings(params);
      return settings.campaigns || [];
    } catch (error) {
      console.error('Error fetching VWO experiments:', error);
      return [];
    }
  }
} 