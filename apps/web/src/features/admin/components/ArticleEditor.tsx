import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MBTI_TYPES, type MBTIType } from '@mbti/shared';
import { adminCall } from '../lib/adminApi';

type Article = {
  id: string;
  mbtiType: MBTIType;
  slug: string;
  title: string;
  body: string;
  status: 'draft' | 'published';
};

const THRESHOLD = 3;
const empty = {
  title: '',
  body: '',
  mbtiType: 'INTJ' as MBTIType,
  slug: '',
  status: 'draft' as 'draft' | 'published',
};

export function ArticleEditor() {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'articles'],
    queryFn: () =>
      adminCall<{ data: { articles: Article[] } | null }>('/api/admin/articles'),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'articles'] });
    qc.invalidateQueries({ queryKey: ['admin', 'metrics'] });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const bodyJson = JSON.stringify(form);
      if (editingId) {
        return adminCall(`/api/admin/articles/${editingId}`, {
          method: 'PATCH',
          body: bodyJson,
        });
      }
      return adminCall('/api/admin/articles', { method: 'POST', body: bodyJson });
    },
    onSuccess: () => {
      setForm(empty);
      setEditingId(null);
      setErr(null);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) =>
      adminCall(`/api/admin/articles/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const articles = data?.data?.articles ?? [];
  const countByType = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.mbtiType] = (acc[a.mbtiType] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <h1 className="font-clash font-bold text-2xl">Quản lý nội dung</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate();
        }}
        className="bg-surface-base border border-white/10 rounded-2xl p-5 space-y-3"
      >
        <h2 className="font-semibold">{editingId ? 'Sửa bài viết' : 'Bài viết mới'}</h2>
        <input
          placeholder="Tiêu đề"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="w-full px-3 py-2 rounded-lg bg-surface-deep border border-white/10 text-white"
        />
        <input
          placeholder="slug-kebab-case"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          required
          className="w-full px-3 py-2 rounded-lg bg-surface-deep border border-white/10 text-white"
        />
        <div className="flex gap-3">
          <select
            value={form.mbtiType}
            onChange={(e) => setForm({ ...form, mbtiType: e.target.value as MBTIType })}
            className="px-3 py-2 rounded-lg bg-surface-deep border border-white/10 text-white"
          >
            {MBTI_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as 'draft' | 'published' })
            }
            className="px-3 py-2 rounded-lg bg-surface-deep border border-white/10 text-white"
          >
            <option value="draft">Nháp</option>
            <option value="published">Xuất bản</option>
          </select>
        </div>
        <textarea
          placeholder="Nội dung"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          required
          rows={6}
          className="w-full px-3 py-2 rounded-lg bg-surface-deep border border-white/10 text-white"
        />
        {err && <p className="text-rose-400 text-sm">{err}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saveMut.isPending}
            className="px-4 py-2 rounded-xl bg-cta-primary hover:bg-cta-hover disabled:opacity-50 text-white text-sm font-medium cursor-pointer"
          >
            {editingId ? 'Lưu thay đổi' : 'Tạo bài viết'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(empty);
              }}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 text-sm cursor-pointer"
            >
              Huỷ
            </button>
          )}
        </div>
      </form>

      <section>
        <h2 className="font-semibold mb-3">Danh sách bài viết</h2>
        {isLoading ? (
          <p className="text-slate-400">Đang tải…</p>
        ) : (
          <ul className="space-y-2">
            {articles.map((a) => {
              const low = (countByType[a.mbtiType] ?? 0) < THRESHOLD;
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 bg-surface-base border border-white/10 rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-white truncate">{a.title}</p>
                    <p className="text-xs text-slate-400">
                      <span
                        className={
                          low
                            ? 'text-amber-300'
                            : 'text-slate-400'
                        }
                      >
                        {a.mbtiType}
                        {low ? ' ⚠ thiếu bài' : ''}
                      </span>{' '}
                      · {a.status === 'published' ? 'Đã xuất bản' : 'Nháp'} · /{a.slug}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(a.id);
                        setForm({
                          title: a.title,
                          body: a.body,
                          mbtiType: a.mbtiType,
                          slug: a.slug,
                          status: a.status,
                        });
                      }}
                      className="text-sm text-slate-300 hover:text-white cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => delMut.mutate(a.id)}
                      className="text-sm text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Xoá
                    </button>
                  </div>
                </li>
              );
            })}
            {articles.length === 0 && (
              <p className="text-slate-400 text-sm">Chưa có bài viết nào.</p>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
