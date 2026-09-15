/** Small, plain building blocks — the admin is a tool, not a show. */
export const btn = 'inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50'
export const btnPrimary = `${btn} border-blue-700 bg-blue-600 text-white hover:bg-blue-700`
export const btnGhost = `${btn} border-gray-300 bg-white text-gray-800 hover:bg-gray-50`
export const btnDanger = `${btn} border-red-700 bg-red-600 text-white hover:bg-red-700`
export const input = 'w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-gray-100'
export const selectInline = input.replace('w-full ', '')
export const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

