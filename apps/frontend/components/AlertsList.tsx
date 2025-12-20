import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface Alert {
    timestamp: string;
    machine_id: string;
    type: string;
    message: string;
    severity: string;
}

export default function AlertsList({ alerts }: { alerts: Alert[] }) {
    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold text-white">Recent Alerts</h3>
            </div>
            <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">No active alerts</div>
                ) : (
                    alerts.map((alert, idx) => (
                        <div key={idx} className="p-4 hover:bg-gray-750 flex items-start space-x-3">
                            <div className={`mt-1 ${alert.severity === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'}`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-white">{alert.machine_id}</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{alert.type}</span>
                                </div>
                                <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
