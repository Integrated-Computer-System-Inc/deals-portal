'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LayoutDashboard, FileText, PlusCircle, ShieldCheck, UserCheck, Building2, LogOut, LogIn } from 'lucide-react';
import { UserRole } from '@my-app/types';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole: UserRole = session?.user?.role || 'admin';
  const accountName = session?.user?.AccountName || session?.user?.name || 'Guest User';
  const accountGroup = session?.user?.AccountGroup || 'BU1';

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/deals', label: 'Deals Registry', icon: FileText },
    { href: '/deals/new', label: 'New Deal Registration', icon: PlusCircle, hidden: userRole === 'bu_admin' },
  ];

  const handleRoleSwitch = (targetRole: UserRole) => {
    let targetName = 'Sarah Jenkins';
    if (targetRole === 'ao') targetName = 'Alex Rivera';
    if (targetRole === 'bu_admin') targetName = 'David Chen';

    signIn('demo-credentials', {
      role: targetRole,
      accountName: targetName,
      callbackUrl: pathname,
    });
  };

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-lg shadow-md shadow-sky-500/20">
              DP
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                DealReg<span className="text-sky-400">Portal</span>
              </span>
              <span className="text-xs block text-slate-400 font-medium">Enterprise Deals Management</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks
              .filter((link) => !link.hidden)
              .map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
          </div>

          {/* User Session & Role Controls */}
          <div className="flex items-center space-x-3">
            {session?.user ? (
              <div className="flex items-center space-x-3 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white">{accountName}</div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-end space-x-1">
                    <span>{session.user.DomainAccount || 'CORP\\USER'}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-sky-400">{accountGroup}</span>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="flex items-center">
                  {userRole === 'admin' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                    </span>
                  )}
                  {userRole === 'ao' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      <UserCheck className="w-3 h-3 mr-1" /> Account Officer
                    </span>
                  )}
                  {userRole === 'bu_admin' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Building2 className="w-3 h-3 mr-1" /> BU Admin
                    </span>
                  )}
                </div>

                {/* Demo Role Selector */}
                <div className="relative group">
                  <button className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 bg-slate-700/60 rounded border border-slate-600">
                    Switch Role
                  </button>
                  <div className="absolute right-0 mt-1 w-44 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 hidden group-hover:block z-50">
                    <button
                      onClick={() => handleRoleSwitch('admin')}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center space-x-2 ${
                        userRole === 'admin' ? 'text-emerald-400 bg-slate-700' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </button>
                    <button
                      onClick={() => handleRoleSwitch('ao')}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center space-x-2 ${
                        userRole === 'ao' ? 'text-sky-400 bg-slate-700' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Account Officer</span>
                    </button>
                    <button
                      onClick={() => handleRoleSwitch('bu_admin')}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center space-x-2 ${
                        userRole === 'bu_admin' ? 'text-amber-400 bg-slate-700' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>BU Admin</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => signOut()}
                  className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('demo-credentials', { role: 'admin', accountName: 'Sarah Jenkins' })}
                className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
