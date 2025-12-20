"use client";

import React, { useMemo } from "react";
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
import { Cog, Zap, AlertTriangle } from "lucide-react";

type MachineType = "motor" | "gearbox" | "pump" | "fan" | "unknown";

type MotorFaults = {
  rotorBar: number;
  airGapEccentricity: number;
  statorIssue: number;
  bearing: number;
  misalignment: number;
};

type GearboxFaults = {
  gearMesh: number;
  gearTooth: number;
  huntingTooth: number;
  bearing: number;
  misalignment: number;
};

interface MachineTypeDiagnosticsProps {
  machineId: string;
  faultScores: {
    imbalance: number;
    misalignment: number;
    bearing: number;
    looseness: number;
    overallRisk: number;
  };
}

// Determine machine type from ID (for demo - in real app this would come from DB/config)
function detectMachineType(id: string): MachineType {
  const lower = id.toLowerCase();
  if (lower.includes("motor") || lower.includes("mtr")) return "motor";
  if (lower.includes("gear") || lower.includes("gbx")) return "gearbox";
  if (lower.includes("pump")) return "pump";
  if (lower.includes("fan")) return "fan";
  // Assign based on machine number for demo variety
  const num = parseInt(id.replace(/\D/g, "") || "1", 10);
  if (num % 3 === 0) return "motor";
  if (num % 3 === 1) return "gearbox";
  return "motor"; // default
}

// Motor-specific fault analysis
function analyzeMotorFaults(
  faultScores: MachineTypeDiagnosticsProps["faultScores"],
  id: string
): MotorFaults {
  const num = parseInt(id.replace(/\D/g, "") || "1", 10);
  const baseRisk = faultScores.overallRisk;

  // Rotor bar faults: high 1× with sidebands, often at slip frequency
  const rotorBar = Math.min(1, baseRisk * 0.7 + (faultScores.imbalance > 0.6 ? 0.3 : 0));

  // Air gap eccentricity: high 1× and 2×, often with line frequency modulation
  const airGapEccentricity = Math.min(
    1,
    faultScores.misalignment * 0.6 + faultScores.imbalance * 0.4
  );

  // Stator issues: line frequency harmonics (50/60 Hz and multiples)
  const statorIssue = Math.min(1, baseRisk * 0.5 + (num % 2 === 0 ? 0.2 : 0));

  return {
    rotorBar,
    airGapEccentricity,
    statorIssue,
    bearing: faultScores.bearing,
    misalignment: faultScores.misalignment,
  };
}

// Gearbox-specific fault analysis
function analyzeGearboxFaults(
  faultScores: MachineTypeDiagnosticsProps["faultScores"],
  id: string
): GearboxFaults {
  const num = parseInt(id.replace(/\D/g, "") || "1", 10);
  const baseRisk = faultScores.overallRisk;

  // Gear mesh frequency: typically 10-20× RPM for common gear ratios
  const gearMesh = Math.min(1, baseRisk * 0.8);

  // Gear tooth fault: harmonics of gear mesh with sidebands
  const gearTooth = Math.min(1, baseRisk * 0.6 + (faultScores.bearing > 0.5 ? 0.3 : 0));

  // Hunting tooth frequency: lowest common multiple of gear teeth
  const huntingTooth = Math.min(1, baseRisk * 0.4);

  return {
    gearMesh,
    gearTooth,
    huntingTooth,
    bearing: faultScores.bearing,
    misalignment: faultScores.misalignment,
  };
}

// Generate frequency markers for motor diagnostics
function getMotorFrequencyMarkers(): Array<{ freq: number; label: string; color: string }> {
  const rpm = 1800; // Typical motor RPM
  const lineFreq = 50; // 50 Hz (or 60 Hz in some regions)
  const rpmHz = rpm / 60; // 30 Hz

  return [
    { freq: rpmHz, label: "1× RPM", color: "#3B82F6" },
    { freq: rpmHz * 2, label: "2× RPM", color: "#3B82F6" },
    { freq: lineFreq, label: "Line Freq", color: "#EF4444" },
    { freq: lineFreq * 2, label: "2× Line", color: "#EF4444" },
    { freq: rpmHz * 0.95, label: "Rotor Bar", color: "#F59E0B" }, // Slip frequency sideband
    { freq: rpmHz * 1.05, label: "Rotor Bar", color: "#F59E0B" },
  ];
}

