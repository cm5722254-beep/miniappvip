import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminMoviesService } from '../admin.service';
import { AdminLayout } from '../AdminLayout';
import { clsx } from 'clsx';

interface AdminMovie {
  id: string;
  title: string;
  titleKh?: string;
  posterUrl?: string;
  price: number;
  isFree: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  totalEpisodes: number;
  viewCount: number;
  purchaseCount: number;
  category: { id?: string; name: string; nameKh: string };
  createdAt: string;
}

interface MovieFormData {
  title: string;
  titleKh: string;
  description: string;
  descriptionKh: string;
  posterUrl: string;
  bannerUrl: string;
  trailerUrl: string;
  year: string;
  price: string;
  isFree: boolean;
  isPopular: boolean;
  isNew: boolean;
  isFeatured: boolean;
  categoryId: string;
  status: string;
  tags: string;
}

const DEFAULT_FORM: MovieFormData = {
  title: '', titleKh: '', description: '', descriptionKh: '',
  posterUrl: '', bannerUrl: '', trailerUrl: '',
  year: String(new Date().getFullYear()), price: '0',
  isFree: true, isPopular: false, isNew: true, isFeatured: false,
  categoryId: '', status: 'DRAFT', tags: '',
};

export function AdminMoviesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editMovie, setEditMovie] = useState<AdminMovie | null>(null);
  const [form, setForm] = useState<MovieFormData>(DEFAULT_FORM);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-movies', page, statusFilter],
    queryFn: () =>
      adminMoviesService.getMovies({ page, limit: 15, status: statusFilter || undefined })
        .then((r: { data: { items: AdminMovie[]; total: number; totalPages: number } }) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminMoviesService.getCategories().then((r: { data: Array<{ id: string; name: string; nameKh: string }> }) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: object) => adminMoviesService.createMovie(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-movies'] }); closeForm(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: object }) => adminMoviesService.updateMovie(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-movies'] }); closeForm(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminMoviesService.deleteMovie(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-movies'] }); setDeleteId(null); },
  });

  const openCreate = () => {
    setEditMovie(null);
    setForm(DEFAULT_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (movie: AdminMovie) => {
    setEditMovie(movie);
    setForm({
      title: movie.title, titleKh: movie.titleKh ?? '',
      description: '', descriptionKh: '',
      posterUrl: movie.posterUrl ?? '', bannerUrl: '', trailerUrl: '',
      year: String(new Date(movie.createdAt).getFullYear()),
      price: String(movie.price), isFree: movie.isFree,
      isPopular: movie.isPopular ?? false,
      isNew: movie.isNew ?? false,
      isFeatured: movie.isFeatured ?? false,
      categoryId: movie.category?.id ?? '',
      status: movie.status,
      tags: '',
    } as MovieFormData);
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditMovie(null); setFormError(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const payload = {
      ...form,
      year: form.year ? parseInt(form.year) : undefined,
      price: parseFloat(form.price) || 0,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    if (editMovie) {
      updateMutation.mutate({ id: editMovie.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const movies: AdminMovie[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-white font-bold text-2xl">🎬 Movies</h1>
            {data && <p className="text-gray-500 text-sm">{data.total} total</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="UNPUBLISHED">Unpublished</option>
            </select>
            <button
              onClick={openCreate}
              className="bg-yellow-500 text-black font-bold text-sm rounded-lg px-4 py-2 hover:bg-yellow-400 transition-colors"
            >
              + Add Movie
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : movies.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No movies found</div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-gray-500 text-xs">
                    <th className="text-left px-4 py-3 font-medium">Movie</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Category</th>
                    <th className="text-left px-4 py-3 font-medium">Price</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Views</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {movies.map((movie) => (
                    <tr key={movie.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {movie.posterUrl ? (
                            <img src={movie.posterUrl} alt="" className="w-8 h-11 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-11 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">🎬</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[140px]">{movie.titleKh || movie.title}</p>
                            <p className="text-gray-500 text-xs truncate max-w-[140px]">{movie.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-gray-400 text-xs">{movie.category?.nameKh || movie.category?.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('text-xs font-semibold', movie.isFree ? 'text-green-400' : 'text-yellow-400')}>
                          {movie.isFree ? 'Free' : `$${movie.price}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={movie.status} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-gray-400 text-xs">{movie.viewCount.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(movie)}
                            className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 rounded-lg px-2.5 py-1.5 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(movie.id)}
                            className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg px-2.5 py-1.5 transition-colors"
                          >
                            Delete
                          </button>
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
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs text-gray-400 disabled:opacity-40 bg-gray-800 rounded-lg px-3 py-1.5"
                >
                  ← Prev
                </button>
                <span className="text-gray-500 text-xs">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-xs text-gray-400 disabled:opacity-40 bg-gray-800 rounded-lg px-3 py-1.5"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Movie Form Modal ─── */}
      {showForm && (
        <Modal title={editMovie ? 'Edit Movie' : 'Add Movie'} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Title (EN)" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
              <FormInput label="Title (KH)" value={form.titleKh} onChange={(v) => setForm({ ...form, titleKh: v })} />
            </div>
            <FormInput label="Description (EN)" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline />
            <FormInput label="Description (KH)" value={form.descriptionKh} onChange={(v) => setForm({ ...form, descriptionKh: v })} multiline />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Poster URL" value={form.posterUrl} onChange={(v) => setForm({ ...form, posterUrl: v })} />
              <FormInput label="Banner URL" value={form.bannerUrl} onChange={(v) => setForm({ ...form, bannerUrl: v })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormInput label="Year" value={form.year} onChange={(v) => setForm({ ...form, year: v })} type="number" />
              <FormInput label="Price ($)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />
              <div>
                <label className="text-gray-400 text-xs block mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
                >
                  <option value="">Select...</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameKh || c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="UNPUBLISHED">Unpublished</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-4">
              {(['isFree', 'isPopular', 'isNew', 'isFeatured'] as const).map((field) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.checked })}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-gray-300 text-sm capitalize">{field.replace('is', '')}</span>
                </label>
              ))}
            </div>
            <FormInput label="Tags (comma-separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />

            {formError && <p className="text-red-400 text-sm">⚠️ {formError}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeForm} className="flex-1 bg-gray-800 text-gray-300 font-semibold rounded-lg py-2.5 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-yellow-500 text-black font-bold rounded-lg py-2.5 text-sm disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editMovie ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deleteId && (
        <Modal title="Delete Movie" onClose={() => setDeleteId(null)}>
          <p className="text-gray-300 text-sm mb-4">Are you sure you want to delete this movie? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 bg-gray-800 text-gray-300 font-semibold rounded-lg py-2.5 text-sm">
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="flex-1 bg-red-500 text-white font-bold rounded-lg py-2.5 text-sm disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

/* ─── Helpers ─── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PUBLISHED: 'bg-green-500/20 text-green-400',
    DRAFT: 'bg-gray-500/20 text-gray-400',
    UNPUBLISHED: 'bg-orange-500/20 text-orange-400',
  };
  return (
    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', map[status] ?? 'text-gray-500')}>
      {status}
    </span>
  );
}

function FormInput({ label, value, onChange, type = 'text', required, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; multiline?: boolean;
}) {
  const cls = "w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500/50 transition-colors placeholder-gray-600";
  return (
    <div>
      <label className="text-gray-400 text-xs block mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={clsx(cls, 'resize-none')} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className={cls} />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 items-center">
          <div className="w-8 h-11 rounded bg-gray-800 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 bg-gray-800 rounded" />
            <div className="h-3 w-1/4 bg-gray-800 rounded" />
          </div>
          <div className="h-5 w-16 bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}
