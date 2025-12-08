import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const VWO = require("vwo-node-sdk");

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

// Fetch experiments from VWO API with status and type filtering
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

            // Filter by status and type on client side
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

            // Break if we've fetched all campaigns
            if (offset >= totalCount || campaigns.length === 0) {
                break;
            }

            // Rate limiting delay between pagination requests
            await sleep(1000);
        } while (true);

        console.log(`Total filtered campaigns: ${allCampaigns.length}`);

        // Fetch detailed data for each campaign (includes stats)
        // Process in smaller batches with delays to avoid rate limiting
        const batchSize = 5;
        const allExperiments: any[] = [];

        for (let i = 0; i < allCampaigns.length; i += batchSize) {
            const batch = allCampaigns.slice(i, i + batchSize);

            // Add delay between batches to respect rate limits
            if (i > 0) {
                await sleep(2000);
            }

            const batchResults = await Promise.all(
                batch.map(async (campaign: any) => {
                    try {
                        // Fetch full campaign details including stats
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

                        // Find primary goal
                        const primaryGoal = campaignDetails.goals?.find((g: any) => g.isPrimary) || campaignDetails.goals?.[0];

                        if (!primaryGoal || !primaryGoal.aggregatedData) {
                            return null;
                        }

                        // Calculate days running
                        const createdOn = new Date(campaignDetails.createdOn * 1000);
                        const now = new Date();
                        const daysRunning = Math.max(1, Math.round((now.getTime() - createdOn.getTime()) / (1000 * 60 * 60 * 24)));

                        // Get total visitors
                        const totalVisitors = Object.values(primaryGoal.aggregatedData).reduce(
                            (sum: number, v: any) => sum + (v.visitorCount || 0),
                            0
                        );
                        const dailyVisitors = Math.round(totalVisitors / daysRunning);

                        // Parse variations
                        const variations = campaignDetails.variations.map((variation: any) => {
                            const varStats = primaryGoal.aggregatedData[variation.id];
                            if (!varStats) return null;

                            const visitors = varStats.visitorCount || 0;
                            const conversions = varStats.conversionCount || 0;
                            const revenue = varStats.totalRevenue || 0;
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
            console.log(`Processed ${allExperiments.length} experiments so far...`);
        }

        console.log(`Successfully loaded ${allExperiments.length} experiments with data for status: ${status}`);

        return allExperiments;
    } catch (error) {
        console.error("Error fetching VWO experiments:", error);
        throw error;
    }
}

function calculateDaysRunning(createdOn: string): number {
    const created = new Date(createdOn);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function calculateDailyVisitors(stats: any): number {
    if (!stats || !stats.variations) return 0;

    const totalVisitors = stats.variations.reduce(
        (sum: number, v: any) => sum + (v.visitors || 0),
        0
    );

    const daysRunning = stats.duration_days || 1;
    return Math.round(totalVisitors / daysRunning);
}

function parseVariations(campaign: any, stats: any) {
    if (!stats || !stats.variations) return [];

    return stats.variations.map((variation: any, index: number) => {
        const visitors = variation.visitors || 0;
        const conversions = variation.conversions || 0;
        const revenue = variation.revenue || 0;
        const conversionRate = visitors > 0 ? (conversions / visitors) * 100 : 0;
        const rpv = visitors > 0 ? revenue / visitors : 0;

        return {
            name: variation.name || `Variation ${index}`,
            isControl: variation.is_control || index === 0,
            visitors,
            orders: conversions,
            conversionRate: parseFloat(conversionRate.toFixed(2)),
            revenue: parseFloat(revenue.toFixed(2)),
            rpv: parseFloat(rpv.toFixed(2)),
            ordersPerVisitor: parseFloat((conversions / (visitors || 1)).toFixed(4)),
        };
    });
}

// Separate caches for each status
interface CacheEntry {
    data: any;
    lastFetch: number;
}

const caches: Record<string, CacheEntry> = {
    RUNNING: { data: null, lastFetch: 0 },
    DRAFT: { data: null, lastFetch: 0 },
    PAUSED: { data: null, lastFetch: 0 },
};

// Cache durations per status (in milliseconds)
const CACHE_DURATIONS: Record<string, number> = {
    RUNNING: 30 * 60 * 1000,  // 30 minutes
    DRAFT: 60 * 60 * 1000,     // 1 hour
    PAUSED: 2 * 60 * 60 * 1000, // 2 hours
};

export async function GET(request: Request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "RUNNING";
        const typesParam = searchParams.get("types") || "ab,multivariate,split_url";
        const types = typesParam.split(",");

        // Validate status
        if (!["RUNNING", "DRAFT", "PAUSED"].includes(status)) {
            return NextResponse.json(
                { error: "Invalid status. Must be RUNNING, DRAFT, or PAUSED" },
                { status: 400 }
            );
        }

        // Check cache for this status
        const now = Date.now();
        const cache = caches[status];
        const cacheDuration = CACHE_DURATIONS[status];

        if (cache.data && now - cache.lastFetch < cacheDuration) {
            console.log(`Returning cached data for status: ${status}`);
            return NextResponse.json({
                experiments: cache.data,
                cached: true,
                status,
                lastUpdate: new Date(cache.lastFetch).toISOString(),
            });
        }

        // Fetch fresh data
        console.log(`Fetching fresh data for status: ${status}`);
        const experiments = await fetchVWOExperiments(status, types);

        // Update cache for this status
        cache.data = experiments;
        cache.lastFetch = now;

        return NextResponse.json({
            experiments,
            cached: false,
            status,
            lastUpdate: new Date(cache.lastFetch).toISOString(),
        });
    } catch (error: any) {
        console.error("Error in experiments API:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch experiments" },
            { status: 500 }
        );
    }
}
