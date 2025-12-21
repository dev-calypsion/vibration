"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type FaultScores = {
  imbalance: number;
  misalignment: number;
  bearing: number;
  looseness: number;
  overallRisk: number;
};

type MachineSpectrumProps = {
  faultScores: FaultScores;
};

type WavePoint = { t: number; value: number };
type FftPoint = { freq: number; amp: number };
type EnvPoint = { tMs: number; env: number };

const SAMPLE_RATE = 2000;
const DURATION_SEC = 1; // 1 second window

function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function pickDominantState(scores: FaultScores): "healthy" | "imbalance" | "misalignment" | "bearing_fault" {
  const entries: [keyof FaultScores, number][] = Object.entries(scores) as any;
  const dominant = entries.reduce(
    (best, curr) => (curr[1] > best[1] ? curr : best),
    entries[0]
  );
  switch (dominant[0]) {
    case "imbalance":
      return "imbalance";
    case "misalignment":
      return "misalignment";
    case "bearing":
      return "bearing_fault";
    default:
      return "healthy";
  }
}

function generateWaveform(state: "healthy" | "imbalance" | "misalignment" | "bearing_fault"): WavePoint[] {
  const n = SAMPLE_RATE * DURATION_SEC;
  const points: WavePoint[] = [];
  const freq1x = 30; // 1800 RPM equivalent

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let signal = 0.5 * Math.sin(2 * Math.PI * freq1x * t);
    signal += randn() * 0.1;

    if (state === "imbalance") {
      signal += 1.2 * Math.sin(2 * Math.PI * freq1x * t);
    } else if (state === "misalignment") {
      signal += 0.8 * Math.sin(2 * Math.PI * 2 * freq1x * t);
    } else if (state === "bearing_fault") {
      const bearingFreq = 120;
      signal +=
        0.3 *
        Math.sin(2 * Math.PI * bearingFreq * t) *
        (1 + 0.5 * Math.sin(2 * Math.PI * 5 * t));
    }

    points.push({ t, value: signal });
  }
  return points;
}

function computeFft(wave: WavePoint[]): FftPoint[] {
  const values = wave.map((p) => p.value);
  const n = values.length;
  if (!n) return [];
  const halfN = Math.floor(n / 2);
  const result: FftPoint[] = [];

  for (let k = 0; k < halfN; k++) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const angle = (-2 * Math.PI * k * i) / n;
      re += values[i] * Math.cos(angle);
      im += values[i] * Math.sin(angle);
    }
    const mag = (2 / n) * Math.sqrt(re * re + im * im);
    const freq = (k * SAMPLE_RATE) / n;
    result.push({ freq, amp: mag });
  }

  return result.filter((p) => p.freq <= 500);
}

function computeEnvelope(wave: WavePoint[]): EnvPoint[] {
  if (!wave.length) return [];
  // Simple rectified + moving-average envelope for visualization
  const windowSize = 20;
  const values = wave.map((p) => Math.abs(p.value));
  const env: EnvPoint[] = [];

  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(values.length - 1, i + windowSize); j++) {
      sum += values[j];
      count++;
    }
    const avg = sum / Math.max(count, 1);
    env.push({ tMs: wave[i].t * 1000, env: avg });
  }
  return env;
}

export default function MachineSpectrum({ faultScores }: MachineSpectrumProps) {
  const [wave, setWave] = useState<WavePoint[]>([]);

  useEffect(() => {
    const state = pickDominantState(faultScores);
    setWave(generateWaveform(state));
    const id = setInterval(() => {
      setWave(generateWaveform(state));
    }, 4000);
    return () => clearInterval(id);
  }, [faultScores]);

  const fft = useMemo(() => computeFft(wave), [wave]);
  const env = useMemo(() => computeEnvelope(wave), [wave]);

  const waveformChartData = wave.map((p, idx) => ({
    tMs: p.t * 1000,
    value: p.value,
    env: env[idx]?.env ?? 0,
  }));

  const fftChartData = fft.map((p) => ({
    freq: p.freq,
    amp: p.amp,
  }));

  // Approximate bearing frequencies for demo
  const harmonics = [30, 60, 90];
  const bearingBands = [
    { freq: 110, label: "BPFO" },
    { freq: 140, label: "BPFI" },
    { freq: 50, label: "BSF" },
    { freq: 15, label: "FTF" },
  ];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Spectrum & Envelope Analysis
          </h3>
          <p className="text-xs text-gray-400">
            Simulated time waveform, envelope, and FFT with harmonic and bearing
            fault markers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Time + envelope */}
        <div className="h-56" style={{ minHeight: '220px' }}>
          <p className="text-xs text-gray-400 mb-1">
            Time-domain waveform with envelope (1 s window)
          </p>
          <div className="w-full h-full" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waveformChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                    dataKey="tMs"
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `${Math.round(v)} ms`}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                    contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    color: "#F9FAFB",
                    }}
                    labelFormatter={(v) => `${Math.round(v)} ms`}
                />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#60A5FA"
                    dot={false}
                    strokeWidth={1.5}
                    name="Waveform"
                />
                <Line
                    type="monotone"
                    dataKey="env"
                    stroke="#F59E0B"
                    dot={false}
                    strokeWidth={2}
                    name="Envelope"
                />
                </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FFT with markers */}
        <div className="h-56" style={{ minHeight: '220px' }}>
          <p className="text-xs text-gray-400 mb-1">
            Single-sided FFT with RPM harmonics and bearing bands
          </p>
          <div className="w-full h-full" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fftChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                    dataKey="freq"
                    stroke="#9CA3AF"
                    tickFormatter={(v) => `${Math.round(v)} Hz`}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                    contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    color: "#F9FAFB",
                    }}
                    labelFormatter={(v) => `${Math.round(v)} Hz`}
                />
                <Line
                    type="monotone"
                    dataKey="amp"
                    stroke="#10B981"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                />

                {harmonics.map((f) => (
                    <ReferenceLine
                    key={`h-${f}`}
                    x={f}
                    stroke="#3B82F6"
                    strokeDasharray="3 3"
                    label={{
                        value: `${Math.round(f / 30)}x`,
                        position: "top",
                        fill: "#60A5FA",
                        fontSize: 10,
                    }}
                    />
                ))}

                {bearingBands.map((b) => (
                    <ReferenceLine
                    key={b.label}
                    x={b.freq}
                    stroke="#F97316"
                    strokeDasharray="4 2"
                    label={{
                        value: b.label,
                        position: "top",
                        fill: "#FDBA74",
                        fontSize: 10,
                    }}
                    />
                ))}
                </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-500">
        For a production system, FFT and envelope would be computed from the
        actual waveform stream (as in your Python signal processing library)
        rather than this in-browser simulation.
      </p>
    </div>
  );
}


