import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ProtocolGenerator } from '../protocol/ProtocolGenerator';
import { ProtocolViewer } from '../protocol/ProtocolViewer';
import { AgentActivity } from '../protocol/AgentActivity';
import { HistoryList } from '../protocol/HistoryList';
import { useProtocolStore } from '../../store/protocolStore';

export const DashboardLayout: React.FC = () => {
    const [activeView, setActiveView] = useState<'generator' | 'viewer' | 'history'>('generator');
    const { currentProtocol } = useProtocolStore();

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar activeView={activeView} setActiveView={setActiveView} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Header />

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Generator View */}
                        {activeView === 'generator' && (
                            <div className="space-y-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        Protocol Generator
                                    </h1>
                                    <p className="mt-2 text-gray-600">
                                        Generate comprehensive CBT protocols using our multi-agent AI system
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left: Generator Form */}
                                    <div className="lg:col-span-2">
                                        <ProtocolGenerator />
                                    </div>

                                    {/* Right: Agent Activity */}
                                    <div className="lg:col-span-1">
                                        <AgentActivity />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Viewer View */}
                        {activeView === 'viewer' && currentProtocol && (
                            <div className="space-y-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        Protocol Viewer
                                    </h1>
                                    <p className="mt-2 text-gray-600">
                                        Review and approve generated protocols
                                    </p>
                                </div>

                                <ProtocolViewer />
                            </div>
                        )}

                        {/* History View */}
                        {activeView === 'history' && (
                            <div className="space-y-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        Protocol History
                                    </h1>
                                    <p className="mt-2 text-gray-600">
                                        View all generated protocols
                                    </p>
                                </div>

                                <HistoryList />
                            </div>
                        )}

                        {/* No Protocol Selected */}
                        {activeView === 'viewer' && !currentProtocol && (
                            <div className="card text-center py-12">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                        <svg
                                            className="w-8 h-8 text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                            No Protocol Selected
                                        </h3>
                                        <p className="mt-1 text-gray-500">
                                            Generate a protocol to view it here
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setActiveView('generator')}
                                        className="btn-primary"
                                    >
                                        Go to Generator
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
