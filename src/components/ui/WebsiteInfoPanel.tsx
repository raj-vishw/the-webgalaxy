import { useState } from 'react'
import { useCatalogStore, useUniverse } from '../../store/catalogStore'
import { HIGHLIGHT_LABEL, type HighlightKind } from '../../services/discoveryService'
import { getTrend, isEmerging, isTrending } from '../../services/recommendationService'
import { hasRelationships } from '../../services/relationshipService'
import { useGalaxyStore } from '../../store/galaxyStore'
import type { CelestialObjectType, WebsiteDefinition } from '../../types/galaxy'
import { accentFor, glyphFor, importanceFor, urlFor } from '../../utils/celestial'
import { interactionEvents } from '../../utils/interaction'
import { shareUrl } from '../../lib/router'
import { AlternativeWebsites } from '../discovery/AlternativeWebsites'
import { IntegrationWebsites } from '../discovery/IntegrationWebsites'
import { RecommendationPanel } from '../discovery/RecommendationPanel'
import { SimilarWebsites } from '../discovery/SimilarWebsites'
import { RelatedWebsites } from '../relationships/RelatedWebsites'
import { focusRing } from './panel'

const TYPE_LABEL: Record<CelestialObjectType, string> = {
  star: 'Star',
  planet: 'Planet',
  moon: 'Moon',
  comet: 'Comet',
}

const buttonBase =
  'inline-flex items-center justify-center rounded-full font-sans text-[11px] tracking-[0.2em] uppercase transition-[color,border-color,background-color,transform] duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/70'

const HIGHLIGHT_KINDS: HighlightKind[] = ['similar', 'alternative', 'integration']

/**
 * Compact information surface for the focused website — a floating readout
 * rather than a card. Every field degrades gracefully when data is missing.
 * Below the facts: the website's connections (the text twin of the lines in
 * the scene), the highlight actions, and a few suggested next stops.
 */
