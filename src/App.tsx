import React, { useState, useEffect } from 'react';
import {
  Terminal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  QrCode,
  Phone,
  RefreshCw,
  Cpu,
  Layers,
  Settings,
  User,
  ExternalLink,
  Code2,
  Clock,
  ShieldCheck,
  BookOpen,
  Info,
  Award,
  Database,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BotConfig {
  botName: string;
  ownerName: string;
  ownerNumber: string;
  prefix: string;
  version: string;
}

interface CommandLog {
  command: string;
  sender: string;
  timestamp: string;
  success: boolean;
}

interface ServerState {
  status: 'disconnected' | 'connecting' | 'qr' | 'pairing_code' | 'connected';
  qrCode: string | null;
  qrImageUrl: string | null;
  pairingCode: string | null;
  phoneNumber: string | null;
  connectionLogs: string[];
  recentCommands: CommandLog[];
  config: BotConfig;
}

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('BUGGU_API_BASE');
    if (saved) {
      const trimmed = saved.trim();
      if (trimmed && trimmed !== 'undefined' && trimmed !== 'null') {
        return trimmed.replace(/\/$/, '');
      }
    }
  }
  const url = import.meta.env.VITE_BACKEND_URL;
  if (url && typeof url === 'string') {
    const trimmed = url.trim();
    if (trimmed !== '' && trimmed !== 'undefined' && trimmed !== 'null' && trimmed !== '/') {
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed.replace(/\/$/, '');
      }
    }
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

