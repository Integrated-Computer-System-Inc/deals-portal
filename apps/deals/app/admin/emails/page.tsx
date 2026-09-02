'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@my-app/types';
import {
  AppEmailConfigRecord,
  EmailRecipientItem,
  getEmailConfig,
  saveEmailConfig,
  sendTestNotificationEmail,
} from '@/app/actions/email-config';
import { TEST_SCENARIO_OPTIONS, getScenarioEmailTemplate } from '@/lib/email-templates';
import EmailAccountPicker from '@/components/admin/EmailAccountPicker';
import { AppCard } from '@/components/ui/cards';
import { AppButton } from '@/components/ui/buttons';
import { AppModal, AppModalHeader, AppModalTitle, AppModalDescription, AppModalBody, AppModalFooter } from '@/components/ui/modal';
import {
  Mail,
  Shield,
  ShieldAlert,
  Send,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  Radio,
  Info,
  Sparkles,
  Layers,
  ChevronDown,
  Eye,
} from 'lucide-react';

export default function AdminEmailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const currentUserRole = (session?.user as any)?.role as UserRole | undefined;

  // Configuration State
  const [mode, setMode] = useState<'DEV' | 'LIVE'>('DEV');
  const [devRecipients, setDevRecipients] = useState<EmailRecipientItem[]>([]);
  const [devCCRecipients, setDevCCRecipients] = useState<EmailRecipientItem[]>([]);
  const [devBCCRecipients, setDevBCCRecipients] = useState<EmailRecipientItem[]>([]);
  const [liveCCRecipients, setLiveCCRecipients] = useState<EmailRecipientItem[]>([]);
  const [liveBCCRecipients, setLiveBCCRecipients] = useState<EmailRecipientItem[]>([]);
  const [includeBuHead, setIncludeBuHead] = useState(true);
  const [includeAdminAndAA, setIncludeAdminAndAA] = useState(true);
  const [includeBrandPm, setIncludeBrandPm] = useState(true);

  // Metadata
  const [lastUpdatedBy, setLastUpdatedBy] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test Email State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>('CREATE');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    recipients?: { to: string[]; cc: string[]; bcc: string[]; mode: string };
    error?: string;
  } | null>(null);

  const loadConfig = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getEmailConfig();
      if (res.success && res.data) {
        setMode(res.data.mode);
        setDevRecipients(res.data.devRecipients || []);
        setDevCCRecipients(res.data.devCCRecipients || []);
        setDevBCCRecipients(res.data.devBCCRecipients || []);
        setLiveCCRecipients(res.data.liveCCRecipients || []);
        setLiveBCCRecipients(res.data.liveBCCRecipients || []);
        setIncludeBuHead(res.data.includeBuHead);
        setIncludeAdminAndAA(res.data.includeAdminAndAA);
        setIncludeBrandPm(res.data.includeBrandPm);
        setLastUpdatedBy(res.data.updatedBy);
        setLastUpdatedAt(res.data.updatedAt);
      } else {
        setErrorMessage(res.error || 'Failed to load email configuration');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && currentUserRole === 'ITadmin') {
      loadConfig();
    } else if (status === 'authenticated' && currentUserRole !== 'ITadmin') {
      setIsLoading(false);
    }
  }, [status, currentUserRole]);

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await saveEmailConfig({
        mode,
        devRecipients,
        devCCRecipients,
        devBCCRecipients,
        liveCCRecipients,
        liveBCCRecipients,
        includeBuHead,
        includeAdminAndAA,
        includeBrandPm,
      });

      if (res.success) {
        setSaveSuccessMessage('Email configuration updated and saved successfully.');
        setTimeout(() => setSaveSuccessMessage(null), 5000);
        await loadConfig();
      } else {
        setErrorMessage(res.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Test Email
  const handleSendTest = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await sendTestNotificationEmail(selectedScenario);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Failed to dispatch test email.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Active Live Email Preview calculation
  const activePreview = useMemo(() => {
    const toList = mode === 'DEV'
      ? devRecipients.map((r) => r.email).filter(Boolean)
      : [session?.user?.email || 'itadmin@ics.com.ph'];
    const ccList = mode === 'DEV'
      ? devCCRecipients.map((r) => r.email).filter(Boolean)
      : ['asy-lu@ics.com.ph', 'afrancisco@ics.com.ph', ...liveCCRecipients.map((r) => r.email).filter(Boolean)];
    const bccList = mode === 'DEV'
      ? devBCCRecipients.map((r) => r.email).filter(Boolean)
      : liveBCCRecipients.map((r) => r.email).filter(Boolean);

    const template = getScenarioEmailTemplate(selectedScenario, {
      mode,
      aoNickName: session?.user?.name?.split(' ')[0] || 'User',
      triggeredBy: `${session?.user?.name || 'IT Admin'} (${session?.user?.email || 'No Email'})`,
      toEmails: toList,
      ccEmails: ccList,
      bccEmails: bccList,
    });

    let finalSubject = template.subject;
    if (mode === 'DEV') {
      const intendedName = session?.user?.name?.split(' ')[0] || 'AO';
      finalSubject = `[DEV MODE - Intended for: ${intendedName}] ${finalSubject}`;
    }

    return {
      from: '"NoReply: Deals Registration" <noreply-newsite@ics.com.ph>',
      to: toList,
      cc: ccList,
      bcc: bccList,
      subject: finalSubject,
      htmlMessage: template.message,
    };
  }, [selectedScenario, mode, devRecipients, devCCRecipients, devBCCRecipients, liveCCRecipients, liveBCCRecipients, session]);

  // Access check
  if (status === 'authenticated' && currentUserRole !== 'ITadmin') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <AppCard className="p-8 text-center bg-card-bg border border-border/80 rounded-2xl shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-xs text-muted max-w-md mx-auto">
            Email Configuration is restricted to IT Administrators. If you need access, please contact the IT department.
          </p>
          <AppButton variant="neutral" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </AppButton>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Email Configuration
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                mode === 'DEV'
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              }`}>
                {mode} MODE ACTIVE
              </span>
            </div>
            <p className="text-xs text-muted">
              Configure system notification recipient routing (TO, CC, BCC) and toggle between Dev and Live modes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setTestResult(null);
              setIsTestModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral hover:bg-neutral/80 text-foreground border border-border rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5 text-sky-600" />
            <span>Send Test Email</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-muted">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-xs">Loading email configuration...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Notification Mode Selector */}
          <AppCard className="p-5 bg-card-bg border border-border/80 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-sm text-foreground">1. System Notification Mode</h2>
              </div>
              <div className="text-[11px] text-muted">
                Last modified by <span className="font-semibold text-foreground">{lastUpdatedBy || 'SYSTEM'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dev Mode Option */}
              <div
                onClick={() => setMode('DEV')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                  mode === 'DEV'
                    ? 'bg-amber-500/5 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-background border-border/60 hover:border-border'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">Dev / Testing Mode</h3>
                          {mode === 'DEV' && (
                            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted">Safe sandbox mode for internal IT & AppsDev team</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="modeSelect"
                      checked={mode === 'DEV'}
                      onChange={() => setMode('DEV')}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-border/50 text-xs text-muted space-y-1">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold text-[11px]">
                      <span>Recipient Routing Rule:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90 font-medium">
                      All portal notification triggers are completely redirected to the <strong>Dev Mode Recipients (TO, CC, BCC)</strong> configured below. Real sales officers, BU heads, and customers are shielded from receiving emails.
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Mode Option */}
              <div
                onClick={() => setMode('LIVE')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                  mode === 'LIVE'
                    ? 'bg-emerald-500/5 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-background border-border/60 hover:border-border'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">Live / Production Mode</h3>
                          {mode === 'LIVE' && (
                            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted">Production delivery to actual business users</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="modeSelect"
                      checked={mode === 'LIVE'}
                      onChange={() => setMode('LIVE')}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-border/50 text-xs text-muted space-y-1">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold text-[11px]">
                      <span>Recipient Routing Rule:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300/90 font-medium">
                      Notifications are automatically delivered to the deal's <strong>Assigned AO (TO)</strong>, designated <strong>BU Head (CC)</strong>, <strong>Sales Admin & AA (CC)</strong>, <strong>Assigned Brand PM (CC)</strong>, and <strong>IT Team (BCC)</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AppCard>

          {/* Section 2: Dev Mode Intercepted Recipients (TO, CC, BCC) */}
          <AppCard className={`p-5 rounded-2xl shadow-xs space-y-5 border transition duration-200 ${
            mode === 'DEV'
              ? 'bg-card-bg border-amber-500/50 ring-2 ring-amber-500/20 shadow-md'
              : 'bg-card-bg/60 border-border/50 opacity-60'
          }`}>
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className={`w-4 h-4 ${mode === 'DEV' ? 'text-amber-500' : 'text-muted'}`} />
                <h2 className="font-bold text-sm text-foreground">2. Dev / Testing Mode Manual Recipients (TO, CC, BCC)</h2>
              </div>
              {mode === 'DEV' ? (
                <span className="text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Active in Dev Mode
                </span>
              ) : (
                <span className="text-[11px] font-medium text-muted bg-neutral px-2 py-0.5 rounded-full border border-border">
                  Inactive in Live Mode
                </span>
              )}
            </div>

            {/* Dev Mode TO Picker */}
            <EmailAccountPicker
              label="Dev Mode Intercepted TO List (Primary Recipients)"
              description="Primary recipients who receive the main notification TO in Dev Mode."
              recipients={devRecipients}
              onChange={setDevRecipients}
              badgeVariant="amber"
              placeholder="Search directory or type custom email for Dev TO (e.g. tester@ics.com.ph)..."
            />

            {/* Dev Mode CC Picker */}
            <EmailAccountPicker
              label="Dev Mode Intercepted CC List"
              description="Optional testing recipients included on the CC line in Dev Mode."
              recipients={devCCRecipients}
              onChange={setDevCCRecipients}
              badgeVariant="sky"
              placeholder="Search directory or type custom email for Dev CC (e.g. dev-cc@ics.com.ph)..."
            />

            {/* Dev Mode BCC Picker */}
            <EmailAccountPicker
              label="Dev Mode Intercepted BCC List"
              description="Optional testing recipients included on the BCC line in Dev Mode."
              recipients={devBCCRecipients}
              onChange={setDevBCCRecipients}
              badgeVariant="indigo"
              placeholder="Search directory or type custom email for Dev BCC (e.g. dev-bcc@ics.com.ph)..."
            />
          </AppCard>

          {/* Section 3: Live Mode Global Rules & Custom Routing */}
          <AppCard className={`p-5 rounded-2xl shadow-xs space-y-5 border transition duration-200 ${
            mode === 'LIVE'
              ? 'bg-card-bg border-emerald-500/50 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-card-bg/60 border-border/50 opacity-60'
          }`}>
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${mode === 'LIVE' ? 'text-emerald-600' : 'text-muted'}`} />
                <h2 className="font-bold text-sm text-foreground">3. Live Production Routing Rules (CC & BCC)</h2>
              </div>
              {mode === 'LIVE' ? (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Active in Live Mode
                </span>
              ) : (
                <span className="text-[11px] font-medium text-muted bg-neutral px-2 py-0.5 rounded-full border border-border">
                  Inactive in Dev Mode
                </span>
              )}
            </div>

            {/* Automatic Routing Rules Summary */}
            <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Automatic Live Recipient Dispatch Pipeline</span>
              </div>
              <ul className="space-y-1 text-[11px] text-muted list-disc list-inside">
                <li><strong className="text-foreground">TO:</strong> Automatically resolved Assigned AO for each deal.</li>
                <li><strong className="text-foreground">CC (BU Head):</strong> Queries <code className="font-mono bg-neutral px-1 rounded">cdbAccounts</code> for the deal's BU Head.</li>
                <li><strong className="text-foreground">CC (Admin & AA):</strong> Automatically CCs <code className="font-mono bg-neutral px-1 rounded">asy-lu@ics.com.ph</code> and <code className="font-mono bg-neutral px-1 rounded">afrancisco@ics.com.ph</code>.</li>
                <li><strong className="text-foreground">CC (Brand PM):</strong> Automatically resolves Product Manager(s) from <code className="font-mono bg-neutral px-1 rounded">dbo.DealBrands</code> and <code className="font-mono bg-neutral px-1 rounded">dbo.Users</code> for the deal's brand.</li>
                <li><strong className="text-foreground">BCC:</strong> IT Monitoring distribution list configured below.</li>
              </ul>
            </div>

            {/* Dynamic Rule Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-background border border-border rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBuHead}
                  onChange={(e) => setIncludeBuHead(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-primary rounded border-border focus:ring-primary/20"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Automatically CC BU Head</span>
                  <span className="text-[11px] text-muted">
                    Queries cdbAccounts directory for the deal's Business Unit head and includes them on CC.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAdminAndAA}
                  onChange={(e) => setIncludeAdminAndAA(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-primary rounded border-border focus:ring-primary/20"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Automatically CC Admin & AA</span>
                  <span className="text-[11px] text-muted">
                    Includes Adeliana Sy-Lu (asy-lu@ics.com.ph) & Athena Francisco (afrancisco@ics.com.ph).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBrandPm}
                  onChange={(e) => setIncludeBrandPm(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-primary rounded border-border focus:ring-primary/20"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Automatically CC Brand PM</span>
                  <span className="text-[11px] text-muted">
                    Resolves designated PM(s) from dbo.DealBrands & PM user accounts for the deal's brand.
                  </span>
                </div>
              </label>
            </div>

            {/* Global Additional CC Picker */}
            <EmailAccountPicker
              label="Live Mode Additional Custom CC Recipients"
              description="Additional designated administrators or managers who should also receive CC on all live notifications."
              recipients={liveCCRecipients}
              onChange={setLiveCCRecipients}
              badgeVariant="sky"
              placeholder="Search directory to add custom CC recipient (e.g. user@ics.com.ph)..."
            />

            {/* Global BCC Picker */}
            <EmailAccountPicker
              label="Live Mode Global BCC Recipients (IT Team / Monitoring)"
              description="IT distribution list for audit logging and notification system monitoring."
              recipients={liveBCCRecipients}
              onChange={setLiveBCCRecipients}
              badgeVariant="indigo"
              placeholder="Search directory to add BCC recipient (e.g. it-admin@ics.com.ph)..."
            />
          </AppCard>

          {/* Bottom Sticky Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card-bg border border-border/80 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                Changes take effect immediately across all deal creation, updates, renewals, and background cron expiration scans.
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : 'Save Email Configuration'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Test Email Modal: Email Client Preview & Testing Center */}
      <AppModal open={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} width={740}>
        <AppModalHeader>
          <div className="flex items-center gap-2 text-primary">
            <Send className="w-5 h-5 text-sky-600" />
            <AppModalTitle>Send Test Notification Email</AppModalTitle>
          </div>
          <AppModalDescription>
            Select an email scenario and inspect the live envelope headers and rendered email body before dispatch.
          </AppModalDescription>
        </AppModalHeader>

        <AppModalBody className="space-y-4 py-2 text-xs">
          {/* Scenario Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Select Notification Scenario</span>
            </label>
            <div className="relative">
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-card-bg border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition cursor-pointer appearance-none shadow-2xs"
              >
                {TEST_SCENARIO_OPTIONS.map((sc) => (
                  <option key={sc.value} value={sc.value}>
                    {sc.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Email Client Envelope Box */}
          <div className="p-3.5 rounded-xl bg-neutral/50 border border-border/80 space-y-2.5 font-sans">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Email Envelope</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                mode === 'DEV'
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              }`}>
                {mode} MODE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 text-[11px]">
              <span className="sm:col-span-2 font-bold text-muted">From:</span>
              <span className="sm:col-span-10 font-mono text-foreground">{activePreview.from}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 text-[11px]">
              <span className="sm:col-span-2 font-bold text-muted">To:</span>
              <span className="sm:col-span-10 font-mono text-sky-600 font-semibold break-all">
                {activePreview.to.length > 0 ? activePreview.to.join(', ') : '(No TO recipients configured)'}
              </span>
            </div>

            {activePreview.cc.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 text-[11px]">
                <span className="sm:col-span-2 font-bold text-muted">Cc:</span>
                <span className="sm:col-span-10 font-mono text-foreground/80 break-all">
                  {activePreview.cc.join(', ')}
                </span>
              </div>
            )}

            {activePreview.bcc.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 text-[11px]">
                <span className="sm:col-span-2 font-bold text-muted">Bcc:</span>
                <span className="sm:col-span-10 font-mono text-foreground/80 break-all">
                  {activePreview.bcc.join(', ')}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 text-[11px] pt-1.5 border-t border-border/40">
              <span className="sm:col-span-2 font-bold text-muted">Subject:</span>
              <span className="sm:col-span-10 font-semibold text-foreground break-all">{activePreview.subject}</span>
            </div>
          </div>

          {/* Email Body Live Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-sky-600" />
                <span>Live Email Body Preview</span>
              </label>
              <span className="text-[10px] text-muted">Formatted HTML Template</span>
            </div>

            <div className="border border-border/80 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 shadow-inner">
              <div className="max-h-72 overflow-y-auto p-4 flex justify-center">
                <div
                  className="w-full max-w-[600px] bg-white rounded-lg shadow-sm overflow-hidden text-slate-800 text-left pointer-events-none select-text"
                  dangerouslySetInnerHTML={{ __html: activePreview.htmlMessage }}
                />
              </div>
            </div>
          </div>

          {/* Dispatch Result Feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2.5 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 min-w-0">
                <p className="font-bold">{testResult.success ? 'Dispatch Success!' : 'Dispatch Failed'}</p>
                <p className="text-[11px] leading-relaxed">
                  {testResult.message || testResult.error}
                </p>
              </div>
            </div>
          )}
        </AppModalBody>

        <AppModalFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setIsTestModalOpen(false)}
            disabled={isSendingTest}
            className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-neutral rounded-xl transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSendTest}
            disabled={isSendingTest || (mode === 'DEV' && devRecipients.length === 0)}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isSendingTest ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSendingTest ? 'Sending Test Email...' : 'Send Test Now'}</span>
          </button>
        </AppModalFooter>
      </AppModal>
    </div>
  );
}
