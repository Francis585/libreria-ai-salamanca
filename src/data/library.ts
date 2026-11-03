import { WORKS_DATABASE, type Work } from './archive';
import { GENERAL, INFANTIL } from './general';
import novedadesData from './catalogo.json';

export type Category =
  | 'Clásicos Salmantinos'
  | 'Humanismo & Ciencia'
  | 'Narrativa Contemporánea'
  | 'Ensayo & Pensamiento IA'
  | 'Poesía'
  | 'Novela & Aventura'
  | 'Misterio & Policíaco'
  | 'Teatro'
  | 'Novedades'
  | 'Infantil & Juvenil';

export const CATEGORIES: Category[] = [
  'Clásicos Salmantinos',
  'Humanismo & Ciencia',
  'Narrativa Contemporánea',
  'Ensayo & Pensamiento IA',
  'Poesía',
  'Novela & Aventura',
  'Misterio & Policíaco',
  'Teatro',
  'Novedades',
  'Infantil & Juvenil',
];

export const EPOCHS = ['Siglo XV', 'Siglo XVI', 'Siglo XVII', 'Siglos XIX-XX', 'Siglo XXI'];

export const THEMES = [
  'Filosofía y Teología',
  'Lingüística y Gramática',
  'Cosmografía y Ciencias',
  'Literatura y Poesía',
  'Derecho y Ética',
  'Medicina y Botánica',
  'Memoria y Ciudad',
  'Tecnología y Sociedad',
];

export interface CoverPalette {
  from: string;
  to: string;
  accent: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  category: Category;
  price: number;
  format: string;
  pages: number;
  rating: number;
  synopsis: string;
  tags: string[];
  keywords: string[];

  epoch: string;
  thematic: string;
  collection?: string;
  accessionCode?: string;
  authorBio?: string;
  badge?: string;

  entities?: {
    characters: { name: string; role: string }[];
    places: { name: string; context: string }[];
    dates: { date: string; significance: string }[];
  };
  excerpt?: { chapter: string; original: string; linguisticNotes: string };
  metrics?: { lexicalRichness: number; densityScore: string; tone: string; digitizationLevel: string };

  relatedIds: string[];
  reasons: Record<string, string>;
  cover: CoverPalette;
}

/** Datos de venta y presentación para las obras del fondo histórico. */
interface RetailMeta {
  price: number;
  format: string;
  pages: number;
  rating: number;
  category: Category;
  thematic: string;
  badge?: string;
}

const RETAIL: Record<string, RetailMeta> = {
  'nebrija-gramatica-1492': {
    price: 32,
    format: 'Tapa dura · facsímil',
    pages: 320,
    rating: 4.9,
    category: 'Clásicos Salmantinos',
    thematic: 'Lingüística y Gramática',
    badge: 'Edición facsímil',
  },
  'celestina-rojas-1499': {
    price: 21.5,
    format: 'Rústica con solapas',
    pages: 368,
    rating: 4.7,
    category: 'Clásicos Salmantinos',
    thematic: 'Literatura y Poesía',
  },
  'vitoria-relectio-1539': {
    price: 26,
    format: 'Tapa dura · bilingüe',
    pages: 244,
    rating: 4.8,
    category: 'Clásicos Salmantinos',
    thematic: 'Derecho y Ética',
    badge: 'Edición bilingüe',
  },
  'luis-leon-nombres-1583': {
    price: 22,
    format: 'Tapa dura · estuche',
    pages: 340,
    rating: 4.8,
    category: 'Clásicos Salmantinos',
    thematic: 'Filosofía y Teología',
  },
  'cortes-sphera-1551': {
    price: 38,
    format: 'Tapa dura · gran formato',
    pages: 216,
    rating: 4.6,
    category: 'Humanismo & Ciencia',
    thematic: 'Cosmografía y Ciencias',
    badge: 'Reproducción de grabados',
  },
  'lazarillo-tormes-1554': {
    price: 14,
    format: 'Bolsillo',
    pages: 160,
    rating: 4.9,
    category: 'Clásicos Salmantinos',
    thematic: 'Literatura y Poesía',
  },
  'castanega-supersticiones-1529': {
    price: 24,
    format: 'Rústica · estudio crítico',
    pages: 288,
    rating: 4.5,
    category: 'Humanismo & Ciencia',
    thematic: 'Filosofía y Teología',
  },
  'huarte-examen-1575': {
    price: 27.5,
    format: 'Tapa dura',
    pages: 312,
    rating: 4.7,
    category: 'Humanismo & Ciencia',
    thematic: 'Medicina y Botánica',
  },
  'suarez-tractatus-1612': {
    price: 45,
    format: 'Tapa dura · edición de lujo',
    pages: 512,
    rating: 4.9,
    category: 'Clásicos Salmantinos',
    thematic: 'Derecho y Ética',
    badge: 'Edición de lujo',
  },
  'leon-arbol-1605': {
    price: 28,
    format: 'Tapa dura · ilustrada',
    pages: 276,
    rating: 4.6,
    category: 'Humanismo & Ciencia',
    thematic: 'Medicina y Botánica',
  },
  'sanjuan-cantico-1584': {
    price: 19.5,
    format: 'Tapa dura · bilingüe',
    pages: 204,
    rating: 5,
    category: 'Poesía',
    thematic: 'Literatura y Poesía',
  },
  'unamuno-sentimiento-1912': {
    price: 18.5,
    format: 'Bolsillo premium',
    pages: 296,
    rating: 4.9,
    category: 'Clásicos Salmantinos',
    thematic: 'Filosofía y Teología',
    badge: 'Más leído',
  },
};

