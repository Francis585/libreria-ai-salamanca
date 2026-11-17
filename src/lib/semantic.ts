import { getValoracion } from '../data/valoraciones';
import { BOOKS, type Book } from '../data/library';

export interface SearchResult {
  book: Book;
  score: number;
  matchedConcepts: string[];
  reason: string;
}

/**
 * Expansión semántica: cada clúster agrupa el vocabulario con el que un lector
 * pediría un tema sin usar las palabras exactas del catálogo.
 */
export const SEMANTIC_CLUSTERS: Record<string, string[]> = {
  humanismo: ['humanista', 'filologia', 'latin', 'cultura', 'clasica', 'nebrija', 'renacimiento', 'erasmo', 'letras', 'retorica'],
  derecho: ['leyes', 'justicia', 'ius', 'gentes', 'soberania', 'pacto', 'indios', 'vitoria', 'suarez', 'moral', 'libertad', 'constitucion'],
  conquista: ['america', 'indias', 'descubrimiento', 'nuevo mundo', 'indigenas', 'soberania', 'vitoria', 'navegacion', 'colonial'],
  lengua: ['idioma', 'gramatica', 'castellano', 'romance', 'nebrija', 'ortografia', 'palabras', 'sintaxis', 'lenguaje', 'diccionario'],
  navegacion: ['mar', 'oceano', 'barco', 'astronomia', 'astrolabio', 'brujula', 'estrellas', 'sphera', 'cortes', 'latitud', 'mapa'],
  medicina: ['salud', 'cerebro', 'humores', 'cuerpo', 'huarte', 'botanica', 'plantas', 'farmacia', 'enfermedad', 'cura', 'herbolario'],
  mistica: ['espiritualidad', 'dios', 'alma', 'oracion', 'fray luis', 'san juan', 'cantico', 'amor divino', 'contemplacion', 'carmelo'],
  picaresca: ['picaro', 'hambre', 'lazarillo', 'ciego', 'escudero', 'sociedad', 'satira', 'calles', 'honra', 'mendigo'],
  amor: ['pasion', 'calisto', 'melibea', 'celestina', 'deseo', 'tragedia', 'muerte', 'amado', 'esposa', 'romance'],
  filosofia: ['razon', 'existencia', 'unamuno', 'sentimiento', 'muerte', 'inmortalidad', 'escolastica', 'moral', 'suarez', 'agonia', 'nivola'],
  inquisicion: ['tribunal', 'herejia', 'brujeria', 'supersticion', 'hechiceria', 'carcel', 'prohibido', 'fe', 'castanega', 'demonio'],
  memoria: ['posguerra', 'infancia', 'recuerdo', 'autoficcion', 'guerra', 'madre', 'casa', 'salamanca', 'martin gaite', 'nostalgia', 'diario'],
  tecnologia: ['inteligencia artificial', 'algoritmo', 'modelo', 'redes neuronales', 'maquina', 'digital', 'datos', 'prompt', 'automatizacion', 'futuro', 'etica'],
  poesia: ['verso', 'soneto', 'lira', 'poema', 'estrofa', 'ritmo', 'metafora', 'cancion', 'lirica'],
  ciudad: ['salamanca', 'plaza mayor', 'piedra', 'rua mayor', 'tormes', 'universidad', 'calle', 'patio', 'barrio']
};

const CLUSTER_LABELS: Record<string, string> = {
  humanismo: 'Humanismo',
  derecho: 'Derecho',
  conquista: 'Conquista',
  lengua: 'Lengua',
  navegacion: 'Navegación',
  medicina: 'Medicina',
  mistica: 'Mística',
  picaresca: 'Picaresca',
  amor: 'Amor',
  filosofia: 'Filosofía',
  inquisicion: 'Inquisición',
  memoria: 'Memoria',
  tecnologia: 'Tecnología',
  poesia: 'Poesía',
  ciudad: 'Ciudad'
};

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'que', 'con', 'por', 'para', 'los', 'las', 'una', 'uno', 'del', 'como', 'mas', 'pero', 'sin', 'sus',
  'este', 'esta', 'esto', 'sobre', 'entre', 'cuando', 'donde', 'muy', 'hay', 'ser', 'estar', 'algo',
  'quiero', 'busco', 'libro', 'libros', 'leer', 'lectura', 'algun', 'alguna', 'tengo', 'gustaria', 'necesito'
]);

