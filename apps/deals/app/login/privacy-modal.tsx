'use client';

import { useState } from 'react';
import { cn } from '@/components/utils/cn';
import {
  Search,
  Laptop,
  Shield,
  ShieldCheck,
  ShieldAlert,
  X,
} from 'lucide-react';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'guidelines' | 'usage' | 'security';

export function PrivacyModal({ visible, onClose }: PrivacyModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const tabs = [
    { id: 'general' as const, label: 'General Policy' },
    { id: 'guidelines' as const, label: 'Deal Guidelines' },
    { id: 'usage' as const, label: 'Responsible Use' },
    { id: 'security' as const, label: 'Data Security' },
  ];

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 w-[640px] max-w-full z-10 flex flex-col h-[70vh] min-h-[70vh] max-h-[70vh] justify-between animate-in fade-in zoom-in-95 duration-200 text-[#111827]">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-0 bg-transparent flex items-center justify-center"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Header + Tabs */}
        <div>
          <div className="flex flex-col gap-1 pb-2 mb-4 text-left">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight pr-8">
              Terms &amp; Privacy Policy
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Deals Portal Terms &amp; Policy covers how we handle deal registrations and your data.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 mb-4 w-full justify-start gap-6 sm:gap-8 overflow-x-auto scrollbar-none bg-white">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'pb-3 text-[13px] sm:text-sm font-semibold transition-all relative cursor-pointer whitespace-nowrap bg-transparent border-0',
                  activeTab === tab.id
                    ? 'text-[#7b1fa2] border-b-2 border-[#7b1fa2] font-bold'
                    : 'text-gray-400 hover:text-gray-600',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 space-y-6 overflow-y-auto my-3 pr-2 text-left bg-white max-h-[42vh]">

          {activeTab === 'general' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300 bg-white">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">About Deal Registrations</h4>
                <p className="text-xs text-gray-600 leading-relaxed mt-2">
                  The Deals Portal is an internal pipeline management system designed to streamline deal registration, pipeline tracking, and collaboration between Account Officers, BU Heads, Product Managers, and Administrators.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Core Features</h4>
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7b1fa2] shrink-0">
                      <Search size={18} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-gray-900">Deal Registration Routing</span>
                      <span className="text-[11px] text-gray-500">Deals are automatically categorized and routed to the correct teams and BU Heads for review.</span>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7b1fa2] shrink-0">
                      <Laptop size={18} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-gray-900">Real-time Pipeline Tracking</span>
                      <span className="text-[11px] text-gray-500">Monitor deal progression from registration to closure in real time.</span>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7b1fa2] shrink-0">
                      <Shield size={18} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-gray-900">Secure Collaboration</span>
                      <span className="text-[11px] text-gray-500">Collaborate directly with business units while keeping deal data confidential.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-purple-50 border border-purple-100 p-4 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-[#7b1fa2] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Need Assistance?</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Contact our IT Support team at{' '}
                    <a
                      href="https://mail.google.com/mail/?view=cm&fs=1&to=it-appsdev@ics.com.ph"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7b1fa2] font-semibold hover:underline"
                    >
                      it-appsdev@ics.com.ph
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guidelines' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300 bg-white">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Accurate Deal Information</h4>
                <p className="text-xs text-gray-600 leading-relaxed mt-2">
                  When registering a deal, provide correct and complete information including the client name, product lines, deal value, and expected close date. Inaccurate submissions lead to delays in pipeline review and approval.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Supporting Documentation</h4>
                <p className="text-xs text-gray-600 leading-relaxed mt-2">
                  Upload accurate supporting documents such as quotations, LOIs, and client briefs. Verify all values before submitting so BU Heads and PMs can act on your deal immediately.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300 bg-white">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Guidelines for Responsible Use</h4>
                <p className="text-xs text-gray-600 leading-relaxed mt-2">
                  Use the Deals Portal responsibly. Do not create duplicate deal registrations or submit test entries into the live system. Duplicates inflate pipeline metrics and slow down the review process for all teams.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Professional Conduct</h4>
                <p className="text-xs text-gray-600 leading-relaxed mt-2">
                  All communication within deal records and comment sections must remain professional, respectful, and focused on progressing the deal pipeline.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300 bg-white">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Data Confidentiality</h4>
                <p className="text-xs text-gray-600 leading-relaxed mt-2 mb-4">
                  Deal details, including client names, pricing, and pipeline status, are strictly confidential. We only share relevant information with authorized business units and administrators as required to process the deal.
                </p>

                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Safety First</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Your data is encrypted in transit and at rest. We do not expose deal history or client information to unauthorized third parties.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-center pt-4 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-10 py-2.5 font-bold h-11 text-sm rounded-full bg-[#7b1fa2] hover:bg-[#6a1b91] active:bg-[#5e1780] text-white shadow-md transition-all cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
