import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VibrationChartProps {
    data: any[];
}


export default function VibrationChart({ data }: VibrationChartProps) {
    const safeData = Array.isArray(data) ? data : [];
    return (
        <div className="w-full bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700 overflow-hidden h-48 md:h-64" style={{ minHeight: '240px' }}>
            <h3 className="text-xs md:text-sm font-semibold text-gray-400 mb-2 md:mb-4">Vibration Trend (RMS)</h3>
            <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={safeData.slice(-50)} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="timestamp"
                            stroke="#9CA3AF"
                            tickFormatter={(str) => new Date(str).toLocaleTimeString()}
                            minTickGap={30}
                            tick={{ fontSize: 10 }}
                        />
                        <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                        />
                        <Line
                            type="monotone"
                            dataKey="rms"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="peak"
                            stroke="#10B981"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
