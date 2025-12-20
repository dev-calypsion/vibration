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
} from "recharts";

type MachineState = "healthy" | "imbalance" | "misalignment" | "bearing_fault";

interface WaveformPoint {
  t: number;
  value: number;
}

interface FftPoint {
  freq: number;
  amp: number;
}

const SAMPLE_RATE = 2000; // Hz
const CHUNK_SIZE = 512; // smaller than backend for snappy UI

function generateWaveform(
  duration: number,
  sampleRate: number,
  faultType: MachineState
): WaveformPoint[] {
  const n = Math.floor(duration * sampleRate);
  const points: WaveformPoint[] = [];
  const freq1x = 30;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Base signal
    let signal = 0.5 * Math.sin(2 * Math.PI * freq1x * t);
    // Noise
    signal += randn() * 0.1;

    if (faultType === "imbalance") {
      signal += 1.5 * Math.sin(2 * Math.PI * freq1x * t);
    } else if (faultType === "misalignment") {
      signal += 0.8 * Math.sin(2 * Math.PI * 2 * freq1x * t);
    } else if (faultType === "bearing_fault") {
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

// Simple Gaussian noise using Box–Muller
function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function calculateMetrics(waveform: WaveformPoint[]) {
  if (!waveform.length) {
    return { rms: 0, peak: 0, crest_factor: 0 };
  }
  const values = waveform.map((p) => p.value);
  const n = values.length;
  const rms = Math.sqrt(
    values.reduce((acc, v) => acc + v * v, 0) / Math.max(n, 1)
  );
  const peak = values.reduce((acc, v) => Math.max(acc, Math.abs(v)), 0);
  const crestFactor = rms > 0 ? peak / rms : 0;
  return {
    rms,
    peak,
    crest_factor: crestFactor,
  };
}

// Lightweight DFT for UI (not optimized, but fine for small N)
function computeFft(waveform: WaveformPoint[], sampleRate: number): FftPoint[] {
  const values = waveform.map((p) => p.value);
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
    const freq = (k * sampleRate) / n;
    result.push({ freq, amp: mag });
  }

  // Focus on up to ~500 Hz for display
  return result.filter((p) => p.freq <= 500);
}

const stateOptions: { value: MachineState; label: string; description: string }[] =
  [
    {
      value: "healthy",
      label: "Healthy",
      description: "Baseline vibration with low noise.",
    },
    {
      value: "imbalance",
      label: "Imbalance",
      description: "Elevated 1× rotational frequency amplitude.",
    },
    {
      value: "misalignment",
      label: "Misalignment",
      description: "Stronger 2× rotational component.",
    },
    {
      value: "bearing_fault",
      label: "Bearing Fault",
      description: "High-frequency modulated impacts.",
    },
  ];

export default function VibrationSimulator() {
  const [state, setState] = useState<MachineState>("healthy");
  const [waveform, setWaveform] = useState<WaveformPoint[]>([]);

  useEffect(() => {
    // initial frame
    setWaveform(generateWaveform(CHUNK_SIZE / SAMPLE_RATE, SAMPLE_RATE, state));

    const id = setInterval(() => {
      setWaveform(
        generateWaveform(CHUNK_SIZE / SAMPLE_RATE, SAMPLE_RATE, state)
      );
    }, 1500);

    return () => clearInterval(id);
  }, [state]);

  const metrics = useMemo(() => calculateMetrics(waveform), [waveform]);
  const fft = useMemo(() => computeFft(waveform, SAMPLE_RATE), [waveform]);

  const waveformChartData = waveform.map((p) => ({
    tMs: p.t * 1000,
    value: p.value,
  }));

  const fftChartData = fft.map((p) => ({
    freq: p.freq,
    amp: p.amp,
  }));

  const statusColor =
    state === "healthy"
      ? "bg-green-500/10 border-green-500/50 text-green-400"
      : "bg-red-500/10 border-red-500/50 text-red-400";

  return (
    <div className="space-y-6">
      {/* Header + status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Real‑Time Vibration Simulator
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Explore how different mechanical faults change the waveform, FFT
            spectrum, and key health metrics.
          </p>
        </div>
        <div
          className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-medium ${statusColor}`}
        >
          <span className="w-2 h-2 rounded-full bg-current mr-2" />
          <span className="capitalize">{state.replace("_", " ")}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-200">
            Machine condition
          </p>
          <p className="text-xs text-gray-400">
            Switch between operating states to see how signatures change.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stateOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setState(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs md:text-sm border transition-colors ${
                state === opt.value
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-900 border-gray-700 text-gray-300 hover:border-blue-500/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">
            RMS
          </p>
          <p className="mt-2 text-2xl font-mono text-white">
            {metrics.rms.toFixed(4)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Overall vibration energy (g or mm/s).
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Peak
          </p>
          <p className="mt-2 text-2xl font-mono text-white">
            {metrics.peak.toFixed(4)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Maximum instantaneous amplitude.
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Crest Factor
          </p>
          <p className="mt-2 text-2xl font-mono text-white">
            {metrics.crest_factor.toFixed(3)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Peak / RMS ratio; sensitive to impacting.
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Time‑domain waveform */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">
            Time‑Domain Waveform
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Raw vibration signal over one second window.
          </p>
          <div className="h-64">
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
                  stroke="#3B82F6"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequency‑domain FFT */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">
            FFT Spectrum
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Single‑sided amplitude spectrum up to 500 Hz.
          </p>
          <div className="h-64">
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
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}


