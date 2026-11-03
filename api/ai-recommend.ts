/**
 * Oráculo literario · función serverless de Vercel.
 *
 * Diseño: recuperación primero, generación después, abstención cuando toca.
 *
 *   1. RECUPERACIÓN  · puntúa las fichas del catálogo contra la consulta (léxico
 *                      ponderado por IDF sobre título, autor, keywords, entidades,
 *                      materia, época y sinopsis) y se queda con los 8 mejores.
 *                      Con 18 fichas el prompt cabría entero, pero el catálogo
 *                      crece: esta capa es la que escala a 18.000 referencias.
 *   2. ABSTENCIÓN    · si la consulta no toca el fondo (cobertura léxica baja),
 *                      responde "no lo tengo" antes de gastar una llamada al modelo.
 *                      El modelo también puede abstenerse.
 *   3. GENERACIÓN    · Gemini elige entre los candidatos y justifica, en el registro
 *                      pedido: erudito, divulgativo o llano.
 *   4. VALIDACIÓN    · se descarta cualquier id fuera del catálogo, cualquier cita
 *                      de un título inexistente y cualquier rationale vacío.
 *
 * Variables de entorno: GEMINI_API_KEY (obligatoria), ORACULO_MODEL (opcional).
 */

type CatalogueItem = {
  id: string;
  title: string;
  author: string;
  year?: number;
  price?: number;
  category?: string;
  tags?: string[];
  keywords?: string[];
  thematic?: string;
  epoch?: string;
  synopsis?: string;
  entities?: { characters?: { name: string; role?: string }[]; places?: { name: string; context?: string }[] };
};

type Registro = 'erudito' | 'divulgativo' | 'llano';

type RequestBody = {
  query?: string;
  mood?: string;
  catalogue?: CatalogueItem[];
  registro?: string;
};

type Recommendation = { id: string; rationale: string; glossary?: string[] };

type Candidate = { item: CatalogueItem; score: number; matched: string[] };

const MODEL = process.env.ORACULO_MODEL || 'gemini-3.8-flash';
const MAX_QUERY = 600;
const MAX_CATALOGUE = 60;
const TOP_K = 8;
const COVERAGE_FLOOR = 0.25;
const MIN_SCORE = 0.3;

const STOPWORDS = new Set([
  'que', 'con', 'por', 'para', 'los', 'las', 'una', 'uno', 'unos', 'unas', 'del', 'de', 'la', 'el',
  'como', 'mas', 'pero', 'sin', 'sus', 'su', 'este', 'esta', 'esto', 'estos', 'estas', 'sobre',
  'entre', 'cuando', 'donde', 'muy', 'hay', 'ser', 'estar', 'algo', 'algun', 'alguna', 'alguno',
  'quiero', 'busco', 'buscando', 'libro', 'libros', 'leer', 'lectura', 'necesito', 'gustaria',
  'tengo', 'dame', 'recomienda', 'recomiendame', 'cosa', 'tipo', 'nada', 'tambien', 'porque',
  'quien', 'cual', 'cuanto', 'mucho', 'poco', 'asi', 'solo', 'todo', 'toda', 'todos'
]);

const REGISTRO_RULES: Record<Registro, string> = {
  erudito:
    'Registro erudito: puedes dar por sabidos los términos de la disciplina, sitúa la obra en su tradición y sé preciso con época y escuela. Máximo 220 caracteres. No uses superlativos vacíos.',
  divulgativo:
    'Registro divulgativo: explica en lenguaje corriente por qué esa obra le sirve a esta persona, sin jerga académica. Si necesitas un término culto (incunable, colofón, escolástica), defínelo en cuatro palabras dentro de la frase. Máximo 210 caracteres.',
  llano:
    'Registro llano: escribe para alguien que casi no lee, sin dar nada por sabido y sin condescendencia. Frases cortas, verbos concretos, cero latinajos, cero "obra cumbre". Si mencionas un término técnico, añádelo en el campo opcional "glossary" con una definición de menos de 12 palabras. Máximo 190 caracteres.'
};

/* ------------------------------------------------------------------ utils */

