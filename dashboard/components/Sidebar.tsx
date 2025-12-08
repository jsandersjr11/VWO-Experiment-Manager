"use client";

import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard,
    FlaskConical,
    BarChart3,
    Settings,
    BookOpen,
    LogOut,
    User
} from "lucide-react";

export default function Sidebar() {
    const { data: session } = useSession();

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", active: true },
        { icon: FlaskConical, label: "Experiments", active: false },
        { icon: BarChart3, label: "Analytics", active: false },
    ];

    return (
        <aside className="w-64 bg-[#0B0E14] text-gray-400 flex flex-col h-screen sticky top-0 border-r border-white/5">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold text-xl">VWO Manager</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 px-2">
                    Menu
                </div>
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${item.active
                                ? "bg-indigo-500/10 text-indigo-400"
                                : "hover:bg-white/5 hover:text-gray-200"
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-white/5 space-y-2">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 hover:text-gray-200 transition-colors">
                    <BookOpen className="w-5 h-5" />
                    <span className="font-medium">Documentation</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 hover:text-gray-200 transition-colors">
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Settings</span>
                </button>
            </div>

            {/* User Profile */}
            {session?.user && (
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                        {session.user.image ? (
                            <img
                                src={session.user.image}
                                alt={session.user.name || "User"}
                                className="w-10 h-10 rounded-full border border-white/10"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                <User className="w-5 h-5 text-indigo-400" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {session.user.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {session.user.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 transition-colors text-xs font-medium"
                    >
                        <LogOut className="w-3 h-3" />
                        Sign Out
                    </button>
                </div>
            )}
        </aside>
    );
}
