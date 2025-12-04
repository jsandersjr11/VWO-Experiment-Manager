"use client";

import { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import DashboardHeader from "@/components/DashboardHeader";
import MetricsSummary from "@/components/MetricsSummary";
import ExperimentCard from "@/components/ExperimentCard";
import ExperimentChart from "@/components/ExperimentChart";

export default function DashboardPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "charts">("cards");

  const fetchExperiments = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const response = await fetch("/api/experiments");

      if (!response.ok) {
        throw new Error(`Failed to fetch experiments: ${response.statusText}`);
      }

      const data = await response.json();
      setExperiments(data.experiments || []);
      setLastUpdate(data.lastUpdate);
    } catch (err: any) {
      console.error("Error fetching experiments:", err);
      setError(err.message || "Failed to load experiments");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchExperiments();
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  // Initial fetch
  useEffect(() => {
    fetchExperiments();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchExperiments();
    }, parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || "300000")); // Default 5 minutes

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20">
        <DashboardHeader
          lastUpdate={lastUpdate}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={handleToggleAutoRefresh}
        />

        <main className="container mx-auto px-6 py-8">
          {error && (
            <div className="glass-panel p-4 mb-6 border-red-500/50 bg-red-500/10">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {experiments.length > 0 && (
            <>
              <MetricsSummary experiments={experiments} />

              {/* View mode toggle */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Experiments ({experiments.length})
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`px-4 py-2 rounded-lg transition-all ${viewMode === "cards"
                        ? "bg-blue-500 text-white"
                        : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode("charts")}
                    className={`px-4 py-2 rounded-lg transition-all ${viewMode === "charts"
                        ? "bg-blue-500 text-white"
                        : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                  >
                    Charts
                  </button>
                </div>
              </div>

              {/* Experiments display */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {experiments.map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {experiments.map((experiment) => (
                    <ExperimentChart
                      key={experiment.id}
                      experiment={experiment}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {!error && experiments.length === 0 && !isRefreshing && (
            <div className="glass-panel p-12 text-center">
              <p className="text-gray-400">No experiments found</p>
            </div>
          )}

          {isRefreshing && experiments.length === 0 && (
            <div className="glass-panel p-12 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading experiments...</p>
            </div>
          )}
        </main>
      </div>
    </SessionProvider>
  );
}
