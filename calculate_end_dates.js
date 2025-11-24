const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');

const API_KEY = 'd0914962ef2b552363166068cb4d1c10557f5fbb9ba87ef6597d80dc8c949898';
const ACCOUNT_ID = '894940';
const EXPERIMENT_IDS = [
    222, 225, 232, 235, 236, 237, 238, 243,
    250, 261, 264, 265, 266, 267, 268, 269, 270
];

// Simple sample size calculator (Evan Miller approximation)
// n = (16 * p * (1-p)) / (p * mde)^2
function calculateSampleSize(p, mde) {
    if (p === 0 || mde === 0) return 0;
    const delta = p * mde;
    return (16 * p * (1 - p)) / (delta * delta);
}

function fetchCampaignDetails(campaignId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'app.vwo.com',
            path: `/api/v2/accounts/${ACCOUNT_ID}/campaigns/${campaignId}`,
            method: 'GET',
            headers: {
                'token': API_KEY
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Status Code: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('| ID | Name | Daily Visitors | Control CR | MDE | Est. Sample Size | Est. End Date |');
    console.log('|----|------|----------------|------------|-----|------------------|---------------|');

    const now = new Date();

    for (const id of EXPERIMENT_IDS) {
        try {
            await sleep(1000); // Wait 1 second between requests
            const data = await fetchCampaignDetails(id);
            const campaign = data._data;

            const createdOn = new Date(campaign.createdOn * 1000);
            const daysRunning = Math.max(1, (now - createdOn) / (1000 * 60 * 60 * 24));

            // Find primary goal
            const primaryGoal = campaign.goals.find(g => g.isPrimary);
            if (!primaryGoal) {
                console.log(`| ${id} | ${campaign.name} | N/A | N/A | N/A | N/A | N/A |`);
                continue;
            }

            // Get visitor count and conversion rate for Control (Variation 1 usually)
            // aggregatedData is keyed by variation ID. 
            // We need to find which variation is control.
            const controlVar = campaign.variations.find(v => v.isControl);
            const controlId = controlVar ? controlVar.id : 1;

            const controlStats = primaryGoal.aggregatedData[controlId];
            const totalVisitors = Object.values(primaryGoal.aggregatedData).reduce((sum, v) => sum + v.visitorCount, 0);

            const dailyVisitors = Math.round(totalVisitors / daysRunning);

            let controlCR = 0;
            if (controlStats && controlStats.visitorCount > 0) {
                controlCR = controlStats.conversionCount / controlStats.visitorCount;
            }

            // MDE from decisionStats (percentage, e.g. 5 for 5%)
            const mdePercent = primaryGoal.decisionStats.minimumDetectableEffect;
            const mde = mdePercent / 100;

            let requiredSamplePerVar = 0;
            let estEndDate = 'N/A';

            if (controlCR > 0 && mde > 0) {
                requiredSamplePerVar = calculateSampleSize(controlCR, mde);
                // Total sample size = required * number of variations
                const totalVariations = campaign.variations.length;
                const totalRequired = requiredSamplePerVar * totalVariations;

                const remainingVisitors = Math.max(0, totalRequired - totalVisitors);
                const daysRemaining = dailyVisitors > 0 ? remainingVisitors / dailyVisitors : 9999;

                const endDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
                estEndDate = endDate.toISOString().split('T')[0];
            } else if (controlCR === 0) {
                estEndDate = "Need Data";
            }

            console.log(`| ${id} | ${campaign.name} | ${dailyVisitors} | ${(controlCR * 100).toFixed(2)}% | ${mdePercent}% | ${Math.round(requiredSamplePerVar * campaign.variations.length)} | ${estEndDate} |`);

        } catch (err) {
            console.error(`Error fetching ${id}:`, err.message);
            // If rate limited, wait longer and retry once
            if (err.message.includes('429')) {
                await sleep(5000);
            }
        }
    }
}

main();
