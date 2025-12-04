"use client";

import { Star, TrendingUp, TrendingDown, Calendar, Users } from "lucide-react";

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
        <div className="glass-panel p-6 hover:border-blue-500/50 transition-all duration-300">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-gray-400">
                            ID: {experiment.id}
                        </span>
                        <span
                            className={`px-2 py-1 text-xs rounded-full ${experiment.status === "RUNNING"
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                }`}
                        >
                            {experiment.status}
                        </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                        {experiment.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {experiment.primaryGoal} ({experiment.goalType})
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <div>
                        <p className="text-xs text-gray-400">Days Running</p>
                        <p className="text-sm font-semibold text-white">
                            {experiment.daysRunning}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <div>
                        <p className="text-xs text-gray-400">Daily Visitors</p>
                        <p className="text-sm font-semibold text-white">
                            {experiment.dailyVisitors}
                        </p>
                    </div>
                </div>
            </div>

            {/* Variations */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Variations</h4>
                {experiment.variations.map((variation: any, index: number) => {
                    const isBest =
                        bestVariation && variation.name === bestVariation.name;
                    const isPositive = variation.conversionRate > 0;

                    return (
                        <div
                            key={index}
                            className={`p-3 rounded-lg border ${variation.isControl
                                    ? "bg-blue-500/10 border-blue-500/30"
                                    : isBest
                                        ? "bg-green-500/10 border-green-500/30"
                                        : "bg-white/5 border-white/10"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {variation.isControl && (
                                        <Star className="w-4 h-4 text-blue-400" />
                                    )}
                                    {isBest && !variation.isControl && (
                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                    )}
                                    <span className="text-sm font-medium text-white">
                                        {variation.name}
                                    </span>
                                </div>
                                <span
                                    className={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-gray-400"
                                        }`}
                                >
                                    {variation.conversionRate.toFixed(2)}% CR
                                </span>
                            </div>

                            <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                    <p className="text-gray-400">Visitors</p>
                                    <p className="font-medium text-white">
                                        {variation.visitors.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Orders</p>
                                    <p className="font-medium text-white">{variation.orders}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Revenue</p>
                                    <p className="font-medium text-white">
                                        ${variation.revenue.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400">RPV</p>
                                    <p className="font-medium text-white">
                                        ${variation.rpv.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
