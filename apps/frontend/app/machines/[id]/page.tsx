"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import VibrationChart from '@/components/VibrationChart';
import MachineSpectrum from '@/components/MachineSpectrum';
import MachineTypeDiagnostics from '@/components/MachineTypeDiagnostics';
import { getMetrics, queryRAG } from '@/lib/api';
import { Bot, Send } from 'lucide-react';

type FaultScores = {
    imbalance: number;
    misalignment: number;
    bearing: number;
    looseness: number;
    overallRisk: number;
};

type MachineInsights = {
    healthScore: number;
    rulHours: number;
    severity: 'Healthy' | 'Warning' | 'Critical';
    lastRms: number;
    lastPeak: number;
    lastCrest: number;
    avgRms: number;
    trendDirection: 'rising' | 'falling' | 'stable';
    faultScores: FaultScores;
};

function buildSyntheticHistory(id: string): any[] {
    const base = 0.4 + (parseInt(id.replace(/\D/g, '') || '1', 10) % 5) * 0.1;
    const now = Date.now();
    const points: any[] = [];

    for (let i = 0; i < 60; i++) {
        const t = new Date(now - (59 - i) * 60_000).toISOString();
        const jitter = (Math.random() - 0.5) * 0.08;
        const rms = Math.max(0.1, base + jitter);
        const peak = rms * (1.4 + Math.random() * 0.4);
        points.push({
            timestamp: t,
            rms,
            peak,
            crest_factor: peak / rms,
            status: 'healthy',
        });
    }

    return points;
}

function analyzeMetrics(data: any[]): MachineInsights | null {
    if (!data || data.length === 0) return null;

    const chronological = [...data].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const last = chronological[chronological.length - 1];
    const rmsValues = chronological.map((m) => m.rms ?? 0);
    const crestValues = chronological.map((m) => m.crest_factor ?? 0);

    const avgRms = rmsValues.reduce((a, v) => a + v, 0) / Math.max(rmsValues.length, 1);

    const firstRms = rmsValues[0] ?? 0;
    const lastRms = last.rms ?? 0;
    const delta = lastRms - firstRms;
    const relChange = Math.abs(firstRms) > 0 ? delta / firstRms : 0;

    let trendDirection: MachineInsights['trendDirection'] = 'stable';
    if (relChange > 0.15) trendDirection = 'rising';
    else if (relChange < -0.15) trendDirection = 'falling';

    const crestAvg = crestValues.reduce((a, v) => a + v, 0) / Math.max(crestValues.length, 1);

    const rawScore = 100 - (lastRms * 40 + Math.max(0, crestAvg - 3) * 15);
    const healthScore = Math.max(0, Math.min(100, rawScore));

    let rulHours: number;
    if (healthScore >= 85) rulHours = 720;
    else if (healthScore >= 70) rulHours = 360;
    else if (healthScore >= 55) rulHours = 168;
    else if (healthScore >= 40) rulHours = 72;
    else rulHours = 24;

    let severity: MachineInsights['severity'] = 'Healthy';
    if (healthScore < 50) severity = 'Critical';
    else if (healthScore < 75) severity = 'Warning';

    // Very simple fault scoring heuristics just for visualization/demo
    const imbalanceScore = Math.min(1, lastRms / 1.5);
    const bearingScore = Math.min(1, Math.max(0, crestAvg - 3) / 2);
    const misalignmentScore = Math.min(1, 0.5 + relChange); // more change -> more suspicion
    const loosenessScore = Math.min(1, avgRms / 2.0);

    const overallRisk = Math.max(
        imbalanceScore,
        bearingScore,
        misalignmentScore,
        loosenessScore,
    );

    return {
        healthScore,
        rulHours,
        severity,
        lastRms,
        lastPeak: last.peak ?? 0,
        lastCrest: last.crest_factor ?? 0,
        avgRms,
        trendDirection,
        faultScores: {
            imbalance: imbalanceScore,
            misalignment: misalignmentScore,
            bearing: bearingScore,
            looseness: loosenessScore,
            overallRisk,
        },
    };
}

