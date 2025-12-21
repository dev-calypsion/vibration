"use client";

import React, { useMemo } from "react";
import { Activity, AlertTriangle, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface MachineOverview {
  status: string;
  rms: number;
  peak: number;
  crest_factor: number;
  healthScore: number;
  rulHours: number;
  trend: any[];
}

interface FleetSummaryProps {
  machines: string[];
  machineData: Record<string, MachineOverview>;
}

export default function FleetSummary({ machines, machineData }: FleetSummaryProps) {
  const fleetStats = useMemo(() => {
    const allMachines = machines.map((id) => machineData[id]).filter(Boolean);
    if (allMachines.length === 0) {
      return {
        totalMachines: 0,
        healthy: 0,
        warning: 0,
        critical: 0,
        avgHealth: 0,
        avgRUL: 0,
        totalAlerts: 0,
        machinesAtRisk: 0,
      };
    }

    const healthy = allMachines.filter((m) => m.status === "healthy").length;
    const warning = allMachines.filter((m) => m.status === "warning").length;
    const critical = allMachines.filter((m) => m.status === "critical").length;
    const avgHealth =
      allMachines.reduce((sum, m) => sum + m.healthScore, 0) / allMachines.length;
    const avgRUL =
      allMachines.reduce((sum, m) => sum + m.rulHours, 0) / allMachines.length;
    const machinesAtRisk = allMachines.filter((m) => m.rulHours < 168).length;

    return {
      totalMachines: allMachines.length,
      healthy,
      warning,
      critical,
      avgHealth,
      avgRUL,
      totalAlerts: critical + warning,
      machinesAtRisk,
    };
  }, [machines, machineData]);

  const healthDistribution = [
    { name: "Healthy", value: fleetStats.healthy, color: "#10B981" },
    { name: "Warning", value: fleetStats.warning, color: "#F59E0B" },
    { name: "Critical", value: fleetStats.critical, color: "#EF4444" },
  ];

  const topMachines = useMemo(() => {
    return machines
      .map((id) => ({
        id,
        ...machineData[id],
      }))
      .filter((m) => m.healthScore !== undefined)
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 5);
  }, [machines, machineData]);

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-gray-400">Fleet Health</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {fleetStats.avgHealth.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {fleetStats.healthy}/{fleetStats.totalMachines} machines healthy
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg border border-green-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-xs text-gray-400">Operational</span>
          </div>
          <p className="text-2xl font-bold text-white">{fleetStats.healthy}</p>
          <p className="text-xs text-gray-400 mt-1">Machines running normally</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-lg border border-yellow-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-xs text-gray-400">At Risk</span>
          </div>
          <p className="text-2xl font-bold text-white">{fleetStats.machinesAtRisk}</p>
          <p className="text-xs text-gray-400 mt-1">
            RUL &lt; 1 week
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-lg border border-red-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-xs text-gray-400">Critical</span>
          </div>
          <p className="text-2xl font-bold text-white">{fleetStats.critical}</p>
          <p className="text-xs text-gray-400 mt-1">Require immediate attention</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Distribution Pie Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Fleet Health Distribution</h3>
          <div className="h-48" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {healthDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    color: "#F9FAFB",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            {healthDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-300">{item.name}</span>
                <span className="text-gray-500">({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Machines at Risk Bar Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Machines Requiring Attention</h3>
          <div className="h-48" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMachines.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="id"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    color: "#F9FAFB",
                  }}
                  formatter={(value: any) => [`${Number(value).toFixed(0)}%`, "Health"]}
                />
                <Bar
                  dataKey="healthScore"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                >
                  {topMachines.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.healthScore >= 80
                          ? "#10B981"
                          : entry.healthScore >= 60
                          ? "#F59E0B"
                          : "#EF4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Average RUL</span>
          </div>
          <p className="text-xl font-bold text-white">
            {fleetStats.avgRUL > 0 ? `${(fleetStats.avgRUL / 24).toFixed(1)} days` : "N/A"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Mean remaining useful life</p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Fleet Efficiency</span>
          </div>
          <p className="text-xl font-bold text-white">
            {fleetStats.totalMachines > 0
              ? `${((fleetStats.healthy / fleetStats.totalMachines) * 100).toFixed(0)}%`
              : "0%"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Operational availability</p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Active Issues</span>
          </div>
          <p className="text-xl font-bold text-white">{fleetStats.totalAlerts}</p>
          <p className="text-xs text-gray-500 mt-1">Warning + Critical alerts</p>
        </div>
      </div>
    </div>
  );
}

