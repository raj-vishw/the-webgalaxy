/**
 * Credit for the directory data, required by Curlie's CC BY licence and shown
 * wherever the catalogue is presented in full (help menu, list view).
 */
export function Attribution({ className = '' }: { className?: string }) {
  return (
    <p className={`font-sans text-[11px] leading-5 text-space-300/65 ${className}`} title="Curlie Directory Attribution">
      With content from{' '}
      <a href="https://curlie.org/" target="_blank" rel="noopener noreferrer" className="text-space-100/80 underline decoration-white/25 underline-offset-2 hover:text-white">
        Curlie.org
      </a>
      {' '}— the largest human-edited directory of the web, and popularity from{' '}
      <a href="https://tranco-list.eu/" target="_blank" rel="noopener noreferrer" className="text-space-100/80 underline decoration-white/25 underline-offset-2 hover:text-white">
        Tranco
      </a>
      .
    </p>
  )
}