// Generate frequency markers for gearbox diagnostics
function getGearboxFrequencyMarkers(): Array<{ freq: number; label: string; color: string }> {
  const rpm = 1800;
  const rpmHz = rpm / 60; // 30 Hz
  const gearRatio = 5; // Example: 5:1 reduction
  const gearMeshFreq = rpmHz * gearRatio; // 150 Hz (typical gear mesh)

  return [
    { freq: rpmHz, label: "1× RPM", color: "#3B82F6" },
    { freq: rpmHz * 2, label: "2× RPM", color: "#3B82F6" },
    { freq: gearMeshFreq, label: "Gear Mesh", color: "#10B981" },
    { freq: gearMeshFreq * 2, label: "2× Mesh", color: "#10B981" },
    { freq: gearMeshFreq * 3, label: "3× Mesh", color: "#10B981" },
    { freq: gearMeshFreq - rpmHz, label: "Sideband -", color: "#F59E0B" },
    { freq: gearMeshFreq + rpmHz, label: "Sideband +", color: "#F59E0B" },
  ];
}

export default function MachineTypeDiagnosticsV2V2({
  machineId,
  faultScores,
}: MachineTypeDiagnosticsProps) {
  const machineType = useMemo(() => detectMachineType(machineId), [machineId]);

  const motorFaults = useMemo(
    () => analyzeMotorFaults(faultScores, machineId),
    [faultScores, machineId]
  );
  const gearboxFaults = useMemo(
    () => analyzeGearboxFaults(faultScores, machineId),
    [faultScores, machineId]
  );

  const frequencyMarkers = useMemo(() => {
    if (machineType === "motor") return getMotorFrequencyMarkers();
    if (machineType === "gearbox") return getGearboxFrequencyMarkers();
    return [];
  }, [machineType]);

  // Generate synthetic spectrum data with machine-type-specific signatures
  const spectrumData = useMemo(() => {
    const data: Array<{ freq: number; amp: number }> = [];
    const baseNoise = 0.05;

    if (machineType === "motor") {
      const rpmHz = 30;
      const lineFreq = 50;
      for (let f = 0; f <= 500; f += 2) {
        let amp = baseNoise + Math.random() * 0.02;
        // 1× RPM
        if (Math.abs(f - rpmHz) < 2) amp += 0.8 + motorFaults.rotorBar * 0.5;
        // 2× RPM
        if (Math.abs(f - rpmHz * 2) < 2) amp += 0.3 + motorFaults.airGapEccentricity * 0.4;
        // Line frequency
        if (Math.abs(f - lineFreq) < 2) amp += 0.2 + motorFaults.statorIssue * 0.3;
        // Rotor bar sidebands
        if (Math.abs(f - rpmHz * 0.95) < 1 || Math.abs(f - rpmHz * 1.05) < 1)
          amp += motorFaults.rotorBar * 0.4;
        data.push({ freq: f, amp: Math.max(0, amp) });
      }
    } else if (machineType === "gearbox") {
      const rpmHz = 30;
      const gearMeshFreq = 150;
      for (let f = 0; f <= 500; f += 2) {
        let amp = baseNoise + Math.random() * 0.02;
        // 1× RPM
        if (Math.abs(f - rpmHz) < 2) amp += 0.4 + gearboxFaults.misalignment * 0.3;
        // Gear mesh frequency
        if (Math.abs(f - gearMeshFreq) < 2)
          amp += 0.9 + gearboxFaults.gearMesh * 0.6;
        // Gear mesh harmonics
        if (Math.abs(f - gearMeshFreq * 2) < 2)
          amp += 0.3 + gearboxFaults.gearTooth * 0.4;
        if (Math.abs(f - gearMeshFreq * 3) < 2) amp += 0.15 + gearboxFaults.gearTooth * 0.2;
        // Sidebands
        if (
          Math.abs(f - (gearMeshFreq - rpmHz)) < 1 ||
          Math.abs(f - (gearMeshFreq + rpmHz)) < 1
        )
          amp += gearboxFaults.gearTooth * 0.3;
        data.push({ freq: f, amp: Math.max(0, amp) });
      }
    }

    return data;
  }, [machineType, motorFaults, gearboxFaults]);

  if (machineType === "unknown") {
    return null;
  }

  const isMotor = machineType === "motor";

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isMotor ? (
            <Zap className="w-6 h-6 text-yellow-400" />
          ) : (
            <Cog className="w-6 h-6 text-blue-400" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-white capitalize">
              {machineType} Diagnostics
            </h3>
            <p className="text-xs text-gray-400">
              {isMotor
                ? "Motor-specific fault detection and frequency analysis"
                : "Gearbox-specific fault detection and gear mesh analysis"}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs border border-blue-500/50 uppercase">
          {machineType}
        </span>
      </div>

      {/* Fault Scores */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {isMotor ? (
          <>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Rotor Bar Fault</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all"
                    style={{ width: `${motorFaults.rotorBar * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-white w-12 text-right">
                  {(motorFaults.rotorBar * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Air Gap Eccentricity</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all"
                    style={{ width: `${motorFaults.airGapEccentricity * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-white w-12 text-right">
                  {(motorFaults.airGapEccentricity * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Stator Issue</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all"
                    style={{ width: `${motorFaults.statorIssue * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-white w-12 text-right">
                  {(motorFaults.statorIssue * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Gear Mesh Fault</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${gearboxFaults.gearMesh * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-white w-12 text-right">
                  {(gearboxFaults.gearMesh * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Gear Tooth Fault</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all"
                    style={{ width: `${gearboxFaults.gearTooth * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-white w-12 text-right">
                  {(gearboxFaults.gearTooth * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Hunting Tooth</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${gearboxFaults.huntingTooth * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-white w-12 text-right">
                  {(gearboxFaults.huntingTooth * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </>
        )}
        {/* Common faults */}
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Bearing</p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${faultScores.bearing * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-white w-12 text-right">
              {(faultScores.bearing * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Misalignment</p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${faultScores.misalignment * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-white w-12 text-right">
              {(faultScores.misalignment * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Spectrum with Frequency Markers */}
      <div>
        <h4 className="text-sm font-semibold text-gray-200 mb-3">
          Frequency Spectrum with {isMotor ? "Motor" : "Gearbox"} Markers
        </h4>
        <div className="h-64 bg-gray-900/30 rounded border border-gray-700 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spectrumData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="freq"
                stroke="#9CA3AF"
                tickFormatter={(v: number) => `${Math.round(v)} Hz`}
                domain={[0, 500]}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  borderColor: "#374151",
                  color: "#F9FAFB",
                }}
                labelFormatter={(v: number) => `${Math.round(v)} Hz`}
              />
              <Line
                type="monotone"
                dataKey="amp"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {frequencyMarkers.map((marker, idx) => (
                <ReferenceLine
                  key={idx}
                  x={marker.freq}
                  stroke={marker.color}
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: marker.label,
                    position: "top",
                    fill: marker.color,
                    fontSize: 10,
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
          {frequencyMarkers.map((marker, idx) => (
            <div key={idx} className="flex items-center space-x-1">
              <div
                className="w-3 h-0.5"
                style={{ backgroundColor: marker.color }}
              />
              <span>{marker.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostic Insights */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h5 className="text-sm font-semibold text-white mb-2">Diagnostic Insights</h5>
            {isMotor ? (
              <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                {motorFaults.rotorBar > 0.5 && (
                  <li>
                    Elevated rotor bar fault indicators detected. Check for broken rotor bars or
                    end-ring issues.
                  </li>
                )}
                {motorFaults.airGapEccentricity > 0.5 && (
                  <li>
                    Air gap eccentricity present. Verify bearing condition and stator alignment.
                  </li>
                )}
                {motorFaults.statorIssue > 0.5 && (
                  <li>
                    Line frequency harmonics suggest potential stator winding or core issues.
                  </li>
                )}
                {motorFaults.rotorBar < 0.3 &&
                  motorFaults.airGapEccentricity < 0.3 &&
                  motorFaults.statorIssue < 0.3 && (
                    <li className="text-green-400">Motor operating within normal parameters.</li>
                  )}
              </ul>
            ) : (
              <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                {gearboxFaults.gearMesh > 0.6 && (
                  <li>
                    Elevated gear mesh frequency amplitude. Inspect gear teeth for wear or damage.
                  </li>
                )}
                {gearboxFaults.gearTooth > 0.5 && (
                  <li>
                    Gear tooth fault indicators detected. Check for chipped, cracked, or worn gear
                    teeth.
                  </li>
                )}
                {gearboxFaults.huntingTooth > 0.4 && (
                  <li>
                    Hunting tooth frequency present. Verify gear alignment and backlash settings.
                  </li>
                )}
                {gearboxFaults.gearMesh < 0.4 &&
                  gearboxFaults.gearTooth < 0.3 &&
                  gearboxFaults.huntingTooth < 0.3 && (
                    <li className="text-green-400">Gearbox operating within normal parameters.</li>
                  )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}