const https = require('https');

const API_KEY = 'd0914962ef2b552363166068cb4d1c10557f5fbb9ba87ef6597d80dc8c949898';
const ACCOUNT_ID = '894940';
const EXPERIMENT_IDS = [
    222, 225, 232, 235, 236, 237, 238, 243,
    250, 261, 264, 265, 266, 267, 268, 269, 270,
    277, 278, 281  // New experiments
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

async function main() {
    console.log('Fetching performance metrics for all running experiments...\n');

    const now = new Date();
    const results = [];

    for (const id of EXPERIMENT_IDS) {
        try {
            await sleep(1000); // Rate limiting
            const data = await fetchCampaignDetails(id);
            const campaign = data._data;

            const createdOn = new Date(campaign.createdOn * 1000);
            const daysRunning = Math.max(1, (now - createdOn) / (1000 * 60 * 60 * 24));

            // Find primary goal (usually revenue goal)
            const primaryGoal = campaign.goals.find(g => g.isPrimary);
            if (!primaryGoal) {
                results.push({
                    id,
                    name: campaign.name,
                    error: 'No primary goal'
                });
                continue;
            }

            // Get total visitors across all variations
            const totalVisitors = Object.values(primaryGoal.aggregatedData).reduce((sum, v) => sum + v.visitorCount, 0);
            const dailyVisitors = Math.round(totalVisitors / daysRunning);

            // Calculate metrics for each variation
            const variations = campaign.variations.map(variation => {
                const varStats = primaryGoal.aggregatedData[variation.id];
                if (!varStats) return null;

                const visitors = varStats.visitorCount || 0;
                const conversions = varStats.conversionCount || 0;
                const revenue = varStats.totalRevenue || 0;

                const cr = visitors > 0 ? (conversions / visitors) * 100 : 0;
                const rpv = visitors > 0 ? revenue / visitors : 0;
                const ordersPerVisitor = visitors > 0 ? conversions / visitors : 0;

                return {
                    name: variation.name,
                    isControl: variation.isControl,
                    visitors,
                    conversions,
                    revenue,
                    cr,
                    rpv,
                    ordersPerVisitor
                };
            }).filter(v => v !== null);

            results.push({
                id,
                name: campaign.name,
                type: campaign.type,
                daysRunning: Math.round(daysRunning),
                dailyVisitors,
                totalVisitors,
                primaryGoalName: primaryGoal.name,
                primaryGoalType: primaryGoal.type,
                variations
            });

        } catch (err) {
            results.push({
                id,
                error: err.message
            });
            if (err.message.includes('429')) {
                await sleep(5000);
            }
        }
    }

    // Display results
    console.log('='.repeat(120));
    for (const result of results) {
        if (result.error) {
            console.log(`\nID ${result.id}: ERROR - ${result.error}`);
            continue;
        }

        console.log(`\n${'='.repeat(120)}`);
        console.log(`ID: ${result.id} | ${result.name}`);
        console.log(`Type: ${result.type} | Days Running: ${result.daysRunning} | Daily Visitors: ${result.dailyVisitors}`);
        console.log(`Primary Goal: ${result.primaryGoalName} (${result.primaryGoalType})`);
        console.log('-'.repeat(120));

        console.log(`${'Variation'.padEnd(20)} | ${'Visitors'.padEnd(10)} | ${'Orders'.padEnd(10)} | ${'CR %'.padEnd(10)} | ${'Revenue'.padEnd(12)} | ${'RPV'.padEnd(10)} | ${'Orders/Visitor'.padEnd(15)}`);
        console.log('-'.repeat(120));

        for (const v of result.variations) {
            const varName = (v.isControl ? '⭐ ' : '   ') + v.name;
            console.log(
                `${varName.padEnd(20)} | ` +
                `${v.visitors.toString().padEnd(10)} | ` +
                `${v.conversions.toString().padEnd(10)} | ` +
                `${v.cr.toFixed(2).padEnd(10)} | ` +
                `$${v.revenue.toFixed(2).padEnd(11)} | ` +
                `$${v.rpv.toFixed(2).padEnd(9)} | ` +
                `${v.ordersPerVisitor.toFixed(4)}`
            );
        }
    }
    console.log('\n' + '='.repeat(120));
}

main();
