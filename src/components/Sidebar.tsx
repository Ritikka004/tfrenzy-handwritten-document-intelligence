import React from 'react';
import { 
  LayoutDashboard, Upload, ListOrdered, ShieldCheck, Search, 
  Sliders, Database, Download, Activity, Settings, FileCode, CheckCircle, BarChart2
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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 hidden md:flex">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Core Workflows
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-link-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Edge System Health Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-1">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>System Health 100%</span>
        </div>
        <p className="text-[11px] text-slate-400">PostgreSQL: Connected</p>
        <p className="text-[11px] text-slate-400">Celery Redis: Active (4 Workers)</p>
      </div>
    </aside>
  );
};
