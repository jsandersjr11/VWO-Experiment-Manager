"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface ExperimentChartProps {
    experiment: any;
}

export default function ExperimentChart({ experiment }: ExperimentChartProps) {
    const data = experiment.variations.map((variation: any) => ({
        name: variation.name.length > 20
            ? variation.name.substring(0, 20) + "..."
            : variation.name,
        "Conversion Rate": variation.conversionRate,
        Revenue: variation.revenue,
        RPV: variation.rpv,
    }));

    return (
        <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
                {experiment.name}
            </h3>

            <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Conversion Rate Comparison
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#9CA3AF" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1F2937",
                                border: "1px solid #374151",
                                borderRadius: "8px",
                            }}
                        />
                        <Bar dataKey="Conversion Rate" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Revenue Comparison
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#9CA3AF" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1F2937",
                                border: "1px solid #374151",
                                borderRadius: "8px",
                            }}
                        />
                        <Bar dataKey="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
