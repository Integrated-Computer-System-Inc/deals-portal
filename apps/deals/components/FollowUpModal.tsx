'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Send,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  RemoveFormatting,
  RotateCcw,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { message as antMessage } from 'antd';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppInput,
  AppAvatar,
} from './ui';
import {
  getFollowUpDealContext,
  sendFollowUpEmail,
  FollowUpDealContext,
} from '@/app/actions/follow-up';

export interface FollowUpModalProps {
  dealID: number | null;
  dealRegID?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EmailChipInputProps {
  label: string;
  placeholder?: string;
  emails: string[];
  onChange: (emails: string[]) => void;
  required?: boolean;
  highlightEmail?: string;
  highlightBadge?: string;
  helperText?: string;
}

function EmailChipInput({
  label,
  placeholder = 'Add email and press Enter...',
  emails,
  onChange,
  required = false,
  highlightEmail,
  highlightBadge = 'You',
  helperText,
}: EmailChipInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleAddEmail = (raw: string) => {
    const trimmed = raw.trim().toLowerCase().replace(/[,;]/g, '');
    if (!trimmed) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setInputError(`"${trimmed}" is not a valid email address.`);
      return;
    }

    if (emails.includes(trimmed)) {
      setInputError(`"${trimmed}" is already in the recipient list.`);
      return;
    }

    setInputError(null);
    onChange([...emails, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      handleAddEmail(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      onChange(emails.slice(0, -1));
    }
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(emails.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
          {label}
          {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[11px] text-muted-foreground">
          {emails.length} recipient{emails.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="min-h-[40px] p-1.5 border border-border/70 rounded-xl bg-neutral/20 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 flex flex-wrap items-center gap-1.5 transition-all">
        {emails.map((email, idx) => {
          const isHighlighted =
            Boolean(highlightEmail) &&
            email.toLowerCase().trim() === highlightEmail?.toLowerCase().trim();

          return (
            <span
              key={idx}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border shadow-2xs transition-all ${
                isHighlighted
                  ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 dark:bg-purple-900/30 font-semibold'
                  : 'bg-primary/10 text-primary dark:text-primary-foreground dark:bg-primary/20 border-primary/20'
              }`}
            >
              <span className="truncate max-w-[200px]">{email}</span>
              {isHighlighted && (
                <span className="text-[10px] uppercase tracking-wider font-bold bg-purple-600 text-white dark:bg-purple-500 px-1 py-0.2 rounded leading-none">
                  {highlightBadge}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5 opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                title={`Remove ${email}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (inputError) setInputError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) {
              handleAddEmail(inputValue);
            }
          }}
          placeholder={emails.length === 0 ? placeholder : 'Add another...'}
          className="flex-1 min-w-[140px] bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/60 px-1.5 py-1"
        />
      </div>

      {helperText && (
        <p className="text-[11px] text-muted-foreground pl-0.5">
          {helperText}
        </p>
      )}

      {inputError && (
        <p className="text-[11px] text-rose-500 font-medium pl-1">
          {inputError}
        </p>
      )}
    </div>
  );
}

export default function FollowUpModal({
  dealID,
  dealRegID,
  isOpen,
  onClose,
  onSuccess,
}: FollowUpModalProps) {
  const [loadingContext, setLoadingContext] = useState(false);
  const [dealContext, setDealContext] = useState<FollowUpDealContext | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);

  // Form Fields
  const [toList, setToList] = useState<string[]>([]);
  const [ccList, setCcList] = useState<string[]>([]);
  const [bccList, setBccList] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [htmlMessage, setHtmlMessage] = useState('');
  const [textLength, setTextLength] = useState(0);

  // UI state
  const [showCc, setShowCc] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ContentEditable Editor Ref
  const editorRef = useRef<HTMLDivElement>(null);

  // Fetch deal context and default recipients on modal open
  useEffect(() => {
    if (!isOpen || !dealID) {
      setDealContext(null);
      setCurrentUserEmail('');
      setCurrentUserName('');
      setCurrentUserAvatar(null);
      setToList([]);
      setCcList([]);
      setBccList([]);
      setSubject('');
      setHtmlMessage('');
      setTextLength(0);
      setShowCc(false);
      setIsMaximized(false);
      setError(null);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      return;
    }

    let isMounted = true;
    setLoadingContext(true);
    setError(null);

    getFollowUpDealContext(dealID)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          const { deal, recipients, currentUser } = res.data;
          setDealContext(deal);
          setCurrentUserEmail(currentUser?.email || '');
          setCurrentUserName(currentUser?.name || '');
          setCurrentUserAvatar(currentUser?.avatar || null);
          setToList(recipients.to || []);
          setCcList(recipients.cc || []);
          setBccList(recipients.bcc || []);

          const ref = deal.dealRegID || deal.dealID;
          setSubject(`[Follow Up] Deal ID : ${ref} - ${deal.custName}`);

          const aoName = recipients.aoNickName || deal.assignedAO || 'Team';
          const initialContent = `<p>Hi ${aoName},</p><p><br></p>`;
          setHtmlMessage(initialContent);
          setTextLength(`Hi ${aoName},`.length);

          if (editorRef.current) {
            editorRef.current.innerHTML = initialContent;
          }

          setShowCc(false);
        } else {
          setError(res.error || 'Unable to retrieve deal details.');
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Failed to load deal follow-up information.');
      })
      .finally(() => {
        if (isMounted) setLoadingContext(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, dealID]);

  // Keep contentEditable in sync if modal finishes loading
  useEffect(() => {
    if (editorRef.current && htmlMessage && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = htmlMessage;
    }
  }, [htmlMessage]);

  const dealRef =
    dealContext?.dealRegID || (dealID ? `DR-${dealID}` : 'N/A');
  const expFormatted = dealContext?.expDt
    ? new Date(dealContext.expDt).toLocaleDateString()
    : dealContext?.expiration || '';

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    setHtmlMessage(html);
    setTextLength(text.trim().length);
  };

  // Gmail-style rich text commands
  const executeCommand = (command: string, value: string = '') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const handleLink = () => {
    const url = window.prompt('Enter link URL (e.g. https://...):');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!dealID) return;

    setError(null);

    const cleanSubject = subject.trim();
    if (!cleanSubject) {
      antMessage.warning('Please enter an email subject.');
      setError('Please provide an email subject.');
      return;
    }

    if (toList.length === 0) {
      antMessage.warning('At least one TO recipient is required.');
      setError('At least one TO recipient is required.');
      return;
    }

    // Get final HTML and text content from editor
    const currentHtml = editorRef.current ? editorRef.current.innerHTML : htmlMessage;
    const currentText = editorRef.current ? editorRef.current.innerText.trim() : '';

    if (!currentText || currentText === '') {
      antMessage.warning('Please enter a follow-up message.');
      setError('Please enter a follow-up message.');
      return;
    }

    setIsSending(true);

    try {
      const res = await sendFollowUpEmail({
        dealID,
        subject: cleanSubject,
        message: currentHtml,
        toList,
        ccList,
        bccList,
      });

      if (res.success) {
        antMessage.success(
          res.message || 'Follow-up email dispatched successfully!'
        );
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to send follow-up email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch email.');
    } finally {
      setIsSending(false);
    }
  };

  // Compute days remaining for SLA badge
  const rawExp = dealContext?.expDt || dealContext?.expiration;
  const daysRemaining = rawExp
    ? Math.ceil((new Date(rawExp).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <AppModal
      open={isOpen}
      onClose={() => {
        if (!isSending) onClose();
      }}
      width={isMaximized ? '94vw' : 720}
      className={isMaximized ? 'max-w-[1240px]' : ''}
    >
      <AppModalHeader>
        <div className="flex items-center gap-2.5 text-primary">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <AppModalTitle>Follow Up Deal</AppModalTitle>
            <AppModalDescription>
              Compose and send an official follow-up notification for Deal{' '}
              <span className="font-semibold text-foreground">#{dealRef}</span>
            </AppModalDescription>
          </div>
        </div>
      </AppModalHeader>

      <div className="space-y-3.5">
        <AppModalBody className="space-y-3.5 py-2 max-h-[72vh] overflow-y-auto pr-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingContext ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs">Loading deal recipients and details...</p>
            </div>
          ) : (
            <>
              {/* Deal Header Summary Tag */}
              {dealContext && (
                <div className="p-3 bg-neutral/40 dark:bg-zinc-800/40 border border-border/80 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {dealContext.custName}
                      </span>
                      {dealContext.brand && (
                        <span className="px-2 py-0.5 bg-neutral/80 text-[10px] font-semibold uppercase tracking-wider rounded-md border border-border/60 text-muted-foreground">
                          {dealContext.brand}
                        </span>
                      )}
                      {daysRemaining !== null && (
                        daysRemaining < 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Expired ({Math.abs(daysRemaining)}d ago)
                          </span>
                        ) : daysRemaining <= 14 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {daysRemaining}d left
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {daysRemaining}d left
                          </span>
                        )
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                      <span>Ref: #{dealRef}</span>
                      {dealContext.projectName && (
                        <span>• Project: {dealContext.projectName}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral/80 text-muted-foreground border border-border/70 uppercase tracking-wider">
                        {dealContext.currency || 'PHP'}
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {dealContext.totalAmount % 1 === 0
                          ? dealContext.totalAmount.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })
                          : dealContext.totalAmount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </span>
                    </div>
                    {expFormatted && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Expires: {expFormatted}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TO Recipient Field */}
              <EmailChipInput
                label="Send To (Assigned AO)"
                placeholder="Enter email..."
                emails={toList}
                onChange={setToList}
                required
              />

              {/* Mini Dropdown Button to Toggle CC */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {showCc ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Hide CC</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>
                        Show CC ({ccList.length} recipient{ccList.length === 1 ? '' : 's'} configured)
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible CC Field */}
              {showCc && (
                <div className="pt-0.5">
                  <EmailChipInput
                    label="CC (Admin Assistant & Stakeholders)"
                    placeholder="Add CC email..."
                    emails={ccList}
                    onChange={setCcList}
                    highlightEmail={currentUserEmail}
                    highlightBadge="You"
                    helperText="Includes your email so you receive a copy in Gmail and maintain an active reply thread with the AO."
                  />
                </div>
              )}

              {/* Subject Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Email Subject
                  <span className="text-rose-500">*</span>
                </label>
                <AppInput
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject line..."
                  required
                />
              </div>

              {/* Sender Header (Gmail-Style Avatar + Full Name + Timestamp) */}
              {currentUserName && (
                <div className="flex items-center gap-3 p-2.5 bg-neutral/40 dark:bg-zinc-800/40 rounded-xl border border-border/60">
                  <AppAvatar
                    src={currentUserAvatar || undefined}
                    name={currentUserName}
                    size={40}
                    className="shrink-0 ring-1 ring-border/80"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground leading-tight truncate">
                      {currentUserName}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Intl.DateTimeFormat('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      }).format(new Date())}
                    </div>
                  </div>
                </div>
              )}

              {/* Rich Text Message Body with contentEditable */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    Follow-Up Message
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] text-muted-foreground">
                      {textLength} characters
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMaximized(!isMaximized)}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-primary hover:bg-primary/10 border border-primary/25 inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:border-primary/40"
                      title={isMaximized ? 'Restore window size' : 'Expand window'}
                    >
                      {isMaximized ? (
                        <>
                          <Minimize2 className="w-3 h-3" />
                          <span>Collapse View</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3 h-3" />
                          <span>Expand View</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorInput}
                  onKeyDown={handleEditorKeyDown}
                  className={`w-full p-3.5 text-xs bg-neutral/20 border border-border/70 rounded-xl text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all overflow-y-auto leading-relaxed ${
                    isMaximized ? 'min-h-[300px] max-h-[460px]' : 'min-h-[140px] max-h-[240px]'
                  }`}
                  style={{
                    wordBreak: 'break-word',
                  }}
                  data-placeholder="Type your follow-up message to the account officer..."
                />
              </div>

              {/* Attached Deal Summary Note */}
              <div className="p-2.5 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl text-xs text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1.5 text-primary font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Branded Deal Summary Attached in Email Body</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  The recipient will receive your formatted message on top, followed
                  by a styled bordered summary table of Deal #{dealRef} and a
                  direct button to view and act on the deal in the portal.
                </p>
              </div>
            </>
          )}
        </AppModalBody>

        {/* Gmail-Style Bottom Bar: Send Button + Formatting Toolbar + Discard */}
        <AppModalFooter className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-border/60">
          {/* Left: Send Button & Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={loadingContext || isSending}
              className="h-8 px-4 rounded-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              title="Send Follow-Up (Ctrl+Enter)"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </>
              )}
            </button>

            {/* Gmail-Style Formatting Bar */}
            <div className="flex items-center gap-0.5 p-1 bg-neutral/40 dark:bg-zinc-800/60 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => executeCommand('undo')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('redo')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-3.5 bg-border/80 mx-1" />

              <button
                type="button"
                onClick={() => executeCommand('bold')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground font-bold transition-colors cursor-pointer"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('italic')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground italic transition-colors cursor-pointer"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('underline')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('strikeThrough')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground line-through transition-colors cursor-pointer"
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-3.5 bg-border/80 mx-1" />

              <button
                type="button"
                onClick={() => executeCommand('insertUnorderedList')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Bulleted List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('insertOrderedList')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-3.5 bg-border/80 mx-1" />

              <button
                type="button"
                onClick={() => executeCommand('formatBlock', 'blockquote')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Quote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleLink}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Insert Link"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('removeFormat')}
                className="p-1.5 rounded hover:bg-neutral text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Clear Formatting"
              >
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Discard / Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="h-8 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-neutral/80 dark:hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            title="Discard draft"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>
        </AppModalFooter>
      </div>
    </AppModal>
  );
}
