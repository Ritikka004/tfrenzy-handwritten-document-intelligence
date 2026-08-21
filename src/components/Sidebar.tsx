import React from 'react';
import { 
  LayoutDashboard, Upload, ListOrdered, ShieldCheck, Search, 
  Sliders, Database, Download, Activity, Settings, FileCode, CheckCircle2, BarChart2
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, pendingCount }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'data-quality', label: 'Data Quality Dashboard', icon: BarChart2 },
    { id: 'upload', label: 'Upload Documents', icon: Upload },
    { id: 'queue', label: 'Processing Queue', icon: ListOrdered },
    { id: 'verification', label: 'Verification Screen', icon: ShieldCheck, badge: pendingCount },
    { id: 'search', label: 'Document Search', icon: Search },
    { id: 'preprocessing', label: 'OpenCV Preprocessing', icon: Sliders },
    { id: 'template', label: 'Template Configuration', icon: Sliders },
    { id: 'dataset', label: 'Dataset Manager', icon: Database },
    { id: 'export', label: 'Export Centre', icon: Download },
    { id: 'performance', label: 'Model Performance', icon: Activity },
    { id: 'settings', label: 'Settings & Audit Logs', icon: Settings },
    { id: 'architecture', label: 'Architecture & Specs', icon: FileCode }
  ];

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800/80 text-slate-300 flex flex-col justify-between shrink-0 hidden md:flex select-none">
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          Core Workflows
        </div>

        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-900/30'
                    : 'hover:bg-slate-800/70 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? 'bg-white text-blue-900 shadow-sm'
                      : 'bg-amber-500 text-slate-950 font-bold'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Edge System Health Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 m-2 rounded-xl shrink-0 mt-auto">
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px]">System Status: Operational</span>
        </div>
        <div className="space-y-0.5 text-[10px] text-slate-400 font-mono">
          <p className="flex justify-between"><span>DB:</span> <span className="text-slate-300">PostgreSQL (5432)</span></p>
          <p className="flex justify-between"><span>Queue:</span> <span className="text-slate-300">Redis (6379)</span></p>
          <p className="flex justify-between"><span>Inference:</span> <span className="text-slate-300">TrOCR + Tesseract.js</span></p>
        </div>
      </div>
    </aside>
  );
};
