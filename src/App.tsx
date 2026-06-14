import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  BookOpen, 
  Sliders, 
  RefreshCw, 
  Sparkles, 
  Radio, 
  Search,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';
import { COMMANDS } from './commands.ts';

interface BotSettings {
  prefix: string;
  autoread: boolean;
  autoreact: boolean;
  autostatusview: boolean;
  autostatusreact: boolean;
  antidelete: boolean;
  anticall: boolean;
  antilink: boolean;
  autoreply: boolean;
  autoreactdm: boolean;
  autoreactgc: boolean;
  autosticker: boolean;
  autodownloadstatus: boolean;
  autosavecontacts: boolean;
  autowelcome: boolean;
  autogoodbye: boolean;
  autotyping?: boolean;
  recording?: boolean;
  online?: boolean;
  antiedit?: boolean;
  welcome?: boolean;
  adminaction?: boolean;
  ownerNumber: string;
}

export default function App() {
  const [status, setStatus] = useState<string>('disconnected');
  const [qrCode, setQrCode] = useState<string>('');
  const [serverPairingCode, setServerPairingCode] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [settings, setSettings] = useState<BotSettings>({
    prefix: '.',
    autoread: false,
    autoreact: false,
    autostatusview: false,
    autostatusreact: false,
    antidelete: false,
    anticall: false,
    antilink: false,
    autoreply: false,
    autoreactdm: false,
    autoreactgc: false,
    autosticker: false,
    autodownloadstatus: false,
    autosavecontacts: false,
    autowelcome: false,
    autogoodbye: false,
    autotyping: false,
    recording: false,
    online: true,
    antiedit: false,
    welcome: false,
    adminaction: false,
    ownerNumber: '918882829982'
  });

  const [activeTab, setActiveTab] = useState<'console' | 'settings' | 'commands'>('console');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Phone number pairing code states
  const [pairingMethod, setPairingMethod] = useState<'qr' | 'phone'>('qr');
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [pairingError, setPairingError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Poll server state every 3 seconds to keep UI completely synchronized
  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) return;

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // Skip if response is not JSON (e.g. HTML serving during server reloads)
          return;
        }

        const data = await response.json();
        if (active) {
          setStatus(data.status);
          setQrCode(data.qr);
          setServerPairingCode(data.pairingCode || '');
          setLogs(data.logs || []);
          if (data.settings) {
            setSettings(data.settings);
          }
        }
      } catch (err) {
        // Intermittent network glitches are normal during dev server fast-restarts
        console.warn('Unable to synchronize status with server API:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleToggle = async (key: keyof BotSettings) => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    const updatedSettings = {
      ...settings,
      [key]: !settings[key]
    };

    // Optimistically update
    setSettings(updatedSettings);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (!response.ok) throw new Error();
    } catch (e) {
      // Revert if error
      setSettings(settings);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrefixChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newPrefix = formData.get('prefix') as string;

    if (!newPrefix) return;
    setIsUpdating(true);

    const updatedSettings = {
      ...settings,
      prefix: newPrefix
    };

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (response.ok) {
        alert('Configuration Prefix updated successfully!');
      }
    } catch (err) {
      alert('Failed to update prefix on active server.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGeneratePairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberInput) {
      setPairingError('Please enter a valid WhatsApp phone number with country code.');
      return;
    }
    setIsGeneratingCode(true);
    setPairingError('');
    try {
      const response = await fetch('/api/pair-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumberInput })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request pairing code.');
      }
      setServerPairingCode(data.code || '');
    } catch (err: any) {
      setPairingError(err.message || 'Could not connect to pairing endpoint.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to reset the session and log out? This will completely wipe all authentication details on the server to start fresh.")) {
      return;
    }
    setIsUpdating(true);
    setPairingError('');
    try {
      const response = await fetch('/api/logout', {
        method: 'POST'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to logout session.');
      }
      alert('Session reset successfully. A clean QR/Pairing pipeline has been re-armed!');
      setServerPairingCode('');
    } catch (err: any) {
      setPairingError(err.message || 'Could not trigger logout endpoint.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <header className="border-b border-gray-800 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <span className="text-3xl">🐣</span>
            <span className="absolute -bottom-1 -right-1 flex h-3.0 w-3.0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center">
              BUGGU MD <span className="ml-2 text-xs py-0.5 px-2 rounded-full bg-amber-500/10 text-brand-accent border border-amber-500/20">PREMIUM V1.0</span>
            </h1>
            <p className="text-xs text-gray-400">High-performance Baileys Multi-Device Controller</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 bg-gray-900/50 rounded-lg p-1.5 border border-gray-800">
            <button 
              onClick={() => setActiveTab('console')} 
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'console' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              <Terminal className="h-4 w-4" />
              <span>Control Room</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'settings' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              <Sliders className="h-4 w-4" />
              <span>Automation Toggles</span>
            </button>
            <button 
              onClick={() => setActiveTab('commands')} 
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'commands' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Command Index</span>
            </button>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-400">Status</div>
            <div className={`text-sm font-bold capitalize ${status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {status}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE NAVIGATION RAILS */}
      <div className="md:hidden flex justify-around border-b border-gray-800 bg-[#0b0f19] p-2 text-xs">
        <button 
          onClick={() => setActiveTab('console')}
          className={`px-3 py-1.5 rounded ${activeTab === 'console' ? 'bg-amber-500/20 text-brand-accent' : 'text-gray-400'}`}
        >
          Control Room
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 rounded ${activeTab === 'settings' ? 'bg-amber-500/20 text-brand-accent' : 'text-gray-400'}`}
        >
          Automation
        </button>
        <button 
          onClick={() => setActiveTab('commands')}
          className={`px-3 py-1.5 rounded ${activeTab === 'commands' ? 'bg-amber-500/20 text-brand-accent' : 'text-gray-400'}`}
        >
          Commands ({COMMANDS.length})
        </button>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: PAIRING STATUS & BOT INSIGHTS */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* PROFILE / BRAND CONTAINER */}
          <div className="rounded-2xl border border-gray-800 bg-[#0f1423] p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              LOCKED BRAND
            </div>
            <div className="w-24 h-24 rounded-full border-4 border-amber-500/20 bg-gray-900 mx-auto overflow-hidden flex items-center justify-center mb-4 shadow-xl">
              <img src="https://iili.io/CCMvy1n.jpg" alt="BUGGU MD Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">BUGGU MD</h2>
            <p className="text-xs text-gray-400 mb-2">Core Developer: <span className="text-amber-400 font-semibold">Divyansh Deewana</span></p>
            
            <div className="flex justify-center space-x-2 mb-4 bg-gray-950/20 py-1 px-2 rounded-lg border border-gray-900 w-fit mx-auto">
              <a href="https://i.ibb.co/tT1Z8nV6/x.jpg" target="_blank" rel="noreferrer" className="text-[10px] text-amber-500 hover:underline">Logo 1</a>
              <span className="text-[10px] text-gray-700">•</span>
              <a href="https://i.ibb.co/cXrfjdGZ/e5b639be4115.jpg" target="_blank" rel="noreferrer" className="text-[10px] text-amber-500 hover:underline">Logo 2</a>
              <span className="text-[10px] text-gray-700">•</span>
              <a href="https://iili.io/CCMvy1n.jpg" target="_blank" rel="noreferrer" className="text-[10px] text-amber-500 hover:underline">Logo 3</a>
            </div>

            <div className="text-left bg-gray-950/50 p-3 rounded-xl border border-gray-900 text-xs flex justify-between items-center">
              <div>
                <span className="text-gray-500 block">Prefix Mode</span>
                <span className="font-mono text-white text-base font-bold">{settings.prefix || '.'}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 block text-[10px]">LOCKED PROFILE</span>
                <span className="text-amber-500 text-xs font-bold font-mono">Premium Core</span>
              </div>
            </div>
          </div>

          {/* DEVICE COUPLING WORKSPACE (QR & PAIRING CODE) */}
          <div className="rounded-2xl border border-gray-800 bg-[#0e1320] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center">
                <Radio className="h-4 w-4 mr-2 text-amber-500 animate-pulse" />
                Connection Link
              </h3>
              {/* Tabs for QR vs Pairing Code */}
              {status !== 'connected' && (
                <div className="flex space-x-1 bg-gray-950 p-0.5 rounded-lg border border-gray-800">
                  <button
                    onClick={() => setPairingMethod('qr')}
                    className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${pairingMethod === 'qr' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    QR Code
                  </button>
                  <button
                    onClick={() => setPairingMethod('phone')}
                    className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${pairingMethod === 'phone' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    Pair Code
                  </button>
                </div>
              )}
            </div>

            {status === 'connected' ? (
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-6 text-center space-y-3">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
                <div>
                  <h4 className="text-emerald-400 font-bold">Successfully Connected</h4>
                  <p className="text-xs text-gray-400 mt-1 mb-2">BUGGU MD is dynamically synchronized with your phone device. Keep-alive system is fully armed!</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] py-1.5 rounded uppercase tracking-wider transition-colors"
                >
                  Disconnect & Logout
                </button>
              </div>
            ) : pairingMethod === 'qr' ? (
              // QR CODE VIEW
              qrCode ? (
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-xl max-w-[220px] mx-auto shadow-2xl">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                      alt="Scan to login"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-center space-y-2 leading-relaxed bg-[#111827] p-3 rounded-lg border border-gray-800">
                    <p className="text-amber-400 font-bold flex items-center justify-center">
                      <Sparkles className="h-3.0 w-3.0 mr-1.5" />
                      QR Instructions
                    </p>
                    <p>1. Open WhatsApp &rarr; Linked Devices &rarr; Link a Device.</p>
                    <p>2. Scan this QR Code to pair BUGGU MD.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 space-y-4 bg-gray-950/30 rounded-xl border border-dashed border-gray-800">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-amber-500/50" />
                  <div className="text-xs">
                    Generating secure QR code pipeline...
                    <p className="text-[10px] text-gray-600 mt-1">Usually takes 5-10 seconds to compile credentials.</p>
                  </div>
                </div>
              )
            ) : (
              // PHONE NUMBER PAIRING VIEW
              <div className="space-y-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Enter your phone number with your country code (e.g., <span className="font-mono text-amber-400 font-semibold">918274932155</span> for India or <span className="font-mono text-amber-400 font-semibold">1xxxxxxxxxx</span> for US) to request a temporary secure pairing code.
                </p>

                {pairingError && (
                  <div className="bg-red-950/20 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{pairingError}</span>
                  </div>
                )}

                {serverPairingCode ? (
                  <div className="text-center space-y-4 bg-gray-950/40 p-4 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Your WhatsApp Pairing Code</span>
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="flex justify-center items-center space-x-1 sm:space-x-2">
                        {serverPairingCode.split('').map((char, idx) => (
                          <span key={idx} className={`w-8 h-10 flex items-center justify-center bg-gray-900 border border-gray-800 rounded text-lg font-black text-amber-400 font-mono shadow-inner ${char === '-' ? 'bg-transparent border-none text-gray-500 w-4' : ''}`}>
                            {char}
                          </span>
                        ))}
                      </div>
                      
                      <button
                        type="button"
                        id="copy-pair-code-btn"
                        onClick={() => {
                          const cleanCode = serverPairingCode.replace(/[^a-zA-Z0-9]/g, '');
                          navigator.clipboard.writeText(cleanCode || serverPairingCode);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                          copiedCode 
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                            : 'bg-gray-900 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-850 hover:border-gray-700'
                        }`}
                      >
                        {copiedCode ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Code Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                            <span>Copy 8-Digit Code</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-xs text-gray-400 text-left space-y-2 leading-relaxed bg-[#111827] p-3 rounded-lg border border-gray-800">
                      <p>1. Open WhatsApp &rarr; Linked Devices &rarr; Link a Device.</p>
                      <p>2. Tap <span className="text-amber-500 font-semibold">Link with phone number instead</span>.</p>
                      <p>3. Enter the 8-character coupling code above.</p>
                    </div>
                    <button
                      type="button"
                      id="request-new-code-btn"
                      onClick={() => setServerPairingCode('')}
                      className="text-[10px] uppercase font-bold tracking-wider text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Request New Code
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleGeneratePairingCode} className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-gray-400 block mb-1">WhatsApp Phone Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 918274932155"
                        value={phoneNumberInput}
                        onChange={(e) => setPhoneNumberInput(e.target.value)}
                        className="bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500 w-full placeholder:text-gray-700"
                        disabled={isGeneratingCode}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isGeneratingCode}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-800 disabled:text-gray-500 transition-colors text-black font-extrabold text-xs py-3 rounded-lg uppercase tracking-wider flex items-center justify-center space-x-2"
                    >
                      {isGeneratingCode ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <span>Generate Pairing Code</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
            
            {status !== 'connected' && (
              <div className="pt-2 border-t border-gray-800/80">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/20 font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all flex items-center justify-center space-x-1 px-3"
                >
                  <RefreshCw className="h-3.0 w-3.0" />
                  <span>Reset Session & Clean Cache</span>
                </button>
              </div>
            )}
          </div>

          {/* PREFIX CONFIGURATOR */}
          <div className="rounded-2xl border border-gray-800 bg-[#0e1320] p-6">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3">
              Action Key / Prefix
            </h3>
            <p className="text-xs text-gray-400 mb-4">BUGGU recognizes trigger characters before actions. Defaulters use period ( . )</p>
            <form onSubmit={handlePrefixChange} className="flex space-x-2">
              <input
                type="text"
                name="prefix"
                defaultValue={settings.prefix}
                maxLength={3}
                placeholder="."
                className="bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 font-mono text-center text-lg w-20 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
              />
              <button 
                type="submit"
                disabled={isUpdating}
                className="flex-1 bg-amber-500 hover:bg-amber-600 transition-colors text-black font-extrabold text-xs tracking-wider rounded-lg uppercase"
              >
                Apply Prefix
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT TWO COLUMNS: DYNAMIC WORKSPACES */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CONTROL ROOM WORKSPACE (TERMINAL LOGS) */}
          {activeTab === 'console' && (
            <div className="rounded-2xl border border-gray-800 bg-[#0e1320] flex flex-col h-[580px] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-bold text-white tracking-wide uppercase">BUGGU CORE STDOUT STREAM</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] text-gray-500 uppercase font-mono">REAL-TIME</span>
                </div>
              </div>

              {/* LOG CONTAINER */}
              <div className="flex-1 p-6 font-mono text-xs bg-black/40 overflow-y-auto space-y-2 select-text">
                {logs.length === 0 ? (
                  <div className="text-gray-500 italic text-center py-12">
                    Awaiting server messages is active... All bootup, query APIs (Movie details, Spotify tracks, SIM record checks) will stream logs here.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-gray-300 leading-relaxed border-l-2 border-amber-500/30 pl-3">
                      {log}
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-gray-800 bg-gray-950/50 flex justify-between text-xs text-gray-500 font-mono">
                <span>BUFFER SIZE: {logs.length} / 100</span>
                <span>SYSTEM LOCAL TIME: 2026-06-13</span>
              </div>
            </div>
          )}

          {/* AUTOMATION SWITCHERS WORKSPACE */}
          {activeTab === 'settings' && (
            <div className="rounded-2xl border border-gray-800 bg-[#0e1320] p-6 space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-white">System Automation Matrix</h3>
                <p className="text-xs text-gray-400 mt-1">BUGGU MD runs background tasks automatically. Toggle flags dynamically; configurations commit to the database instantly.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* AUTO READ */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">👀</span> Auto Read Messages
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Instantly mark incoming chats as read.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('autoread')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoread ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.autoread ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* AUTO REACT */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">❤️</span> Auto React
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">React immediately to all incoming chats.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('autoreact')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoreact ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.autoreact ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* AUTO STATUS VIEW */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">📸</span> Auto Status View
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">View statuses of contacts instantly.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('autostatusview')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autostatusview ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.autostatusview ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* AUTO STATUS REACT */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">😍</span> Auto Status React
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Trigger emojis when status stories loaded.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('autostatusreact')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autostatusreact ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.autostatusreact ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* ANTI DELETE */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">🛡️</span> Anti Delete Protection
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Intercept deleted/revoked items instantly.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('antidelete')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.antidelete ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.antidelete ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* ANTI CALL */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">🚫</span> Anti Call Rejector
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Instantly drop incoming voice/video calls.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('anticall')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.anticall ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.anticall ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* ANTI LINK */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">🔗</span> Anti Link Group Shield
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Block active URL sharing in group rooms.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('antilink')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.antilink ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.antilink ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* AUTO REPLY */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">🤖</span> Intelligent Auto Reply
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Formulate auto responses using presets.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('autoreply')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoreply ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.autoreply ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* AUTO REACT DM */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">💬</span> DM Solo React
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Restrict auto-reactions to DM logs only.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('autoreactdm')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoreactdm ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.autoreactdm ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* AUTO REACT GROUP */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">👨‍👩‍👧‍👦</span> Group React Limit
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Restrict auto-reactions to Group chats.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('autoreactgc')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoreactgc ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.autoreactgc ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* AUTO TYPING */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">⌨️</span> Auto Typing Simulator
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Simulate active typing composing status on receipt.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('autotyping')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autotyping ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.autotyping ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* AUTO RECORDING */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">🎤</span> Auto Recording Simulator
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Simulate voice recording status on receipt.</p>
                  </div>
                  <button 
                     onClick={() => handleToggle('recording')}
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.recording ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.recording ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* ALWAYS ONLINE */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">🌐</span> Always Online Mode
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Force always online presence signals to WhatsApp.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('online')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.online ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.online ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* ANTI EDIT */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">🛠️</span> Anti Edit Monitor
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Trace/Highlight modified message content logs.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('antiedit')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.antiedit ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.antiedit ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* WELCOME */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">🎉</span> Welcome Greetings
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Broadcast custom greetings to newly joined group members.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('welcome')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.welcome ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.welcome ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* ADMIN ACTION */}
                <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 hover:border-gray-800 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center">
                      <span className="mr-2">⚡</span> Admin Promotions Log
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Track and notify member role promotions or demotions.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('adminaction')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.adminaction ? 'bg-amber-500' : 'bg-gray-800'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings.adminaction ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* COMMAND INDEX WORKSPACE */}
          {activeTab === 'commands' && (
            <div className="rounded-2xl border border-gray-800 bg-[#0e1320] p-6 space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-white">Dynamic Commands Index</h3>
                  <p className="text-xs text-gray-400 mt-1">A dynamically generated list of all registered command modules currently in system.</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search commands..."
                    className="bg-[#111827] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs w-full md:w-64 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* LIST VIEW */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                {filteredCommands.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No active command match found.
                  </div>
                ) : (
                  filteredCommands.map((cmd) => (
                    <div key={cmd.name} className="p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 flex items-start justify-between hover:border-gray-700 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-base">{cmd.emoji}</span>
                          <span className="font-mono text-sm font-bold text-amber-400">{settings.prefix || '.'}{cmd.name}</span>
                          <span className="text-[10px] uppercase tracking-wide bg-gray-800 text-gray-300 font-semibold px-2 py-0.5 rounded">
                            {cmd.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 pr-4">{cmd.description}</p>
                        <p className="text-[10px] font-mono text-gray-500">Usage: <span className="text-white">{cmd.usage}</span></p>
                      </div>
                      <div className="text-xs text-gray-600 font-mono">
                        Active
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-900 bg-gray-950/80 px-6 py-4 text-center text-xs text-gray-500">
        <div>&copy; 2026 BUGGU MD CONTROL SUITE. ALL RIGHTS RESERVED.</div>
        <div className="mt-1">Hand-crafted by Developer <span className="text-amber-400 font-bold">Divyansh Deewana</span></div>
      </footer>
    </div>
  );
}
