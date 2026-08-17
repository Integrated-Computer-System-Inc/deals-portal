'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  ACTIVE_BUSINESS_UNITS,
  ALL_BUSINESS_UNITS,
  DEAL_STATUS_MAP,
  MOCK_DEALS,
  CustomerLookupResult,
  DealHeaderRecord,
  UserRole,
} from '@my-app/types';
import { useDealQuery, useUpdateDealMutation } from '@/hooks/useDealsQuery';
import { normalizeBusinessUnit } from '@/lib/searchUtils';
import {
  AppTextarea,
  AppCard,
  AppChip,
} from '../../../../components/ui';
import { addDaysToDateString, getDaysDifference } from '../../../../components/utils/time';
import CustomerSearchModal from '../../../../components/CustomerSearchModal';
import WTNModal from '../../../../components/WTNModal';
import LostDealModal from '../../../../components/LostDealModal';
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Save,
  Building2,
  FileText,
  Calendar,
  Layers,
  Loader2,
  Info,
  ShieldAlert,
  BellRing,
  Lock,
  Unlock,
} from 'lucide-react';

const dealItemSchema = z.object({
  dealItemID: z.number().optional(),
  itemDesc: z.string().min(2, 'Item description is required'),
  qty: z.coerce.number().min(1, 'Quantity must be at least 1'),
  currency: z.string().min(1, 'Currency is required'),
  totalAmt: z.coerce.number().min(0, 'Total amount must be 0 or greater'),
});

const updateDealSchema = z.object({
  dtRegistered: z.string().min(1, 'Registration date is required'),
  validityDays: z.coerce.number().optional(),
  expDt: z.string().min(1, 'Expiration date is required'),
  brand: z.string().min(1, 'Brand is required'),
  customerID: z.string().optional().default(''),
  custName: z.string().min(2, 'Customer name is required'),
  dealRegID: z.string().min(1, 'Deal Registration ID is required'),
  projectName: z.string().min(2, 'Project name is required'),
  assignedAO: z.string().min(2, 'Assigned AO is required'),
  bu: z.string().min(1, 'Business Unit is required'),
  dealStatus: z.union([z.string(), z.number()]),
  remarks: z.string().optional(),
  toEmail: z.boolean().default(true),
  items: z.array(dealItemSchema).min(1, 'At least one line item is required'),
});

type UpdateDealFormData = z.infer<typeof updateDealSchema>;

