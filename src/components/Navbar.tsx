import React from 'react';
import { 
  FileText, ShieldCheck, Cpu, HardDrive, Bell, User, CheckCircle2, AlertTriangle, Layers, Key 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, pendingCount }) => {
  const { user } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg text-white shadow-md">
            TF
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-100">TFrenzy DocIntel</span>
              <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-semibold border border-blue-500/30">
                v1.3 Edge
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Handwritten Document Intelligence & Validation</p>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="hidden md:flex items-center space-x-6 text-xs text-slate-300">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-200">Jetson Orin: Ready (FP16 ONNX)</span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>OCR: PaddlePP-v6 + TrOCR</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <button
            id="nav-btn-verification"
            onClick={() => setActiveTab('verification')}
            className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'verification'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30'
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
            className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Arch & Specs</span>
          </button>

          <div 
            onClick={() => setActiveTab('login')}
            className="flex items-center space-x-2 pl-2 border-l border-slate-800 cursor-pointer hover:opacity-80 transition"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-semibold text-xs">
              {user ? user.fullName.split(' ').map(n => n[0]).join('') : 'R'}
            </div>
            <div className="hidden xl:block text-left text-xs">
              <p className="font-semibold text-slate-200">{user?.fullName || 'Rithika'}</p>
              <div className="flex items-center gap-1">
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-bold uppercase">
                  {user?.role || 'admin'}
                </span>
                <span className="text-[10px] text-slate-400">JWT Token</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
