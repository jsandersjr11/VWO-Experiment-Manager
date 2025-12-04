"use client";

import { signOut, useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";

interface DashboardHeaderProps {
    lastUpdate: string | null;
    onRefresh: () => void;
    isRefreshing: boolean;
    autoRefreshEnabled: boolean;
    onToggleAutoRefresh: () => void;
}

export default function DashboardHeader({
    lastUpdate,
    onRefresh,
    isRefreshing,
    autoRefreshEnabled,
    onToggleAutoRefresh,
}: DashboardHeaderProps) {
    const { data: session } = useSession();

    return (
        <header className="glass-panel sticky top-0 z-50 border-b border-white/10">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            VWO Performance Dashboard
                        </h1>
                        {lastUpdate && (
                            <p className="text-sm text-gray-400 mt-1">
                                Last updated: {new Date(lastUpdate).toLocaleString()}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Auto-refresh toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefreshEnabled}
                                onChange={onToggleAutoRefresh}
                                className="w-4 h-4 rounded accent-blue-500"
                            />
                            <span className="text-sm text-gray-300">Auto-refresh</span>
                        </label>

                        {/* Manual refresh button */}
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="btn-primary flex items-center gap-2"
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                            />
                            Refresh
                        </button>

                        {/* User info and sign out */}
                        {session?.user && (
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">
                                        {session.user.name}
                                    </p>
                                    <p className="text-xs text-gray-400">{session.user.email}</p>
                                </div>
                                {session.user.image && (
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        className="w-10 h-10 rounded-full border-2 border-blue-500/50"
                                    />
                                )}
                                <button
                                    onClick={() => signOut()}
                                    className="btn-secondary text-sm"
                                >
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
