"use client";

import { RefreshCw, Search, Plus, MoreVertical } from "lucide-react";

interface DashboardHeaderProps {
    lastUpdate: string | null;
    onRefresh: () => void;
    isRefreshing: boolean;
    autoRefreshEnabled: boolean;
    onToggleAutoRefresh: () => void;
    showAutoRefresh?: boolean;
}

export default function DashboardHeader({
    lastUpdate,
    onRefresh,
    isRefreshing,
    autoRefreshEnabled,
    onToggleAutoRefresh,
    showAutoRefresh = true,
}: DashboardHeaderProps) {
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="px-8 py-4">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Experiment Gallery
                    </h1>
                    <div className="flex items-center gap-3">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search Experiment"
                                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64"
                            />
                        </div>

                        {/* Add Button */}
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                            <Plus className="w-4 h-4" />
                            Add experiment
                        </button>

                        {/* Menu */}
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Tabs will go here in the parent component, or we can move them here if we want header to contain tabs */}
                    </div>

                    <div className="flex items-center gap-4">
                        {lastUpdate && (
                            <p className="text-xs text-gray-500">
                                Updated: {new Date(lastUpdate).toLocaleTimeString()}
                            </p>
                        )}

                        {/* Auto-refresh toggle */}
                        {showAutoRefresh && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoRefreshEnabled}
                                    onChange={onToggleAutoRefresh}
                                    className="w-3.5 h-3.5 rounded accent-indigo-600"
                                />
                                <span className="text-xs font-medium text-gray-600">Auto-refresh</span>
                            </label>
                        )}

                        {/* Manual refresh button */}
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw
                                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                            />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