const COVERS: Record<string, CoverPalette> = {
  'Lingüística y Gramática': { from: '#3f4a37', to: '#1d231a', accent: '#dcc98f' },
  'Literatura y Poesía': { from: '#8b4b2f', to: '#3a2118', accent: '#f0d9b8' },
  'Derecho y Ética': { from: '#35404c', to: '#1a222a', accent: '#d8c9a8' },
  'Filosofía y Teología': { from: '#4d4055', to: '#241d2a', accent: '#e3d4c2' },
  'Cosmografía y Ciencias': { from: '#2f4a4b', to: '#152526', accent: '#cfe0d6' },
  'Medicina y Botánica': { from: '#4c5339', to: '#242819', accent: '#e2ddb6' },
  'Memoria y Ciudad': { from: '#7b5c48', to: '#33231b', accent: '#f0dcc6' },
  'Tecnología y Sociedad': { from: '#3b3a44', to: '#1b1a22', accent: '#d9d3e2' },
};

function fromArchive(work: Work): Book {
  const retail = RETAIL[work.id];
  return {
    id: work.id,
    title: work.title,
    author: work.author,
    year: work.year,
    category: retail.category,
    price: retail.price,
    format: retail.format,
    pages: retail.pages,
    rating: retail.rating,
    synopsis: work.aiSummary,
    tags: work.thematicTags,
    keywords: work.semanticKeywords,
    epoch: work.epoch,
    thematic: work.thematic,
    collection: work.collection,
    accessionCode: work.accessionCode,
    authorBio: work.authorBio,
    badge: retail.badge,
    entities: work.keyEntities,
    excerpt: work.sampleExcerpt,
    metrics: work.analysisMetrics,
    relatedIds: work.relatedWorkIds,
    reasons: work.recommendationReasons,
    cover: COVERS[work.thematic] ?? COVERS['Literatura y Poesía'],
  };
}

