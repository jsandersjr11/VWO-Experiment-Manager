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

// Fetch experiments from VWO API
async function fetchVWOExperiments() {
    const accountId = process.env.VWO_ACCOUNT_ID;
    const apiToken = process.env.VWO_API_TOKEN;

    if (!accountId || !apiToken) {
        throw new Error("VWO credentials not configured");
    }

    try {
        // Fetch all campaigns with pagination
        let allCampaigns: any[] = [];
        let offset = 0;
        let totalCount = 0;
        const limit = 100; // Fetch 100 at a time

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

            allCampaigns = allCampaigns.concat(campaigns);
            offset += campaigns.length;

            console.log(`Fetched ${allCampaigns.length} of ${totalCount} campaigns`);

            // Break if we've fetched all campaigns
            if (allCampaigns.length >= totalCount || campaigns.length === 0) {
                break;
            }
        } while (true);

        console.log(`Total campaigns fetched: ${allCampaigns.length}`);

        // Fetch detailed data for each campaign (includes stats)
        // Process in batches to avoid overwhelming the API
        const batchSize = 10;
        const allExperiments: any[] = [];

        for (let i = 0; i < allCampaigns.length; i += batchSize) {
            const batch = allCampaigns.slice(i, i + batchSize);

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

        console.log(`Successfully loaded ${allExperiments.length} experiments with data`);

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

// Cache for experiments data
let cachedData: any = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function GET(request: Request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check cache
        const now = Date.now();
        if (cachedData && now - lastFetch < CACHE_DURATION) {
            return NextResponse.json({
                experiments: cachedData,
                cached: true,
                lastUpdate: new Date(lastFetch).toISOString(),
            });
        }

        // Fetch fresh data
        const experiments = await fetchVWOExperiments();

        cachedData = experiments;
        lastFetch = now;

        return NextResponse.json({
            experiments,
            cached: false,
            lastUpdate: new Date(lastFetch).toISOString(),
        });
    } catch (error: any) {
        console.error("Error in experiments API:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch experiments" },
            { status: 500 }
        );
    }
}
