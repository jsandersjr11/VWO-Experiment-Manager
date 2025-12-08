"use client";

import { useState } from "react";

interface TabNavigationProps {
    activeTab: "RUNNING" | "DRAFT" | "PAUSED";
    onTabChange: (tab: "RUNNING" | "DRAFT" | "PAUSED") => void;
    counts: {
        RUNNING: number;
        DRAFT: number;
        PAUSED: number;
    };
}

export default function TabNavigation({
    activeTab,
    onTabChange,
    counts,
}: TabNavigationProps) {
    const tabs = [
        { id: "RUNNING" as const, label: "Running", count: counts.RUNNING },
        { id: "DRAFT" as const, label: "Draft", count: counts.DRAFT },
        { id: "PAUSED" as const, label: "Paused", count: counts.PAUSED },
    ];

    return (
        <div className="border-b border-gray-200 mb-8">
            <div className="flex gap-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
              pb-4 text-sm font-medium transition-all duration-200 relative
              flex items-center gap-2
              ${activeTab === tab.id
                                ? "text-indigo-600"
                                : "text-gray-500 hover:text-gray-700"
                            }
            `}
                    >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                            <span
                                className={`
                  px-2 py-0.5 rounded-full text-xs font-medium
                  ${activeTab === tab.id
                                        ? "bg-indigo-50 text-indigo-600"
                                        : "bg-gray-100 text-gray-500"
                                    }
                `}
                            >
                                {tab.count}
                            </span>
                        )}
                        {/* Active Indicator Line */}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
