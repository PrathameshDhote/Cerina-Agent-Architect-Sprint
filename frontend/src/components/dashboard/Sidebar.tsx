import React from 'react';
import { cn } from '../../utils/cn';
import { useProtocolStore } from '../../store/protocolStore';

interface SidebarProps {
  activeView: 'generator' | 'viewer' | 'history';
  setActiveView: (view: 'generator' | 'viewer' | 'history') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const { currentProtocol, isGenerating } = useProtocolStore();

  const menuItems = [
    {
      id: 'generator' as const,
      label: 'Generator',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      id: 'viewer' as const,
      label: 'Viewer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      disabled: !currentProtocol,
      badge: currentProtocol?.approval_status === 'pending_human_review',
    },
    {
      id: 'history' as const,
      label: 'History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // location of brand image; place your image in /public/brand.png or change this path
  const brandImage = '/logo.png';

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Brand image on the LEFT of the text */}
          <div className="w-10 h-10 flex-shrink-0">
            <img
              src={brandImage}
              alt="Cerina Logo"
              className="w-10 h-10 rounded-lg object-cover shadow-sm border border-gray-100"
              onError={(e) => {
                // if image not found, hide it so fallback gradient renders
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* Text block */}
          <div>
            <h2 className="font-bold text-gray-900">Cerina</h2>
            <p className="text-xs text-gray-500">Protocol Foundry</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && setActiveView(item.id)}
            disabled={item.disabled}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors',
              activeView === item.id
                ? 'bg-cerina-50 text-cerina-700'
                : item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-50'
            )}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && <span className="w-2 h-2 bg-cerina-600 rounded-full animate-pulse" />}
          </button>
        ))}
      </nav>

      {/* Status Indicator */}
      {isGenerating && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 bg-cerina-50 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="animate-spin h-5 w-5 text-cerina-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cerina-900">Generating Protocol</p>
              <p className="text-xs text-cerina-600 truncate">Agents are working...</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>Backend Connected</span>
        </div>
      </div>
    </aside>
  );
};
