import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminDepositsService } from '../admin.service';
import { AdminLayout } from '../AdminLayout';
import { clsx } from 'clsx';

interface AdminDeposit {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentMethod: string;
  paymentReference?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName?: string;
    username?: string;
    telegramId: string;
  };
}

const STATUS_TABS = [
  { value: 'PENDING',   label: '⏳ Pending' },
  { value: '',          label: 'All' },
  { value: 'COMPLETED', label: '✅ Done' },
  { value: 'FAILED',    label: '❌ Failed' },
];

export function AdminDepositsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-deposits', page, statusFilter],
    queryFn: () =>
      adminDepositsService
        .getDeposits({ page, limit: 15, status: statusFilter || undefined })
        .then((r: { data: { items: AdminDeposit[]; total: number; totalPages: number } }) => r.data),
    refetchInterval: statusFilter === 'PENDING' ? 15000 : false,
  });

  const approveMutation = useMutation({
    mutationFn: (depositId: string) => adminDepositsService.approveDeposit(depositId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
      setActionError('');
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ depositId, reason }: { depositId: string; reason: string }) =>
      adminDepositsService.rejectDeposit(depositId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
      setRejectId(null);
      setRejectReason('');
      setActionError('');
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const deposits: AdminDeposit[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-white font-bold text-2xl">💰 Deposits</h1>
          {data && <p className="text-gray-500 text-sm">{data.total} results</p>}
        </div>

        {actionError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-red-400 text-sm">⚠️ {actionError}</p>
          </div>
        )}

        {/* Status tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={clsx(
                'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                statusFilter === tab.value
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-500 hover:text-gray-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pending alert */}
        {statusFilter === 'PENDING' && deposits.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="text-orange-300 text-sm font-medium">
              {deposits.length} pending deposit{deposits.length > 1 ? 's' : ''} require your approval
            </p>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <DepositsSkeleton />
        ) : deposits.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            {statusFilter === 'PENDING' ? '✅ No pending deposits' : 'No deposits found'}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {deposits.map((deposit) => (
                <DepositCard
                  key={deposit.id}
                  deposit={deposit}
                  onApprove={() => approveMutation.mutate(deposit.id)}
                  onReject={() => { setRejectId(deposit.id); setRejectReason(''); setActionError(''); }}
                  isApproving={approveMutation.isPending && approveMutation.variables === deposit.id}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-gray-900 rounded-xl border border-gray-800 px-4 py-3">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="text-xs text-gray-400 disabled:opacity-40 bg-gray-800 rounded-lg px-3 py-1.5">← Prev</button>
                <span className="text-gray-500 text-xs">Page {page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="text-xs text-gray-400 disabled:opacity-40 bg-gray-800 rounded-lg px-3 py-1.5">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold">❌ Reject Deposit</h2>
              <button onClick={() => setRejectId(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Rejection reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Payment not received"
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500/50 resize-none"
                />
              </div>
              {actionError && <p className="text-red-400 text-sm">⚠️ {actionError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setRejectId(null)}
                  className="flex-1 bg-gray-800 text-gray-300 font-semibold rounded-lg py-2.5 text-sm">Cancel</button>
                <button
                  onClick={() => rejectMutation.mutate({ depositId: rejectId, reason: rejectReason || 'Rejected by admin' })}
                  disabled={rejectMutation.isPending}
                  className="flex-1 bg-red-500 text-white font-bold rounded-lg py-2.5 text-sm disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function DepositCard({ deposit, onApprove, onReject, isApproving }: {
  deposit: AdminDeposit;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
}) {
  const statusMap: Record<string, { cls: string; label: string }> = {
    PENDING:   { cls: 'bg-orange-500/20 text-orange-400', label: '⏳ Pending' },
    COMPLETED: { cls: 'bg-green-500/20  text-green-400',  label: '✅ Completed' },
    FAILED:    { cls: 'bg-red-500/20    text-red-400',    label: '❌ Failed' },
    CANCELLED: { cls: 'bg-gray-500/20   text-gray-400',   label: '🚫 Cancelled' },
  };
  const s = statusMap[deposit.status] ?? statusMap.FAILED;
  const methodLabel: Record<string, string> = {
    MANUAL_BANK_TRANSFER: '🏦 Bank Transfer',
    MANUAL_KHQR: '📱 KHQR',
    MANUAL_ABABANK: '💳 ABA Bank',
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* User */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm flex-shrink-0">👤</div>
            <div>
              <p className="text-white text-sm font-semibold">
                {deposit.user.firstName} {deposit.user.lastName ?? ''}
              </p>
              <p className="text-gray-500 text-xs">
                {deposit.user.username ? `@${deposit.user.username}` : `ID: ${deposit.user.telegramId}`}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <span className="text-yellow-400 font-bold text-lg">
              ${parseFloat(String(deposit.amount)).toFixed(2)}
            </span>
            <span className="text-gray-400 self-end">
              {methodLabel[deposit.paymentMethod] ?? deposit.paymentMethod}
            </span>
            {deposit.paymentReference && (
              <span className="text-gray-500 font-mono self-end">Ref: {deposit.paymentReference}</span>
            )}
          </div>
          <p className="text-gray-600 text-[10px] mt-1">
            {new Date(deposit.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Right: status + actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={clsx('text-[10px] font-semibold px-2.5 py-1 rounded-full', s.cls)}>
            {s.label}
          </span>
          {deposit.status === 'PENDING' && (
            <div className="flex gap-2">
              <button
                onClick={onApprove}
                disabled={isApproving}
                className="bg-green-500 text-white text-xs font-bold rounded-lg px-3 py-1.5 hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                {isApproving ? '...' : '✅ Approve'}
              </button>
              <button
                onClick={onReject}
                className="bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg px-3 py-1.5 hover:bg-red-500/30 transition-colors"
              >
                ❌
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DepositsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-gray-800" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-1/3 bg-gray-800 rounded" />
              <div className="h-3 w-1/5 bg-gray-800 rounded" />
            </div>
          </div>
          <div className="h-6 w-20 bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}
