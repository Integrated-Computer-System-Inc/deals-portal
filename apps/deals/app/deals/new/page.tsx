'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { message } from 'antd';
import { createDeal } from '../../actions/deals';
import { useCreateDealMutation } from '@/hooks/useDealsQuery';
import { normalizeBusinessUnit } from '@/lib/searchUtils';
import {
  ACTIVE_BUSINESS_UNITS,
  ALL_BUSINESS_UNITS,
  DEAL_STATUS_MAP,
  CustomerLookupResult,
  UserRole,
} from '@my-app/types';
import {
  AppTextarea,
  AppCard,
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
} from '../../../components/ui';
import { addDaysToDateString, getDaysDifference, formatDateLong } from '../../../components/utils/time';
import CustomerSearchModal from '../../../components/CustomerSearchModal';
import LostDealModal from '../../../components/LostDealModal';
import BrandSelect from '../../../components/BrandSelect';
import FormattedAmountInput from '../../../components/FormattedAmountInput';
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Save,
  Building2,
  FileText,
  Layers,
  Loader2,
  Info,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

const dealItemSchema = z.object({
  itemDesc: z.string().min(2, 'Item description is required'),
  qty: z.coerce.number().min(1, 'Quantity must be at least 1'),
  currency: z.string().min(1, 'Currency is required'),
  totalAmt: z.coerce.number().min(0, 'Total amount must be 0 or greater'),
});

const createDealSchema = z.object({
  dealRegID: z.string().min(1, 'Deal Registration ID is required'),
  dtRegistered: z.string().min(1, 'Registration date is required'),
  validityDays: z.coerce.number().optional(),
  expDt: z.string().min(1, 'Expiration date is required'),
  brand: z.string().min(1, 'Brand is required'),
  customerID: z.string().optional().default(''),
  custName: z.string().min(2, 'Customer name is required'),
  projectName: z.string().min(2, 'Project name is required'),
  assignedAO: z.string().min(2, 'Assigned AO is required'),
  bu: z.string().min(1, 'Business Unit is required'),
  dealStatus: z.union([z.string(), z.number()]).default(4),
  remarks: z.string().min(1, 'Remarks / Partner notes are required'),
  items: z.array(dealItemSchema).min(1, 'At least one line item is required'),
});

type CreateDealFormData = z.infer<typeof createDealSchema>;

