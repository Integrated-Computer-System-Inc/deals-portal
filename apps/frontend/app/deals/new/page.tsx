'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createDeal } from '../../actions/deals';
import { Plus, Trash2, Save, ArrowLeft, Loader2, FilePlus } from 'lucide-react';
import Link from 'next/link';

// Zod Schema Definition for Dynamic Deal Creation
const dealItemSchema = z.object({
  itemDesc: z.string().min(2, 'Item description is required'),
  qty: z.coerce.number().min(1, 'Quantity must be at least 1'),
  currency: z.string().min(1, 'Currency is required'),
  totalAmt: z.coerce.number().min(0, 'Total amount must be 0 or greater'),
});

const createDealSchema = z.object({
  dtRegistered: z.string().min(1, 'Registration date is required'),
  expDt: z.string().min(1, 'Expiration date is required'),
  brand: z.string().min(1, 'Brand is required'),
  customerID: z.string().min(1, 'Customer ID is required'),
  custName: z.string().min(2, 'Customer name is required'),
  projectName: z.string().min(2, 'Project name is required'),
  assignedAO: z.string().min(2, 'Assigned AO is required'),
  bu: z.string().min(1, 'Business Unit is required'),
  dealStatus: z.coerce.number().default(4), // 4 = Pending
  remarks: z.string().optional(),
  items: z.array(dealItemSchema).min(1, 'At least one line item is required'),
});

type CreateDealFormData = z.infer<typeof createDealSchema>;

export default function NewDealPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultRegDate = new Date().toISOString().split('T')[0];
  const defaultExpDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDealFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createDealSchema as any),
    defaultValues: {
      dtRegistered: defaultRegDate,
      expDt: defaultExpDate,
      brand: 'Cisco',
      customerID: 'CUST-1002',
      custName: 'Enterprise Global Corp',
      projectName: 'Cloud Infrastructure Upgrade',
      assignedAO: session?.user?.AccountName || 'Sarah Jenkins',
      bu: session?.user?.AccountGroup || 'BU1',
      dealStatus: 4, // Pending
      remarks: '',
      items: [
        {
          itemDesc: 'Enterprise Switch Hardware Package',
          qty: 5,
          currency: 'USD',
          totalAmt: 12500,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const onSubmit = async (data: CreateDealFormData) => {
    setLoading(true);
    setErrorMsg(null);

    const creatorName = session?.user?.AccountName || session?.user?.name || 'System User';

    const result = await createDeal(
      {
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
      },
      creatorName
    );

    setLoading(false);

    if (result.success) {
      router.push('/deals');
    } else {
      setErrorMsg(result.error || 'An error occurred while registering the deal.');
    }
  };

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
              <FilePlus className="w-6 h-6 text-sky-600" />
              <span>New Deal Registration</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Submit deal headers and dynamic line items into database pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Section 1: Deal Header Information */}
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
              {errors.brand && <p className="text-[11px] text-rose-500 mt-1">{errors.brand.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Customer ID *</label>
              <input
                type="text"
                {...register('customerID')}
                placeholder="e.g. CUST-9021"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.customerID && <p className="text-[11px] text-rose-500 mt-1">{errors.customerID.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Customer Name *</label>
              <input
                type="text"
                {...register('custName')}
                placeholder="Full Customer Corporation Name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.custName && <p className="text-[11px] text-rose-500 mt-1">{errors.custName.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Project Name *</label>
              <input
                type="text"
                {...register('projectName')}
                placeholder="Project Title"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.projectName && <p className="text-[11px] text-rose-500 mt-1">{errors.projectName.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned AO *</label>
              <input
                type="text"
                {...register('assignedAO')}
                placeholder="Account Officer Name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.assignedAO && <p className="text-[11px] text-rose-500 mt-1">{errors.assignedAO.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Business Unit (BU) *</label>
              <select
                {...register('bu')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="BU1">BU1 - Network Infrastructure</option>
                <option value="BU2">BU2 - Cybersecurity Solutions</option>
                <option value="BU3">BU3 - Cloud & Datacenter</option>
                <option value="BU6">BU6 - Special Projects (No Notification)</option>
              </select>
              {errors.bu && <p className="text-[11px] text-rose-500 mt-1">{errors.bu.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Remarks</label>
            <textarea
              rows={2}
              {...register('remarks')}
              placeholder="Additional registration notes..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
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

          {errors.items && typeof errors.items.message === 'string' && (
            <p className="text-xs text-rose-500 font-semibold">{errors.items.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description</label>
                  <input
                    type="text"
                    {...register(`items.${index}.itemDesc`)}
                    placeholder="Line item description"
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

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-4 pt-4">
          <Link
            href="/deals"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-sky-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save & Register Deal</span>
          </button>
        </div>
      </form>
    </div>
  );
}
