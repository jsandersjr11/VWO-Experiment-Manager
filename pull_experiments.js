const https = require('https');

const VWO_ACCOUNT_ID = '894940';
const VWO_API_KEY = 'd0914962ef2b552363166068cb4d1c10557f5fbb9ba87ef6597d80dc8c949898';
const VWO_SETTINGS_BASE_URL = 'https://dev.visualwebsiteoptimizer.com/dcdn/settings.js';

async function fetchVWOSettings() {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        const params = new URLSearchParams({
            a: VWO_ACCOUNT_ID,
            settings_type: 4,
            ts: Math.floor(now / 1000),
            dt: 'desktop',
            cc: 'US'
        });
        const settingsUrl = `${VWO_SETTINGS_BASE_URL}?${params.toString()}`;

        const options = {
            headers: {
                'Authorization': `Bearer ${VWO_API_KEY}`,
                'Accept': 'application/json'
            }
        };

        https.get(settingsUrl, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to fetch VWO settings: ${res.statusCode} ${res.statusMessage}`));
                    return;
                }

                // The response is JSONP, extract the settings object
                // Find the start of the object
                const startMarker = 'var allSettings=(function(){return';
                const startIndex = data.indexOf(startMarker);

                if (startIndex === -1) {
                    console.error('Raw VWO response (first 500 chars):', data.substring(0, 500));
                    reject(new Error('Could not extract settings from VWO response'));
                    return;
                }

                const jsonStart = startIndex + startMarker.length;
                let braceCount = 0;
                let inString = false;
                let stringChar = '';
                let escape = false;
                let jsonEnd = -1;

                for (let i = jsonStart; i < data.length; i++) {
                    const char = data[i];

                    if (inString) {
                        if (escape) {
                            escape = false;
                        } else if (char === '\\') {
                            escape = true;
                        } else if (char === stringChar) {
                            inString = false;
                        }
                    } else {
                        if (char === '"' || char === "'") {
                            inString = true;
                            stringChar = char;
                        } else if (char === '{') {
                            braceCount++;
                        } else if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                jsonEnd = i;
                                break;
                            }
                        }
                    }
                }

                if (jsonEnd === -1) {
                    reject(new Error('Could not find end of settings object (unbalanced braces)'));
                    return;
                }

                const jsonStr = data.substring(jsonStart, jsonEnd + 1);

                try {
                    const settings = new Function('return ' + jsonStr)();
                    resolve(settings);
                } catch (parseError) {
                    console.error('JSON extraction failed. Tail:', jsonStr.substring(jsonStr.length - 100));
                    reject(parseError);
                }
            });

        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    try {
        console.log('Fetching VWO settings...');
        const settings = await fetchVWOSettings();

        const campaigns = settings.campaigns || (settings.dataStore && settings.dataStore.campaigns);

        if (!campaigns) {
            console.log('No campaigns found.');
            return;
        }

        console.log('Experiments found:');
        Object.entries(campaigns).forEach(([id, campaign]) => {
            console.log(`ID: ${id}`);
            console.log(`Name: ${campaign.name}`);
            console.log(`Status: ${campaign.status}`);
            console.log(`Type: ${campaign.type}`);
            console.log('Variations:');
            Object.entries(campaign.variations || {}).forEach(([varId, variation]) => {
                console.log(`  ${varId}: ${variation.name}`);
            });
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
