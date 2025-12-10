
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
const VWO = require("vwo-node-sdk");

// Load envs
dotenv.config({ path: '.env.local' });

// Initialize VWO SDK
let vwoClient: any = null;

function getVWOClient() {
    if (!vwoClient && process.env.VWO_ACCOUNT_ID && process.env.VWO_API_TOKEN) {
        vwoClient = VWO.launch({
            accountId: process.env.VWO_ACCOUNT_ID,
            sdkKey: process.env.VWO_API_TOKEN,
        });
    }
    return vwoClient;
}

// Helper to read Looker data
function getLookerData() {
    try {
        const dbPath = path.join(process.cwd(), 'data', 'looker-data.json');
        if (!fs.existsSync(dbPath)) return null;

        const fileContent = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Error reading Looker data:", error);
        return null;
    }
}

async function fetchVWOExperiments(status: string = 'RUNNING', types: string[] = ['ab', 'multivariate', 'split_url']) {
    const accountId = process.env.VWO_ACCOUNT_ID;
    const apiToken = process.env.VWO_API_TOKEN;

    if (!accountId || !apiToken) {
        throw new Error("VWO credentials not configured");
    }

    // Helper function to add delay
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        // Fetch all campaigns with pagination and filtering
        let allCampaigns: any[] = [];
        let offset = 0;
        let totalCount = 0;
        const limit = 100;

        console.log(`Fetching campaigns with status: ${status}, types: ${types.join(',')}`);

        do {
            const campaignsResponse = await fetch(
                `https://app.vwo.com/api/v2/accounts/${accountId}/campaigns?offset=${offset}&limit=${limit}`,
                {
                    headers: {
                        "token": apiToken,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!campaignsResponse.ok) {
                throw new Error(`VWO API error: ${campaignsResponse.statusText}`);
            }

            const campaignsData = await campaignsResponse.json();
            const campaigns = campaignsData._data?.partialCollection || [];
            totalCount = campaignsData._data?.totalCount || 0;

            const filteredCampaigns = campaigns.filter((campaign: any) => {
                const matchesStatus = campaign.status === status ||
                    (status === 'PAUSED' && campaign.status === 'STOPPED') ||
                    (status === 'DRAFT' && campaign.status === 'NOT_STARTED');
                const matchesType = types.includes(campaign.type);
                return matchesStatus && matchesType;
            });

            allCampaigns = allCampaigns.concat(filteredCampaigns);
            offset += campaigns.length;

            console.log(`Fetched ${offset} of ${totalCount} campaigns, ${allCampaigns.length} match filters`);

            if (offset >= totalCount || campaigns.length === 0) {
                break;
            }

            // await sleep(1000); // Reduced for debugging
        } while (true);

        console.log(`Total filtered campaigns: ${allCampaigns.length}`);

        const lookerData = getLookerData();
        console.log(`Loaded Looker data entries: ${lookerData ? Object.keys(lookerData).length : 0}`);

        const batchSize = 5;
        const allExperiments: any[] = [];

        for (let i = 0; i < allCampaigns.length; i += batchSize) {
            const batch = allCampaigns.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(async (campaign: any) => {
                    try {
                        const detailsResponse = await fetch(
                            `https://app.vwo.com/api/v2/accounts/${accountId}/campaigns/${campaign.id}`,
                            {
                                headers: {
                                    "token": apiToken,
                                    "Content-Type": "application/json",
                                },
                            }
                        );

                        if (!detailsResponse.ok) {
                            console.warn(`Failed to fetch details for campaign ${campaign.id}`);
                            return null;
                        }

                        const detailsData = await detailsResponse.json();
                        const campaignDetails = detailsData._data;

                        const primaryGoal = campaignDetails.goals?.find((g: any) => g.isPrimary) || campaignDetails.goals?.[0];

                        // Debug: Log if primaryGoal is missing
                        if (!primaryGoal) console.log(`No primary goal for ${campaign.id}`);
                        else if (!primaryGoal.aggregatedData) console.log(`No aggregatedData for ${campaign.id}`);

                        if (!primaryGoal || !primaryGoal.aggregatedData) {
                            return null;
                        }

                        const createdOn = new Date(campaignDetails.createdOn * 1000);
                        const now = new Date();
                        const daysRunning = Math.max(1, Math.round((now.getTime() - createdOn.getTime()) / (1000 * 60 * 60 * 24)));

                        const experimentLookerData = lookerData && lookerData[campaign.id];

                        const variations = campaignDetails.variations.map((variation: any) => {
                            let varStats = primaryGoal.aggregatedData[variation.id] || {};
                            let visitors = varStats.visitorCount || 0;
                            let conversions = varStats.conversionCount || 0;
                            let revenue = varStats.totalRevenue || 0;

                            if (experimentLookerData && experimentLookerData.variations) {
                                const lookerVar = experimentLookerData.variations[variation.id] || experimentLookerData.variations[variation.name];

                                if (lookerVar) {
                                    if (lookerVar.visitors !== undefined) visitors = lookerVar.visitors;
                                    if (lookerVar.conversions !== undefined) conversions = lookerVar.conversions;
                                    if (lookerVar.revenue !== undefined) revenue = lookerVar.revenue;
                                }
                            }

                            const conversionRate = visitors > 0 ? (conversions / visitors) * 100 : 0;
                            const rpv = visitors > 0 ? revenue / visitors : 0;

                            return {
                                name: variation.name,
                                isControl: variation.isControl,
                                visitors,
                                orders: conversions,
                                conversionRate: parseFloat(conversionRate.toFixed(2)),
                                revenue: parseFloat(revenue.toFixed(2)),
                                rpv: parseFloat(rpv.toFixed(2)),
                                ordersPerVisitor: parseFloat((conversions / (visitors || 1)).toFixed(4)),
                            };
                        }).filter((v: any) => v !== null);

                        const totalVisitors = variations.reduce((sum: number, v: any) => sum + v.visitors, 0);
                        const dailyVisitors = Math.round(totalVisitors / daysRunning);

                        return {
                            id: campaignDetails.id,
                            name: campaignDetails.name,
                            type: campaignDetails.type,
                            status: campaignDetails.status,
                            daysRunning,
                            dailyVisitors,
                            variations,
                            primaryGoal: primaryGoal.name || "Total Orders Revenue",
                            goalType: primaryGoal.type || "revenue",
                        };
                    } catch (error) {
                        console.error(`Error fetching details for campaign ${campaign.id}:`, error);
                        return null;
                    }
                })
            );

            allExperiments.push(...batchResults.filter((exp) => exp !== null));
        }
        return allExperiments;
    } catch (error) {
        console.error("Error fetching VWO experiments:", error);
        throw error;
    }
}

// Run
fetchVWOExperiments()
    .then(() => console.log('Success!'))
    .catch(err => console.error('FAILED:', err));
