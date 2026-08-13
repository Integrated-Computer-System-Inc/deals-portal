'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { getDealById, updateDeal } from '../../../actions/deals';
import {
  ACTIVE_BUSINESS_UNITS,
  DEAL_STATUS_MAP,
  MOCK_DEALS,
  CustomerLookupResult,
  DealHeaderRecord,
} from '@my-app/types';
import {
  AppInput,
  AppTextarea,
  AppCard,
  AppChip,
} from '../../../../components/ui';
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
  Sparkles,
  Loader2,
  DollarSign,
  Info,
  ShieldAlert,
  BellRing,
  AlertCircle,
  Send,
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
  validityDays: z.coerce.number().min(1, 'Validity days must be at least 1'),
  expDt: z.string().min(1, 'Expiration date is required'),
  brand: z.string().min(1, 'Brand is required'),
  customerID: z.string().min(1, 'Customer ID is required'),
  custName: z.string().min(2, 'Customer name is required'),
  dealRegID: z.string().min(2, 'Deal Registration ID is required'),
  projectName: z.string().min(2, 'Project name is required'),
  assignedAO: z.string().min(2, 'Assigned AO is required'),
  bu: z.string().min(1, 'Business Unit is required'),
  dealStatus: z.coerce.number(),
  remarks: z.string().optional(),
  toEmail: z.boolean().default(true),
  items: z.array(dealItemSchema).min(1, 'At least one line item is required'),
});

type UpdateDealFormData = z.infer<typeof updateDealSchema>;

