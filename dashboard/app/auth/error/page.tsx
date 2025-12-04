"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function AuthErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20">
            <div className="glass-panel p-8 max-w-md w-full text-center">
                <div className="mb-6">
                    <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-8 h-8 text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Authentication Error
                    </h1>
                    <p className="text-gray-400">
                        {error === "AccessDenied"
                            ? "Access denied. Only @clearlink.com accounts are allowed to access this dashboard."
                            : "An error occurred during authentication. Please try again."}
                    </p>
                </div>

                <Link href="/auth/signin" className="btn-primary inline-block">
                    Try Again
                </Link>
            </div>
        </div>
    );
}

export default function AuthError() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20"><div className="text-white">Loading...</div></div>}>
            <AuthErrorContent />
        </Suspense>
    );
}
