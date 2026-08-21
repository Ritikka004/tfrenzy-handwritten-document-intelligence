import React from 'react';
import {
  FileText, ShieldCheck, Cpu, HardDrive, Bell, User, CheckCircle2, AlertTriangle, Layers, Key, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, pendingCount }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-slate-900/85 backdrop-blur-md border-b border-slate-800/80 text-white sticky top-0 z-50 shadow-lg shadow-slate-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => setActiveTab('dashboard')}
          title="Return to Dashboard"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center font-extrabold text-lg text-white shadow-md shadow-blue-900/30 border border-blue-400/20 group-hover:scale-105 transition-transform">
            TF
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-100 group-hover:text-blue-300 transition-colors">
                TFrenzy DocIntel
              </span>
              <span className="bg-blue-500/15 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                v1.3 Edge
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Handwritten Document Intelligence &amp; Validation</p>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="hidden md:flex items-center space-x-4 text-xs text-slate-300">
          <div className="flex items-center space-x-2 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-200 text-[11px]">Jetson Orin: Ready (FP16 ONNX)</span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] text-slate-300">OCR: TrOCR + Tesseract.js</span>
          </div>
        </div>

        {/* Right Actions & Profile */}
        <div className="flex items-center space-x-3">
          <button
            id="nav-btn-verification"
            onClick={() => setActiveTab('verification')}
            className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'verification'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/30'
                : 'bg-slate-950/80 hover:bg-slate-800 text-amber-400 border border-amber-500/30'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verification Queue</span>
            {pendingCount > 0 && (
              <span className="ml-1 bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-extrabold text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            id="nav-btn-docs"
            onClick={() => setActiveTab('architecture')}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-950/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Arch &amp; Specs</span>
          </button>

          {/* Profile & Logout Section */}
          <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-800/80">
            {/* User avatar + name */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600/40 to-blue-600/40 border border-indigo-500/40 flex items-center justify-center text-indigo-200 font-bold text-xs shadow-inner">
                {user ? user.fullName.split(' ').map(n => n[0]).join('') : 'R'}
              </div>
              <div className="hidden xl:block text-left text-xs">
                <p className="font-bold text-slate-200 leading-tight">{user?.fullName || 'Rithika'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                    {user?.role || 'admin'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">JWT</span>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              id="nav-btn-logout"
              onClick={logout}
              title="Sign Out of TFrenzy"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 transition-all cursor-pointer"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
