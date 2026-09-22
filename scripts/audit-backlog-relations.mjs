import fs from 'node:fs/promises';

const STOPWORDS = new Set([
  'a','al','algo','como','con','contra','cual','cuando','de','del','desde','donde',
  'el','ella','en','entre','es','esta','este','esto','la','las','lo','los','mas',
  'no','o','para','pero','por','que','se','si','sin','sobre','su','sus','un','una',
  'unos','unas','y','ya','the','and','or','to','of','for','in','on','with','without',
  'backlog','item','items','sistema'
]);

export function normalizeBacklogText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9#\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemToken(token) {
  const suffixes = [
    'amientos','imientos','amiento','imiento',
    'aciones','adores','adoras','acion','ador','adora',
    'ados','adas','idos','idas','ado','ada','ido','ida',
    'mente','es','s'
  ];
  for (const suffix of suffixes) {
    if (!token.endsWith(suffix)) continue;
    const root = token.slice(0, -suffix.length);
    if (root.length >= 4) return root;
  }
  return token;
}

export function backlogTokens(value) {
  return [...new Set(
    normalizeBacklogText(value)
      .split(/\s+/)
      .map(stemToken)
      .filter(token => token.length >= 3 && !STOPWORDS.has(token))
  )].sort();
}

function jaccard(a, b) {
  const left = new Set(a);
  const right = new Set(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

export function explicitBacklogRefs(item = {}) {
  const text = String(item.summary ?? '') + ' ' + String(item.title ?? '');
  const refs = new Set();
  const patterns = [
    /\bbacklog\s*[-#: ]\s*(\d{1,4})\b/gi,
    /\bitem\s*[-#: ]\s*(\d{1,4})\b/gi,
    /#(\d{1,4})\b/g
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) refs.add(Number(match[1]));
  }
  refs.delete(Number(item.id));
  return [...refs].filter(Number.isInteger).sort((a, b) => a - b);
}

export function backlogPairMetrics(a = {}, b = {}) {
  const aTitle = backlogTokens(a.title);
  const bTitle = backlogTokens(b.title);
  const aSummary = backlogTokens(a.summary);
  const bSummary = backlogTokens(b.summary);
  const aCombined = [...new Set([...aTitle, ...aSummary])];
  const bCombined = [...new Set([...bTitle, ...bSummary])];
  const titleSimilarity = jaccard(aTitle, bTitle);
  const summarySimilarity = jaccard(aSummary, bSummary);
  const combinedSimilarity = jaccard(aCombined, bCombined);
  const score = (0.55 * titleSimilarity) + (0.30 * summarySimilarity) + (0.15 * combinedSimilarity);
  const commonTerms = aCombined.filter(token => bCombined.includes(token)).sort();
  return {
    title_similarity: Number(titleSimilarity.toFixed(4)),
    summary_similarity: Number(summarySimilarity.toFixed(4)),
    combined_similarity: Number(combinedSimilarity.toFixed(4)),
    score: Number(score.toFixed(4)),
    common_terms: commonTerms
  };
}

export function classifyBacklogPair(a, b, options = {}) {
  const duplicateThreshold = Number(options.duplicateThreshold ?? 0.68);
  const relatedThreshold = Number(options.relatedThreshold ?? 0.30);
  const metrics = backlogPairMetrics(a, b);
  const aRefs = explicitBacklogRefs(a);
  const bRefs = explicitBacklogRefs(b);
  const explicit = aRefs.includes(Number(b.id)) || bRefs.includes(Number(a.id));

  let relation = null;
  const reasons = [];
  if (explicit) {
    relation = 'EXPLICIT_RELATION';
    reasons.push('explicit_reference');
  }
  if (metrics.score >= duplicateThreshold || (
    metrics.title_similarity >= 0.75 && metrics.combined_similarity >= 0.50
  )) {
    relation = 'DUPLICATE_CANDIDATE';
    reasons.push('high_lexical_similarity');
  } else if (!relation && metrics.score >= relatedThreshold && metrics.common_terms.length >= 2) {
    relation = 'RELATED';
    reasons.push('shared_semantic_terms');
  }

  if (!relation) return null;
  return {
    a_id: Number(a.id),
    b_id: Number(b.id),
    relation,
    score: metrics.score,
    reasons,
    common_terms: metrics.common_terms,
    explicit_refs: {
      a_to_b: aRefs.includes(Number(b.id)),
      b_to_a: bRefs.includes(Number(a.id))
    }
  };
}

export function auditBacklogRelations(items = [], options = {}) {
  const relations = [];
  const sorted = [...items]
    .filter(item => Number.isInteger(Number(item.id)))
    .sort((a, b) => Number(a.id) - Number(b.id));

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const relation = classifyBacklogPair(sorted[i], sorted[j], options);
      if (relation) relations.push(relation);
    }
  }

  relations.sort((x, y) =>
    y.score - x.score ||
    x.a_id - y.a_id ||
    x.b_id - y.b_id ||
    x.relation.localeCompare(y.relation)
  );

  return {
    schema: 'prometeo.backlog-relation-audit/v1',
    authority: 'ANALYSIS_ONLY_NO_AUTO_MERGE_OR_STATUS_CHANGE',
    thresholds: {
      duplicate: Number(options.duplicateThreshold ?? 0.68),
      related: Number(options.relatedThreshold ?? 0.30)
    },
    item_count: sorted.length,
    relation_count: relations.length,
    duplicate_candidate_count: relations.filter(x => x.relation === 'DUPLICATE_CANDIDATE').length,
    explicit_relation_count: relations.filter(x => x.relation === 'EXPLICIT_RELATION').length,
    related_count: relations.filter(x => x.relation === 'RELATED').length,
    relations
  };
}

function parseArgs(argv) {
  const args = {input: 'docs/cognitive-forge/backlog.json', output: null};
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--input') args.input = argv[++i];
    else if (value === '--output') args.output = argv[++i];
    else if (value === '--duplicate-threshold') args.duplicateThreshold = Number(argv[++i]);
    else if (value === '--related-threshold') args.relatedThreshold = Number(argv[++i]);
    else throw new Error(`UNKNOWN_ARGUMENT:${value}`);
  }
  return args;
}

if (process.argv[1] && process.argv[1].endsWith('audit-backlog-relations.mjs')) {
  const args = parseArgs(process.argv);
  const raw = JSON.parse(await fs.readFile(args.input, 'utf8'));
  const report = auditBacklogRelations(raw.items ?? raw, args);
  const text = JSON.stringify(report, null, 2) + '\n';
  if (args.output) await fs.writeFile(args.output, text, 'utf8');
  else process.stdout.write(text);
}