const CONTEMPORARY: Book[] = [
  {
    id: 'unamuno-niebla-1914',
    title: 'Niebla',
    author: 'Miguel de Unamuno',
    year: 1914,
    category: 'Clásicos Salmantinos',
    price: 18.5,
    format: 'Tapa dura de coleccionista',
    pages: 288,
    rating: 4.9,
    synopsis:
      'La nivola que rompió la novela española del siglo XX: Augusto Pérez descubre que quizá no es más que un personaje, y se atreve a discutir con su propio autor en el despacho del rectorado. Salamanca, la niebla y la angustia de existir.',
    tags: ['Nivola', 'Existencialismo', 'Metaficción', 'Salamanca', 'Unamuno'],
    keywords: ['niebla', 'unamuno', 'augusto', 'existencia', 'metaficcion', 'autoria', 'salamanca', 'muerte', 'razon', 'amor', 'victor', 'ficcion'],
    epoch: 'Siglos XIX-XX',
    thematic: 'Literatura y Poesía',
    collection: 'Casa Museo Unamuno · Universidad de Salamanca',
    accessionCode: 'BGHS-NOV-1914-UNA',
    authorBio: 'Rector perpetuo de la Universidad de Salamanca, novelista, poeta y agitador de conciencias.',
    badge: 'Recomendado',
    entities: {
      characters: [
        { name: 'Augusto Pérez', role: 'Protagonista sin oficio ni destino que se sabe personaje' },
        { name: 'Miguel de Unamuno', role: 'Autor que aparece como personaje y decreta la muerte de su criatura' },
        { name: 'Eugenia Domingo del Arco', role: 'Pianista de quien Augusto se enamora sin ser correspondido' },
      ],
      places: [
        { name: 'Salamanca', context: 'Calles, casino y despacho rectoral por donde deambula Augusto' },
        { name: 'Casa de los Pérez', context: 'Interior burgués donde la criatura espera un destino que no le pertenece' },
      ],
      dates: [
        { date: '1914', significance: 'Publicación de Niebla en la editorial Renacimiento' },
        { date: '1936', significance: '«Venceréis, pero no convenceréis»: el último gran gesto público de Unamuno' },
      ],
    },
    excerpt: {
      chapter: 'Capítulo XXXI: Unamuno dialoga con su criatura',
      original:
        '«No, no sueño; estoy despierto. ¡Soy yo quien te sueña! ... Tú no eres más que un ente de ficción, un personaje de novela, y como tal no puedes morirte sino cuando yo quiera.»',
      linguisticNotes: 'Prosa aforística que alterna el monólogo interior con el diálogo filosófico directo.',
    },
    metrics: {
      lexicalRichness: 93,
      densityScore: 'Alta densidad reflexiva (320 aforismos existenciales)',
      tone: 'Agónico, irónico y confesional',
      digitizationLevel: 'Transcripción cotejada con la edición príncipe de 1914',
    },
    relatedIds: ['unamuno-sentimiento-1912', 'luis-leon-nombres-1583', 'martin-gaite-cuarto-1978'],
    reasons: {
      'unamuno-sentimiento-1912': 'El ensayo donde Unamuno formula la agonía que Niebla dramatiza.',
      'luis-leon-nombres-1583': 'Los dos grandes diálogos salmantinos sobre el alma, con tres siglos de distancia.',
      'martin-gaite-cuarto-1978': 'Otra salmantina que convierte la memoria y la ficción en un mismo laberinto.',
    },
    cover: { from: '#6b5233', to: '#2b2115', accent: '#f0dcb4' },
  },
  {
    id: 'martin-gaite-cuarto-1978',
    title: 'El cuarto de atrás',
    author: 'Carmen Martín Gaite',
    year: 1978,
    category: 'Narrativa Contemporánea',
    price: 20.5,
    format: 'Bolsillo premium',
    pages: 232,
    rating: 4.9,
    synopsis:
      'Una noche de insomnio, una mujer conversa con un visitante misterioso y reconstruye la Salamanca de la posguerra: la tienda de su padre, los cuadernos de niña, la guerra y la escritura como única forma de ordenar el pasado.',
    tags: ['Memoria', 'Posguerra', 'Metaficción', 'Salamanca', 'Premio Nacional de Literatura'],
    keywords: ['memoria', 'posguerra', 'salamanca', 'martin gaite', 'autoficcion', 'infancia', 'guerra civil', 'escritura', 'mujer', 'fantastico', 'entrevista'],
    epoch: 'Siglos XIX-XX',
    thematic: 'Memoria y Ciudad',
    collection: 'Narrativa salmantina contemporánea',
    accessionCode: 'BGHS-NOV-1978-GAI',
    authorBio: 'Escritora salmantina, Premio Príncipe de Asturias de las Letras y voz esencial de la narrativa española del XX.',
    entities: {
      characters: [
        { name: 'Carmen', role: 'Narradora que confunde recuerdo, sueño y escritura' },
        { name: 'El hombre de negro', role: 'Interlocutor ambiguo que la empuja a recordar' },
      ],
      places: [
        { name: 'Salamanca', context: 'La ciudad de la infancia, la Plaza Mayor y la tienda familiar' },
        { name: 'El cuarto de atrás', context: 'Espacio de la memoria donde se guardan los cuadernos y los miedos' },
      ],
      dates: [{ date: '1978', significance: 'Publicación y Premio Nacional de Literatura' }],
    },
    relatedIds: ['unamuno-niebla-1914', 'unamuno-sentimiento-1912'],
    reasons: {
      'unamuno-niebla-1914': 'Comparte la pregunta por quién escribe y quién es escrito, desde la otra orilla del siglo.',
      'unamuno-sentimiento-1912': 'Dos formas salmantinas de mirar la muerte, la memoria y la identidad.',
    },
    cover: { from: '#7b5c48', to: '#33231b', accent: '#f0dcc6' },
  },
  {
    id: 'sotomayor-algoritmos-2025',
    title: 'Algoritmos de la poesía y el pensamiento',
    author: 'Elena Sotomayor',
    year: 2025,
    category: 'Ensayo & Pensamiento IA',
    price: 24.9,
    format: 'Tapa dura',
    pages: 310,
    rating: 4.7,
    synopsis:
      'Un puente entre la retórica clásica que se enseñaba en las aulas de Salamanca y los modelos de lenguaje que hoy escriben, traducen y clasifican. Qué se gana, qué se pierde y qué sigue siendo irreductiblemente humano en la lectura.',
    tags: ['Inteligencia artificial', 'Retórica', 'Humanismo digital', 'Ética', 'Lenguaje'],
    keywords: ['inteligencia artificial', 'algoritmo', 'poesia', 'lenguaje', 'modelos', 'etica', 'humanismo', 'retorica', 'creatividad', 'tecnologia', 'futuro', 'lectura'],
    epoch: 'Siglo XXI',
    thematic: 'Tecnología y Sociedad',
    collection: 'Ensayos de la Rúa Mayor',
    accessionCode: 'LAS-ENS-2025-SOT',
    authorBio: 'Filóloga computacional y profesora invitada en el Máster de Humanidades Digitales.',
    badge: 'Novedad',
    entities: {
      characters: [{ name: 'Elena Sotomayor', role: 'Autora y filóloga computacional' }],
      places: [{ name: 'Salamanca', context: 'Laboratorio de humanidades digitales de la Rúa Mayor' }],
      dates: [{ date: '2025', significance: 'Primera edición, con apéndice sobre modelos abiertos' }],
    },
    relatedIds: ['debaran-redes-2026', 'nebrija-gramatica-1492', 'unamuno-sentimiento-1912'],
    reasons: {
      'debaran-redes-2026': 'El complemento técnico: cómo funcionan por dentro los modelos que este ensayo interpreta.',
      'nebrija-gramatica-1492': 'La primera gramática de una lengua romance frente a la gramática estadística del siglo XXI.',
      'unamuno-sentimiento-1912': 'La pregunta por la conciencia y la autoría, formulada ahora ante una máquina.',
    },
    cover: { from: '#3b3a44', to: '#1b1a22', accent: '#d9d3e2' },
  },
  {
    id: 'debaran-redes-2026',
    title: 'Redes neuronales y creatividad literaria',
    author: 'Marcos Al Debaran',
    year: 2026,
    category: 'Ensayo & Pensamiento IA',
    price: 26.5,
    format: 'Tapa dura',
    pages: 290,
    rating: 4.6,
    synopsis:
      'Cómo los modelos de lenguaje amplían el borrador, el archivo y la traducción sin sustituir la decisión de escribir. Un manual para libreros, editores y lectores que quieren entender la herramienta antes de opinar sobre ella.',
    tags: ['Modelos de lenguaje', 'Edición', 'Creatividad', 'Traducción', 'Oficio'],
    keywords: ['redes neuronales', 'modelos de lenguaje', 'ia', 'edicion', 'creatividad', 'traduccion', 'escritura', 'prompt', 'archivo', 'tecnologia'],
    epoch: 'Siglo XXI',
    thematic: 'Tecnología y Sociedad',
    collection: 'Ensayos de la Rúa Mayor',
    accessionCode: 'LAS-ENS-2026-DEB',
    authorBio: 'Ingeniero de aprendizaje automático y colaborador del taller de escritura de la librería.',
    entities: {
      characters: [{ name: 'Marcos Al Debaran', role: 'Autor e ingeniero de aprendizaje automático' }],
      places: [{ name: 'Taller de la librería', context: 'Donde se prueban los borradores asistidos con autores locales' }],
      dates: [{ date: '2026', significance: 'Edición revisada tras los talleres de invierno' }],
    },
    relatedIds: ['sotomayor-algoritmos-2025', 'huarte-examen-1575'],
    reasons: {
      'sotomayor-algoritmos-2025': 'El marco humanístico del mismo fenómeno técnico.',
      'huarte-examen-1575': 'Huarte ya se preguntaba cómo medir el ingenio de cada persona para orientarla.',
    },
    cover: { from: '#3b3a44', to: '#1b1a22', accent: '#d9d3e2' },
  },
  {
    id: 'villanueva-sonetos-2024',
    title: 'Sonetos de la Plaza Mayor',
    author: 'Tomás de Villanueva',
    year: 2024,
    category: 'Poesía',
    price: 16,
    format: 'Tapa blanda',
    pages: 128,
    rating: 4.8,
    synopsis:
      'Cuarenta y dos sonetos escritos a la luz de las seis de la tarde sobre la piedra de Villamayor. El amor tardío, el café de después de comer y una ciudad que se apaga despacio, verso a verso.',
    tags: ['Poesía contemporánea', 'Salamanca', 'Soneto', 'Paisaje urbano'],
    keywords: ['poesia', 'sonetos', 'plaza mayor', 'salamanca', 'amor', 'piedra', 'luz', 'tarde', 'ciudad', 'melancolia'],
    epoch: 'Siglo XXI',
    thematic: 'Literatura y Poesía',
    collection: 'Poesía de la Rúa Mayor',
    accessionCode: 'LAS-POE-2024-VIL',
    authorBio: 'Poeta y librero de viejo, autor de tres cuadernos sobre la ciudad.',
    entities: {
      characters: [{ name: 'Tomás de Villanueva', role: 'Autor y librero de viejo' }],
      places: [{ name: 'Plaza Mayor de Salamanca', context: 'Escenario y protagonista de todo el libro' }],
      dates: [{ date: '2024', significance: 'Primera edición, ilustrada con dibujos a lápiz' }],
    },
    relatedIds: ['sanjuan-cantico-1584', 'unamuno-niebla-1914'],
    reasons: {
      'sanjuan-cantico-1584': 'La misma atención al paisaje y al silencio, cinco siglos después.',
      'unamuno-niebla-1914': 'Salamanca como estado del alma, no solo como escenario.',
    },
    cover: { from: '#8a6a2f', to: '#3a2b12', accent: '#f4e4bb' },
  },
  {
    id: 'usal-universidad-2023',
    title: 'La Universidad del saber libre',
    author: 'Colectivo Histórico USAL',
    year: 2023,
    category: 'Humanismo & Ciencia',
    price: 35,
    format: 'Tapa dura · gran formato',
    pages: 450,
    rating: 4.9,
    synopsis:
      'Ocho siglos de aulas, manuscritos y disputas en el Estudio Salmantino, contados a través de sus bibliotecas: del códice iluminado al repositorio digital. Un volumen ilustrado para leer con calma y consultar siempre.',
    tags: ['Historia', 'Universidad de Salamanca', 'Manuscritos', 'Bibliotecas'],
    keywords: ['universidad', 'salamanca', 'historia', 'biblioteca', 'manuscritos', 'estudio', 'ocho siglos', 'archivo', 'humanismo', 'ciencia'],
    epoch: 'Siglos XIX-XX',
    thematic: 'Memoria y Ciudad',
    collection: 'Biblioteca General Histórica',
    accessionCode: 'BGHS-HIS-2023-USAL',
    authorBio: 'Equipo de investigación del Archivo y Biblioteca Histórica de la Universidad.',
    entities: {
      characters: [{ name: 'Colectivo Histórico USAL', role: 'Autores y documentalistas del archivo universitario' }],
      places: [{ name: 'Biblioteca General Histórica', context: 'Sede del fondo antiguo y de la sala de manuscritos' }],
      dates: [{ date: '2023', significance: 'Publicación conmemorativa del octavo centenario del Estudio' }],
    },
    relatedIds: ['nebrija-gramatica-1492', 'vitoria-relectio-1539', 'suarez-tractatus-1612'],
    reasons: {
      'nebrija-gramatica-1492': 'El incunable que abrió la colección histórica de la Universidad.',
      'vitoria-relectio-1539': 'La lección que convirtió el aula salmantina en conciencia de Europa.',
      'suarez-tractatus-1612': 'La culminación jurídica de la Escuela de Salamanca.',
    },
    cover: { from: '#5a4a38', to: '#241d16', accent: '#eadfc8' },
  },
];

