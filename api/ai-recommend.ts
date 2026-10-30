/**
 * Oráculo literario · función serverless de Vercel.
 *
 * Recibe una consulta libre + un estado de ánimo y devuelve 3 ids del catálogo
 * real de la librería con una justificación breve. La IA nunca inventa títulos:
 * solo elige entre las obras que le pasamos desde el cliente.
 *
 * Variable de entorno necesaria: GEMINI_API_KEY
 */

type CatalogueItem = {
  id: string;
  title: string;
  author: string;
  year?: number;
  category?: string;
  tags?: string[];
  synopsis?: string;
};

type RequestBody = {
  query?: string;
  mood?: string;
  catalogue?: CatalogueItem[];
};

type Recommendation = { id: string; rationale: string };

const MODEL = 'gemini-2.5-flash';
const MAX_QUERY = 600;
const MAX_CATALOGUE = 40;

function json(res: any, status: number, payload: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function buildPrompt(query: string, mood: string, catalogue: CatalogueItem[]): string {
  const list = catalogue
    .map((book) => {
      const tags = (book.tags ?? []).slice(0, 6).join(', ');
      const synopsis = (book.synopsis ?? '').slice(0, 260);
      return `- id: ${book.id} | "${book.title}" — ${book.author} (${book.year ?? 's. f.'}) | ${book.category ?? ''} | ${tags} | ${synopsis}`;
    })
    .join('\n');

  return `Eres el librero de la Librería AI Salamanca, en la Rúa Mayor. Conoces el fondo y recomiendas con criterio, sin exagerar ni inventar títulos.

CATÁLOGO DISPONIBLE (elige SOLO entre estos ids):
${list}

PETICIÓN DEL LECTOR
- Estado de ánimo o tema: ${mood || 'no indicado'}
- Consulta libre: ${query || 'no indicada'}

TAREA
Elige exactamente 3 obras del catálogo que mejor encajen. No repitas la misma obra. Si la consulta no encaja con nada, elige las tres que más se acerquen temáticamente.

Devuelve únicamente JSON válido con esta forma:
{"recommendations":[{"id":"<id exacto del catálogo>","rationale":"<una o dos frases, en español, concretas: por qué esta obra y no otra, mencionando el tema o personaje que conecta con la petición>"}]}

Reglas del rationale: máximo 220 caracteres, tono culto y cálido, sin superlativos vacíos, sin inventar datos biográficos ni premios.`;
}

export default async function handler(req: any, res: any) {
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
  const catalogue = Array.isArray(body.catalogue) ? body.catalogue.slice(0, MAX_CATALOGUE) : [];

  if (!query && !mood) {
    return json(res, 400, { error: 'empty_query' });
  }
  if (catalogue.length === 0) {
    return json(res, 400, { error: 'empty_catalogue' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // El cliente aplica su motor semántico local cuando recibe este aviso.
    return json(res, 200, { source: 'unconfigured', recommendations: [] as Recommendation[] });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(query, mood, catalogue) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 900,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 }
        }
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('Gemini error', upstream.status, detail.slice(0, 500));
      return json(res, 200, { source: 'upstream_error', recommendations: [] as Recommendation[] });
    }

    const data: any = await upstream.json();
    const raw = data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    if (!raw) {
      return json(res, 200, { source: 'empty', recommendations: [] as Recommendation[] });
    }

    const parsed = JSON.parse(stripFence(raw));
    const validIds = new Set(catalogue.map((book) => book.id));
    const seen = new Set<string>();
    const recommendations: Recommendation[] = [];

    for (const item of Array.isArray(parsed?.recommendations) ? parsed.recommendations : []) {
      const id = typeof item?.id === 'string' ? item.id : '';
      if (!validIds.has(id) || seen.has(id)) continue;
      seen.add(id);
      recommendations.push({
        id,
        rationale: cleanText(item?.rationale, 260)
      });
      if (recommendations.length === 3) break;
    }

    if (recommendations.length === 0) {
      return json(res, 200, { source: 'no_match', recommendations: [] as Recommendation[] });
    }

    return json(res, 200, { source: 'gemini', recommendations });
  } catch (error: any) {
    console.error('ai-recommend failed:', error?.message ?? error);
    return json(res, 200, { source: 'error', recommendations: [] as Recommendation[] });
  }
}

function stripFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}