export default function NewDealPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const createMutation = useCreateDealMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isCustomerFromIceCream, setIsCustomerFromIceCream] = useState(false);

  const userRole: UserRole = (session?.user as any)?.role || 'admin';

  useEffect(() => {
    if (session && (userRole === 'bu' || userRole === 'bu_admin' || userRole === 'ao')) {
      router.push('/deals');
    }
  }, [session, userRole, router]);

  const defaultRegDate = new Date().toISOString().split('T')[0];
  const defaultExpDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateDealFormData>({
    resolver: zodResolver(createDealSchema as any),
    defaultValues: {
      dealRegID: '',
      dtRegistered: defaultRegDate,
      validityDays: 90,
      expDt: defaultExpDate,
      brand: '',
      customerID: '',
      custName: '',
      projectName: '',
      assignedAO: '',
      bu: '',
      dealStatus: 4, // Pending
      remarks: '',
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
  const watchStatus = watch('dealStatus');
  const watchItems = watch('items') || [];
  const watchBu = watch('bu');

  const dynamicBuOptions = useMemo(() => {
    const set = new Set<string>([...ALL_BUSINESS_UNITS]);
    if (watchBu && watchBu.trim()) {
      set.add(watchBu.trim());
    }
    return Array.from(set);
  }, [watchBu]);

  const handleRegDateChange = (regDateStr: string) => {
    setValue('dtRegistered', regDateStr, { shouldValidate: true });
    if (regDateStr && watchValidityDays && watchValidityDays > 0) {
      const reg = new Date(regDateStr);
      if (!isNaN(reg.getTime())) {
        const newExp = new Date(reg.getTime() + watchValidityDays * 24 * 60 * 60 * 1000);
        setValue('expDt', newExp.toISOString().split('T')[0], { shouldValidate: true });
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
        const newExp = new Date(reg.getTime() + days * 24 * 60 * 60 * 1000);
        setValue('expDt', newExp.toISOString().split('T')[0], { shouldValidate: true });
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

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CreateDealFormData | null>(null);

  const onSubmit = (data: CreateDealFormData) => {
    setErrorMsg(null);
    setPendingFormData(data);
    setShowConfirmModal(true);
  };

  const handleExecuteCreate = async () => {
    if (!pendingFormData) return;
    const data = pendingFormData;
    const finalBu = data.bu || watch('bu') || 'BU5';

    try {
      const result = await createMutation.mutateAsync(
        {
          dealRegID: data.dealRegID,
          dtRegistered: data.dtRegistered,
          expDt: data.expDt,
          brand: data.brand,
          customerID: data.customerID,
          custName: data.custName,
          projectName: data.projectName,
          ProjectName: data.projectName,
          assignedAO: data.assignedAO,
          AssignedAO: data.assignedAO,
          bu: finalBu,
          BU: finalBu,
          dealStatus: data.dealStatus,
          remarks: data.remarks,
          items: data.items,
        }
      );

      if (result && result.success) {
        setShowConfirmModal(false);
        message.success(`Deal ${data.dealRegID ? `#${data.dealRegID}` : ''} registered successfully!`);
        router.push('/deals');
      } else {
        setShowConfirmModal(false);
        setErrorMsg(result?.error || 'Failed to submit deal registration.');
      }
    } catch (err: any) {
      setShowConfirmModal(false);
      setErrorMsg(err?.message || 'A network error occurred.');
    }
  };

  const loading = createMutation.isPending;

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
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Register New Deal
            </h1>
            <p className="text-xs text-muted">
              Fill in customer account, project scope, validity timeline, and line items.
            </p>
          </div>
        </div>
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
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 text-xs font-semibold rounded-lg border border-sky-500/30 transition"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Lookup in liveSearch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Company / Customer Name *</label>
              <input
                {...register('custName')}
                placeholder=""
                className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 input-autocaps ${
                  errors.custName ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
                }`}
              />
              {errors.custName && <p className="text-[11px] text-rose-500 mt-1">{errors.custName.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-foreground">Customer ID Reference</label>
                {watch('customerID') ? (
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
                placeholder=""
                className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 input-autocaps ${
                  errors.customerID ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
                }`}
              />
              {errors.customerID && <p className="text-[11px] text-rose-500 mt-1">{errors.customerID.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-foreground">Business Unit (BU) *</label>
                {isCustomerFromIceCream ? (
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
                className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 ${
                  errors.bu ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
                }`}
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
                placeholder=""
                className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 input-autocaps ${
                  errors.assignedAO ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
                }`}
              />
              {errors.assignedAO && <p className="text-[11px] text-rose-500 mt-1">{errors.assignedAO.message}</p>}
            </div>
          </div>
        </AppCard>

        {/* Section 2: Deal Meta & Timeline */}
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
                placeholder=""
                className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-mono font-medium text-foreground focus:outline-none focus:ring-2 input-autocaps ${
                  errors.dealRegID ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
                }`}
              />
              {errors.dealRegID && <p className="text-[11px] text-rose-500 mt-1">{errors.dealRegID.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Brand Name *</label>
              <Controller
                control={control}
                name="brand"
                render={({ field }) => (
                  <BrandSelect
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.brand?.message}
                    placeholder=""
                  />
                )}
              />
              {errors.brand && <p className="text-[11px] text-rose-500 mt-1">{errors.brand.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Initial Deal Status *</label>
              <select
                value={watchStatus || 4}
                onChange={(e) => handleStatusChange(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              placeholder=""
              className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 input-autocaps ${
                errors.projectName ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
              }`}
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
                className={`w-full px-3.5 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 ${
                  errors.dtRegistered ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
                }`}
              />
              {watch('dtRegistered') && (
                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-1">
                  {formatDateLong(watch('dtRegistered'))}
                </p>
              )}
              {errors.dtRegistered && <p className="text-[11px] text-rose-500 mt-1">{errors.dtRegistered.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Validity (in Days)</label>
              <input
                type="number"
                value={watchValidityDays !== undefined && watchValidityDays !== null && !isNaN(watchValidityDays) ? watchValidityDays : ''}
                placeholder="e.g. 90"
                onChange={(e) => handleValidityChange(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Expiration Date *</label>
              <input
                type="date"
                value={watch('expDt') || ''}
                onChange={(e) => handleExpDateChange(e.target.value)}
                className={`w-full px-3.5 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 ${
                  errors.expDt ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
                }`}
              />
              {watch('expDt') && (
                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-1">
                  {formatDateLong(watch('expDt'))}
                </p>
              )}
              {errors.expDt && <p className="text-[11px] text-rose-500 mt-1">{errors.expDt.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Remarks & Partner Notes *</label>
            <AppTextarea
              {...register('remarks')}
              required
              error={errors.remarks?.message}
              placeholder=""
              rows={2}
            />
          </div>
        </AppCard>

        {/* Section 3: Dynamic Deal Items */}
        <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-sm text-foreground">3. Deal Products & Line Items</h2>
            </div>
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
                    placeholder=""
                    className={`w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 ${
                      errors.items?.[index]?.itemDesc ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
                    }`}
                  />
                  {errors.items?.[index]?.itemDesc && (
                    <p className="text-[10px] text-rose-500 mt-0.5">{errors.items[index]?.itemDesc?.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-muted mb-1">Qty *</label>
                    <Controller
                      control={control}
                      name={`items.${index}.qty` as const}
                      render={({ field }) => (
                        <FormattedAmountInput
                          allowDecimals={false}
                          value={field.value}
                          onChange={(val) => field.onChange(val || 1)}
                          placeholder="1"
                          error={!!errors.items?.[index]?.qty}
                        />
                      )}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-muted mb-1">Currency *</label>
                    <select
                      {...register(`items.${index}.currency` as const)}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 ${
                        errors.items?.[index]?.currency ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
                      }`}
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
                    <Controller
                      control={control}
                      name={`items.${index}.totalAmt` as const}
                      render={({ field }) => (
                        <FormattedAmountInput
                          allowDecimals={true}
                          value={field.value}
                          onChange={(val) => field.onChange(val)}
                          placeholder="0.00"
                          error={!!errors.items?.[index]?.totalAmt}
                        />
                      )}
                    />
                  </div>

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
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/deals"
            className="px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-neutral rounded-xl border border-border transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition shadow-md disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save & Register Deal</span>
          </button>
        </div>
      </form>

      {/* Customer LiveSearch Modal */}
      <CustomerSearchModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
      />

      {/* Lost Deal Modal */}
      <LostDealModal
        dealID={0}
        dealRegID={watch('dealRegID') || 'NEW-DEAL'}
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Transaction Confirmation Modal Safeguard */}
      <AppModal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} width={480}>
        <AppModalHeader>
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <AppModalTitle>Confirm Deal Registration</AppModalTitle>
          </div>
          <AppModalDescription>
            Please verify the registration parameters before saving to the database.
          </AppModalDescription>
        </AppModalHeader>

        {pendingFormData && (
          <AppModalBody className="space-y-3 py-2 text-xs">
            <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/70 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted">Deal Reg ID:</span>
                <span className="font-mono font-bold text-foreground">{pendingFormData.dealRegID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Customer:</span>
                <span className="font-bold text-foreground">{pendingFormData.custName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Project:</span>
                <span className="font-medium text-foreground truncate max-w-[200px]">{pendingFormData.projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Brand & BU:</span>
                <span className="font-bold text-foreground">{pendingFormData.brand} | {pendingFormData.bu || watch('bu')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Assigned AO:</span>
                <span className="font-medium text-foreground">{pendingFormData.assignedAO}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1.5">
                <span className="text-muted">Validity:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatDateLong(pendingFormData.dtRegistered)} → {formatDateLong(pendingFormData.expDt)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1.5">
                <span className="text-muted font-bold">Total Items:</span>
                <span className="font-bold text-foreground">{pendingFormData.items?.length || 0} line items</span>
              </div>
            </div>
          </AppModalBody>
        )}

        <AppModalFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setShowConfirmModal(false)}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-neutral rounded-xl transition"
          >
            Back / Edit
          </button>
          <button
            type="button"
            onClick={handleExecuteCreate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-primary hover:opacity-90 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{loading ? 'Registering...' : 'Yes, Confirm & Register'}</span>
          </button>
        </AppModalFooter>
      </AppModal>
    </div>
  );
}
