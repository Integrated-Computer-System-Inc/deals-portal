'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getScopedDeals, updateDeal } from '../../../actions/deals';
import { UserRole } from '@my-app/types';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Edit3 } from 'lucide-react';
import Link from 'next/link';

const dealItemSchema = z.object({
  itemDesc: z.string().min(2, 'Item description is required'),
  qty: z.coerce.number().min(1, 'Quantity must be at least 1'),
  currency: z.string().min(1, 'Currency is required'),
  totalAmt: z.coerce.number().min(0, 'Total amount must be 0 or greater'),
});

const updateDealSchema = z.object({
  dtRegistered: z.string().min(1, 'Registration date is required'),
  expDt: z.string().min(1, 'Expiration date is required'),
  brand: z.string().min(1, 'Brand is required'),
  customerID: z.string().min(1, 'Customer ID is required'),
  custName: z.string().min(2, 'Customer name is required'),
  projectName: z.string().min(2, 'Project name is required'),
  assignedAO: z.string().min(2, 'Assigned AO is required'),
  bu: z.string().min(1, 'Business Unit is required'),
  dealStatus: z.coerce.number(),
  remarks: z.string().optional(),
  items: z.array(dealItemSchema).min(1, 'At least one line item is required'),
});

type UpdateDealFormData = z.infer<typeof updateDealSchema>;

export default function EditDealPage() {
  const router = useRouter();
  const params = useParams();
  const dealIdNum = Number(params?.id);

  const { data: session } = useSession();
  const role: UserRole = session?.user?.role || 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateDealFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(updateDealSchema as any),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    async function loadDealDetails() {
      setLoading(true);
      const res = await getScopedDeals({
        userRole: role,
        accountName: session?.user?.AccountName,
        accountGroup: session?.user?.AccountGroup,
      });

      if (res.success && res.data) {
        const found = res.data.find((d) => d.dealID === dealIdNum);
        if (found) {
          reset({
            dtRegistered: new Date(found.dtRegistered).toISOString().split('T')[0],
            expDt: new Date(found.expDt).toISOString().split('T')[0],
            brand: found.brand,
            customerID: found.customerID,
            custName: found.custName,
            projectName: found.projectName,
            assignedAO: found.assignedAO,
            bu: found.bu,
            dealStatus: found.dealStatus,
            remarks: found.remarks || '',
            items: found.items && found.items.length > 0
              ? found.items.map((i) => ({
                  itemDesc: i.itemDesc,
                  qty: i.qty,
                  currency: i.currency,
                  totalAmt: i.totalAmt,
                }))
              : [{ itemDesc: 'Standard Deal Item', qty: 1, currency: 'USD', totalAmt: 1000 }],
          });
        } else {
          setErrorMsg('Deal record not found or inaccessible under your current scope.');
        }
      }
      setLoading(false);
    }

    if (dealIdNum) {
      loadDealDetails();
    }
  }, [dealIdNum, role, session, reset]);

  const onSubmit = async (data: UpdateDealFormData) => {
    setSaving(true);
    setErrorMsg(null);

    const result = await updateDeal({
      dealID: dealIdNum,
      dtRegistered: data.dtRegistered,
      expDt: data.expDt,
      brand: data.brand,
      customerID: data.customerID,
      custName: data.custName,
      projectName: data.projectName,
      assignedAO: data.assignedAO,
      bu: data.bu,
      dealStatus: data.dealStatus,
      remarks: data.remarks,
      items: data.items,
    });

    setSaving(false);

    if (result.success) {
      router.push('/deals');
    } else {
      setErrorMsg(result.error || 'Failed to update deal record.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 font-medium flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
        <span>Loading deal details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/deals"
            className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-indigo-600" />
              <span>Edit Deal Record #{dealIdNum}</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Update header info, line items, and status SLA calculation trigger
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Section 1: Header Specs */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
            1. Deal Header Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Registration Date *</label>
              <input
                type="date"
                {...register('dtRegistered')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.dtRegistered && <p className="text-[11px] text-rose-500 mt-1">{errors.dtRegistered.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Expiration Date *</label>
              <input
                type="date"
                {...register('expDt')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.expDt && <p className="text-[11px] text-rose-500 mt-1">{errors.expDt.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Brand *</label>
              <select
                {...register('brand')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="Cisco">Cisco</option>
                <option value="Fortinet">Fortinet</option>
                <option value="HPE Aruba">HPE Aruba</option>
                <option value="Dell Technologies">Dell Technologies</option>
                <option value="Palo Alto Networks">Palo Alto Networks</option>
                <option value="Microsoft">Microsoft</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Customer ID *</label>
              <input
                type="text"
                {...register('customerID')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Customer Name *</label>
              <input
                type="text"
                {...register('custName')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Project Name *</label>
              <input
                type="text"
                {...register('projectName')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned AO *</label>
              <input
                type="text"
                {...register('assignedAO')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Deal Status *</label>
              <select
                {...register('dealStatus')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={1}>1 - Registered (Triggers SLA calc from Pending)</option>
                <option value={4}>4 - Pending</option>
                <option value={8}>8 - Lost</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Dynamic Line Items */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              2. Dynamic Line Items
            </h3>
            <button
              type="button"
              onClick={() => append({ itemDesc: '', qty: 1, currency: 'USD', totalAmt: 0 })}
              className="flex items-center space-x-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description</label>
                  <input
                    type="text"
                    {...register(`items.${index}.itemDesc`)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="w-full md:w-28">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    {...register(`items.${index}.qty`)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="w-full md:w-32">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Currency</label>
                  <select
                    {...register(`items.${index}.currency`)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="PHP">PHP (₱)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div className="w-full md:w-36">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.totalAmt`)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-4 md:mt-4 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-4">
          <Link
            href="/deals"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Update Deal Record</span>
          </button>
        </div>
      </form>
    </div>
  );
}
