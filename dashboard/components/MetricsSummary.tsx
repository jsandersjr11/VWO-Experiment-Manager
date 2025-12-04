"use client";

import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";

interface MetricsSummaryProps {
    experiments: any[];
}

export default function MetricsSummary({ experiments }: MetricsSummaryProps) {
    // Calculate aggregate metrics
    const totalExperiments = experiments.length;
    const runningExperiments = experiments.filter(
        (exp) => exp.status === "RUNNING"
    ).length;

    const totalRevenue = experiments.reduce((sum, exp) => {
        return (
            sum +
            exp.variations.reduce((vSum: number, v: any) => vSum + (v.revenue || 0), 0)
        );
    }, 0);

    const totalVisitors = experiments.reduce((sum, exp) => {
        return (
            sum +
            exp.variations.reduce((vSum: number, v: any) => vSum + (v.visitors || 0), 0)
        );
    }, 0);

    const avgConversionRate =
        experiments.reduce((sum, exp) => {
            const expAvg =
                exp.variations.reduce(
                    (vSum: number, v: any) => vSum + (v.conversionRate || 0),
                    0
                ) / (exp.variations.length || 1);
            return sum + expAvg;
        }, 0) / (experiments.length || 1);

    const metrics = [
        {
            label: "Total Experiments",
            value: totalExperiments,
            subValue: `${runningExperiments} running`,
            icon: TrendingUp,
            color: "blue",
        },
        {
            label: "Total Revenue",
            value: `$${totalRevenue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`,
            icon: DollarSign,
            color: "green",
        },
        {
            label: "Total Visitors",
            value: totalVisitors.toLocaleString(),
            icon: Users,
            color: "purple",
        },
        {
            label: "Avg Conversion Rate",
            value: `${avgConversionRate.toFixed(2)}%`,
            icon: TrendingUp,
            color: "orange",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                    <div key={index} className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className={`p-3 rounded-lg bg-${metric.color}-500/20 border border-${metric.color}-500/30`}
                            >
                                <Icon className={`w-6 h-6 text-${metric.color}-400`} />
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-400 mb-1">
                            {metric.label}
                        </h3>
                        <p className="text-2xl font-bold text-white">{metric.value}</p>
                        {metric.subValue && (
                            <p className="text-xs text-gray-500 mt-1">{metric.subValue}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
