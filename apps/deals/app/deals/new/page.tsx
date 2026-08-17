'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { createDeal } from '../../actions/deals';
import { useCreateDealMutation } from '@/hooks/useDealsQuery';
import {
  ACTIVE_BUSINESS_UNITS,
  DEAL_STATUS_MAP,
  CustomerLookupResult,
  UserRole,
} from '@my-app/types';
import {
  AppTextarea,
  AppCard,
} from '../../../components/ui';
import CustomerSearchModal from '../../../components/CustomerSearchModal';
import LostDealModal from '../../../components/LostDealModal';
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
  remarks: z.string().optional(),
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

  const userRole: UserRole = (session?.user as any)?.role || 'admin';

  useEffect(() => {
    if (session && (userRole === 'bu' || userRole === 'bu_admin' || userRole === 'ao')) {
      router.push('/deals');
    }
  }, [session, userRole, router]);

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
      dtRegistered: '',
      validityDays: undefined,
      expDt: '',
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

  const handleValidityChange = (days?: number) => {
    setValue('validityDays', days);
    if (watchRegDate && days && days > 0) {
      const reg = new Date(watchRegDate);
      const newExp = new Date(reg.getTime() + days * 24 * 60 * 60 * 1000);
      setValue('expDt', newExp.toISOString().split('T')[0]);
    }
  };

  const handleExpDateChange = (expDateStr: string) => {
    setValue('expDt', expDateStr);
    if (watchRegDate && expDateStr) {
      const reg = new Date(watchRegDate).getTime();
      const exp = new Date(expDateStr).getTime();
      const diffDays = Math.ceil((exp - reg) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        setValue('validityDays', diffDays);
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
    setValue('customerID', customer.customerID);
    setValue('custName', customer.custName);
    setValue('bu', customer.bu);
    if (customer.assignedAO) {
      setValue('assignedAO', customer.assignedAO);
    }
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

  const onSubmit = async (data: CreateDealFormData) => {
    setErrorMsg(null);

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
          bu: data.bu,
          BU: data.bu,
          dealStatus: data.dealStatus,
          remarks: data.remarks,
          items: data.items,
        }
      );

      if (result && result.success) {
        router.push('/deals');
      } else {
        setErrorMsg(result?.error || 'Failed to submit deal registration.');
      }
    } catch (err: any) {
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
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/deals"
            className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold text-foreground hover:bg-neutral rounded-xl border border-border transition shadow-xs"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-xs disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Submit Registration</span>
          </button>
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
                placeholder="e.g. HEALTHPROOF (MANILA) INC."
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.custName && <p className="text-[11px] text-rose-500 mt-1">{errors.custName.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-foreground">Customer ID Reference</label>
                {watch('customerID') ? (
                  <button
                    type="button"
                    onClick={() => setValue('customerID', '')}
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
                placeholder="e.g. CUST-3184 or leave blank"
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.customerID && <p className="text-[11px] text-rose-500 mt-1">{errors.customerID.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Business Unit (BU) *</label>
              <select
                {...register('bu')}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Business Unit...</option>
                {ACTIVE_BUSINESS_UNITS.map((bu: string) => (
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
                placeholder="e.g. Juan Dela Cruz (AO-104)"
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                placeholder="e.g. 31842219 or REGI-0005491402"
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.dealRegID && <p className="text-[11px] text-rose-500 mt-1">{errors.dealRegID.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Brand Name *</label>
              <select
                {...register('brand')}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Brand...</option>
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
              placeholder="e.g. 2026 Dell Laptops Refresh for Executive Teams"
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.projectName && <p className="text-[11px] text-rose-500 mt-1">{errors.projectName.message}</p>}
          </div>

          {/* Reactive Date Synchronizer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-neutral/40 border border-border/60">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Date Registered *</label>
              <input
                type="date"
                {...register('dtRegistered')}
                className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
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
                className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.expDt && <p className="text-[11px] text-rose-500 mt-1">{errors.expDt.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Remarks & Partner Notes</label>
            <AppTextarea
              {...register('remarks')}
              placeholder="Add any special pricing instructions, renewal context, or deal registration IDs..."
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
                    placeholder="e.g. Dell Pro 14 PC14250 Core Ultra 7"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-muted mb-1">Qty *</label>
                    <input
                      type="number"
                      min="1"
                      {...register(`items.${index}.qty` as const)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-muted mb-1">Currency *</label>
                    <select
                      {...register(`items.${index}.currency` as const)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
    </div>
  );
}
