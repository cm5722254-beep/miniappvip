import { useQuery } from '@tanstack/react-query';
import { adminDashboardService } from '../admin.service';
import { AdminLayout } from '../AdminLayout';
import { clsx } from 'clsx';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalMovies: number;
  publishedMovies: number;
  totalRevenue: number;
  pendingDeposits: number;
  totalDeposits: number;
  completedDeposits: number;
  recentUsers?: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    username?: string;
    createdAt: string;
  }>;
}

export function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminDashboardService.getStats().then((r: { data: DashboardStats }) => r.data),
    refetchInterval: 30000,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-white font-bold text-2xl">📊 Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">ទិដ្ឋភាពទូទៅ — Overview</p>
        </div>

        {isLoading && <StatsSkeletonGrid />}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm">⚠️ Failed to load stats</p>
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="👥" label="Total Users"        value={data.totalUsers}      sub={`${data.activeUsers} active`}              color="blue"   />
              <StatCard icon="🎬" label="Movies"             value={data.totalMovies}     sub={`${data.publishedMovies} published`}        color="purple" />
              <StatCard icon="💰" label="Revenue"            value={`$${(data.totalRevenue ?? 0).toFixed(2)}`} sub="total completed"    color="yellow" />
              <StatCard icon="⏳" label="Pending Deposits"   value={data.pendingDeposits} sub={`${data.completedDeposits} completed`}      color={data.pendingDeposits > 0 ? 'red' : 'green'} />
            </div>

            {data.recentUsers && data.recentUsers.length > 0 && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h2 className="text-white font-semibold text-sm">👤 Recent Users</h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {data.recentUsers.slice(0, 8).map((user) => (
                    <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">👤</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">
                          {user.firstName} {user.lastName ?? ''}
                        </p>
                        {user.username && <p className="text-gray-500 text-xs">@{user.username}</p>}
                      </div>
                      <p className="text-gray-600 text-xs flex-shrink-0">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

const colorMap = {
  blue:   'bg-blue-500/10   border-blue-500/30   text-blue-400',
  purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  green:  'bg-green-500/10  border-green-500/30  text-green-400',
  red:    'bg-red-500/10    border-red-500/30    text-red-400',
};

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub: string; color: keyof typeof colorMap;
}) {
  return (
    <div className={clsx('rounded-xl border p-4', colorMap[color])}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-white font-bold text-2xl">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  );
}

function StatsSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2 animate-pulse">
          <div className="h-4 w-1/2 bg-gray-800 rounded" />
          <div className="h-8 w-2/3 bg-gray-800 rounded" />
          <div className="h-3 w-1/3 bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}
