import React from 'react';
import { Activity, AlertTriangle, LayoutDashboard, Settings, User } from 'lucide-react';
import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 border-r border-gray-700">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-blue-400">VibroGuard</h1>
                </div>
                <nav className="mt-6">
                    <Link href="/" className="flex items-center px-6 py-3 hover:bg-gray-700 text-gray-300 hover:text-white">
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        Dashboard
                    </Link>
                    <Link href="/simulator" className="flex items-center px-6 py-3 hover:bg-gray-700 text-gray-300 hover:text-white">
                        <Activity className="w-5 h-5 mr-3" />
                        Simulator
                    </Link>
                    {/*<Link href="/alerts" className="flex items-center px-6 py-3 hover:bg-gray-700 text-gray-300 hover:text-white">
                        <AlertTriangle className="w-5 h-5 mr-3" />
                        Alerts
                    </Link>
                    <Link href="/settings" className="flex items-center px-6 py-3 hover:bg-gray-700 text-gray-300 hover:text-white">
                        <Settings className="w-5 h-5 mr-3" />
                        Settings
                    </Link>*/}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-6">
                    <h2 className="text-lg font-semibold">Plant Overview</h2>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center text-sm text-gray-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            System Online
                        </div>
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5" />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
