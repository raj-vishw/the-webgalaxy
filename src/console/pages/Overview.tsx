import { api } from '../services/api'
import type { Overview as OverviewData, Website } from '../services/types'
import { Notice, PageTitle } from '../components/ui'
import { useLoad } from '../hooks'

function Stat({ label, value, onClick }: { label: string; value: number | string; onClick?: () => void }) {
  const inner = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-blue-300">
      {inner}
    </button>
  ) : (
    <div className="rounded-lg border border-gray-200 bg-white p-4">{inner}</div>
  )
}

export function Overview({ go }: { go: (page: string) => void }) {
  const overview = useLoad(() => api<OverviewData>('/admin/overview').then((r) => r.data))
  const trending = useLoad(() => api<Website[]>('/discovery/trending', { query: { limit: 8 } }).then((r) => r.data))
  const emerging = useLoad(() => api<Website[]>('/discovery/emerging', { query: { limit: 8 } }).then((r) => r.data))
  const d = overview.data

  return (
    <>
      <PageTitle title="Overview" />
      {overview.error && <Notice kind="error">{overview.error}</Notice>}
      {d && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Websites" value={`${d.websites.active} / ${d.websites.total}`} onClick={() => go('websites')} />
          <Stat label="Universes" value={d.universes} onClick={() => go('universes')} />
          <Stat label="Pending submissions" value={d.submissions.pending} onClick={() => go('submissions')} />
          <Stat label="Trending" value={d.websites.trending} />
          <Stat label="Emerging" value={d.websites.emerging} />
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Trending (admin-controlled snapshot)</h2>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white text-sm">
            {(trending.data ?? []).map((w) => (
              <li key={w.id} className="flex items-center justify-between px-3 py-2">
                <span>{w.name}</span>
                <span className="text-gray-500">
                  {w.universeSlug} · {w.trendingScore.toFixed(2)} {w.trendDirection === 'up' ? '↑' : w.trendDirection === 'down' ? '↓' : '→'}
                </span>
              </li>
            ))}
            {trending.data?.length === 0 && <li className="px-3 py-2 text-gray-500">Nothing marked trending.</li>}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Emerging</h2>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white text-sm">
            {(emerging.data ?? []).map((w) => (
              <li key={w.id} className="flex items-center justify-between px-3 py-2">
                <span>{w.name}</span>
                <span className="text-gray-500">{w.universeSlug}</span>
              </li>
            ))}
            {emerging.data?.length === 0 && <li className="px-3 py-2 text-gray-500">Nothing marked emerging.</li>}
          </ul>
        </section>
      </div>
    </>
  )
}
