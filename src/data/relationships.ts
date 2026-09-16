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

  // ─── Productivity · Crypto · Startups ─────────────────────────────────────
  { source: 'notion', target: 'slack', type: 'integration', note: 'Notion pages unfurl and update from Slack' },
  { source: 'notion', target: 'evernote', type: 'alternative' },
  { source: 'notion', target: 'obsidian', type: 'alternative', note: 'Cloud workspace versus local files' },
  { source: 'notion', target: 'airtable', type: 'related', note: 'Both put databases in the hands of non-programmers' },
  { source: 'slack', target: 'zoom', type: 'integration', note: 'Start calls from a channel' },
  { source: 'slack', target: 'github', type: 'integration', note: 'Pull request and deploy notifications' },
  { source: 'slack', target: 'zapier', type: 'integration' },
  { source: 'trello', target: 'asana', type: 'alternative' },
  { source: 'asana', target: 'monday', type: 'alternative' },
  { source: 'linear', target: 'jira', type: 'alternative', note: 'Issue tracking, fast versus configurable' },
  { source: 'linear', target: 'github', type: 'integration', note: 'Issues close from commits' },
  { source: 'zapier', target: 'airtable', type: 'integration' },
  { source: 'dropbox', target: 'google-workspace', type: 'alternative', note: 'File storage and sharing' },
  { source: 'google-workspace', target: 'microsoft-365', type: 'competitor' },
  { source: 'miro', target: 'figma', type: 'related', note: 'Whiteboarding and design side by side' },
  { source: 'grammarly', target: 'notion', type: 'integration' },
  { source: 'bitcoin-org', target: 'ethereum-org', type: 'related', note: 'The two largest networks' },
  { source: 'binance', target: 'kraken', type: 'competitor' },
  { source: 'binance', target: 'coinbase', type: 'competitor' },
  { source: 'coinmarketcap', target: 'coingecko', type: 'alternative' },
  { source: 'metamask', target: 'uniswap', type: 'integration', note: 'Connect a wallet to trade' },
  { source: 'metamask', target: 'etherscan', type: 'related' },
  { source: 'uniswap', target: 'aave', type: 'ecosystem', note: 'Core Ethereum DeFi protocols' },
  { source: 'ethereum-org', target: 'polygon', type: 'ecosystem' },
  { source: 'ethereum-org', target: 'arbitrum', type: 'ecosystem' },
  { source: 'solana', target: 'phantom', type: 'ecosystem', note: 'The network and its most used wallet' },
  { source: 'coindesk', target: 'the-block', type: 'alternative' },
  { source: 'defillama', target: 'coingecko', type: 'related' },
  { source: 'coinbase', target: 'coinbase-learn', type: 'same-company' },
  { source: 'ycombinator', target: 'hackernews', type: 'same-company' },
  { source: 'ycombinator', target: 'techstars', type: 'competitor' },
  { source: 'producthunt', target: 'betalist', type: 'alternative' },
  { source: 'producthunt', target: 'hackernews', type: 'related', note: 'Where launches get discussed' },
  { source: 'indiehackers', target: 'gumroad', type: 'related', note: 'Solo founders and their storefronts' },
  { source: 'stripe', target: 'shopify', type: 'integration', note: 'Shopify Payments runs on Stripe' },
  { source: 'stripe', target: 'lemonsqueezy', type: 'alternative', note: 'Merchant of record versus raw payments' },
  { source: 'stripe', target: 'vercel', type: 'related', note: 'The default stack of a new web product' },
  { source: 'kickstarter', target: 'indiegogo', type: 'competitor' },
  { source: 'substack', target: 'ko-fi', type: 'related', note: 'Paid audiences for independent creators' },
  { source: 'webflow', target: 'bubble', type: 'related', note: 'No-code for sites and for apps' },
  { source: 'webflow', target: 'framer', type: 'competitor' },
  { source: 'crunchbase', target: 'wellfound', type: 'related' },
  { source: 'techcrunch', target: 'crunchbase', type: 'same-company', note: 'Crunchbase began inside TechCrunch' },
]
