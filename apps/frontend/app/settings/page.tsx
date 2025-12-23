'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [backendUrl, setBackendUrl] = useState('');
  const [status, setStatus] = useState('');
  const router = useRouter();
  return null;

  useEffect(() => {
    // Read existing cookie
    const match = document.cookie.match(new RegExp('(^| )vg_backend_url=([^;]+)'));
    if (match) {
      setBackendUrl(decodeURIComponent(match[2]));
    }
  }, []);

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    let url = backendUrl.trim();
    if (!url) {
      setStatus('Please enter a URL');
      return;
    }
    
    // Warning for Vercel URLs
    if (url.includes('vercel.app')) {
       if (!confirm("Warning: You entered a 'vercel.app' URL. This usually points to the Frontend, not the Backend API. Are you sure?")) {
          return;
       }
    }

    // Remove trailing slash
    url = url.replace(/\/$/, '');
    
    // Save to cookie (valid for 7 days)
    const d = new Date();
    d.setTime(d.getTime() + (7*24*60*60*1000));
    document.cookie = `vg_backend_url=${encodeURIComponent(url)};expires=${d.toUTCString()};path=/`;
    
    setBackendUrl(url);
    setStatus('Saved! Redirecting...');
    
    setTimeout(() => {
      router.push('/');
    }, 1000);
  };

  const clearSettings = () => {
    document.cookie = "vg_backend_url=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setBackendUrl('');
    setStatus('Cleared. Will use default Environment Variable.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-blue-400">Developer Settings</h1>
        
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg text-sm text-blue-200">
          <p className="mb-2"><strong>Dynamic Backend URL</strong></p>
          <p>Use this to update the backend connection string without redeploying Vercel. Useful for free ngrok tunnels.</p>
        </div>

        <form onSubmit={saveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Backend URL
            </label>
            <input
              type="url"
              placeholder="https://xxxx-xx-xx-xx-xx.ngrok-free.app"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-200 placeholder-slate-600"
            />
          </div>

          {status && (
            <div className={`text-sm ${status.includes('Saved') ? 'text-green-400' : 'text-yellow-400'}`}>
              {status}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              Save & Connect
            </button>
            <button
              type="button"
              onClick={clearSettings}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="mt-8 text-xs text-slate-600 text-center">
          Vibration Monitor &bull; Dev Mode
        </div>
      </div>
    </div>
  );
}
