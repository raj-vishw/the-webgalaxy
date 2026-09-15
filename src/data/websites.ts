import type { WebsiteDefinition } from '../types/galaxy'

/**
 * Sample websites for demonstrating the celestial system.
 *
 * Every website simply exists inside the universe named by `universeId`.
 * `orbitAnchorId` on moons is a visual arrangement only — it does not make
 * one website subordinate to another. Positions are generated at runtime.
 *
 * Relationships to other websites may be declared inline (`relationships`)
 * or in `relationships.ts`; both are merged and validated by the
 * relationship service. Neither form ranks or nests websites.
 */
export const websites: WebsiteDefinition[] = [
  // ─── AI ──────────────────────────────────────────────────────────────────
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', universeId: 'ai', objectType: 'star', importance: 98, description: 'Conversational AI assistant by OpenAI.', accent: '#74aa9c', glyph: 'GPT', tags: ['assistant', 'llm'] },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai', universeId: 'ai', objectType: 'planet', importance: 88, description: 'AI assistant by Anthropic.', accent: '#d97757', glyph: 'Cl', tags: ['assistant', 'llm'] },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', universeId: 'ai', objectType: 'star', importance: 90, description: "Google's multimodal AI assistant.", accent: '#8ab4f8', glyph: 'G', tags: ['assistant', 'llm'] },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', universeId: 'ai', objectType: 'planet', importance: 74, description: 'AI-powered answer engine.', accent: '#20b8cd', glyph: 'P', tags: ['search', 'llm'] },
  { id: 'huggingface', name: 'Hugging Face', url: 'https://huggingface.co', universeId: 'ai', objectType: 'comet', importance: 80, description: 'Open machine-learning models, datasets and demos.', accent: '#ffd21e', glyph: 'HF', tags: ['models', 'open-source'] },
  { id: 'openrouter', name: 'OpenRouter', url: 'https://openrouter.ai', universeId: 'ai', objectType: 'moon', importance: 52, description: 'Unified API across many language models.', accent: '#a5b4fc', glyph: 'OR', orbitAnchorId: 'perplexity', tags: ['api'] },
  { id: 'poe', name: 'Poe', url: 'https://poe.com', universeId: 'ai', objectType: 'moon', importance: 55, description: 'Chat with many AI models in one place.', accent: '#b692f6', glyph: 'Poe', orbitAnchorId: 'claude', tags: ['assistant'] },
  { id: 'replicate', name: 'Replicate', url: 'https://replicate.com', universeId: 'ai', objectType: 'planet', importance: 60, description: 'Run machine-learning models in the cloud.', accent: '#e8e8e8', glyph: 'R', tags: ['models', 'api'] },
  { id: 'cursor', name: 'Cursor', url: 'https://cursor.com', universeId: 'ai', objectType: 'planet', importance: 72, description: 'AI-first code editor.', accent: '#d7dcff', glyph: 'Cu', tags: ['ide', 'coding', 'assistant'] },
  { id: 'ollama', name: 'Ollama', url: 'https://ollama.com', universeId: 'ai', objectType: 'comet', importance: 50, description: 'Run open language models on your own machine.', accent: '#9bb0ff', glyph: 'Ol', tags: ['models', 'open-source', 'llm'] },

  // ─── Cybersecurity ───────────────────────────────────────────────────────
  { id: 'tryhackme', name: 'TryHackMe', url: 'https://tryhackme.com', universeId: 'cybersecurity', objectType: 'star', importance: 86, description: 'Hands-on cybersecurity training rooms.', accent: '#c11111', glyph: 'THM', tags: ['learning', 'ctf'] },
  { id: 'hackthebox', name: 'Hack The Box', url: 'https://www.hackthebox.com', universeId: 'cybersecurity', objectType: 'planet', importance: 85, description: 'Penetration-testing labs and challenges.', accent: '#9fef00', glyph: 'HTB', tags: ['learning', 'ctf'] },
  { id: 'portswigger', name: 'PortSwigger', url: 'https://portswigger.net', universeId: 'cybersecurity', objectType: 'star', importance: 82, description: 'Burp Suite and the Web Security Academy.', accent: '#ff6633', glyph: 'PS', tags: ['web', 'tools'] },
  { id: 'virustotal', name: 'VirusTotal', url: 'https://www.virustotal.com', universeId: 'cybersecurity', objectType: 'planet', importance: 80, description: 'Analyse suspicious files, URLs and hashes.', accent: '#394eff', glyph: 'VT', tags: ['malware', 'tools', 'threat-intel'] },
  { id: 'shodan', name: 'Shodan', url: 'https://www.shodan.io', universeId: 'cybersecurity', objectType: 'comet', importance: 70, description: 'Search engine for internet-connected devices.', accent: '#c93e3e', glyph: 'SH', tags: ['recon', 'networking'] },
  { id: 'cyberchef', name: 'CyberChef', url: 'https://gchq.github.io/CyberChef', universeId: 'cybersecurity', objectType: 'moon', importance: 62, description: 'The cyber Swiss-army knife for data transforms.', accent: '#7fd1b9', glyph: 'CC', orbitAnchorId: 'portswigger', tags: ['tools'] },
  { id: 'exploitdb', name: 'Exploit Database', url: 'https://www.exploit-db.com', universeId: 'cybersecurity', objectType: 'planet', importance: 66, description: 'Archive of public exploits and vulnerable software.', accent: '#c57b57', glyph: 'EDB', tags: ['exploits'] },
  { id: 'mitre-attack', name: 'MITRE ATT&CK', url: 'https://attack.mitre.org', universeId: 'cybersecurity', objectType: 'planet', importance: 76, description: 'Knowledge base of adversary tactics and techniques.', accent: '#d64f4f', glyph: 'ATT', tags: ['framework', 'threat-intel'] },
  { id: 'cloudflare', name: 'Cloudflare', url: 'https://www.cloudflare.com', universeId: 'cybersecurity', objectType: 'planet', importance: 84, description: 'Web security, CDN, DNS and edge infrastructure.', accent: '#f38020', glyph: 'CF', tags: ['networking', 'hosting', 'web'] },
  { id: 'owasp', name: 'OWASP', url: 'https://owasp.org', universeId: 'cybersecurity', objectType: 'planet', importance: 58, description: 'Open community for application security.', accent: '#5b8fd6', glyph: 'OW', tags: ['web', 'learning', 'open-source'] },
  { id: 'haveibeenpwned', name: 'Have I Been Pwned', url: 'https://haveibeenpwned.com', universeId: 'cybersecurity', objectType: 'moon', importance: 56, description: 'Check whether your accounts appear in known breaches.', accent: '#7fb3e6', glyph: 'HIBP', orbitAnchorId: 'virustotal', tags: ['breaches', 'tools'] },

  // ─── Development ─────────────────────────────────────────────────────────
  {
    id: 'github', name: 'GitHub', url: 'https://github.com', universeId: 'development', objectType: 'star', importance: 100, description: 'Where the world builds software.', accent: '#f0f6fc', glyph: 'GH', tags: ['git', 'open-source'],
    // Inline relationships: connections between equals, nothing more.
    relationships: [
      { target: 'gitlab', type: 'alternative' },
      { target: 'vercel', type: 'integration', note: 'Deploys straight from repositories' },
      { target: 'stackoverflow', type: 'related' },
    ],
  },
  { id: 'gitlab', name: 'GitLab', url: 'https://gitlab.com', universeId: 'development', objectType: 'planet', importance: 75, description: 'DevSecOps platform and git hosting.', accent: '#fc6d26', glyph: 'GL', tags: ['git', 'devops', 'open-source'] },
  { id: 'stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com', universeId: 'development', objectType: 'star', importance: 92, description: 'Questions and answers for programmers.', accent: '#f48024', glyph: 'SO', tags: ['q&a'] },
  { id: 'npm', name: 'npm', url: 'https://www.npmjs.com', universeId: 'development', objectType: 'planet', importance: 80, description: 'The JavaScript package registry.', accent: '#cb3837', glyph: 'npm', tags: ['packages'] },
  { id: 'vercel', name: 'Vercel', url: 'https://vercel.com', universeId: 'development', objectType: 'planet', importance: 74, description: 'Frontend cloud and deployment platform.', accent: '#e6e6e6', glyph: '▲', tags: ['hosting', 'devops'] },
  { id: 'netlify', name: 'Netlify', url: 'https://www.netlify.com', universeId: 'development', objectType: 'moon', importance: 62, description: 'Web hosting and serverless platform.', accent: '#32e6e2', glyph: 'NL', orbitAnchorId: 'vercel', tags: ['hosting'] },
  { id: 'codepen', name: 'CodePen', url: 'https://codepen.io', universeId: 'development', objectType: 'planet', importance: 64, description: 'Social frontend playground.', accent: '#c9c9c9', glyph: 'CP', tags: ['playground'] },
  { id: 'replit', name: 'Replit', url: 'https://replit.com', universeId: 'development', objectType: 'comet', importance: 68, description: 'Collaborative browser-based IDE.', accent: '#f26207', glyph: 'Re', tags: ['ide', 'coding'] },
  { id: 'jira', name: 'Jira', url: 'https://www.atlassian.com/software/jira', universeId: 'development', objectType: 'planet', importance: 72, description: 'Issue tracking and agile project management.', accent: '#2684ff', glyph: 'Ji', tags: ['planning', 'devops'] },
  { id: 'railway', name: 'Railway', url: 'https://railway.com', universeId: 'development', objectType: 'planet', importance: 50, description: 'Deploy apps, databases and services from git.', accent: '#b58cff', glyph: 'Rw', tags: ['hosting', 'devops'] },
  { id: 'render', name: 'Render', url: 'https://render.com', universeId: 'development', objectType: 'moon', importance: 48, description: 'Cloud hosting for apps, sites and databases.', accent: '#46e3b7', glyph: 'Rn', orbitAnchorId: 'railway', tags: ['hosting'] },

  // ─── Design ──────────────────────────────────────────────────────────────
  { id: 'figma', name: 'Figma', url: 'https://www.figma.com', universeId: 'design', objectType: 'star', importance: 93, description: 'Collaborative interface design.', accent: '#a259ff', glyph: 'Fg', tags: ['ui', 'prototyping', 'collaboration'] },
  { id: 'canva', name: 'Canva', url: 'https://www.canva.com', universeId: 'design', objectType: 'planet', importance: 85, description: 'Easy online graphic design.', accent: '#00c4cc', glyph: 'Cv', tags: ['graphics'] },
  { id: 'dribbble', name: 'Dribbble', url: 'https://dribbble.com', universeId: 'design', objectType: 'planet', importance: 70, description: 'Showcase for designers and creatives.', accent: '#ea4c89', glyph: 'Dr', tags: ['community', 'inspiration'] },
  { id: 'behance', name: 'Behance', url: 'https://www.behance.net', universeId: 'design', objectType: 'planet', importance: 70, description: 'Creative portfolios by Adobe.', accent: '#1769ff', glyph: 'Be', tags: ['community', 'inspiration'] },
  { id: 'framer', name: 'Framer', url: 'https://www.framer.com', universeId: 'design', objectType: 'comet', importance: 72, description: 'Design and publish interactive sites.', accent: '#66a3ff', glyph: 'Fr', tags: ['web', 'prototyping', 'hosting'] },
  { id: 'adobe', name: 'Adobe', url: 'https://www.adobe.com', universeId: 'design', objectType: 'star', importance: 90, description: 'Creative Cloud and design software.', accent: '#ff3b30', glyph: 'A', tags: ['tools'] },
  { id: 'penpot', name: 'Penpot', url: 'https://penpot.app', universeId: 'design', objectType: 'planet', importance: 46, description: 'Open-source design and prototyping.', accent: '#00d1b8', glyph: 'Pp', tags: ['ui', 'prototyping', 'open-source'] },

  // ─── Gaming ──────────────────────────────────────────────────────────────
  { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com', universeId: 'gaming', objectType: 'star', importance: 96, description: 'The largest PC game storefront.', accent: '#66c0f4', glyph: 'St', tags: ['store'] },
  { id: 'epicgames', name: 'Epic Games', url: 'https://store.epicgames.com', universeId: 'gaming', objectType: 'planet', importance: 82, description: 'Epic Games Store and Unreal Engine.', accent: '#dcdcdc', glyph: 'EG', tags: ['store', 'engine'] },
  { id: 'itchio', name: 'itch.io', url: 'https://itch.io', universeId: 'gaming', objectType: 'comet', importance: 60, description: 'Indie games marketplace.', accent: '#fa5c5c', glyph: 'io', tags: ['indie'] },
  { id: 'roblox', name: 'Roblox', url: 'https://www.roblox.com', universeId: 'gaming', objectType: 'planet', importance: 85, description: 'User-generated online game platform.', accent: '#f2f2f2', glyph: 'Rb', tags: ['platform'] },
  { id: 'ign', name: 'IGN', url: 'https://www.ign.com', universeId: 'gaming', objectType: 'moon', importance: 65, description: 'Games and entertainment news.', accent: '#bf1313', glyph: 'IGN', orbitAnchorId: 'epicgames', tags: ['news'] },

  // ─── Education ───────────────────────────────────────────────────────────
  { id: 'khanacademy', name: 'Khan Academy', url: 'https://www.khanacademy.org', universeId: 'education', objectType: 'star', importance: 88, description: 'Free world-class education for anyone.', accent: '#14bf96', glyph: 'KA', tags: ['courses'] },
  { id: 'coursera', name: 'Coursera', url: 'https://www.coursera.org', universeId: 'education', objectType: 'planet', importance: 84, description: 'University courses and certificates online.', accent: '#0056d2', glyph: 'Co', tags: ['courses'] },
  { id: 'edx', name: 'edX', url: 'https://www.edx.org', universeId: 'education', objectType: 'planet', importance: 74, description: 'Online courses from leading institutions.', accent: '#c92d5d', glyph: 'edX', tags: ['courses'] },
  { id: 'mit-ocw', name: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu', universeId: 'education', objectType: 'moon', importance: 68, description: 'Free MIT course materials.', accent: '#a31f34', glyph: 'MIT', orbitAnchorId: 'edx', tags: ['courses'] },
  { id: 'freecodecamp', name: 'freeCodeCamp', url: 'https://www.freecodecamp.org', universeId: 'education', objectType: 'comet', importance: 78, description: 'Learn to code for free.', accent: '#0a0a23', glyph: 'fCC', tags: ['coding'] },

  // ─── Science ─────────────────────────────────────────────────────────────
  { id: 'nasa', name: 'NASA', url: 'https://www.nasa.gov', universeId: 'science', objectType: 'star', importance: 92, description: 'Space exploration and discovery.', accent: '#fc3d21', glyph: 'NASA', tags: ['space'] },
  { id: 'arxiv', name: 'arXiv', url: 'https://arxiv.org', universeId: 'science', objectType: 'planet', importance: 78, description: 'Open-access research preprints.', accent: '#b31b1b', glyph: 'arX', tags: ['papers'] },
  { id: 'nature', name: 'Nature', url: 'https://www.nature.com', universeId: 'science', objectType: 'planet', importance: 76, description: 'Leading international science journal.', accent: '#dfe6ff', glyph: 'N', tags: ['journal'] },
  // Deliberately sparse entry: exercises the metadata fallbacks.
  { id: 'pubmed', name: 'PubMed', universeId: 'science', objectType: 'moon', orbitAnchorId: 'nature' },
  { id: 'wolframalpha', name: 'Wolfram Alpha', url: 'https://www.wolframalpha.com', universeId: 'science', objectType: 'moon', importance: 64, description: 'Computational knowledge engine.', accent: '#dd1100', glyph: 'Wα', orbitAnchorId: 'arxiv', tags: ['tools'] },

  // ─── Finance ─────────────────────────────────────────────────────────────
  { id: 'bloomberg', name: 'Bloomberg', url: 'https://www.bloomberg.com', universeId: 'finance', objectType: 'star', importance: 88, description: 'Financial news and market data.', accent: '#f5f5f5', glyph: 'Bb', tags: ['news', 'markets'] },
  { id: 'coinbase', name: 'Coinbase', url: 'https://www.coinbase.com', universeId: 'finance', objectType: 'planet', importance: 74, description: 'Cryptocurrency exchange.', accent: '#0052ff', glyph: 'CB', tags: ['crypto'] },
  { id: 'investopedia', name: 'Investopedia', url: 'https://www.investopedia.com', universeId: 'finance', objectType: 'planet', importance: 70, description: 'Investing and finance education.', accent: '#6bd48b', glyph: 'In', tags: ['learning'] },
  { id: 'tradingview', name: 'TradingView', url: 'https://www.tradingview.com', universeId: 'finance', objectType: 'comet', importance: 76, description: 'Charts and trading community.', accent: '#2962ff', glyph: 'TV', tags: ['charts'] },

  // ─── Music ───────────────────────────────────────────────────────────────
  { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com', universeId: 'music', objectType: 'star', importance: 95, description: 'Music and podcast streaming.', accent: '#1db954', glyph: 'Sp', tags: ['streaming'] },
  { id: 'soundcloud', name: 'SoundCloud', url: 'https://soundcloud.com', universeId: 'music', objectType: 'planet', importance: 74, description: 'Audio platform for independent artists.', accent: '#ff5500', glyph: 'SC', tags: ['streaming', 'community'] },
  { id: 'bandcamp', name: 'Bandcamp', url: 'https://bandcamp.com', universeId: 'music', objectType: 'planet', importance: 66, description: 'Direct-to-fan music store.', accent: '#629aa9', glyph: 'Bc', tags: ['store'] },
  { id: 'genius', name: 'Genius', url: 'https://genius.com', universeId: 'music', objectType: 'moon', importance: 60, description: 'Song lyrics and annotations.', accent: '#ffff64', glyph: 'Ge', orbitAnchorId: 'soundcloud', tags: ['lyrics'] },

  // ─── Entertainment ───────────────────────────────────────────────────────
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com', universeId: 'entertainment', objectType: 'star', importance: 100, description: 'Video for everyone.', accent: '#ff0033', glyph: 'YT', tags: ['video'] },
  { id: 'netflix', name: 'Netflix', url: 'https://www.netflix.com', universeId: 'entertainment', objectType: 'star', importance: 92, description: 'Streaming films and series.', accent: '#e50914', glyph: 'N', tags: ['streaming'] },
  { id: 'imdb', name: 'IMDb', url: 'https://www.imdb.com', universeId: 'entertainment', objectType: 'planet', importance: 78, description: 'Film and TV database.', accent: '#f5c518', glyph: 'IMDb', tags: ['database'] },
  { id: 'twitch', name: 'Twitch', url: 'https://www.twitch.tv', universeId: 'entertainment', objectType: 'planet', importance: 84, description: 'Live streaming for creators.', accent: '#9146ff', glyph: 'Tw', tags: ['streaming', 'live'] },
  { id: 'letterboxd', name: 'Letterboxd', url: 'https://letterboxd.com', universeId: 'entertainment', objectType: 'comet', importance: 62, description: 'Social film diary.', accent: '#40bcf4', glyph: 'Lb', tags: ['community'] },
]

