import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VibrationChartProps {
    data: any[];
}


export default function VibrationChart({ data }: VibrationChartProps) {
    const safeData = Array.isArray(data) ? data : [];
    return (
        <div className="h-64 w-full bg-gray-800 p-4 rounded-lg border border-gray-700" style={{ minHeight: '250px' }}>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Vibration Trend (RMS)</h3>
            <div className="w-full h-full" style={{ minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={safeData.slice(-50)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="timestamp"
                            stroke="#9CA3AF"
                            tickFormatter={(str) => new Date(str).toLocaleTimeString()}
                            minTickGap={30}
                        />
                        <YAxis stroke="#9CA3AF" />
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
