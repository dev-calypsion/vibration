"use client";

import React, { useState } from 'react';
import { Activity, AlertTriangle, LayoutDashboard, Settings, User, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Layout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 
                transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex items-center justify-between p-6">
                    <h1 className="text-2xl font-bold text-blue-400">VibroGuard</h1>
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden text-gray-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <nav className="mt-2">
                    <Link 
                        href="/" 
                        className={`flex items-center px-6 py-3 hover:bg-gray-700 hover:text-white transition-colors ${pathname === '/' ? 'bg-gray-700/50 text-blue-400' : 'text-gray-300'}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        Dashboard
                    </Link>
                    <Link 
                        href="/simulator" 
                        className={`flex items-center px-6 py-3 hover:bg-gray-700 hover:text-white transition-colors ${pathname === '/simulator' ? 'bg-gray-700/50 text-blue-400' : 'text-gray-300'}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <Activity className="w-5 h-5 mr-3" />
                        Simulator
                    </Link>
                    <Link 
                        href="/settings" 
                        className={`flex items-center px-6 py-3 hover:bg-gray-700 hover:text-white transition-colors ${pathname === '/settings' ? 'bg-gray-700/50 text-blue-400' : 'text-gray-300'}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <Settings className="w-5 h-5 mr-3" />
                        Settings
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden w-full">
                {/* Header */}
                <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-4 md:px-6">
                    <div className="flex items-center">
                        <button 
                            onClick={toggleSidebar}
                            className="mr-4 text-gray-400 hover:text-white md:hidden"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-semibold truncate">
                            {pathname === '/simulator' ? 'Vibration Simulator' : 
                             pathname === '/settings' ? 'System Settings' :
                             pathname.includes('/machines/') ? 'Machine Details' : 'Plant Overview'}
                        </h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center text-sm text-gray-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                            <span className="hidden lg:inline">System Online</span>
                            <span className="lg:hidden">Online</span>
                        </div>
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5" />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-4 md:p-6 w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