const PALETAS: CoverPalette[] = [
  { from: '#3f4a5c', to: '#181d24', accent: '#e3ecf4' },
  { from: '#5c4033', to: '#241811', accent: '#f3e2cd' },
  { from: '#3f5c47', to: '#18241c', accent: '#dff0e3' },
  { from: '#5c4a3f', to: '#241d18', accent: '#f0e3d3' },
  { from: '#4a3f5c', to: '#1d1824', accent: '#e9e0f4' },
];

/** Catálogo actualizable (catalogo.json): novedades y fondo del siglo XXI. */
const CATALOGO: Book[] = (novedadesData.libros as any[]).map((libro, index) => ({
  id: libro.id,
  title: libro.titulo,
  author: libro.autor,
  year: Number(libro.anio),
  category: libro.categoria as Category,
  price: Number(libro.precio),
  format: libro.formato ?? 'Rústica con solapas',
  pages: Number(libro.paginas ?? 300),
  rating: Number(libro.valoracion ?? 4.5),
  synopsis: libro.sinopsis,
  tags: libro.etiquetas ?? [],
  keywords: libro.claves ?? [],
  epoch: 'Siglo XXI',
  thematic: libro.tematica ?? 'Literatura y Poesía',
  collection: libro.editorial ? `${libro.editorial} · ${libro.anio}` : undefined,
  accessionCode: `LAS-${String(libro.anio).slice(2)}-${libro.id.split('-')[0].toUpperCase().slice(0, 3)}`,
  authorBio: undefined,
  badge: libro.categoria === 'Novedades' ? 'Novedad' : undefined,
  relatedIds: [],
  reasons: {},
  cover: PALETAS[index % PALETAS.length],
}));

