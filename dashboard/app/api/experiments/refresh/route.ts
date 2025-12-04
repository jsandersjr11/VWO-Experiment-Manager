import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request: Request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Trigger a fresh fetch by clearing the cache
        // The actual refresh happens in the main experiments route
        return NextResponse.json({
            success: true,
            message: "Cache cleared, next request will fetch fresh data",
        });
    } catch (error: any) {
        console.error("Error in refresh API:", error);
        return NextResponse.json(
            { error: error.message || "Failed to refresh data" },
            { status: 500 }
        );
    }
}