export default function App() {
  const [apiBase, setApiBase] = useState<string>(getApiBase());
  const [apiBaseInput, setApiBaseInput] = useState<string>(getApiBase());
  const [state, setState] = useState<ServerState | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [activeTab, setActiveTab] = useState<'qr' | 'pair'>('qr');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uptimeStr, setUptimeStr] = useState('00h 02m 15s');
  const [pollFailed, setPollFailed] = useState(false);

  const handleSaveApiBase = () => {
    setActionError(null);
    const trimmed = apiBaseInput.trim();
    if (!trimmed) {
      localStorage.removeItem('BUGGU_API_BASE');
      const fallback = getApiBase();
      setApiBase(fallback);
      setApiBaseInput(fallback);
      setPollFailed(false);
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setActionError('The API base URL must start with http:// or https://');
      return;
    }
    const cleanUrl = trimmed.replace(/\/$/, '');
    localStorage.setItem('BUGGU_API_BASE', cleanUrl);
    setApiBase(cleanUrl);
    setApiBaseInput(cleanUrl);
    setPollFailed(false);
  };

  const handleClearApiBase = () => {
    localStorage.removeItem('BUGGU_API_BASE');
    const fallback = getApiBase();
    setApiBase(fallback);
    setApiBaseInput(fallback);
    setPollFailed(false);
  };

  // Poll status from server every 2 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      if (!apiBase) {
        setState(null);
        return;
      }
      try {
        const res = await fetch(`${apiBase}/api/status`);
        if (res.ok) {
          const data = await res.json();
          setState(data);
          setPollFailed(false);
        } else {
          setState(null);
          setPollFailed(true);
        }
      } catch (err) {
        console.error('Failed to poll status:', err);
        setState(null);
        setPollFailed(true);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [apiBase]);

  // Update dynamic uptime ticks locally
  useEffect(() => {
    let seconds = 135; // default starter
    const timer = setInterval(() => {
      seconds++;
      const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      setUptimeStr(`${hrs}h ${mins}m ${secs}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setLoading(true);

    if (!apiBase) {
      setActionError('Please configure an API base URL first.');
      setLoading(false);
      return;
    }

    if (!phoneInput.trim()) {
      setActionError('Please enter a valid phone number with country code.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneInput.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Failed to request pairing code');
      } else {
        // Force refresh state immediately
        const statusRes = await fetch(`${apiBase}/api/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setState(statusData);
        }
      }
    } catch (err) {
      setActionError('An error occurred. Make sure the server is healthy.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!apiBase) {
      setActionError('Please configure an API base URL first.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete session files and restart the bot? This will disconnect any active session.')) {
      return;
    }
    setActionError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/reset`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setPhoneInput('');
        // force state pull
        const statusRes = await fetch(`${apiBase}/api/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setState(statusData);
        }
      } else {
        setActionError('Failed to reset session.');
      }
    } catch (err) {
      setActionError('Error contacting reset endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!apiBase) {
      setActionError('Please configure an API base URL first.');
      return;
    }
    setActionError(null);
    try {
      await fetch(`${apiBase}/api/connect`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  const copyPairingCode = () => {
    if (!state?.pairingCode) return;
    navigator.clipboard.writeText(state.pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status mapping
  const getStatusBadge = () => {
    const status = state?.status || 'disconnected';
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            CONNECTED
          </span>
        );
      case 'qr':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            WAITING SCAN
          </span>
        );
      case 'pairing_code':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            PAIR CODE READY
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse"></span>
            CONNECTING...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
            OFFLINE
          </span>
        );
    }
  };

  const getStatusTextLabel = () => {
    const status = state?.status || 'disconnected';
    switch (status) {
      case 'connected':
        return 'The WhatsApp bot client is actively authenticated and responding to commands.';
      case 'qr':
        return 'Scan the generated QR code with your mobile WhatsApp to link the device.';
      case 'pairing_code':
        return 'Enter the generated pairing code on your mobile device to establish connection.';
      case 'connecting':
        return 'Authenticating socket credentials and pulling network gateways.';
      default:
        return 'Bot is currently sleeping/disconnected. Use the credentials generator tabs below to connect!';
    }
  };

  // Command guide definitions
  const commandsList = [
    { name: '.menu', desc: 'Displays the beautiful command catalog', type: 'info' },
    { name: '.ping', desc: 'Checks roundtrip response speed of server', type: 'system' },
    { name: '.alive', desc: 'Quickly verifies active socket health', type: 'system' },
    { name: '.runtime', desc: 'Calculates overall process node uptime', type: 'system' },
    { name: '.settings', desc: 'Inspects prefixes & server details', type: 'system' },
    { name: '.owner', desc: 'Fetches developer Divyansh Deewana info', type: 'info' },
    { name: '.help', desc: 'Provides instructions & syntax rules', type: 'general' },
    { name: '.about', desc: 'Details full tech architecture', type: 'info' },
    { name: '.version', desc: 'Returns current software version tags', type: 'info' },
    { name: '.credits', desc: 'Mentions open-source tools and libraries', type: 'info' }
  ];

  const botNameInstance = state?.config?.botName || 'BUGGU MD';
  const ownerNameInstance = state?.config?.ownerName || 'Divyansh Deewana';
  const prefixInstance = state?.config?.prefix || '.';
  const botVersion = state?.config?.version || '1.2.0';

  return (
    <div 
      id="buggu-md-app" 
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 flex flex-col relative"
    >
      
      {/* Background Dots Grid Decoration */}
      <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
        <div 
          className="absolute top-0 left-0 w-full h-full" 
          style={{ 
            backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
            backgroundSize: '32px 32px' 
          }}
        ></div>
      </div>

      {/* Top Navigation Bar: Geometric Balance Styling */}
      <nav className="h-20 border-b border-slate-800 flex items-center justify-between px-6 sm:px-10 bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center font-bold text-xl text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]">
            B
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tighter uppercase whitespace-nowrap">
              BUGGU <span className="text-indigo-500">MD</span>
            </span>
            <span className="text-[9px] font-mono tracking-wider text-slate-400 hidden sm:inline uppercase">
              Command-Handler Architecture
            </span>
          </div>
        </div>

        {/* Navigation Categories Tabs (Visual Decorative) */}
        <div className="hidden md:flex gap-8 text-xs font-semibold uppercase tracking-widest text-slate-400">
          <span className="text-indigo-400 border-b-2 border-indigo-500 pb-1 cursor-default">Dashboard</span>
          <span className="hover:text-white transition-colors cursor-default">Baileys WA Protocol</span>
          <span className="hover:text-white transition-colors cursor-default">Modular Handlers</span>
        </div>

        {/* Server status monitor */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">System Status</span>
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${state?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'}`}></span> 
              {state?.status === 'connected' ? 'ONLINE' : 'ACTIVE PIPELINE'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Column Structure */}
      <div className="flex-1 flex flex-col lg:flex-row z-10 relative">
        
        {/* Left Sidebar Status (Geometric Balance Layout Pattern) */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 sm:p-8 flex flex-col gap-8 bg-slate-950/40">
          
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
              Process Information
            </h3>
            <div className="space-y-4">
              <div className="bg-slate-900/80 p-4 border border-slate-800 rounded">
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1">Total Runtime</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <p className="font-mono text-sm text-indigo-300 font-bold">{uptimeStr}</p>
                </div>
              </div>
              
              <div className="bg-slate-900/80 p-4 border border-slate-800 rounded">
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1">Bot Version</p>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <p className="font-mono text-sm text-indigo-300 font-bold">v{botVersion}-stable</p>
                </div>
              </div>
              
              <div className="bg-slate-900/80 p-4 border border-slate-800 rounded">
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1">Server Latency / Speed</p>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <p className="font-mono text-sm text-emerald-400 font-bold">24 ms (Fast)</p>
                </div>
              </div>

              <div className="bg-slate-900/80 p-4 border border-slate-800 rounded">
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1">Socket Network</p>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-400" />
                  <p className="font-mono text-sm text-slate-300">Port 3000 Ingress</p>
                </div>
              </div>
            </div>
          </div>

          {/* API Server Hook Panel */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
              API Server Link
            </h3>
            <div className="bg-slate-900/80 p-4 border border-slate-800 rounded space-y-3">
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                Backend API URL
              </p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. https://your-bot.onrender.com"
                  value={apiBaseInput}
                  onChange={(e) => setApiBaseInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:border-indigo-500 outline-none placeholder-slate-700"
                />
              </div>
              <div className="flex gap-2">
                <button
                  id="apply-api-btn"
                  onClick={handleSaveApiBase}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] font-bold uppercase tracking-wider text-white transition-colors cursor-pointer text-center"
                >
                  Connect
                </button>
                {localStorage.getItem('BUGGU_API_BASE') && (
                  <button
                    id="reset-api-btn"
                    onClick={handleClearApiBase}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors cursor-pointer"
                    title="Reset to default environment URL"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p id="active-api-text" className="text-[9px] text-slate-500 leading-normal font-mono break-all">
                {apiBase ? `Active: ${apiBase}` : '⚠️ Offline: No Backend URL linked'}
              </p>
            </div>
          </div>

          <div className="mt-8 lg:mt-auto">
            <div className="p-4 border-l-2 border-indigo-500 bg-indigo-500/5">
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Developer Credentials</p>
              <p className="text-sm font-medium text-white">{ownerNameInstance}</p>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">© 2026 {botNameInstance.toUpperCase()}</p>
            </div>
          </div>
        </aside>

        {/* Main Grid Content Area */}
        <main className="flex-1 p-6 sm:p-10 overflow-x-hidden overflow-y-auto">
          
          {pollFailed && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-bold">Sync Failed: Backend Server Unreachable (<code className="text-amber-200 break-all">{apiBase}</code>)</p>
                  <p className="text-slate-400 mt-0.5">Please verify if your Render/external URL is active. If you are previewing inside the AI Studio Web Sandbox, click below to immediately restore fallback to our built-in local backend server.</p>
                </div>
              </div>
              <button
                onClick={handleClearApiBase}
                className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold uppercase tracking-wider text-[10px] rounded transition-all cursor-pointer"
              >
                Use Local Applet
              </button>
            </div>
          )}

          {/* Spotlight banner container */}
          <div className="mb-8 p-6 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">CONNECTION HUB</span>
                  {getStatusBadge()}
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Active State Interface</h2>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xl">{getStatusTextLabel()}</p>
              </div>

              <div className="flex flex-wrap gap-3 shrink-0">
                {state?.status === 'disconnected' && (
                  <button
                    onClick={handleConnect}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    Initiate Connection
                  </button>
                )}
                
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all border border-slate-700 cursor-pointer"
                >
                  Force Session Wipe
                </button>
              </div>
            </div>
          </div>

          {actionError && (
            <div className="mb-8 p-4 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{actionError}</p>
            </div>
          )}

          {/* Primary Layout Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Box: Authentication Portal & Live Log Frame */}
            <div className="xl:col-span-7 flex flex-col gap-8">
              
              {/* Authenticator Portal Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col justify-between min-h-[400px]">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Secure Link Portal</h3>
                    <p className="text-xs text-slate-400">Choose authentication protocol below</p>
                  </div>
                  
                  {/* Selector tab switches */}
                  <div className="flex bg-slate-950 p-1 rounded border border-slate-800">
                    <button
                      onClick={() => { setActiveTab('qr'); setActionError(null); }}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                        activeTab === 'qr' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      QR DISPLAY
                    </button>
                    <button
                      onClick={() => { setActiveTab('pair'); setActionError(null); }}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                        activeTab === 'pair' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      PAIRING CODE
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center py-4">
                  {activeTab === 'qr' ? (
                    /* QR Display Code block */
                    <div className="text-center flex flex-col items-center">
                      {state?.status === 'connected' ? (
                        <div className="p-6 flex flex-col items-center">
                          <div className="h-14 w-14 bg-emerald-500/10 rounded-full border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                          </div>
                          <h4 className="text-md font-bold text-white">Bot linked successfully!</h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                            Active session locked. The console handler is online and listening.
                          </p>
                        </div>
                      ) : state?.qrImageUrl ? (
                        <div className="space-y-4">
                          <div className="p-2.5 bg-white rounded inline-block shadow-[0_0_25px_rgba(99,102,241,0.15)]">
                            <img
                              src={state.qrImageUrl}
                              alt="BUGGU MD WA Connection QR"
                              className="w-48 h-48 sm:w-56 sm:h-56 select-none"
                            />
                          </div>
                          <div className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                            Scan this QR using <strong className="text-indigo-400 font-mono">Linked Devices</strong> inside mobile WhatsApp to pair instantly.
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
                          <span className="text-xs text-slate-400 font-mono">
                            {state?.status === 'connecting' ? 'Connecting to terminal socket...' : 'Idle state. Click Initiate Connection.'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Pairing Code Input block */
                    <div className="w-full max-w-md mx-auto space-y-6">
                      {state?.status === 'connected' ? (
                        <div className="text-center p-6 flex flex-col items-center">
                          <div className="h-14 w-14 bg-emerald-500/10 rounded-full border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                          </div>
                          <h4 className="text-md font-bold text-white">Pairing Sequence Active</h4>
                          <p className="text-xs text-slate-400 mt-1">Multi-device session files configured correctly.</p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <form onSubmit={handlePair} className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                                Mobile Number with Country Code
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={phoneInput}
                                  onChange={(e) => setPhoneInput(e.target.value)}
                                  placeholder="e.g., 917014631313"
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-3 text-xs font-mono focus:border-indigo-500 text-white outline-none placeholder-slate-600"
                                />
                                <div className="absolute right-3 top-3 select-none pointer-events-none text-[9px] bg-slate-905 border border-slate-800 text-slate-400 px-1 rounded font-mono">
                                  No spaces
                                </div>
                              </div>
                            </div>
                            
                            <button
                              type="submit"
                              disabled={loading || !phoneInput}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white rounded font-bold text-xs tracking-wider uppercase cursor-pointer transition-all duration-150"
                            >
                              {loading ? 'GENERATING CODE...' : 'GENERATE 8-DIGIT PAIRING CODE'}
                            </button>
                          </form>

                          {state?.pairingCode && (
                            <div className="p-4 bg-slate-950 border border-slate-800 rounded text-center relative overflow-hidden">
                              <span className="text-[9px] font-bold tracking-widest text-indigo-400 uppercase block mb-1">
                                WhatsApp Verification Code
                              </span>
                              <div
                                onClick={copyPairingCode}
                                className="inline-block text-xl sm:text-2xl font-mono tracking-[0.25rem] font-black text-white hover:text-indigo-400 transition-colors cursor-pointer py-1"
                              >
                                {state.pairingCode}
                              </div>
                              <p className="text-[10px] text-slate-400 hover:text-slate-300 mt-2 cursor-pointer" onClick={copyPairingCode}>
                                {copied ? '✅ COPIED TO CLIPBOARD' : 'CLICK CODE TO COPY'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
              
              {/* Terminal connection logger */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    Live System Terminal
                  </h4>
                  <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                    Live Stream
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded font-mono text-[11px] leading-relaxed h-48 overflow-y-auto border border-slate-800/60 text-slate-300 flex flex-col space-y-2">
                  {state?.connectionLogs && state.connectionLogs.length > 0 ? (
                    state.connectionLogs.map((log, idx) => {
                      let colorClass = 'text-slate-400';
                      if (log.includes('[CONNECTED]')) colorClass = 'text-emerald-400 font-bold';
                      if (log.includes('[DISCONNECTED]')) colorClass = 'text-rose-400';
                      if (log.includes('[QR_CODE]')) colorClass = 'text-amber-300';
                      if (log.includes('[PAIRING]')) colorClass = 'text-indigo-300';
                      if (log.includes('[ERROR]')) colorClass = 'text-rose-500 font-bold';

                      return (
                        <div key={idx} className="break-all">
                          <span className="text-slate-600 select-none mr-2">&gt;</span>
                          <span className={colorClass}>{log}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600">
                      <span>Socket inactive. Click Initiate Connection to launch live container stream.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Box: Command Registry Grid & Live Trigger stats feeds */}
            <div className="xl:col-span-5 flex flex-col gap-8">
              
              {/* Commands Catalog list */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                  <h3 className="font-bold uppercase tracking-widest text-xs text-white">Command Registry</h3>
                  <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    {commandsList.length} ACTIVE
                  </span>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[354px] overflow-y-auto bg-slate-900/50">
                  {commandsList.map((cmd) => (
                    <div key={cmd.name} className="p-3 bg-slate-950 border border-slate-800 rounded flex items-start gap-2.5 hover:border-indigo-500/50 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                      <div>
                        <span className="font-mono text-xs font-bold text-white block">
                          {prefixInstance}{cmd.name.replace('.', '')}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal">
                          {cmd.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Live feeds tracker */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Recent Command Logs
                  </h4>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto divide-y divide-slate-800/50">
                  {state?.recentCommands && state.recentCommands.length > 0 ? (
                    state.recentCommands.map((log, idx) => (
                      <div key={idx} className="pt-2 pb-1.5 flex items-center justify-between text-xs gap-4">
                        <div className="min-w-0">
                          <span className="font-mono text-white font-bold block truncate">{log.command}</span>
                          <span className="text-[10px] text-slate-500">
                            by {log.sender} at {log.timestamp}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded shrink-0 uppercase tracking-wide ${
                          log.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {log.success ? 'Complete' : 'Fail'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-600 text-xs font-mono">
                      No events registered. Send command messages on WhatsApp to poll records.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </main>

      </div>

      {/* Persistent Bottom Bar Info (Geometric Balance Styling) */}
      <footer className="h-14 border-t border-slate-800 px-6 sm:px-10 bg-slate-900 flex items-center justify-between z-10 text-xs text-slate-400">
        <div className="hidden sm:flex items-center gap-6 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Node.js v22.x</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Express Server</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Multi-Device Session</span>
        </div>
        
        <div className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase font-mono">
          PROJECT: BUGGU_MD_WA_BOT
        </div>
      </footer>

    </div>
  );
}
