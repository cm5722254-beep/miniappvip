import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersService } from '../admin.service';
import { AdminLayout } from '../AdminLayout';
import { clsx } from 'clsx';
import { debounce } from '@/utils/helpers';
import { useCallback } from 'react';

interface AdminUser {
  id: string;
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  balance: number;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
  _count?: { purchases: number };
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [balanceError, setBalanceError] = useState('');

  const debouncedSet = useCallback(
    debounce((val: string) => { setActiveSearch(val); setPage(1); }, 400),
    [],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, activeSearch],
    queryFn: () =>
      adminUsersService.getUsers({ page, limit: 15, search: activeSearch || undefined })
        .then((r: { data: { items: AdminUser[]; total: number; totalPages: number } }) => r.data),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      adminUsersService.adjustBalance(userId, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
      setBalanceAmount('');
      setBalanceReason('');
      setBalanceError('');
    },
    onError: (e: Error) => setBalanceError(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      adminUsersService.updateStatus(userId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !balanceAmount) return;
    setBalanceError('');
    adjustMutation.mutate({
      userId: selectedUser.id,
      amount: parseFloat(balanceAmount),
      reason: balanceReason || 'Admin adjustment',
    });
  };

  const users: AdminUser[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-white font-bold text-2xl">👥 Users</h1>
            {data && <p className="text-gray-500 text-sm">{data.total} total</p>}
          </div>
          <input
            type="search"
            placeholder="Search by name or @username..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); debouncedSet(e.target.value); }}
            className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-4 py-2 w-64 focus:outline-none focus:border-yellow-500/50"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <UserTableSkeleton />
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No users found</div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-gray-500 text-xs">
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Balance</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Purchases</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.photoUrl ? (
                            <img src={user.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 text-sm">👤</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[120px]">
                              {user.firstName} {user.lastName ?? ''}
                            </p>
                            {user.username && (
                              <p className="text-gray-500 text-xs">@{user.username}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-yellow-400 font-semibold text-xs">
                          ${parseFloat(String(user.balance)).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-gray-400 text-xs">{user._count?.purchases ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <UserStatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSelectedUser(user); setBalanceError(''); }}
                            className="text-xs text-yellow-400 bg-yellow-500/10 rounded-lg px-2.5 py-1.5"
                          >
                            Balance
                          </button>
                          <select
                            value={user.status}
                            onChange={(e) => statusMutation.mutate({ userId: user.id, status: e.target.value })}
                            className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1.5"
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="SUSPENDED">Suspend</option>
                            <option value="BANNED">Ban</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="text-xs text-gray-400 disabled:opacity-40 bg-gray-800 rounded-lg px-3 py-1.5">← Prev</button>
                <span className="text-gray-500 text-xs">Page {page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="text-xs text-gray-400 disabled:opacity-40 bg-gray-800 rounded-lg px-3 py-1.5">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Balance Adjustment Modal ─── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold">💰 Adjust Balance</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5">
              <div className="bg-gray-800 rounded-xl p-3 mb-4">
                <p className="text-white font-semibold">{selectedUser.firstName} {selectedUser.lastName ?? ''}</p>
                <p className="text-yellow-400 text-sm mt-0.5">
                  Current: ${parseFloat(String(selectedUser.balance)).toFixed(2)}
                </p>
              </div>
              <form onSubmit={handleAdjust} className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Amount (positive = add, negative = deduct)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="e.g. 10 or -5"
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Reason</label>
                  <input
                    type="text"
                    value={balanceReason}
                    onChange={(e) => setBalanceReason(e.target.value)}
                    placeholder="Reason for adjustment"
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                {balanceError && <p className="text-red-400 text-sm">⚠️ {balanceError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setSelectedUser(null)}
                    className="flex-1 bg-gray-800 text-gray-300 font-semibold rounded-lg py-2.5 text-sm">Cancel</button>
                  <button type="submit" disabled={adjustMutation.isPending}
                    className="flex-1 bg-yellow-500 text-black font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">
                    {adjustMutation.isPending ? 'Saving...' : 'Apply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function UserStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-500/20 text-green-400',
    SUSPENDED: 'bg-orange-500/20 text-orange-400',
    BANNED: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', map[status] ?? '')}>
      {status}
    </span>
  );
}

function UserTableSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 items-center">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-gray-800 rounded" />
            <div className="h-3 w-1/5 bg-gray-800 rounded" />
          </div>
          <div className="h-4 w-16 bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}
