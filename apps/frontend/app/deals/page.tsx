'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { getScopedDeals } from '../actions/deals';
import { DealHeaderRecord, UserRole } from '@my-app/types';
import Link from 'next/link';
import WTNModal from '../../components/WTNModal';
import LostDealModal from '../../components/LostDealModal';
import {
  Search,
  Filter,
  Edit,
  BellRing,
  ShieldAlert,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export default function DealsPage() {
  const { data: session } = useSession();
  const [deals, setDeals] = useState<DealHeaderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [wtnTarget, setWtnTarget] = useState<{ id: number; regID: string; date?: string | Date | null } | null>(null);
  const [lostTarget, setLostTarget] = useState<{ id: number; regID: string } | null>(null);

  const role: UserRole = session?.user?.role || 'admin';
  const accountName = session?.user?.AccountName;
  const accountGroup = session?.user?.AccountGroup;

  const fetchDeals = async () => {
    setLoading(true);
    const res = await getScopedDeals({
      userRole: role,
      accountName,
      accountGroup,
    });

    if (res.success && res.data) {
      setDeals(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDeals();
  }, [role, accountName, accountGroup]);

  // Filter deals based on search bar query and status dropdown
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesSearch =
        deal.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.dealRegID.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.assignedAO.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || String(deal.dealStatus) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [deals, searchQuery, statusFilter]);

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Registered
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Pending
          </span>
        );
      case 8:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Lost
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 mr-1 text-slate-500" /> Status {status}
          </span>
        );
    }
  };

  const formatAmounts = (totals?: Record<string, number>) => {
    if (!totals || Object.keys(totals).length === 0) return '0.00';
    return Object.entries(totals)
      .map(([curr, amt]) => `${curr} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      .join(' | ');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Deals Registry</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Manage, edit, and track registered opportunities across your scope ({role.toUpperCase()})
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDeals}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {role !== 'bu_admin' && (
            <Link
              href="/deals/new"
              className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Deal</span>
            </Link>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project, customer, AO, or deal reg ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
            <Filter className="w-4 h-4" />
            <span>Filter Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="1">1 - Registered</option>
            <option value="4">4 - Pending</option>
            <option value="8">8 - Lost</option>
          </select>
        </div>
      </div>

      {/* Main Deals Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Deal Reg ID</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Project Name</th>
                <th className="py-3.5 px-4">Assigned AO</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Expiration Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    Loading scoped deals registry...
                  </td>
                </tr>
              )}

              {!loading && filteredDeals.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No matching deal records found.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredDeals.map((deal) => (
                  <tr key={deal.dealID} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-4 font-bold text-sky-600">{deal.dealRegID}</td>
                    <td className="py-4 px-4 font-bold text-slate-900">{deal.custName}</td>
                    <td className="py-4 px-4 text-slate-700">{deal.projectName}</td>
                    <td className="py-4 px-4 text-slate-600">{deal.assignedAO}</td>
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {formatAmounts(deal.aggregatedTotals)}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {new Date(deal.expiration).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(deal.dealStatus)}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Quick WTN Edit Modal Trigger */}
                        <button
                          onClick={() =>
                            setWtnTarget({
                              id: deal.dealID,
                              regID: deal.dealRegID,
                              date: deal.wtn?.whenToNotify,
                            })
                          }
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                          title="Quick Edit WTN Date"
                        >
                          <BellRing className="w-4 h-4" />
                        </button>

                        {/* Lost Deal Modal Trigger */}
                        {role !== 'bu_admin' && (
                          <button
                            onClick={() => setLostTarget({ id: deal.dealID, regID: deal.dealRegID })}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Mark as Lost Deal"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}

                        {/* Edit Deal Page Link */}
                        {role !== 'bu_admin' && (
                          <Link
                            href={`/deals/${deal.dealID}/edit`}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit Full Deal Record"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WTN Modal */}
      {wtnTarget && (
        <WTNModal
          dealID={wtnTarget.id}
          dealRegID={wtnTarget.regID}
          currentWTN={wtnTarget.date}
          isOpen={!!wtnTarget}
          onClose={() => setWtnTarget(null)}
          onSuccess={fetchDeals}
        />
      )}

      {/* Lost Deal Modal */}
      {lostTarget && (
        <LostDealModal
          dealID={lostTarget.id}
          dealRegID={lostTarget.regID}
          isOpen={!!lostTarget}
          onClose={() => setLostTarget(null)}
          onSuccess={fetchDeals}
        />
      )}
    </div>
  );
}