export const BOOKS: Book[] = [
  ...WORKS_DATABASE.map(fromArchive),
  ...CONTEMPORARY,
  ...GENERAL,
  ...INFANTIL,
  ...CATALOGO,
];

export const BOOKS_BY_ID: Record<string, Book> = Object.fromEntries(BOOKS.map((b) => [b.id, b]));

export const FEATURED_ID = 'unamuno-niebla-1914';

export function getBook(id: string): Book | undefined {
  return BOOKS_BY_ID[id];
}

export function booksByIds(ids: string[]): Book[] {
  return ids.map((id) => BOOKS_BY_ID[id]).filter(Boolean);
}

/** Un color por materia: tiñe el punto de los filtros y la etiqueta de cada ficha. */
export const CATEGORY_ACCENTS: Record<Category, string> = {
  'Clásicos Salmantinos': '#3b3bf5',
  'Humanismo & Ciencia': '#0f766e',
  'Narrativa Contemporánea': '#4f46e5',
  'Ensayo & Pensamiento IA': '#1d4ed8',
  Poesía: '#a21caf',
  'Novela & Aventura': '#0e7490',
  'Misterio & Policíaco': '#3730a3',
  Teatro: '#c2410c',
  Novedades: '#3b3bf5',
  'Infantil & Juvenil': '#15803d',
};
