"use client";

import { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import DashboardHeader from "@/components/DashboardHeader";
import MetricsSummary from "@/components/MetricsSummary";
import ExperimentCard from "@/components/ExperimentCard";
import ExperimentChart from "@/components/ExperimentChart";
import TabNavigation from "@/components/TabNavigation";
import Sidebar from "@/components/Sidebar";
import { FlaskConical } from "lucide-react";

type TabStatus = "RUNNING" | "DRAFT" | "PAUSED";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabStatus>("RUNNING");
  const [experiments, setExperiments] = useState<Record<TabStatus, any[]>>({
    RUNNING: [],
    DRAFT: [],
    PAUSED: [],
  });
  const [lastUpdate, setLastUpdate] = useState<Record<TabStatus, string | null>>({
    RUNNING: null,
    DRAFT: null,
    PAUSED: null,
  });
  const [loadedTabs, setLoadedTabs] = useState<Set<TabStatus>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "charts">("cards");

  const fetchExperiments = async (status: TabStatus) => {
    try {
      setIsRefreshing(true);
      setError(null);

      const response = await fetch(`/api/experiments?status=${status}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch experiments: ${response.statusText}`);
      }

      const data = await response.json();
      setExperiments((prev) => ({
        ...prev,
        [status]: data.experiments || [],
      }));
      setLastUpdate((prev) => ({
        ...prev,
        [status]: data.lastUpdate,
      }));
      setLoadedTabs((prev) => new Set(prev).add(status));
    } catch (err: any) {
      console.error("Error fetching experiments:", err);
      setError(err.message || "Failed to load experiments");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchExperiments(activeTab);
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  const handleTabChange = (tab: TabStatus) => {
    setActiveTab(tab);
    // Lazy load: only fetch if tab hasn't been loaded yet
    if (!loadedTabs.has(tab)) {
      fetchExperiments(tab);
    }
  };

  // Initial fetch for Running tab
  useEffect(() => {
    fetchExperiments("RUNNING");
  }, []);

  // Auto-refresh (only for Running tab)
  useEffect(() => {
    if (!autoRefreshEnabled || activeTab !== "RUNNING") return;

    const interval = setInterval(() => {
      fetchExperiments("RUNNING");
    }, parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || "300000"));

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, activeTab]);

  const currentExperiments = experiments[activeTab];
  const currentLastUpdate = lastUpdate[activeTab];

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader
            lastUpdate={currentLastUpdate}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            autoRefreshEnabled={autoRefreshEnabled}
            onToggleAutoRefresh={handleToggleAutoRefresh}
            showAutoRefresh={activeTab === "RUNNING"}
          />

          <main className="flex-1 p-8 overflow-y-auto">
            {/* Tab Navigation */}
            <TabNavigation
              activeTab={activeTab}
              onTabChange={handleTabChange}
              counts={{
                RUNNING: experiments.RUNNING.length,
                DRAFT: experiments.DRAFT.length,
                PAUSED: experiments.PAUSED.length,
              }}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {currentExperiments.length > 0 && (
              <>
                {/* View mode toggle - Hidden for now to match Stax design which is card-focused */}
                {/* 
                <div className="flex items-center justify-end mb-6">
                  <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200">
                    <button
                      onClick={() => setViewMode("cards")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === "cards"
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setViewMode("charts")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === "charts"
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Charts
                    </button>
                  </div>
                </div>
                */}

                {/* Experiments display */}
                {viewMode === "cards" ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {currentExperiments.map((experiment) => (
                      <ExperimentCard
                        key={experiment.id}
                        experiment={experiment}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {currentExperiments.map((experiment) => (
                      <ExperimentChart
                        key={experiment.id}
                        experiment={experiment}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {!error && currentExperiments.length === 0 && !isRefreshing && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FlaskConical className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No experiments found</h3>
                <p className="text-gray-500 max-w-sm">
                  There are no {activeTab.toLowerCase()} experiments to display at the moment.
                </p>
              </div>
            )}

            {isRefreshing && currentExperiments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
                <p className="text-gray-500 font-medium">Loading experiments...</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