function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(' ')
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function bookCorpus(book: Book): string {
  return normalizeText(
    [
      book.title,
      book.author,
      book.synopsis,
      book.tags.join(' '),
      book.keywords.join(' '),
      book.thematic,
      book.epoch,
      book.entities?.characters.map((c) => `${c.name} ${c.role}`).join(' ') ?? '',
      book.entities?.places.map((p) => `${p.name} ${p.context}`).join(' ') ?? '',
      book.excerpt?.original ?? ''
    ].join(' ')
  );
}

const corpusCache = new Map<string, string>();
function corpusOf(book: Book): string {
  let c = corpusCache.get(book.id);
  if (!c) {
    c = bookCorpus(book);
    corpusCache.set(book.id, c);
  }
  return c;
}

export interface SearchOptions {
  epoch?: string;
  thematic?: string;
  category?: string;
}

export function searchBooks(query: string, options: SearchOptions = {}): SearchResult[] {
  const { epoch, thematic, category } = options;

  const pool = BOOKS.filter((book) => {
    if (epoch && epoch !== 'Todas las épocas' && book.epoch !== epoch) return false;
    if (thematic && thematic !== 'Todas las materias' && book.thematic !== thematic) return false;
    if (category && category !== 'Todos' && book.category !== category) return false;
    return true;
  });

  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return pool.map((book) => ({
      book,
      score: 100,
      matchedConcepts: [book.thematic, book.epoch],
      reason: 'Fondo catalogado en el catálogo de la casa'
    }));
  }

  const triggered: string[] = [];
  for (const [cluster, synonyms] of Object.entries(SEMANTIC_CLUSTERS)) {
    const clusterTokens = [cluster, ...synonyms].map(normalizeText);
    if (tokens.some((t) => clusterTokens.some((ct) => ct.includes(t) || t.includes(ct)))) {
      triggered.push(cluster);
    }
  }

  const results: SearchResult[] = [];

  for (const book of pool) {
    let rawScore = 0;
    const concepts: string[] = [];
    const title = normalizeText(book.title);
    const author = normalizeText(book.author);
    const tags = book.tags.map(normalizeText);
    const keywords = book.keywords.map(normalizeText);
    const summary = normalizeText(book.synopsis);
    const thematicNorm = normalizeText(book.thematic);
    const corpus = corpusOf(book);

    for (const token of tokens) {
      if (title.includes(token)) {
        rawScore += 42;
        concepts.push(token);
      }
      if (author.includes(token)) {
        rawScore += 36;
        concepts.push(book.author.split(' ').slice(-1)[0]);
      }
      if (tags.some((t) => t.includes(token)) || keywords.some((k) => k.includes(token))) {
        rawScore += 26;
        concepts.push(token);
      }
      if (thematicNorm.includes(token)) rawScore += 18;
      if (summary.includes(token)) rawScore += 16;
      if (corpus.includes(token)) rawScore += 8;
    }

    for (const cluster of triggered) {
      const affinity = SEMANTIC_CLUSTERS[cluster].some((syn) => corpus.includes(normalizeText(syn)));
      if (affinity) {
        rawScore += 30;
        concepts.push(CLUSTER_LABELS[cluster] ?? cluster);
      }
    }

    if (rawScore <= 0) continue;

    const unique = Array.from(new Set(concepts)).slice(0, 4);
    const score = Math.min(99, Math.max(68, Math.round(65 + Math.min(rawScore, 100) * 0.34)));

    results.push({
      book,
      score,
      matchedConcepts: unique.length ? unique : [book.thematic],
      reason: unique.length
        ? `Afinidad en ${unique.join(', ')} con la consulta`
        : 'Correspondencia léxica con el corpus catalogado'
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Materias y temas que el catálogo puede ofrecer HOY, sacados de las etiquetas
 * reales de las fichas. El selector del Oráculo se construye con esto, así que
 * crece solo cuando crece el fondo: no hay ninguna lista escrita a mano.
 */
export interface TemaGrupo {
  materia: string;
  temas: string[];
}

export function temasDelCatalogo(): TemaGrupo[] {
  const porMateria = new Map<string, Map<string, number>>();

  for (const book of BOOKS) {
    const etiquetas = porMateria.get(book.category) ?? new Map<string, number>();
    for (const tag of book.tags) etiquetas.set(tag, (etiquetas.get(tag) ?? 0) + 1);
    porMateria.set(book.category, etiquetas);
  }

  // Cada materia enseña sus seis temas más frecuentes: así ninguna sección de la
  // librería desaparece del selector y la lista sigue siendo legible cuando el
  // fondo crezca. Lo que no quepa, se pide escribiéndolo en el campo libre.
  const POR_MATERIA = 6;

  return [...porMateria.entries()]
    .map(([materia, etiquetas]) => ({
      materia,
      temas: [...etiquetas.entries()]
        .filter(([tema]) => tema.trim().length >= 3)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
        .slice(0, POR_MATERIA)
        .map(([tema]) => tema)
    }))
    .filter((grupo) => grupo.temas.length > 0);
}

/** Cuántas obras responden a un tema concreto (para el contador del selector). */
export function obrasPorTema(tema: string): number {
  return BOOKS.filter((book) => book.tags.includes(tema)).length;
}

/** Recomendador local: respaldo del Oráculo cuando no hay clave de IA configurada. */
export function localRecommendations(query = '', mood = '', count = 3, temas: string[] = []): SearchResult[] {
  const trimmedQuery = query.trim();
  const matched = trimmedQuery
    ? new Map(searchBooks(trimmedQuery).map((result) => [result.book.id, result]))
    : new Map<string, SearchResult>();
  const moodPicks = ORACLE_MOODS.find((entry) => entry.label === mood)?.picks ?? [];

  // Cada ánimo tiene su lista curada; los temas elegidos y la consulta libre se
  // suman por puntuación, de modo que se puedan combinar varios a la vez.
  const results: SearchResult[] = BOOKS.map((book) => {
    const base = matched.get(book.id);
    const moodIndex = moodPicks.indexOf(book.id);
    const aciertosTema = temas.filter(
      (tema) => book.tags.includes(tema) || book.thematic === tema || book.category === tema
    );
    if (!base && moodIndex === -1 && aciertosTema.length === 0) return null;

    const bonusTema = Math.min(42, aciertosTema.length * 24);

    return {
      book,
      score: Math.min(99, (base?.score ?? 64) + (moodIndex >= 0 ? 40 - moodIndex * 6 : 0) + bonusTema),
      matchedConcepts: base?.matchedConcepts ?? (aciertosTema.length ? aciertosTema : [book.thematic]),
      reason: base?.reason ?? (aciertosTema.length ? `Temas elegidos: ${aciertosTema.join(', ')}` : '')
    };
  })
    .filter((result): result is SearchResult => result !== null)
    .sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    return BOOKS.filter((b) => b.badge === 'Recomendado' || (getValoracion(b.id)?.average ?? 0) >= 4.3)
      .slice(0, count)
      .map((book) => ({
        book,
        score: 82,
        matchedConcepts: [book.thematic],
        reason: 'Una de las obras que más recomendamos esta temporada.'
      }));
  }

  // Diversificamos: ni dos obras del mismo autor ni tres de la misma materia.
  const picked: SearchResult[] = [];
  const authors = new Set<string>();
  const themes = new Map<string, number>();

  for (const result of results) {
    const authorKey = normalizeText(result.book.author.split('(')[0]);
    const themeKey = result.book.thematic;
    if (authors.has(authorKey)) continue;
    if ((themes.get(themeKey) ?? 0) >= 2) continue;

    picked.push(result);
    authors.add(authorKey);
    themes.set(themeKey, (themes.get(themeKey) ?? 0) + 1);
    if (picked.length === count) break;
  }

  // Si la diversificación deja huecos, completamos con los siguientes mejor puntuados.
  if (picked.length < count) {
    for (const result of results) {
      if (picked.some((entry) => entry.book.id === result.book.id)) continue;
      picked.push(result);
      if (picked.length === count) break;
    }
  }

  return picked.map((result) => ({
    ...result,
    reason: buildLocalRationale(result)
  }));
}

function buildLocalRationale(result: SearchResult): string {
  const { book } = result;
  const firstLine = book.synopsis.split('. ')[0].replace(/\.$/, '');
  const tags = book.tags.slice(0, 2).join(' y ');
  return `${firstLine}. Se acerca por ${tags}.`;
}

export const SUGGESTED_QUERIES = [
  { label: 'Derechos de los pueblos indígenas', query: 'derechos humanos pueblos indigenas vitoria justicia universal' },
  { label: 'Lengua, gramática y poder', query: 'gramatica castellana humanismo nebrija imperio' },
  { label: 'Navegación y magnetismo', query: 'navegacion astronomica astrolabio brujula magnetismo latitud' },
  { label: 'Mística en el Tormes', query: 'mistica fray luis san juan tormes espiritualidad alma' },
  { label: 'Pícaros y hambre en Castilla', query: 'picaresca hambre lazarillo honra satira calle' },
  { label: 'Memoria de la posguerra', query: 'memoria posguerra salmantina infancia autoficcion' },
  { label: 'La IA y la escritura', query: 'inteligencia artificial lenguaje autoría creatividad etica' }
];

export interface OracleMood {
  label: string;
  /** Obras del catálogo que responden a ese ánimo, en orden de preferencia. */
  picks: string[];
}

export const ORACLE_MOODS: OracleMood[] = [
  {
    label: 'Melancolía y pregunta por la existencia',
    picks: [
      'unamuno-sentimiento-1912',
      'unamuno-niebla-1914',
      'sanjuan-cantico-1584',
      'martin-gaite-cuarto-1978',
      'luis-leon-nombres-1583'
    ]
  },
  {
    label: 'Misterio en la Salamanca del siglo XVI',
    picks: [
      'castanega-supersticiones-1529',
      'celestina-rojas-1499',
      'lazarillo-tormes-1554',
      'huarte-examen-1575'
    ]
  },
  {
    label: 'Poesía para una tarde de lluvia',
    picks: ['sanjuan-cantico-1584', 'villanueva-sonetos-2024', 'luis-leon-nombres-1583', 'unamuno-niebla-1914']
  },
  {
    label: 'Quiero entender la inteligencia artificial',
    picks: ['sotomayor-algoritmos-2025', 'debaran-redes-2026', 'huarte-examen-1575', 'nebrija-gramatica-1492']
  },
  {
    label: 'Memoria, familia y posguerra',
    picks: ['martin-gaite-cuarto-1978', 'unamuno-niebla-1914', 'usal-universidad-2023', 'unamuno-sentimiento-1912']
  },
  {
    label: 'Justicia, ley y conciencia',
    picks: ['vitoria-relectio-1539', 'suarez-tractatus-1612', 'castanega-supersticiones-1529', 'lazarillo-tormes-1554']
  },
  {
    label: 'Ciencia y asombro renacentista',
    picks: ['cortes-sphera-1551', 'huarte-examen-1575', 'leon-arbol-1605', 'nebrija-gramatica-1492']
  },
  {
    label: 'Algo breve para leer en el café',
    picks: ['villanueva-sonetos-2024', 'lazarillo-tormes-1554', 'martin-gaite-cuarto-1978', 'celestina-rojas-1499']
  }
];

export const ORACLE_MOOD_LABELS = ORACLE_MOODS.map((mood) => mood.label);