export default function EditDealPage({ params }: { params: { id: string } }) {
  const dealID = Number(params.id);
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isWtnModalOpen, setIsWtnModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [currentWtnDate, setCurrentWtnDate] = useState<Date | string | null>(null);

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
      dtRegistered: new Date().toISOString().split('T')[0],
      validityDays: 90,
      expDt: new Date().toISOString().split('T')[0],
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
          currency: 'USD',
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
  const watchItems = watch('items');
  const watchStatus = watch('dealStatus');
  const watchToEmail = watch('toEmail');

  useEffect(() => {
    async function loadDeal() {
      setFetching(true);
      try {
        const res = await getDealById(dealID);
        if (res && res.success && res.data) {
          const deal = res.data;
          const regStr = new Date(deal.dtRegistered).toISOString().split('T')[0];
          const expStr = new Date(deal.expDt).toISOString().split('T')[0];
          const diffDays = Math.max(
            1,
            Math.ceil((new Date(deal.expDt).getTime() - new Date(deal.dtRegistered).getTime()) / (1000 * 60 * 60 * 24))
          );

          reset({
            dtRegistered: regStr,
            validityDays: diffDays,
            expDt: expStr,
            brand: deal.brand,
            customerID: deal.customerID,
            custName: deal.custName,
            dealRegID: deal.dealRegID,
            projectName: deal.projectName,
            assignedAO: deal.assignedAO,
            bu: deal.bu,
            dealStatus: deal.dealStatus,
            remarks: deal.remarks || '',
            toEmail: true,
            items: deal.items && deal.items.length > 0
              ? deal.items.map((i: any) => ({
                  dealItemID: i.dealItemID,
                  itemDesc: i.itemDesc,
                  qty: i.qty,
                  currency: i.currency,
                  totalAmt: i.totalAmt,
                }))
              : [{ itemDesc: 'Hardware Bundle', qty: 1, currency: 'PHP', totalAmt: 10000 }],
          });

          if (deal.wtn?.whenToNotify) {
            setCurrentWtnDate(deal.wtn.whenToNotify);
          }
        } else {
          // Fallback to MOCK_DEALS
          const mockMatch = MOCK_DEALS.find((d: DealHeaderRecord) => d.dealID === dealID) || MOCK_DEALS[0];
          const regStr = new Date(mockMatch.dtRegistered).toISOString().split('T')[0];
          const expStr = new Date(mockMatch.expDt).toISOString().split('T')[0];
          const diffDays = Math.max(
            1,
            Math.ceil((new Date(mockMatch.expDt).getTime() - new Date(mockMatch.dtRegistered).getTime()) / (1000 * 60 * 60 * 24))
          );

          reset({
            dtRegistered: regStr,
            validityDays: diffDays,
            expDt: expStr,
            brand: mockMatch.brand,
            customerID: mockMatch.customerID,
            custName: mockMatch.custName,
            dealRegID: mockMatch.dealRegID,
            projectName: mockMatch.projectName,
            assignedAO: mockMatch.assignedAO,
            bu: mockMatch.bu,
            dealStatus: mockMatch.dealStatus,
            remarks: mockMatch.remarks || '',
            toEmail: true,
            items: mockMatch.items
              ? mockMatch.items.map((i: any) => ({
                  dealItemID: i.dealItemID,
                  itemDesc: i.itemDesc,
                  qty: i.qty,
                  currency: i.currency,
                  totalAmt: i.totalAmt,
                }))
              : [{ itemDesc: 'Hardware Bundle', qty: 1, currency: 'PHP', totalAmt: 10000 }],
          });

          if (mockMatch.wtn?.whenToNotify) {
            setCurrentWtnDate(mockMatch.wtn.whenToNotify);
          }
        }
      } catch (err: any) {
        console.error('Failed to load deal:', err);
        const mockMatch = MOCK_DEALS[0];
        reset({
          dtRegistered: new Date(mockMatch.dtRegistered).toISOString().split('T')[0],
          validityDays: 90,
          expDt: new Date(mockMatch.expDt).toISOString().split('T')[0],
          brand: mockMatch.brand,
          customerID: mockMatch.customerID,
          custName: mockMatch.custName,
          dealRegID: mockMatch.dealRegID,
          projectName: mockMatch.projectName,
          assignedAO: mockMatch.assignedAO,
          bu: mockMatch.bu,
          dealStatus: mockMatch.dealStatus,
          remarks: mockMatch.remarks || '',
          toEmail: true,
          items: [
            {
              itemDesc: 'Standard Bundle',
              qty: 1,
              currency: 'PHP',
              totalAmt: 50000,
            },
          ],
        });
      } finally {
        setFetching(false);
      }
    }

    if (dealID) {
      loadDeal();
    }
  }, [dealID, reset]);

  // Reactive Expiration Calculation
  const handleValidityChange = (days: number) => {
    setValue('validityDays', days);
    if (watchRegDate && days > 0) {
      const reg = new Date(watchRegDate);
      const newExp = new Date(reg.getTime() + days * 24 * 60 * 60 * 1000);
      setValue('expDt', newExp.toISOString().split('T')[0]);
    }
  };

  const handleExpDateChange = (expDateStr: string) => {
    setValue('expDt', expDateStr);
    if (watchRegDate && expDateStr) {
      const reg = new Date(watchRegDate);
      const exp = new Date(expDateStr);
      const diffTime = exp.getTime() - reg.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        setValue('validityDays', diffDays);
      }
    }
  };

  // Customer Auto-Fill Handler
  const handleSelectCustomer = (customer: CustomerLookupResult) => {
    setValue('customerID', customer.customerID);
    setValue('custName', customer.custName);
    setValue('assignedAO', customer.assignedAO || 'Abegail Cebujano');
    setValue('bu', customer.bu || 'BU5');
  };

  // Status Change Interceptor
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = Number(e.target.value);
    setValue('dealStatus', newStatus);

    if (newStatus === 7) {
      setIsLostModalOpen(true);
    }
  };

  // Currency Totals Calculation
  const currencyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    if (watchItems && Array.isArray(watchItems)) {
      watchItems.forEach((item) => {
        if (item && item.currency && item.totalAmt) {
          const curr = item.currency;
          totals[curr] = (totals[curr] || 0) + Number(item.totalAmt || 0);
        }
      });
    }
    return totals;
  }, [watchItems]);

  const onSubmit = async (data: UpdateDealFormData) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        dealID,
        dtRegistered: new Date(data.dtRegistered),
        expiration: Number(data.validityDays),
        expDt: new Date(data.expDt),
        brand: data.brand,
        customerID: data.customerID,
        custName: data.custName,
        dealRegID: data.dealRegID,
        projectName: data.projectName,
        assignedAO: data.assignedAO,
        bu: data.bu,
        dealStatus: Number(data.dealStatus),
        remarks: data.remarks || '',
        toEmail: Boolean(data.toEmail),
        items: data.items.map((item) => ({
          dealItemID: item.dealItemID,
          itemDesc: item.itemDesc,
          qty: Number(item.qty),
          currency: item.currency,
          totalAmt: Number(item.totalAmt),
        })),
      };

      const result = await updateDeal(payload);

      if (result.success) {
        router.push('/deals');
        router.refresh();
      } else {
        setErrorMsg(result.error || 'Failed to update deal registration');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm font-semibold text-muted">Loading deal details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/deals"
            className="p-2 rounded-xl bg-neutral/80 hover:bg-neutral border border-border/70 text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              Edit Deal Registration
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
                #{dealID}
              </span>
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Update deal attributes, adjust When-To-Notify alert dates, and modify line items.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick WTN Trigger */}
          <button
            type="button"
            onClick={() => setIsWtnModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-600 rounded-xl text-xs font-semibold hover:bg-amber-500/20 transition border border-amber-500/20"
          >
            <BellRing className="w-4 h-4" />
            <span>Adjust WTN Date</span>
          </button>

          {/* Quick Lost Deal Trigger */}
          {watchStatus !== 7 && (
            <button
              type="button"
              onClick={() => setIsLostModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-500/20 transition border border-rose-500/20"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Mark as Lost</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Section 1: Customer Identification */}
        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <h2 className="font-bold text-sm text-foreground">1. Customer Identification</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-600 rounded-lg text-xs font-semibold hover:bg-sky-500/20 transition border border-sky-500/20"
            >
              <Search className="w-3.5 h-3.5" />
              <span>LiveSearch Customer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Customer Name *</label>
              <input
                {...register('custName')}
                placeholder="Search or enter customer company..."
                className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  errors.custName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
                }`}
              />
              {errors.custName && <p className="text-[10px] text-rose-500 mt-1">{errors.custName.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Customer ID *</label>
              <input
                {...register('customerID')}
                placeholder="e.g. CUST-3184"
                className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  errors.customerID ? 'border-rose-500' : 'border-border'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Assigned Account Officer (AO) *</label>
              <input
                {...register('assignedAO')}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Business Unit (BU) *</label>
              <select
                {...register('bu')}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {ACTIVE_BUSINESS_UNITS.map((bu) => (
                  <option key={bu} value={bu}>
                    {bu}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </AppCard>

        {/* Section 2: Deal Specification & Timing */}
        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm text-foreground">2. Deal Registration Details</h2>
            </div>
            {currentWtnDate && (
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                WTN: {new Date(currentWtnDate).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Product Brand *</label>
              <select
                {...register('brand')}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Dell">Dell</option>
                <option value="HP">HP</option>
                <option value="Lenovo">Lenovo</option>
                <option value="Cisco">Cisco</option>
                <option value="Microsoft">Microsoft</option>
                <option value="Fortinet">Fortinet</option>
                <option value="APC">APC</option>
                <option value="Epson">Epson</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Deal Registration ID *</label>
              <input
                {...register('dealRegID')}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Current Deal Status</label>
              <select
                value={watchStatus}
                onChange={handleStatusChange}
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
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Validity (in Days) *</label>
              <input
                type="number"
                value={watchValidityDays}
                onChange={(e) => handleValidityChange(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Expiration Date *</label>
              <input
                type="date"
                value={watch('expDt')}
                onChange={(e) => handleExpDateChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
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
        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs space-y-4">
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
                className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-neutral/30 border border-border/60 hover:border-border transition"
              >
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Item #{index + 1} Description *
                  </label>
                  <input
                    {...register(`items.${index}.itemDesc` as const)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-muted mb-1">Qty *</label>
                  <input
                    type="number"
                    min="1"
                    {...register(`items.${index}.qty` as const)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="col-span-3 sm:col-span-2">
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

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-muted mb-1">Total Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.totalAmt` as const)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="col-span-1 text-right sm:pt-5">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition disabled:opacity-30"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Currency Summary Footer */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral/80 border border-border/80">
            <span className="text-xs font-bold text-foreground">Total Deal Amount:</span>
            <div className="flex items-center gap-3 font-mono font-bold text-sm text-primary">
              {Object.entries(currencyTotals).map(([curr, amt]) => (
                <span key={curr} className="bg-background px-3 py-1 rounded-lg border border-border shadow-xs">
                  {curr} {amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ))}
            </div>
          </div>
        </AppCard>

        {/* Section 4: Email Notification & Actions */}
        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Send Email Notification on Update</div>
              <div className="text-[11px] text-muted">
                Queues update email in deals_reg_notification for Assigned AO & BU Head (skips BU6).
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              {...register('toEmail')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
          </label>
        </AppCard>

        {/* Action Footer */}
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
            <span>Save & Apply Updates</span>
          </button>
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
        onSuccess={() => {}}
      />

      {/* Lost Deal Modal */}
      <LostDealModal
        dealID={dealID}
        dealRegID={watch('dealRegID') || String(dealID)}
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