export function WebsiteInfoPanel() {
  const selectedWebsiteId = useGalaxyStore((s) => s.selectedWebsiteId)
  const clearWebsite = useGalaxyStore((s) => s.clearWebsite)
  const highlight = useGalaxyStore((s) => s.highlight)
  const setHighlight = useGalaxyStore((s) => s.setHighlight)
  const recommendations = useGalaxyStore((s) => s.recommendations)
  // Keep the last website while fading out so the panel doesn't blank mid-transition.
  const current = useCatalogStore((s) => (selectedWebsiteId ? s.websites.find((w) => w.id === selectedWebsiteId) ?? null : null))
  const detailStatus = useCatalogStore((s) => (selectedWebsiteId ? s.detailStatus[selectedWebsiteId] : undefined))
  const [shown, setShown] = useState<WebsiteDefinition | null>(current)
  if (current && current !== shown) setShown(current)
  const website = current ?? shown
  const universe = useUniverse(website?.universeId ?? null)
  const visible = !!current

  const [openingId, setOpeningId] = useState<string | null>(null)
  const opening = openingId !== null && openingId === website?.id
  const [shared, setShared] = useState<'idle' | 'copied' | 'failed'>('idle')

  const share = async () => {
    if (!website) return
    const url = shareUrl()
    const data = { title: `${website.name} · The WebGalaxy`, text: website.description ?? '', url }
    try {
      if (typeof navigator.share === 'function' && (typeof navigator.canShare !== 'function' || navigator.canShare(data))) {
        await navigator.share(data)
        return
      }
      await navigator.clipboard.writeText(url)
      setShared('copied')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      setShared('failed')
    }
    window.setTimeout(() => setShared('idle'), 2200)
  }

  const url = website ? urlFor(website) : null
  const accent = website ? accentFor(website) : '#c9d4ff'
  const importance = website ? importanceFor(website) : 0
  const trend = website ? getTrend(website.id) : undefined
  const badge = website ? (isTrending(website.id) ? '🔥 Trending' : isEmerging(website.id) ? '✦ Emerging' : null) : null
  const activeHighlight = highlight && website && highlight.sourceId === website.id ? highlight : null
  const canHighlight: Record<HighlightKind, boolean> = {
    similar: !!website,
    alternative: !!website && hasRelationships(website.id, ['alternative']),
    integration: !!website && hasRelationships(website.id, ['integration', 'complementary']),
  }

  const visit = () => {
    if (!website || !url) return
    setOpeningId(website.id)
    interactionEvents.emit({ type: 'website:visit', websiteId: website.id })
    // Brief feedback before the tab opens; the galaxy stays where it is.
    window.setTimeout(() => {
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => setOpeningId(null), 900)
    }, 260)
  }

  return (
    <section
      aria-label={website ? `${website.name} details` : 'Website details'}
      aria-hidden={!visible}
      className={[
        'absolute z-20',
        'inset-x-3 bottom-20 sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:right-9 sm:w-[300px] sm:-translate-y-1/2',
        'transition-[opacity,transform] duration-700 ease-out',
        visible ? 'opacity-100 translate-x-0' : 'pointer-events-none opacity-0 sm:translate-x-3',
      ].join(' ')}
    >
      <div
        // Scrolls inside itself when the connections make it tall; never under the header.
        className="relative max-h-[42vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#070a18]/60 px-6 pt-6 pb-5 backdrop-blur-md sm:max-h-[calc(100vh-9.5rem)]"
        style={{
          boxShadow: `0 0 0 1px rgba(255,255,255,0.02) inset, 0 24px 70px rgba(0,0,0,0.5), 0 0 40px ${accent}22`,
        }}
      >
        <button
          type="button"
          onClick={clearWebsite}
          aria-label="Close website details"
          className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full text-space-300/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <span aria-hidden className="text-[16px] leading-none">×</span>
        </button>

        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10"
            style={{ background: `radial-gradient(circle at 35% 30%, ${accent}66, ${accent}14 70%)`, boxShadow: `0 0 22px ${accent}33` }}
          >
            {website?.logo ? (
              <img src={website.logo} alt="" className="h-7 w-7 object-contain" />
            ) : (
              <span className="font-sans text-[13px] font-semibold tracking-[0.04em] text-white/90">
                {website ? glyphFor(website) : ''}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2
              className="truncate font-sans text-[16px] font-medium tracking-[0.12em] uppercase text-white"
              style={{ textShadow: '0 0 18px rgba(190,205,255,0.35)' }}
            >
              {website?.name ?? ''}
            </h2>
            <p className="mt-1 font-sans text-[11px] tracking-[0.18em] uppercase text-space-300">
              {universe ? `${universe.name} Universe` : 'The WebGalaxy'}
            </p>
            {badge && (
              <p
                className="mt-1 font-sans text-[10px] tracking-[0.18em] uppercase text-white/80"
                title={trend ? `Demo snapshot as of ${trend.asOf} — not live traffic` : undefined}
              >
                {badge}
              </p>
            )}
          </div>
        </div>

        <p className="mt-5 font-sans text-[13px] leading-6 text-space-100/85" aria-busy={detailStatus === 'loading'}>
          {website?.description?.trim() ||
            (detailStatus === 'loading' || (website && !website.detailLoaded && detailStatus !== 'error')
              ? 'Charting this world…'
              : 'No description has been charted for this world yet.')}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[10.5px] tracking-[0.16em] uppercase text-space-300/75">
          <span>{website ? TYPE_LABEL[website.objectType] : ''}</span>
          {website?.tags?.map((tag) => (
            <span key={tag} className="flex items-center gap-2">
              <span aria-hidden className="text-space-300/35">·</span>
              <span>{tag}</span>
            </span>
          ))}
        </div>

        <div className="mt-4" aria-label={`Prominence ${Math.round(importance * 100)} of 100`} role="img">
          <div className="h-px w-full bg-white/10">
            <div
              className="h-px transition-[width] duration-700 ease-out"
              style={{ width: `${Math.round(importance * 100)}%`, background: `linear-gradient(90deg, ${accent}, #ffffff)` }}
            />
          </div>
        </div>

        {website && (
          <div role="group" aria-label="Discover from here" className="mt-4 flex flex-wrap gap-1.5">
            {HIGHLIGHT_KINDS.map((kind) => {
              const active = activeHighlight?.kind === kind
              const enabled = canHighlight[kind]
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setHighlight(kind)}
                  disabled={!enabled || !visible}
                  aria-pressed={active}
                  title={enabled ? undefined : 'Nothing recorded for this website'}
                  className={[
                    'rounded-full border px-2.5 py-1 font-sans text-[10px] tracking-[0.14em] uppercase transition-colors duration-300',
                    active ? 'border-white/60 bg-white/10 text-white' : 'border-white/15 text-white/75 hover:border-white/45 hover:text-white',
                    'disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/15',
                    focusRing,
                  ].join(' ')}
                >
                  {HIGHLIGHT_LABEL[kind].action}
                </button>
              )
            })}
          </div>
        )}

        {website && activeHighlight?.kind === 'similar' && <SimilarWebsites source={website} items={activeHighlight.items} />}
        {website && activeHighlight?.kind === 'alternative' && <AlternativeWebsites source={website} items={activeHighlight.items} />}
        {website && activeHighlight?.kind === 'integration' && <IntegrationWebsites source={website} items={activeHighlight.items} />}
        {website && !activeHighlight && <RelatedWebsites website={website} />}
        {website && !activeHighlight && visible && (
          <RecommendationPanel recommendations={recommendations} fromUniverseId={website.universeId} />
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={visit}
            disabled={!url || opening}
            className={[
              buttonBase,
              'flex-1 whitespace-nowrap border px-5 py-2.5 text-white/90',
              url
                ? 'border-white/20 hover:border-white/50 hover:text-white active:scale-[0.98]'
                : 'cursor-not-allowed border-white/10 text-space-300/50',
              opening ? 'border-white/50 bg-white/10' : '',
            ].join(' ')}
          >
            {opening ? 'Opening…' : url ? 'Visit Website' : 'No link'}
          </button>
          <button type="button" onClick={share} disabled={!visible} aria-label="Share this website" className={`${buttonBase} px-3 py-2.5 text-space-300/80 hover:text-white`}>
            Share
          </button>
          <button type="button" onClick={clearWebsite} className={`${buttonBase} px-3 py-2.5 text-space-300/80 hover:text-white`}>
            Back
          </button>
        </div>
        <p role="status" aria-live="polite" className={`mt-2 h-4 text-center font-sans text-[10.5px] tracking-[0.18em] uppercase text-space-300/70 transition-opacity ${shared === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
          {shared === 'copied' ? 'Link copied.' : shared === 'failed' ? 'Copy the address bar to share.' : ''}
        </p>
      </div>
    </section>
  )
}