export default function EditDealPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const dealID = parseInt(params.id, 10);

  const { data: deal, isLoading: fetching } = useDealQuery(dealID);
  const updateMutation = useUpdateDealMutation();

  const [currentWtnDate, setCurrentWtnDate] = useState<Date | string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isWtnModalOpen, setIsWtnModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isCustomerFromIceCream, setIsCustomerFromIceCream] = useState(false);

  const userRole: UserRole = (session?.user as any)?.role || 'admin';
  const isViewOnly = userRole === 'bu' || userRole === 'bu_admin' || userRole === 'ao';

  const defaultRegDate = new Date().toISOString().split('T')[0];
  const defaultExpDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UpdateDealFormData>({
    resolver: zodResolver(updateDealSchema as any),
    defaultValues: {
      dtRegistered: defaultRegDate,
      validityDays: 90,
      expDt: defaultExpDate,
      brand: 'Dell',
      customerID: '',
      custName: '',
      dealRegID: '',
      projectName: '',
      assignedAO: '',
      bu: 'BU5',
      dealStatus: 1,
      remarks: '',
      toEmail: true,
      items: [
        {
          itemDesc: '',
          qty: 1,
          currency: 'PHP',
          totalAmt: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchRegDate = watch('dtRegistered');
  const watchValidityDays = watch('validityDays');
  const watchItems = watch('items') || [];
  const watchStatus = watch('dealStatus');
  const watchBu = watch('bu');

  const dynamicBuOptions = useMemo(() => {
    const set = new Set<string>([...ALL_BUSINESS_UNITS]);
    if (watchBu && watchBu.trim()) {
      set.add(watchBu.trim());
    }
    return Array.from(set);
  }, [watchBu]);

  useEffect(() => {
    if (!deal) return;

    const regDateVal = deal.dtRegistered ? new Date(deal.dtRegistered) : new Date();
    const expDateVal = deal.expDt || deal.expiration ? new Date(deal.expDt || deal.expiration!) : new Date();

    const regStr = regDateVal.toISOString().split('T')[0];
    const expStr = expDateVal.toISOString().split('T')[0];
    const diffDays = Math.max(
      1,
      Math.ceil((expDateVal.getTime() - regDateVal.getTime()) / (1000 * 60 * 60 * 24))
    );

    const initialBu = normalizeBusinessUnit(deal.BU || deal.bu || 'BU5');

    reset({
      dtRegistered: regStr,
      validityDays: diffDays,
      expDt: expStr,
      brand: deal.brand || 'Dell',
      customerID: deal.customerID ? String(deal.customerID) : '',
      custName: deal.custName || '',
      dealRegID: deal.dealRegID || String(deal.dealID),
      projectName: deal.ProjectName || deal.projectName || '',
      assignedAO: deal.AssignedAO || deal.assignedAO || '',
      bu: initialBu,
      dealStatus: deal.dealStatus ?? 1,
      remarks: deal.remarks || '',
      toEmail: true,
      items:
        deal.items && deal.items.length > 0
          ? deal.items.map((i: any) => ({
              dealItemID: i.itemID || i.dealItemID,
              itemDesc: i.itemDesc || '',
              qty: i.qty || 1,
              currency: i.currency || 'PHP',
              totalAmt: i.totalAmt || 0,
            }))
          : [{ itemDesc: 'Standard Item', qty: 1, currency: 'PHP', totalAmt: 0 }],
    });

    setIsCustomerFromIceCream(Boolean(deal.customerID));

    if (deal.wtn?.whenToNotify) {
      setCurrentWtnDate(deal.wtn.whenToNotify);
    }
  }, [deal, reset]);

  const handleRegDateChange = (regDateStr: string) => {
    setValue('dtRegistered', regDateStr, { shouldValidate: true });
    if (regDateStr && watchValidityDays && watchValidityDays > 0) {
      const reg = new Date(regDateStr);
      if (!isNaN(reg.getTime())) {
        const exp = new Date(reg.getTime() + watchValidityDays * 24 * 60 * 60 * 1000);
        setValue('expDt', exp.toISOString().split('T')[0], { shouldValidate: true });
      }
    } else if (regDateStr && watch('expDt')) {
      const reg = new Date(regDateStr).getTime();
      const exp = new Date(watch('expDt')).getTime();
      if (!isNaN(reg) && !isNaN(exp) && exp > reg) {
        const diffDays = Math.ceil((exp - reg) / (1000 * 60 * 60 * 24));
        setValue('validityDays', diffDays);
      }
    }
  };

  const handleValidityChange = (days?: number) => {
    setValue('validityDays', days, { shouldValidate: true });
    if (days === undefined || days === null || isNaN(days) || days <= 0) {
      setValue('expDt', '', { shouldValidate: true });
      return;
    }
    if (watchRegDate) {
      const reg = new Date(watchRegDate);
      if (!isNaN(reg.getTime())) {
        const exp = new Date(reg.getTime() + days * 24 * 60 * 60 * 1000);
        setValue('expDt', exp.toISOString().split('T')[0], { shouldValidate: true });
      }
    }
  };

  const handleExpDateChange = (expDateStr: string) => {
    setValue('expDt', expDateStr, { shouldValidate: true });
    if (!expDateStr) {
      setValue('validityDays', undefined, { shouldValidate: true });
      return;
    }
    if (watchRegDate) {
      const reg = new Date(watchRegDate).getTime();
      const exp = new Date(expDateStr).getTime();
      if (!isNaN(reg) && !isNaN(exp)) {
        const diffDays = Math.ceil((exp - reg) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          setValue('validityDays', diffDays, { shouldValidate: true });
        } else {
          setValue('validityDays', undefined, { shouldValidate: true });
        }
      }
    }
  };

  const handleStatusChange = (newStatus: number) => {
    setValue('dealStatus', newStatus);
    if (Number(newStatus) === 7 || Number(newStatus) === 8) {
      setIsLostModalOpen(true);
    }
  };

  const handleSelectCustomer = (customer: CustomerLookupResult) => {
    setValue('customerID', customer.customerID || '', { shouldValidate: true, shouldDirty: true });
    setValue('custName', customer.custName || '', { shouldValidate: true, shouldDirty: true });
    setValue('bu', customer.bu || 'BU5', { shouldValidate: true, shouldDirty: true });
    if (customer.assignedAO) {
      setValue('assignedAO', customer.assignedAO, { shouldValidate: true, shouldDirty: true });
    }
    setIsCustomerFromIceCream(!customer.isManual && Boolean(customer.customerID || customer.custName));
  };

  const currencyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    watchItems.forEach((item) => {
      const curr = item.currency || 'PHP';
      const amt = Number(item.totalAmt) || 0;
      totals[curr] = (totals[curr] || 0) + amt;
    });
    return totals;
  }, [watchItems]);

  const onSubmit = async (data: UpdateDealFormData) => {
    setErrorMsg(null);

    const finalBu = data.bu || watch('bu') || 'BU5';

    try {
      const result = await updateMutation.mutateAsync({
        dealID,
        dtRegistered: data.dtRegistered,
        expDt: data.expDt,
        brand: data.brand,
        customerID: data.customerID,
        custName: data.custName,
        dealRegID: data.dealRegID,
        projectName: data.projectName,
        ProjectName: data.projectName,
        assignedAO: data.assignedAO,
        AssignedAO: data.assignedAO,
        bu: finalBu,
        BU: finalBu,
        dealStatus: data.dealStatus,
        remarks: data.remarks,
        toEmail: data.toEmail,
        items: data.items,
      });

      if (result && result.success) {
        router.push('/deals');
      } else {
        setErrorMsg(result?.error || 'Failed to update deal record.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'A network error occurred.');
    }
  };

  const loading = updateMutation.isPending;

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <p className="text-xs font-semibold text-muted">Loading deal details #{dealID}...</p>
      </div>
    );
  }

  const statusNum = typeof watchStatus === 'number' ? watchStatus : parseInt(watchStatus) || 1;
  const statusMeta = DEAL_STATUS_MAP[statusNum] || {
    label: `Status ${watchStatus}`,
    variant: 'default' as const,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/deals"
            className="p-2 rounded-xl bg-neutral hover:bg-neutral/80 border border-border text-muted hover:text-foreground transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {isViewOnly ? 'Deal Details' : 'Edit Deal'} #{watch('dealRegID') || dealID}
              </h1>
              <AppChip variant={statusMeta.variant as any}>{statusMeta.label}</AppChip>
            </div>
            <p className="text-xs text-muted">
              {isViewOnly
                ? 'Viewing deal information and line items from live database (Read-Only).'
                : 'Update deal parameters, status changes, When-To-Notify dates, or line item details.'}
            </p>
          </div>
        </div>

        {!isViewOnly && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsWtnModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-semibold rounded-xl border border-amber-500/30 transition flex-1 sm:flex-initial"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Update WTN</span>
            </button>

            {statusNum !== 7 && statusNum !== 8 && (
              <button
                type="button"
                onClick={() => setIsLostModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-xs font-semibold rounded-xl border border-rose-500/30 transition flex-1 sm:flex-initial"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Mark Lost</span>
              </button>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-medium flex items-center gap-2">
          <Info className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Customer Account */}
        <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <h2 className="font-bold text-sm text-foreground">1. Customer Information</h2>
            </div>
            {!isViewOnly && (
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 text-xs font-semibold rounded-lg border border-sky-500/30 transition"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Lookup in liveSearch</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Company / Customer Name *</label>
              <input
                {...register('custName')}
                disabled={isViewOnly}
                placeholder="e.g. HEALTHPROOF (MANILA) INC."
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 input-autocaps"
              />
              {errors.custName && <p className="text-[11px] text-rose-500 mt-1">{errors.custName.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-foreground">Customer ID Reference</label>
                {!isViewOnly && (
                  watch('customerID') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setValue('customerID', '');
                        setIsCustomerFromIceCream(false);
                      }}
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      Detach / Clear ID
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted font-normal">(Optional / Blank)</span>
                  )
                )}
              </div>
              <input
                {...register('customerID')}
                onChange={(e) => {
                  register('customerID').onChange(e);
                  if (!e.target.value) {
                    setIsCustomerFromIceCream(false);
                  }
                }}
                disabled={isViewOnly}
                placeholder="e.g. CUST-3184 or leave blank"
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 input-autocaps"
              />
              {errors.customerID && <p className="text-[11px] text-rose-500 mt-1">{errors.customerID.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-foreground">Business Unit (BU) *</label>
                {!isViewOnly && isCustomerFromIceCream ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      <Lock className="w-2.5 h-2.5" /> Synced from CRM
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomerFromIceCream(false)}
                      className="text-[10px] text-muted hover:text-foreground underline"
                    >
                      Unlock
                    </button>
                  </div>
                ) : null}
              </div>
              <select
                {...register('bu')}
                value={watchBu || ''}
                onChange={(e) => setValue('bu', e.target.value, { shouldValidate: true, shouldDirty: true })}
                disabled={isViewOnly}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
              >
                <option value="">Select Business Unit...</option>
                {dynamicBuOptions.map((bu: string) => (
                  <option key={bu} value={bu}>
                    {bu}
                  </option>
                ))}
              </select>
              {errors.bu && <p className="text-[11px] text-rose-500 mt-1">{errors.bu.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Assigned Account Officer (AO) *</label>
              <input
                {...register('assignedAO')}
                disabled={isViewOnly}
                placeholder="e.g. Juan Dela Cruz (AO-104)"
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 input-autocaps"
              />
            </div>
          </div>
        </AppCard>

        {/* Section 2: Deal Core Information */}
        <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-sm text-foreground">2. Deal Header & Validity Period</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Deal Registration ID *</label>
              <input
                {...register('dealRegID')}
                disabled={isViewOnly}
                placeholder="e.g. 31842219 or REGI-0005491402"
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 input-autocaps"
              />
              {errors.dealRegID && <p className="text-[11px] text-rose-500 mt-1">{errors.dealRegID.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Brand Name *</label>
              <select
                {...register('brand')}
                disabled={isViewOnly}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
              >
                <option value="Dell">Dell</option>
                <option value="HPi">HPi</option>
                <option value="HPe">HPe</option>
                <option value="HP Poly">HP Poly</option>
                <option value="Cisco">Cisco</option>
                <option value="Microsoft">Microsoft</option>
                <option value="Lenovo">Lenovo</option>
                <option value="Fortinet">Fortinet</option>
                <option value="VMware">VMware</option>
                <option value="Palo Alto">Palo Alto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Deal Status *</label>
              <select
                value={watchStatus}
                onChange={(e) => handleStatusChange(Number(e.target.value))}
                disabled={isViewOnly}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
              >
                {Object.entries(DEAL_STATUS_MAP).map(([id, meta]: [string, any]) => (
                  <option key={id} value={id}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Project Name & Description *</label>
            <input
              {...register('projectName')}
              disabled={isViewOnly}
              placeholder="e.g. 2026 Dell Laptops Refresh for Executive Teams"
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 input-autocaps"
            />
            {errors.projectName && <p className="text-[11px] text-rose-500 mt-1">{errors.projectName.message}</p>}
          </div>

          {/* Reactive Date Synchronizer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-neutral/40 border border-border/60">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Date Registered *</label>
              <input
                type="date"
                value={watch('dtRegistered') || ''}
                onChange={(e) => handleRegDateChange(e.target.value)}
                disabled={isViewOnly}
                className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
              />
              {errors.dtRegistered && <p className="text-[11px] text-rose-500 mt-1">{errors.dtRegistered.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Validity (in Days) *</label>
              <input
                type="number"
                value={watchValidityDays !== undefined && watchValidityDays !== null && !isNaN(watchValidityDays) ? watchValidityDays : ''}
                placeholder="e.g. 90"
                onChange={(e) => handleValidityChange(e.target.value ? Number(e.target.value) : undefined)}
                disabled={isViewOnly}
                className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Expiration Date *</label>
              <input
                type="date"
                value={watch('expDt') || ''}
                onChange={(e) => handleExpDateChange(e.target.value)}
                disabled={isViewOnly}
                className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Remarks & Partner Notes</label>
            <AppTextarea
              {...register('remarks')}
              disabled={isViewOnly}
              placeholder="Add any special pricing instructions, renewal context, or deal registration IDs..."
              rows={2}
            />
          </div>

          {!isViewOnly && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="toEmail"
                {...register('toEmail')}
                className="h-4 w-4 text-primary rounded border-border focus:ring-primary/20"
              />
              <label htmlFor="toEmail" className="text-xs font-medium text-foreground cursor-pointer">
                Send update email notification to sales operations team
              </label>
            </div>
          )}
        </AppCard>

        {/* Section 3: Dynamic Deal Items */}
        <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-sm text-foreground">3. Deal Products & Line Items</h2>
            </div>
            {!isViewOnly && (
              <button
                type="button"
                onClick={() =>
                  append({
                    itemDesc: '',
                    qty: 1,
                    currency: 'PHP',
                    totalAmt: 0,
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 hover:border-border transition space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center"
              >
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Item #{index + 1} Description *
                  </label>
                  <input
                    {...register(`items.${index}.itemDesc` as const)}
                    disabled={isViewOnly}
                    placeholder="e.g. Dell Pro 14 PC14250 Core Ultra 7"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-muted mb-1">Qty *</label>
                    <input
                      type="number"
                      min="1"
                      {...register(`items.${index}.qty` as const)}
                      disabled={isViewOnly}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-muted mb-1">Currency *</label>
                    <select
                      {...register(`items.${index}.currency` as const)}
                      disabled={isViewOnly}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
                    >
                      <option value="PHP">PHP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="SGD">SGD</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-end gap-2 sm:contents">
                  <div className="flex-1 sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-muted mb-1">Total Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.totalAmt` as const)}
                      disabled={isViewOnly}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75"
                    />
                  </div>

                  {!isViewOnly && (
                    <div className="sm:col-span-1 text-right sm:pt-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition disabled:opacity-30 flex items-center justify-center ml-auto"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Currency Summary Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 sm:p-4 rounded-xl bg-neutral/80 border border-border/80">
            <span className="text-xs font-bold text-foreground">Estimated Total Amount:</span>
            <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
              {Object.entries(currencyTotals).map(([curr, amt]) => (
                <span key={curr} className="bg-background px-3 py-1 rounded-lg border border-border shadow-xs">
                  {curr} {amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ))}
            </div>
          </div>
        </AppCard>

        {/* Section 4: Action Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
          {isViewOnly ? (
            <Link
              href="/deals"
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Deals Registry</span>
            </Link>
          ) : (
            <>
              <Link
                href="/deals"
                className="text-center px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-neutral rounded-xl border border-border transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Update Deal Record</span>
              </button>
            </>
          )}
        </div>
      </form>

      {/* Customer LiveSearch Modal */}
      <CustomerSearchModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
      />

      {/* WTN Modal */}
      <WTNModal
        dealID={dealID}
        dealRegID={watch('dealRegID') || String(dealID)}
        currentWTN={currentWtnDate}
        isOpen={isWtnModalOpen}
        onClose={() => setIsWtnModalOpen(false)}
        onSuccess={() => setIsWtnModalOpen(false)}
      />

      {/* Lost Deal Modal */}
      <LostDealModal
        dealID={dealID}
        dealRegID={watch('dealRegID') || String(dealID)}
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        onSuccess={() => {
          setIsLostModalOpen(false);
          router.push('/deals');
        }}
      />
    </div>
  );
}
