import type { ReactNode } from 'react'

import { btnGhost, label } from './styles'

export function Field({ id, text, children, hint }: { id: string; text: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export function Notice({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const tone = kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : kind === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-blue-200 bg-blue-50 text-blue-800'
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' }) {
  const tones = { gray: 'bg-gray-100 text-gray-700', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', blue: 'bg-blue-100 text-blue-800' }
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  )
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
      <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" className={btnGhost} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  )
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {children}
    </div>
  )
}
