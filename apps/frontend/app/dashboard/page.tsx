'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getScopedDeals } from '../actions/deals';
import { DealHeaderRecord, UserRole } from '@my-app/types';
import MetricCard from '../../components/MetricCard';
import {
  FileCheck2,
  CalendarX2,
  Tag,
  Building,
  PlusCircle,
  Clock,
  TrendingUp,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [deals, setDeals] = useState<DealHeaderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const role: UserRole = session?.user?.role || 'admin';
  const accountName = session?.user?.AccountName;
  const accountGroup = session?.user?.AccountGroup;

  useEffect(() => {
    async function loadDashboardData() {
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
    }
    loadDashboardData();
  }, [role, accountName, accountGroup]);

  // Metric Computations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalRegistered = deals.filter((d) => d.dealStatus === 1).length;

  const expiredThisMonth = deals.filter((d) => {
    const exp = new Date(d.expiration);
    return exp.getMonth() === currentMonth && exp.getFullYear() === currentYear && exp < now;
  }).length;

  // Deals per Brand breakdown
  const dealsPerBrandMap: Record<string, number> = {};
  deals.forEach((d) => {
    dealsPerBrandMap[d.brand] = (dealsPerBrandMap[d.brand] || 0) + 1;
  });
  const topBrandCount = Object.keys(dealsPerBrandMap).length;

  // Deals per BU breakdown
  const dealsPerBUMap: Record<string, number> = {};
  deals.forEach((d) => {
    dealsPerBUMap[d.bu] = (dealsPerBUMap[d.bu] || 0) + 1;
  });
  const topBUCount = Object.keys(dealsPerBUMap).length;

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Scoped Role: {role.toUpperCase()}
            </span>
            {accountGroup && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/80 text-slate-300 border border-slate-600">
                {accountGroup}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Real-time analytics and deal registration pipeline tracking for {accountName || 'All Business Units'}.
          </p>
        </div>

        {role !== 'bu_admin' && (
          <Link
            href="/deals/new"
            className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-sky-500/25 transition active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Register New Deal</span>
          </Link>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Registered Deals"
          value={loading ? '...' : totalRegistered}
          subtitle="Status = 1 (Active Deals)"
          icon={FileCheck2}
          trend="+12%"
          trendType="positive"
          colorGradient="bg-gradient-to-tr from-emerald-500 to-teal-600"
        />

        <MetricCard
          title="Expired Deals per Month"
          value={loading ? '...' : expiredThisMonth}
          subtitle={`Expired in ${now.toLocaleString('default', { month: 'long' })}`}
          icon={CalendarX2}
          trend="-5%"
          trendType="negative"
          colorGradient="bg-gradient-to-tr from-rose-500 to-red-600"
        />

        <MetricCard
          title="Active Brands"
          value={loading ? '...' : topBrandCount}
          subtitle="Deals Per Brand Tracking"
          icon={Tag}
          trend="Diverse"
          trendType="neutral"
          colorGradient="bg-gradient-to-tr from-sky-500 to-blue-600"
        />

        <MetricCard
          title="Active Business Units"
          value={loading ? '...' : topBUCount}
          subtitle="Deals Per BU Distribution"
          icon={Building}
          trend="Balanced"
          trendType="neutral"
          colorGradient="bg-gradient-to-tr from-amber-500 to-orange-600"
        />
      </div>

      {/* Detailed Breakdown Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deals per Brand Panel */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-sky-600" />
                <span>Deals per Brand</span>
              </h3>
              <p className="text-xs text-slate-500">Distribution of registered pipeline across vendor partners</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{deals.length} total deals</span>
          </div>

          <div className="space-y-4">
            {Object.keys(dealsPerBrandMap).length === 0 && !loading && (
              <p className="text-xs text-slate-400 italic py-4 text-center">No brand data available</p>
            )}

            {Object.entries(dealsPerBrandMap).map(([brand, count]) => {
              const pct = deals.length ? Math.round((count / deals.length) * 100) : 0;
              return (
                <div key={brand} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{brand}</span>
                    <span className="text-slate-500">
                      {count} deals ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deals per BU Panel */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-600" />
                <span>Deals per Business Unit</span>
              </h3>
              <p className="text-xs text-slate-500">Distribution of opportunities by organizational group</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{topBUCount} Business Units</span>
          </div>

          <div className="space-y-4">
            {Object.keys(dealsPerBUMap).length === 0 && !loading && (
              <p className="text-xs text-slate-400 italic py-4 text-center">No BU data available</p>
            )}

            {Object.entries(dealsPerBUMap).map(([bu, count]) => {
              const pct = deals.length ? Math.round((count / deals.length) * 100) : 0;
              return (
                <div key={bu} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{bu}</span>
                    <span className="text-slate-500">
                      {count} deals ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Table Preview */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>Recent Deal Registrations</span>
          </h3>
          <Link href="/deals" className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
            View All Registry <TrendingUp className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 px-2">Deal Reg ID</th>
                <th className="pb-3 px-2">Customer Name</th>
                <th className="pb-3 px-2">Project Name</th>
                <th className="pb-3 px-2">Assigned AO</th>
                <th className="pb-3 px-2">Brand</th>
                <th className="pb-3 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {deals.slice(0, 5).map((deal) => (
                <tr key={deal.dealID} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-2 font-bold text-sky-600">{deal.dealRegID}</td>
                  <td className="py-3 px-2 text-slate-900 font-semibold">{deal.custName}</td>
                  <td className="py-3 px-2 text-slate-600">{deal.projectName}</td>
                  <td className="py-3 px-2 text-slate-600">{deal.assignedAO}</td>
                  <td className="py-3 px-2 text-slate-600">{deal.brand}</td>
                  <td className="py-3 px-2 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        deal.dealStatus === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : deal.dealStatus === 4
                          ? 'bg-amber-100 text-amber-800'
                          : deal.dealStatus === 8
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {deal.dealStatus === 1 ? 'Registered' : deal.dealStatus === 4 ? 'Pending' : deal.dealStatus === 8 ? 'Lost' : `Status ${deal.dealStatus}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