function json(res: any, status: number, payload: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function stripFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/* ------------------------------------------------------- recuperación */

type Doc = { item: CatalogueItem; tokens: Set<string>; freq: Map<string, number>; size: number };

function docText(item: CatalogueItem): string {
  const characters = (item.entities?.characters ?? []).map((c) => `${c.name} ${c.role ?? ''}`).join(' ');
  const places = (item.entities?.places ?? []).map((p) => `${p.name} ${p.context ?? ''}`).join(' ');
  return [
    item.title,
    item.author,
    item.category,
    item.thematic,
    item.epoch,
    (item.tags ?? []).join(' '),
    (item.keywords ?? []).join(' '),
    characters,
    places,
    item.synopsis
  ]
    .filter(Boolean)
    .join(' ');
}

function buildDocs(items: CatalogueItem[]): Doc[] {
  return items.map((item) => {
    // Título y keywords repetidos: peso de campo sin inventar un BM25 completo.
    const raw = [
      item.title,
      item.title,
      item.title,
      item.author,
      item.author,
      (item.keywords ?? []).join(' '),
      (item.keywords ?? []).join(' '),
      docText(item)
    ]
      .filter(Boolean)
      .join(' ');
    const tokens = normalize(raw).split(' ');
    const freq = new Map<string, number>();
    for (const token of tokens) freq.set(token, (freq.get(token) ?? 0) + 1);
    return { item, tokens: new Set(tokens), freq, size: tokens.length };
  });
}

function retrieve(query: string, mood: string, docs: Doc[], k: number) {
  const queryTokens = Array.from(new Set([...tokenize(query), ...tokenize(mood)]));
  if (queryTokens.length === 0) return { candidates: [] as Candidate[], coverage: 0 };

  const n = docs.length || 1;
  const df = new Map<string, number>();
  for (const token of queryTokens) {
    let count = 0;
    for (const doc of docs) if (doc.tokens.has(token)) count += 1;
    df.set(token, count);
  }

  const coverage =
    queryTokens.filter((token) => (df.get(token) ?? 0) > 0).length / queryTokens.length;

  // Peso de cada término: raro en el fondo = informativo. Un término que no
  // existe en el catálogo pesa como el máximo, porque penaliza la consulta.
  const maxIdf = Math.log(1 + n);
  const weight = (token: string) => {
    const frequency = df.get(token) ?? 0;
    return frequency === 0 ? maxIdf : Math.log(1 + n / frequency);
  };
  const denominator =
    queryTokens.reduce((sum, token) => sum + weight(token), 0) || 1;

  const lowered = normalize(query);
  const scored: Candidate[] = [];

  for (const doc of docs) {
    let raw = 0;
    const matched: string[] = [];

    for (const token of queryTokens) {
      const frequency = doc.freq.get(token) ?? 0;
      if (frequency === 0) continue;
      raw += (1 + Math.log(frequency)) * weight(token);
      matched.push(token);
    }

    // Una frase exacta de las keywords o del título vale un extra fijo.
    for (const keyword of doc.item.keywords ?? []) {
      const norm = normalize(keyword);
      if (norm.length > 4 && lowered.includes(norm)) raw += maxIdf;
    }

    if (raw <= 0) continue;
    scored.push({
      item: doc.item,
      score: Number((raw / denominator).toFixed(3)),
      matched: Array.from(new Set(matched)).slice(0, 6)
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return { candidates: scored.slice(0, k), coverage };
}

/* ------------------------------------------------------- restricciones */

/**
 * El Oráculo escucha también lo que no es tema: presupuesto, longitud y ese
 * "no sé qué regalar". "Algo de menos de 20 €" es la consulta más frecuente
 * y la que peor responde un buscador semántico puro.
 */
function parseBudget(query: string): number | null {
  const text = normalize(query);
  const explicit = text.match(/(?:menos de|por debajo de|hasta|maximo de|maximo|no mas de|presupuesto de)\s*(\d{1,3})/);
  if (explicit) return Number(explicit[1]);
  if (/\b(barat|economic|asequible|bolsillo)/.test(text)) return 20;
  return null;
}

/** Señales de consulta sin tema: regalo, encargo para otro, "no sé qué". */
function isTopicless(query: string): boolean {
  const text = normalize(query);
  return /\b(regalo|regalar|sorpresa|para mi (madre|padre|hijo|hija|hermano|hermana|abuelo|abuela|amigo|amiga|pareja|jefe)|no se que|no tengo ni idea|recomiendame algo|algo para leer|no leo|no suelo leer|empiezo a leer|para empezar a leer)\b/.test(
    text
  );
}

/** Peticiones de fondo infantil o juvenil: el catálogo no las cubre. */
function wantsChildren(query: string): boolean {
  const text = normalize(query);
  return /\b(infantil|juvenil|nino|nina|niños|ninas|adolescente|chaval|chavala|sobrino|sobrina|para mi hijo|para mi hija|colegio|instituto)\b/.test(
    text
  );
}

/**
 * Sin tema no se abstiene: se baja el listón y se ofrecen las puertas de
 * entrada al fondo (lo más asequible y lo más breve), que es lo que haría
 * un librero de mostrador. El modelo no inventa, elige de esta lista corta.
 */
function entryCandidates(docs: Doc[], budget: number | null, k = 6): Candidate[] {
  const pool = docs.filter((doc) => typeof doc.item.price === 'number');
  const affordable = budget === null ? pool : pool.filter((doc) => (doc.item.price ?? 0) <= budget);
  const usable = affordable.length ? affordable : pool;
  return usable
    .slice()
    .sort((a, b) => (a.item.price ?? 0) - (b.item.price ?? 0))
    .slice(0, k)
    .map((doc) => ({ item: doc.item, score: 0, matched: [] }));
}

/* ---------------------------------------------------------- generación */

function buildPrompt(
  query: string,
  mood: string,
  registro: Registro,
  candidates: Candidate[],
  budget: number | null,
  sinTema: boolean
): string {
  const list = candidates
    .map(({ item, matched }) => {
      const characters = (item.entities?.characters ?? []).slice(0, 3).map((c) => c.name).join(', ');
      const tags = (item.tags ?? []).slice(0, 6).join(', ');
      const keywords = (item.keywords ?? []).slice(0, 8).join(', ');
      return [
        `- id: ${item.id}`,
        `  título: "${item.title}" — ${item.author} (${item.year ?? 's. f.'})`,
        `  materia: ${item.thematic ?? item.category ?? ''} · época: ${item.epoch ?? ''}`,
        typeof item.price === 'number' ? `  precio: ${item.price.toFixed(2)} €` : '',
        `  etiquetas: ${tags}`,
        `  palabras clave: ${keywords}`,
        characters ? `  personajes: ${characters}` : '',
        `  sinopsis: ${(item.synopsis ?? '').slice(0, 320)}`,
        matched.length ? `  coincidencias con la consulta: ${matched.join(', ')}` : ''
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  return `Eres el librero de la Librería AI Salamanca, en la Rúa Mayor. Llevas desde 1987 recomendando de viva voz: escuchas y solo entonces propones. No inventas títulos, no inventas premios, no inventas datos biográficos.

CANDIDATOS (los únicos títulos de los que puedes hablar; elige SOLO entre estos ids):
${list}

PETICIÓN DEL LECTOR
- Estado de ánimo o tema elegido: ${mood || 'no indicado'}
- Lo que ha escrito: ${query || 'no indicado'}

TAREA
${sinTema ? 'El lector no ha dado un tema: quiere un regalo o no sabe qué pedir. No le devuelvas la pregunta: propón 2 o 3 opciones de entrada, distintas entre sí, explicando para quién funciona cada una. Es una lista corta y asequible, así que elige con criterio de mostrador.\n' : 'Elige entre 1 y 3 obras que de verdad encajen. Si ninguna encaja, abstente: es una respuesta correcta y valorada.\n'}Cada justificación debe conectar con algo concreto de la petición (un tema, un personaje, una época, una situación vital) y con algo concreto de la ficha. Nada de "es una obra imprescindible".
${budget !== null ? `\nEl lector ha puesto un límite de ${budget} €: todos los candidatos ya lo cumplen. Puedes mencionar el precio si ayuda, no lo inventes.\n` : ''}

${REGISTRO_RULES[registro]}

Devuelve únicamente JSON válido:
{
  "recommendations": [
    { "id": "<id exacto>", "rationale": "<1-2 frases>", "glossary": [ { "term": "<término>", "definition": "<menos de 12 palabras>" } ] }
  ],
  "abstain": false
}

Si te abstienes:
{ "recommendations": [], "abstain": true, "reason": "<una frase, en español, sin reproches>" }`;
}

async function callModel(prompt: string, apiKey: string, maxTokens: number): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 }
      }
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`gemini_${response.status}: ${detail.slice(0, 300)}`);
  }

  const data: any = await response.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  if (!text) throw new Error('gemini_empty');
  return stripFence(text);
}

/* --------------------------------------------------------- validación */

const FORBIDDEN_PATTERNS = [
  /premio\s+(nobel|cervantes|planeta|princesa)/i,
  /best[\s-]?seller/i,
  /\b(millones|miles)\s+de\s+ejemplares/i,
  /traducid[oa]\s+a\s+\w+\s+idiomas/i
];

function sanitizeRationale(raw: unknown, item: CatalogueItem): string {
  let text = cleanText(raw, 320);
  if (!text) return '';
  text = text.replace(/\*\*/g, '').replace(/^["“]|["”]$/g, '').trim();
  if (FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text))) return '';
  // Un título entre comillas que no sea el de la propia ficha es una invención.
  const quoted = Array.from(text.matchAll(/[«"“]([^»"”]{4,80})[»"”]/g)).map((m) => normalize(m[1]));
  const ownTitle = normalize(item.title);
  if (quoted.some((q) => q.length > 3 && !ownTitle.includes(q) && !q.includes(ownTitle))) return '';
  return text;
}

function pickValid(
  parsed: any,
  candidates: Candidate[]
): { recommendations: Recommendation[]; abstain: boolean; reason: string } {
  const byId = new Map(candidates.map((candidate) => [candidate.item.id, candidate.item]));
  const seen = new Set<string>();
  const recommendations: Recommendation[] = [];

  for (const entry of Array.isArray(parsed?.recommendations) ? parsed.recommendations : []) {
    const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    const item = byId.get(id);
    if (!item || seen.has(id)) continue;
    const rationale = sanitizeRationale(entry?.rationale, item);
    if (!rationale) continue;
    seen.add(id);

    const glossary = Array.isArray(entry?.glossary)
      ? entry.glossary
          .filter((g: any) => typeof g?.term === 'string' && typeof g?.definition === 'string')
          .slice(0, 2)
          .map((g: any) => `${cleanText(g.term, 40)}: ${cleanText(g.definition, 60)}`)
      : [];

    recommendations.push(glossary.length ? { id, rationale, glossary } : { id, rationale });
    if (recommendations.length === 3) break;
  }

  return {
    recommendations,
    abstain: parsed?.abstain === true || recommendations.length === 0,
    reason: cleanText(parsed?.reason, 220)
  };
}

/* ------------------------------------------------------------- handler */

export default async function handler(req: any, res: any) {
  const started = Date.now();

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return json(res, 204, {});
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  let body: RequestBody = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, 400, { error: 'invalid_json' });
  }

  const query = cleanText(body.query, MAX_QUERY);
  const mood = cleanText(body.mood, 160);
  const registro: Registro =
    body.registro === 'erudito' || body.registro === 'llano' ? body.registro : 'divulgativo';
  const catalogue = Array.isArray(body.catalogue)
    ? body.catalogue
        .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
        .slice(0, MAX_CATALOGUE)
    : [];

  if (!query && !mood) return json(res, 400, { error: 'empty_query' });
  if (catalogue.length === 0) return json(res, 400, { error: 'empty_catalogue' });

  const docs = buildDocs(catalogue);
  const budget = parseBudget(query);
  const retrieved = retrieve(query, mood, docs, budget === null ? TOP_K : MAX_CATALOGUE);
  const affordable =
    budget === null
      ? retrieved.candidates
      : retrieved.candidates.filter(
          (candidate) => typeof candidate.item.price !== 'number' || candidate.item.price <= budget
        );
  const candidates = affordable.slice(0, TOP_K);
  const coverage = retrieved.coverage;

  // ¿Es una consulta sin tema ("un regalo", "algo barato")? Entonces no se
  // abstiene: se ofrecen las puertas de entrada al fondo.
  const weak = candidates.length === 0 || (candidates[0]?.score ?? 0) < MIN_SCORE;
  const sinTema = weak && (isTopicless(query) || budget !== null) && coverage < 0.6;
  const offering = sinTema ? entryCandidates(docs, budget, 6) : candidates;

  const baseMeta = {
    modelo: MODEL,
    catalogo: catalogue.length,
    candidatos: offering.length,
    cobertura: Number(coverage.toFixed(2)),
    sin_tema: sinTema,
    presupuesto: budget,
    ms: Date.now() - started,
    ...(process.env.ORACULO_DEBUG === '1'
      ? { debug: offering.map((c) => ({ id: c.item.id, score: c.score, matched: c.matched })) }
      : {})
  };

  // Fondo infantil: la casa no lo tiene. Se dice, no se disimula.
  if (wantsChildren(query)) {
    return json(res, 200, {
      source: 'no_match',
      recommendations: [] as Recommendation[],
      nearest: [],
      message:
        'No tenemos fondo infantil ni juvenil. Es una ausencia de la casa, no un descuido del Oráculo: preferimos decírtelo antes que venderte un clásico para adultos como si sirviera para una niña de nueve años.',
      meta: { ...baseMeta, motivo: 'sin_fondo_infantil' }
    });
  }

  // Abstención barata: la consulta no toca el fondo, no gastamos llamada.
  const topScore = candidates[0]?.score ?? 0;
  if (!sinTema && (candidates.length === 0 || coverage < COVERAGE_FLOOR || topScore < MIN_SCORE)) {
    return json(res, 200, {
      source: 'no_match',
      recommendations: [] as Recommendation[],
      nearest: candidates.slice(0, 3).map((candidate) => ({
        id: candidate.item.id,
        title: candidate.item.title,
        reason: `Comparte ${candidate.matched.slice(0, 3).join(', ') || 'algún término'} con tu búsqueda`
      })),
      message:
        budget !== null && retrieved.candidates.length > 0 && candidates.length === 0
          ? `En la sala no queda nada de ese tema por debajo de ${budget} €. Si amplías el presupuesto, te enseño lo que hay.`
          : 'En el fondo de la sala no hay nada que responda a eso. Preferimos decírtelo antes que recomendarte algo que no tiene que ver.',
      meta: baseMeta
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(res, 200, { source: 'unconfigured', recommendations: [], meta: baseMeta });
  }

  const prompt = buildPrompt(query, mood, registro, offering, budget, sinTema);

  try {
    let parsed: any = null;
    let raw = await callModel(prompt, apiKey, 900);

    try {
      parsed = JSON.parse(raw);
    } catch {
      // Un reintento, más estricto, antes de rendirse.
      raw = await callModel(
        `${prompt}\n\nAVISO: tu respuesta anterior no era JSON válido. Devuelve solo el objeto JSON, sin texto alrededor.`,
        apiKey,
        900
      );
      parsed = JSON.parse(raw);
    }

    const { recommendations, abstain, reason } = pickValid(parsed, offering);

    if (abstain || recommendations.length === 0) {
      return json(res, 200, {
        source: 'no_match',
        recommendations: [],
        nearest: offering.slice(0, 3).map((candidate) => ({
          id: candidate.item.id,
          title: candidate.item.title,
          reason: `Se acerca por ${candidate.matched.slice(0, 3).join(', ') || 'tema'}`
        })),
        message: reason || 'El Oráculo no ha encontrado en la sala nada que encaje de verdad con lo que pides.',
        meta: { ...baseMeta, ms: Date.now() - started, abstained_by: 'model' }
      });
    }

    return json(res, 200, {
      source: 'gemini',
      recommendations,
      meta: { ...baseMeta, ms: Date.now() - started, registro }
    });
  } catch (error: any) {
    console.error('oraculo:', error?.message ?? error);
    return json(res, 200, {
      source: 'error',
      recommendations: [],
      message: 'El Oráculo no puede responder ahora mismo.',
      meta: { ...baseMeta, ms: Date.now() - started }
    });
  }
}
