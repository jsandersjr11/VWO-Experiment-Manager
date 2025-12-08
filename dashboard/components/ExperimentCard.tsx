"use client";

import { Star, TrendingUp, Calendar, Users, Copy, ExternalLink } from "lucide-react";

interface ExperimentCardProps {
    experiment: any;
}

export default function ExperimentCard({ experiment }: ExperimentCardProps) {
    // Find the best performing variation
    const bestVariation = experiment.variations.reduce(
        (best: any, current: any) => {
            if (!best) return current;
            return current.conversionRate > best.conversionRate ? current : best;
        },
        null
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {experiment.name}
                        </h3>
                        {experiment.status === "RUNNING" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wide">
                                Running
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {experiment.primaryGoal} ({experiment.goalType}) - ID: {experiment.id}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-medium uppercase tracking-wide">
                            {experiment.type}
                        </span>
                        <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs font-medium uppercase tracking-wide">
                            {experiment.variations.length} Variations
                        </span>
                    </div>
                </div>

                {/* Action Button */}
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 my-4" />

            {/* Metrics Summary */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Visitors</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-gray-900">
                            {experiment.dailyVisitors.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400">/ day</span>
                    </div>
                </div>
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Top Variation</p>
                    {bestVariation ? (
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-green-600">
                                {bestVariation.conversionRate.toFixed(2)}%
                            </span>
                            <span className="text-xs text-gray-400">CR</span>
                        </div>
                    ) : (
                        <span className="text-sm text-gray-400">-</span>
                    )}
                </div>
            </div>

            {/* Variations Preview */}
            <div className="space-y-2">
                {experiment.variations.slice(0, 2).map((variation: any, index: number) => {
                    const isBest = bestVariation && variation.name === bestVariation.name;

                    return (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                {variation.isControl ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                ) : (
                                    <span className={`w-1.5 h-1.5 rounded-full ${isBest ? "bg-green-500" : "bg-indigo-500"}`} />
                                )}
                                <span className="text-gray-600 truncate max-w-[150px]">{variation.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-900">
                                    {variation.conversionRate.toFixed(2)}%
                                </span>
                                <span className="text-xs text-gray-400 w-16 text-right">
                                    ${variation.revenue.toFixed(0)}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {experiment.variations.length > 2 && (
                    <p className="text-xs text-center text-gray-400 mt-2">
                        + {experiment.variations.length - 2} more variations
                    </p>
                )}
            </div>
        </div>
    );
}
