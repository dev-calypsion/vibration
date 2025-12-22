"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Settings, Save, X } from 'lucide-react';

interface CameraFeedProps {
    machineId: string;
}

export default function CameraFeed({ machineId }: CameraFeedProps) {
    const [cameraUrl, setCameraUrl] = useState<string | null>(null);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        // Load saved URL from localStorage
        const saved = localStorage.getItem(`camera_url_${machineId}`);
        if (saved) {
            setCameraUrl(saved);
        }
    }, [machineId]);

    const handleSave = () => {
        if (inputValue.trim()) {
            localStorage.setItem(`camera_url_${machineId}`, inputValue.trim());
            setCameraUrl(inputValue.trim());
            setIsConfiguring(false);
        }
    };

    const handleClear = () => {
        localStorage.removeItem(`camera_url_${machineId}`);
        setCameraUrl(null);
        setInputValue("");
        setIsConfiguring(false);
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <Camera className="w-5 h-5 text-blue-400 mr-2" />
                    <h2 className="text-lg font-semibold text-white">Live Camera Feed</h2>
                </div>
                {!isConfiguring && (
                    <button 
                        onClick={() => {
                            setInputValue(cameraUrl || "");
                            setIsConfiguring(true);
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Configure Camera"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="relative h-[300px] bg-gray-900 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center group">
                {isConfiguring ? (
                    <div className="w-full max-w-md p-6 space-y-4 bg-gray-800/90 rounded-lg backdrop-blur-sm border border-gray-700">
                        <h3 className="text-sm font-medium text-gray-200">Configure Camera Stream</h3>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400">Stream URL (MJPEG/HLS/Image)</label>
                            <input 
                                type="text" 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="http://camera-ip:port/stream"
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button 
                                onClick={handleClear}
                                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                                Remove
                            </button>
                            <button 
                                onClick={() => setIsConfiguring(false)}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                            >
                                <Save className="w-3 h-3 mr-1" />
                                Save
                            </button>
                        </div>
                    </div>
                ) : cameraUrl ? (
                    <div className="relative w-full h-full">
                        {/* Try to render as image first (works for MJPEG streams too usually) */}
                        <img 
                            src={cameraUrl} 
                            alt="Live Feed" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                // Fallback or error handling could go here
                                // For now, we assume it's an image/stream that <img> can handle
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-500"><p>Stream format not supported by <img> tag.</p><p class="text-xs mt-1">Try a direct MJPEG or snapshot URL.</p></div>`;
                            }}
                        />
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded animate-pulse">
                            LIVE
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                        <Camera className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">No camera configured</p>
                        <button 
                            onClick={() => setIsConfiguring(true)}
                            className="mt-4 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg text-sm transition-all"
                        >
                            Configure Camera
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
