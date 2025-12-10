
import dotenv from 'dotenv';
const VWO = require("vwo-node-sdk");

// Load envs
dotenv.config({ path: '.env.local' });

async function debugExperiment250() {
    const accountId = process.env.VWO_ACCOUNT_ID;
    const apiToken = process.env.VWO_API_TOKEN;

    if (!accountId || !apiToken) throw new Error("Missing credentials");

    console.log(`Fetching details for Campaign 250...`);

    try {
        const response = await fetch(
            `https://app.vwo.com/api/v2/accounts/${accountId}/campaigns/250`,
            {
                headers: {
                    "token": apiToken,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            console.error(`Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Body:', text);
            return;
        }

        const data = await response.json();
        console.log('Campaign Data:', JSON.stringify(data._data, null, 2));

        // Simulate logic check
        const campaignDetails = data._data;
        const primaryGoal = campaignDetails.goals?.find((g: any) => g.isPrimary) || campaignDetails.goals?.[0];
        console.log('Primary Goal:', primaryGoal ? 'Found' : 'Missing');

        if (primaryGoal) {
            console.log('Aggregated Data:', primaryGoal.aggregatedData ? 'Present' : 'Missing');
        }

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

debugExperiment250();