export default function MachineDetail() {
    const params = useParams();
    const id = params.id as string;

    const [metrics, setMetrics] = useState<any[]>([]);
    const [insights, setInsights] = useState<MachineInsights | null>(null);
    const [chatQuery, setChatQuery] = useState("");
    const [chatResponse, setChatResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMetrics, setLoadingMetrics] = useState(true);
    const [metricsError, setMetricsError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoadingMetrics(true);
            setMetricsError(null);
            try {let data: any[] = await getMetrics(id);

            if (!data || data.length === 0) {
                // Fallback to synthetic data when backend is offline
                data = buildSyntheticHistory(id);
            }

            const chronological =
                data.length > 1 &&
                    new Date(data[0].timestamp).getTime() >
                    new Date(data[data.length - 1].timestamp).getTime()
                    ? [...data].reverse()
                    : data;

            setMetrics(chronological);
            setInsights(analyzeMetrics(chronological));
        } catch (e) {
        console.error(e);
        setMetrics([]);
        setInsights(null);
        setMetricsError("Failed to load metrics. Please try again.");
        }finally {
            setLoadingMetrics(false);
        }
    };
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, [id]);

    const handleAsk = async () => {
        if (!chatQuery) return;
        setLoading(true);
        try {
            const res = await queryRAG(chatQuery);
            setChatResponse(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Machine: {id}</h1>
                        {insights && (
                            <p className="text-xs text-gray-400 mt-1">
                                Live condition monitoring · Trend {insights.trendDirection} ·
                                Health {insights.healthScore.toFixed(0)}%
                            </p>
                        )}
                    </div>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm border border-green-500/50">
                        Monitoring Active
                    </span>
                </div>

                    {loadingMetrics && (
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-400">
                        Loading live metrics...
                        </div>
                    )}

                    {metricsError && (
                        <div className="bg-red-900/40 border border-red-500 text-red-200 rounded-lg p-3 text-sm">
                        {metricsError}
                        </div>
                    )}

                    {!loadingMetrics && metrics.length > 0 && (
                        <VibrationChart data={metrics} />
                    )}

                {/* Summary metrics */}
                {insights && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                                Health Index
                            </p>
                            <p className="mt-2 text-2xl font-mono text-white">
                                {insights.healthScore.toFixed(0)}%
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Overall mechanical condition score.
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                                Remaining Useful Life
                            </p>
                            <p className="mt-2 text-2xl font-mono text-white">
                                {insights.rulHours.toFixed(0)}h
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Estimated time before maintenance is required.
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                                Latest Metrics
                            </p>
                            <p className="mt-2 text-sm text-gray-300">
                                RMS{" "}
                                <span className="font-mono text-white">
                                    {insights.lastRms.toFixed(3)}
                                </span>
                            </p>
                            <p className="text-sm text-gray-300">
                                Peak{" "}
                                <span className="font-mono text-white">
                                    {insights.lastPeak.toFixed(3)}
                                </span>
                            </p>
                            <p className="text-sm text-gray-300">
                                Crest{" "}
                                <span className="font-mono text-white">
                                    {insights.lastCrest.toFixed(3)}
                                </span>
                            </p>
                        </div>
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                                Severity
                            </p>
                            <p className="mt-2 text-xl font-semibold text-white">
                                {insights.severity}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Based on current vibration level and crest factor.
                            </p>
                        </div>
                    </div>
                )}


                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        {!loadingMetrics && metrics.length > 0 ? (
                    <VibrationChart data={metrics} />
                   ) : (
               <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 text-gray-400">
                   {loadingMetrics ? 'Loading live metrics...' : 'No data available.'}
            </div>
          )}
                    </div>

                    {/* Fault fingerprint */}
                    {insights && (
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <h3 className="text-sm font-semibold text-white mb-3">
                                Fault Fingerprint
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">
                                Relative likelihood of common vibration issues based on
                                current signature.
                            </p>
                            <div className="space-y-3 text-xs text-gray-300">
                                {(['imbalance', 'misalignment', 'bearing', 'looseness'] as const).map((k) => (
                                    <div key={k}>
                                        <div className="flex justify-between mb-1">
                                            <span className="capitalize">{k}</span>
                                            <span className="font-mono">
                                                {Math.round(
                                                    insights.faultScores[k] * 100,
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        insights.faultScores[k] * 100,
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-3 text-[11px] text-gray-500">
                                    Heuristic scoring for demo purposes. In a production
                                    system this would be driven by your ML models and
                                    expert rules.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {insights && (
                    <MachineSpectrum faultScores={insights.faultScores} />
                )}

                {/* Machine Type Specific Diagnostics */}
                {insights && (
                    <MachineTypeDiagnostics
                        machineId={id}
                        faultScores={insights.faultScores}
                    />
                )}

                {/* AI Insights */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <div className="flex items-center mb-4">
                        <Bot className="w-6 h-6 text-purple-400 mr-2" />
                        <h2 className="text-lg font-semibold text-white">AI Maintenance Assistant</h2>
                    </div>

                    <div className="flex space-x-4">
                        <input
                            type="text"
                            value={chatQuery}
                            onChange={(e) => setChatQuery(e.target.value)}
                            placeholder="Ask about this machine's condition..."
                            className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        />
                        <button
                            onClick={handleAsk}
                            disabled={loading}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center"
                        >
                            {loading ? "Thinking..." : <Send className="w-4 h-4" />}
                        </button>
                    </div>

                    {chatResponse && (
                        <div className="mt-6 bg-gray-900/50 p-4 rounded border border-gray-700">
                            <h3 className="font-semibold text-purple-300 mb-2">Analysis Result</h3>
                            <p className="text-gray-300 mb-4">{chatResponse.summary}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Likely Causes</h4>
                                    <ul className="list-disc list-inside text-gray-300 text-sm">
                                        {chatResponse.likely_causes?.map((c: string, i: number) => <li key={i}>{c}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Recommended Actions</h4>
                                    <ul className="list-disc list-inside text-gray-300 text-sm">
                                        {chatResponse.immediate_actions?.map((a: string, i: number) => <li key={i}>{a}</li>)}
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-end">
                                <span className="text-xs text-gray-500 mr-2">Confidence Score:</span>
                                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500"
                                        style={{ width: `${(chatResponse.confidence_score || 0) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
