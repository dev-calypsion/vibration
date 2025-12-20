import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface TrendPoint {
    timestamp: string;
    rms: number;
    peak: number;
}

interface MachineCardProps {
    machineId: string;
    status: string;
    rms: number;
    peak: number;
    crestFactor: number;
    healthScore: number;
    rulHours: number;
    trend: TrendPoint[];
}

export default function MachineCard({
    machineId,
    status,
    rms,
    peak,
    crestFactor,
    healthScore,
    rulHours,
    trend,
}: MachineCardProps) {
    const getStatusColor = (s: string) => {
        switch (s.toLowerCase()) {
            case 'healthy': return 'bg-green-500/10 border-green-500/50 text-green-500';
            case 'warning': return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500';
            case 'critical':
            case 'bearing_fault':
            case 'imbalance':
            case 'misalignment':
                return 'bg-red-500/10 border-red-500/50 text-red-500';
            default: return 'bg-gray-500/10 border-gray-500/50 text-gray-500';
        }
    };

    const getIcon = (s: string) => {
        switch (s.toLowerCase()) {
            case 'healthy': return <CheckCircle className="w-5 h-5" />;
            default: return <AlertCircle className="w-5 h-5" />;
        }
    };

    const healthColor =
        healthScore >= 80 ? 'text-green-400' :
            healthScore >= 60 ? 'text-yellow-400' :
                'text-red-400';

    const rulLabel =
        rulHours >= 500 ? 'Long' :
            rulHours >= 150 ? 'Medium' :
                'Short';

    return (
        <Link href={`/machines/${machineId}`}>
            <div className={`p-4 rounded-lg border hover:bg-gray-800/60 transition-colors cursor-pointer ${getStatusColor(status)}`}>
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-lg text-white">{machineId}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Condition-based monitoring · Live trend
                        </p>
                    </div>
                    {getIcon(status)}
                </div>

                {/* Metrics + health */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mb-3">
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>RMS</span>
                            <span className="font-mono text-sm">{rms.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Peak</span>
                            <span className="font-mono text-sm">{peak.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Crest</span>
                            <span className="font-mono text-sm">{crestFactor.toFixed(3)}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span>Health</span>
                            <span className={`font-mono text-sm ${healthColor}`}>{healthScore.toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>RUL</span>
                            <span className="font-mono text-sm">{rulHours.toFixed(0)} h</span>
                        </div>
                        <div className="flex justify-end">
                            <span className="px-2 py-0.5 rounded-full border border-gray-600 text-[10px] uppercase tracking-wide text-gray-300">
                                {rulLabel} remaining life
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trend sparkline */}
                <div className="h-16 mb-2 rounded bg-gray-900/40 border border-gray-800 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trend}>
                            <Line
                                type="monotone"
                                dataKey="rms"
                                stroke="#3B82F6"
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-1 pt-1 border-t border-gray-800 text-xs uppercase font-bold tracking-wider flex justify-between items-center">
                    <span>{status.replace('_', ' ')}</span>
                    <span className="text-[10px] text-gray-400">
                        Tap for full spectrum & AI insights
                    </span>
                </div>
            </div>
        </Link>
    );
}
