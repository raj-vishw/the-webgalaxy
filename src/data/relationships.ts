import type { WebsiteRelationship } from '../types/galaxy'

/**
 * Connections between websites.
 *
 * Every entry links two independent websites as equals. "GitHub — Vercel"
 * means the two are commonly used together; it never means one owns,
 * contains or outranks the other. Symmetrical relationships are declared
 * once (the service mirrors them); `directed: true` marks the few that
 * genuinely flow one way.
 *
 * Only claims the descriptions can support are made here. The list is
 * validated at load time — see `services/relationshipService.ts` — so a bad
 * entry is dropped with a warning rather than breaking the galaxy.
 */
export const relationships: WebsiteRelationship[] = [
  // ─── Development ─────────────────────────────────────────────────────────
  { source: 'github', target: 'netlify', type: 'integration', note: 'Continuous deployment from repositories' },
  { source: 'github', target: 'npm', type: 'integration', note: 'Packages are published from repositories' },
  { source: 'github', target: 'replit', type: 'integration', note: 'Import and push repositories' },
  { source: 'github', target: 'jira', type: 'integration', note: 'Commits link to issues' },
  { source: 'github', target: 'huggingface', type: 'integration', note: 'Model code and weights live on both' },
  { source: 'gitlab', target: 'jira', type: 'integration' },
  { source: 'vercel', target: 'netlify', type: 'alternative' },
  { source: 'vercel', target: 'cloudflare', type: 'integration', note: 'DNS and edge in front of deployments' },
  { source: 'vercel', target: 'railway', type: 'related', note: 'Frontend and backend hosting' },
  { source: 'vercel', target: 'render', type: 'related' },
  { source: 'netlify', target: 'cloudflare', type: 'integration' },
  { source: 'railway', target: 'render', type: 'alternative' },
  { source: 'npm', target: 'stackoverflow', type: 'related' },
  { source: 'replit', target: 'codepen', type: 'alternative' },
  { source: 'codepen', target: 'dribbble', type: 'related', note: 'Front-end craft and design showcases' },
  { source: 'cursor', target: 'github', type: 'integration' },
  { source: 'cursor', target: 'replit', type: 'related', note: 'AI-assisted coding environments' },

  // ─── AI ──────────────────────────────────────────────────────────────────
  { source: 'chatgpt', target: 'claude', type: 'alternative' },
  { source: 'chatgpt', target: 'gemini', type: 'alternative' },
  { source: 'claude', target: 'gemini', type: 'alternative' },
  { source: 'perplexity', target: 'chatgpt', type: 'related', note: 'Conversational answers' },
  { source: 'perplexity', target: 'gemini', type: 'related' },
  { source: 'poe', target: 'openrouter', type: 'related', note: 'Access many models in one place' },
  { source: 'openrouter', target: 'claude', type: 'integration', note: 'Routes requests to Claude models' },
  { source: 'openrouter', target: 'chatgpt', type: 'integration', note: 'Routes requests to OpenAI models' },
  { source: 'huggingface', target: 'replicate', type: 'related' },
  { source: 'huggingface', target: 'ollama', type: 'integration', note: 'Open models are pulled from the Hub' },
  { source: 'ollama', target: 'replicate', type: 'alternative', note: 'Local versus cloud inference' },
  { source: 'huggingface', target: 'arxiv', type: 'related', note: 'Papers and the models they describe' },
  { source: 'cursor', target: 'claude', type: 'integration', note: 'Claude models available in the editor' },
  { source: 'cursor', target: 'chatgpt', type: 'integration', note: 'OpenAI models available in the editor' },
  { source: 'gemini', target: 'youtube', type: 'same-company' },

  // ─── Cybersecurity ───────────────────────────────────────────────────────
  { source: 'tryhackme', target: 'hackthebox', type: 'alternative' },
  { source: 'tryhackme', target: 'portswigger', type: 'related', note: 'Hands-on security learning' },
  { source: 'hackthebox', target: 'portswigger', type: 'related' },
  { source: 'portswigger', target: 'cyberchef', type: 'complementary', note: 'Intercept, then decode' },
  { source: 'portswigger', target: 'owasp', type: 'related', note: 'Web application security' },
  { source: 'owasp', target: 'tryhackme', type: 'related' },
  { source: 'virustotal', target: 'shodan', type: 'related', note: 'Threat and exposure lookups' },
  { source: 'virustotal', target: 'haveibeenpwned', type: 'related' },
  { source: 'exploitdb', target: 'mitre-attack', type: 'related' },
  { source: 'exploitdb', target: 'hackthebox', type: 'complementary' },
  { source: 'mitre-attack', target: 'virustotal', type: 'complementary' },
  { source: 'tryhackme', target: 'freecodecamp', type: 'related', note: 'Learn by doing' },

  // ─── Design ──────────────────────────────────────────────────────────────
  { source: 'figma', target: 'penpot', type: 'alternative' },
  { source: 'figma', target: 'canva', type: 'alternative' },
  { source: 'figma', target: 'framer', type: 'complementary', note: 'Design, then publish' },
  { source: 'figma', target: 'adobe', type: 'competitor' },
  { source: 'figma', target: 'dribbble', type: 'complementary', note: 'Inspiration for the canvas' },
  { source: 'dribbble', target: 'behance', type: 'alternative' },
  { source: 'behance', target: 'adobe', type: 'same-company' },
  { source: 'canva', target: 'adobe', type: 'competitor' },
  { source: 'framer', target: 'vercel', type: 'related', note: 'Ways to publish a site' },

  // ─── Gaming ──────────────────────────────────────────────────────────────
  { source: 'steam', target: 'epicgames', type: 'competitor' },
  { source: 'steam', target: 'itchio', type: 'alternative' },
  { source: 'ign', target: 'steam', type: 'related', note: 'Reviews for the storefront' },
  { source: 'roblox', target: 'twitch', type: 'related', note: 'Played and streamed' },
  { source: 'itchio', target: 'bandcamp', type: 'related', note: 'Direct-to-creator marketplaces' },

  // ─── Education ───────────────────────────────────────────────────────────
  { source: 'khanacademy', target: 'coursera', type: 'related' },
  { source: 'coursera', target: 'edx', type: 'alternative' },
  { source: 'edx', target: 'mit-ocw', type: 'ecosystem', note: 'MIT co-founded edX' },
  { source: 'freecodecamp', target: 'github', type: 'integration', note: 'Curriculum and projects live in repositories' },
  { source: 'freecodecamp', target: 'stackoverflow', type: 'related' },
  { source: 'khanacademy', target: 'youtube', type: 'integration', directed: true, note: 'Lessons are published on YouTube' },
  { source: 'wolframalpha', target: 'khanacademy', type: 'complementary', note: 'Compute alongside the lesson' },

  // ─── Science ─────────────────────────────────────────────────────────────
  { source: 'nasa', target: 'nature', type: 'related' },
  { source: 'arxiv', target: 'nature', type: 'related', note: 'Preprints and published research' },
  { source: 'nature', target: 'pubmed', type: 'related' },
  { source: 'arxiv', target: 'pubmed', type: 'related' },

  // ─── Finance ─────────────────────────────────────────────────────────────
  { source: 'bloomberg', target: 'tradingview', type: 'complementary', note: 'News beside the charts' },
  { source: 'coinbase', target: 'tradingview', type: 'integration', note: 'Exchange data on the charts' },
  { source: 'investopedia', target: 'bloomberg', type: 'related' },
  { source: 'investopedia', target: 'khanacademy', type: 'related', note: 'Learning to invest' },

  // ─── Music ───────────────────────────────────────────────────────────────
  { source: 'spotify', target: 'soundcloud', type: 'alternative' },
  { source: 'soundcloud', target: 'bandcamp', type: 'alternative' },
  { source: 'genius', target: 'soundcloud', type: 'related' },
  { source: 'spotify', target: 'youtube', type: 'competitor' },

  // ─── Entertainment ───────────────────────────────────────────────────────
  { source: 'youtube', target: 'twitch', type: 'competitor' },
  { source: 'netflix', target: 'imdb', type: 'complementary' },
  { source: 'imdb', target: 'letterboxd', type: 'alternative' },
  { source: 'letterboxd', target: 'netflix', type: 'related' },

  // ─── Deliberately invalid entries ────────────────────────────────────────
  // These exercise the validator: an unknown target, a self-link and a
  // duplicate of a relationship declared above. All three are dropped.
  { source: 'github', target: 'nonexistent-site', type: 'related' },
  { source: 'figma', target: 'figma', type: 'related' },
  { source: 'gitlab', target: 'github', type: 'alternative' },
]
