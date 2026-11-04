/**
 * API de la librería · una sola función con enrutado interno.
 *
 * Motivo: el runtime Node de Vercel (con package.json "type":"module") transpila
 * cada archivo de /api sin empaquetar los módulos locales, así que cualquier
 * helper compartido en otro archivo se quedaba fuera de /var/task. Manteniendo
 * todo en un único módulo, el despliegue no depende del bundler.
 *
 * Rutas:
 *   GET  /api/stock
 *   GET  /api/disponibilidad
 *   POST /api/pedidos
 *   POST /api/reservas
 *   POST /api/newsletter
 *   GET  /api/admin/resumen   (Authorization: Bearer ADMIN_SECRET)
 */
import { neon } from '@neondatabase/serverless';

export const maxDuration = 30;
import { createHash, timingSafeEqual } from 'node:crypto';

const sql = neon(process.env.DATABASE_URL ?? '');

/* ------------------------------------------------------------------ utils */

function json(res: any, status: number, payload: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res: any, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  return json(res, 405, { error: 'method_not_allowed' });
}

function readBody(req: any): Record<string, any> {
  try {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    if (req.body && typeof req.body === 'object') return req.body;
  } catch {
    /* body inválido */
  }
  return {};
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value) && value.length <= 254;
}

function isDate(value: string, maxDaysAhead = 120): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() + maxDaysAhead * 86_400_000);
  return date.getTime() >= today.getTime() - 86_400_000 && date.getTime() <= limit.getTime();
}

const buckets = new Map<string, { count: number; reset: number }>();

function rateLimit(req: any, key: string, max = 12, windowMs = 60_000): boolean {
  const ip =
    (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'desconocida';
  const id = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(id);

  if (!bucket || bucket.reset < now) {
    buckets.set(id, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

function validAdminToken(header: unknown): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || typeof header !== 'string') return false;

  const provided = header.replace(/^Bearer\s+/i, '').trim();
  if (!provided) return false;

  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(secret).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* --------------------------------------------------------------- correo */

/**
 * Todo correo se compone y se guarda en `outbox` ANTES de intentar enviarse.
 *
 * Motivos: (1) se puede enseñar y auditar sin depender de un proveedor,
 * (2) un fallo del correo nunca rompe una reserva ya confirmada,
 * (3) si no hay proveedor configurado el mensaje queda como 'simulado' y se ve
 *     igualmente en el admin, que es justo lo que hace falta en una demo.
 *
 * Proveedor: Resend por HTTP (sin dependencias). Variables:
 * Proveedores (el primero configurado gana):
 *   RESEND_API_KEY  + EMAIL_FROM   · Resend por HTTP
 *   GMAIL_USER      + GMAIL_APP_PASSWORD · Gmail por SMTP (contraseña de aplicación)
 * Sin ninguno de los dos no se envía nada: el correo queda en estado 'simulado'.
 */

const EMAIL_BRAND = {
  ink: '#2D2822',
  paper: '#F5F1E8',
  card: '#FFFFFF',
  clay: '#A8442A',
  gold: '#B08A3E',
  muted: '#6B6259'
};

type EmailContent = { titulo: string; entradilla: string; bloques: string[]; cierre?: string };

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emailHtml({ titulo, entradilla, bloques, cierre }: EmailContent): string {
  const b = EMAIL_BRAND;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:${b.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${b.paper};padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:${b.card};border:1px solid #E4DCCB;border-radius:10px;overflow:hidden;font-family:Georgia,'Times New Roman',serif;color:${b.ink};">
    <tr><td style="padding:22px 32px 18px;border-bottom:1px solid #E4DCCB;">
      <div style="font:600 13px/1.2 Georgia,serif;letter-spacing:.16em;text-transform:uppercase;">Librería AI Salamanca</div>
      <div style="font:400 10px/1.6 -apple-system,Segoe UI,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${b.muted};margin-top:4px;">Librería online · envíos a toda España</div>
    </td></tr>
    <tr><td style="padding:28px 32px 8px;">
      <h1 style="margin:0 0 10px;font:400 26px/1.2 Georgia,serif;color:${b.ink};">${esc(titulo)}</h1>
      <p style="margin:0 0 18px;font:400 15px/1.6 -apple-system,Segoe UI,sans-serif;color:${b.muted};">${esc(entradilla)}</p>
      ${bloques
        .map(
          (bloque) =>
            `<div style="margin:0 0 16px;padding:14px 16px;background:#FBF8F1;border-left:2px solid ${b.gold};font:400 14px/1.65 -apple-system,Segoe UI,sans-serif;color:${b.ink};">${bloque}</div>`
        )
        .join('\n      ')}
      ${
        cierre
          ? `<p style="margin:22px 0 0;font:400 14px/1.6 -apple-system,Segoe UI,sans-serif;color:${b.muted};">${esc(cierre)}</p>`
          : ''
      }
    </td></tr>
    <tr><td style="padding:18px 32px 26px;">
      <a href="https://libreria-ai-salamanca.vercel.app/#catalogo" style="display:inline-block;padding:11px 18px;background:${b.ink};color:${b.paper};text-decoration:none;border-radius:6px;font:600 13px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.04em;">Ver el catálogo</a>
    </td></tr>
    <tr><td style="padding:16px 32px 24px;border-top:1px solid #E4DCCB;font:400 11px/1.7 -apple-system,Segoe UI,sans-serif;color:${b.muted};">
      Librería AI Salamanca · tienda online · 923 21 40 14<br>
      Este correo se ha generado automáticamente. Si algo no cuadra, responde y lo lee una persona.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

type EmailDraft = { tipo: string; destinatario: string; asunto: string; html: string; texto: string };

function draftTertulia(nombre: string, evento: string, plazasRestantes: number): EmailDraft {
  const titulo = 'Tu plaza está reservada';
  const bloques = [
    `<strong>${esc(evento)}</strong><br>Quedan ${plazasRestantes} ${plazasRestantes === 1 ? 'plaza' : 'plazas'} libres para ese encuentro.`,
    'Te esperamos unos minutos antes en la bodega. Si no puedes venir, avísanos y liberamos la plaza: hay lista de espera.'
  ];
  return {
    tipo: 'reserva_tertulia',
    destinatario: '',
    asunto: `Reserva confirmada · ${evento}`,
    html: emailHtml({
      titulo,
      entradilla: `${nombre}, te guardamos sitio.`,
      bloques,
      cierre: 'La fecha y la hora están en la agenda de la web, en Tertulias.'
    }),
    texto: `${nombre}, te guardamos sitio para «${evento}». Quedan ${plazasRestantes} plazas. Si no puedes venir, avísanos. Librería AI Salamanca.`
  };
}

function draftMesa(nombre: string, fecha: string, hora: string, personas: number): EmailDraft {
  return {
    tipo: 'reserva_mesa',
    destinatario: '',
    asunto: `Mesa reservada · ${fecha} a las ${hora}`,
    html: emailHtml({
      titulo: 'Mesa reservada',
      entradilla: `${nombre}, aquí tienes el enlace de la videollamada.`,
      bloques: [
        `<strong>${esc(fecha)} · ${esc(hora)}</strong><br>${personas} ${personas === 1 ? 'persona' : 'personas'}, bajo los arcos del patio.`,
        'Se puede leer, se puede callar y se puede discutir de libros. El café lo tostamos a cuatro calles de aquí.'
      ],
      cierre: 'Si cambiáis de plan, responded a este correo y lo movemos.'
    }),
    texto: `${nombre}, mesa reservada el ${fecha} a las ${hora} para ${personas}. Café Melchor Cano, Rúa Mayor 14.`
  };
}

function draftBienvenida(email: string): EmailDraft {
  return {
    tipo: 'newsletter_alta',
    destinatario: email,
    asunto: 'Aquí empieza el boletín de la librería',
    html: emailHtml({
      titulo: 'Bienvenido al boletín',
      entradilla: 'Tres citas al mes, nunca más. Esa es la promesa.',
      bloques: [
        'Cada mes te contamos qué hemos recibido, qué se está leyendo en el café y qué tertulia viene.',
        'Sin ruido, sin venta agresiva y sin compartir tu correo con nadie.'
      ],
      cierre: 'Si algún día quieres salir, basta con responder «baja» a cualquier envío.'
    }),
    texto: 'Bienvenido al boletín de Librería AI Salamanca. Tres citas al mes, nunca más. Responde «baja» para salir.'
  };
}

async function queueEmail(draft: EmailDraft, destinatario: string): Promise<number | null> {
  try {
    const rows = await sql.query(
      `insert into outbox (tipo, destinatario, asunto, html, texto, estado)
       values ($1, $2, $3, $4, $5, 'encolado') returning id`,
      [draft.tipo, destinatario, draft.asunto, draft.html, draft.texto]
    );
    const id = Number(rows[0]?.id);
    await deliverEmail(id);
    return id;
  } catch (error) {
    // Un correo que falla no puede tumbar una reserva ya confirmada.
    console.error('[outbox]', errorMessage(error));
    return null;
  }
}

const proveedorCorreo = (): 'resend' | 'smtp' | null => {
  if (process.env.RESEND_API_KEY) return 'resend';
  if ((process.env.SMTP_USER || process.env.GMAIL_USER) && (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD))
    return 'smtp';
  return null;
};

async function deliverEmail(id: number): Promise<void> {
  if (!Number.isFinite(id)) return;

  const resendKey = process.env.RESEND_API_KEY;
  // Credenciales SMTP genéricas: sirven para Gmail, Brevo, Mailjet, SendGrid...
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const gmailReady = Boolean(smtpUser && smtpPass);

  if (!resendKey && !gmailReady) {
    await sql
      .query(`update outbox set estado = 'simulado', error = $2 where id = $1`, [
        id,
        'Sin proveedor configurado (falta RESEND_API_KEY o GMAIL_USER + GMAIL_APP_PASSWORD): el correo queda compuesto y visible en el admin.'
      ])
      .catch(() => undefined);
    return;
  }

  try {
    const rows = await sql.query(`select destinatario, asunto, html, texto from outbox where id = $1`, [id]);
    const mail = rows[0];
    if (!mail) return;

    if (resendKey) {
      const from = process.env.EMAIL_FROM || 'Librería AI Salamanca <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [mail.destinatario],
          subject: mail.asunto,
          html: mail.html,
          text: mail.texto ?? undefined
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`resend_${response.status}: ${detail}`);
      }

      await sql.query(`update outbox set estado = 'enviado', proveedor = 'resend', enviado_en = now() where id = $1`, [id]);
      return;
    }

    // Gmail por SMTP. Requiere contraseña de aplicación (no la del correo).
    const { default: nodemailer } = await import('nodemailer');
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const transporte = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user: smtpUser as string, pass: smtpPass as string }
    });

    await transporte.sendMail({
      from: process.env.SMTP_FROM || `"Librería AI Salamanca" <${smtpUser}>`,
      to: mail.destinatario,
      subject: mail.asunto,
      html: mail.html,
      text: mail.texto ?? undefined
    });

    await sql.query(`update outbox set estado = 'enviado', proveedor = 'smtp', enviado_en = now() where id = $1`, [id]);
  } catch (error) {
    await sql
      .query(`update outbox set estado = 'error', proveedor = $3, error = $2 where id = $1`, [
        id,
        errorMessage(error).slice(0, 300),
        resendKey ? 'resend' : 'smtp'
      ])
      .catch(() => undefined);
  }
}

async function handleAdminEmails(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!validAdminToken(req.headers?.authorization)) return json(res, 401, { error: 'no_autorizado' });

  try {
    const rows = await sql.query(
      `select id, tipo, destinatario, asunto, estado, proveedor, error, creado_en, enviado_en, html
         from outbox order by creado_en desc limit 40`,
      []
    );
    const proveedor = proveedorCorreo();
    return json(res, 200, {
      proveedor,
      remitente:
        process.env.EMAIL_FROM ||
        (proveedor === 'smtp'
          ? process.env.SMTP_FROM || `Librería AI Salamanca <${process.env.SMTP_USER || process.env.GMAIL_USER}>`
          : 'Librería AI Salamanca <onboarding@resend.dev>'),
      correos: rows.map((row: any) => ({ ...row, id: Number(row.id) }))
    });
  } catch (error) {
    console.error('[admin-emails]', error);
    return json(res, 500, { error: 'error_interno', correos: [] });
  }
}

/** Genera los tres correos de la casa para revisarlos sin crear datos falsos. */
async function handleEmailsPrueba(req: any, res: any) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!validAdminToken(req.headers?.authorization)) return json(res, 401, { error: 'no_autorizado' });

  try {
    const cuerpo = readBody(req);
    const destino = text(cuerpo.email, 254).toLowerCase();
    if (!isEmail(destino)) return json(res, 400, { error: 'email_invalido' });

    const nombre = text(cuerpo.nombre, 120) || 'Lectora';
    const draft = [
      draftTertulia(nombre, 'El Oráculo: ¿puede una máquina escribir un soneto?', 9),
      draftMesa(nombre, '2026-11-21', '18:30', 2),
      draftBienvenida(destino)
    ];

    const ids: number[] = [];
    for (const item of draft) {
      const id = await queueEmail(item, destino);
      if (id) ids.push(id);
    }

    return json(res, 201, {
      ok: true,
      ids,
      proveedor: proveedorCorreo(),
      mensaje: proveedorCorreo()
        ? 'Tres correos compuestos y entregados al proveedor.'
        : 'Tres correos compuestos y guardados. Sin proveedor configurado quedan como «simulado» y se leen en esta misma pantalla.'
    });
  } catch (error) {
    console.error('[emails-prueba]', error);
    return json(res, 500, { error: 'error_interno' });
  }
}

/** Reintenta la entrega de un correo ya compuesto (útil con proveedor recién configurado). */
async function handleEmailReenviar(req: any, res: any) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!validAdminToken(req.headers?.authorization)) return json(res, 401, { error: 'no_autorizado' });

  const cuerpo = readBody(req);
  const id = Number(cuerpo.id);
  if (!Number.isInteger(id) || id <= 0) return json(res, 400, { error: 'id_invalido' });
  if (!proveedorCorreo()) {
    return json(res, 409, {
      error: 'sin_proveedor',
      mensaje: 'No hay proveedor configurado: el correo se puede leer, pero no entregar.'
    });
  }

  await deliverEmail(id);

  const rows = await sql.query(
    `select id, tipo, destinatario, asunto, estado, proveedor, error, creado_en, enviado_en
       from outbox where id = $1`,
    [id]
  );
  if (!rows[0]) return json(res, 404, { error: 'no_existe' });
  return json(res, 200, { ok: true, correo: { ...rows[0], id: Number(rows[0].id) } });
}

/* ------------------------------------------------------------ novedades */

/**
 * Novedades automáticas.
 *
 * `GET /api/novedades` devuelve lo último que ha entrado de la fuente externa.
 * `POST /api/novedades-sync` la consulta y guarda lo nuevo. Lo llama un cron
 * de Vercel cada semana (cabecera x-vercel-cron) o el admin a mano.
 *
 * Fuente: Open Library, sin clave y sin cuota compartida.
 */

// Editoriales de referencia en castellano. Pedir por editorial es lo único que
// devuelve novedades reales: el "sort=new" global está lleno de autoeditados.
/**
 * Editoriales españolas que se consultan en la fuente externa.
 *
 * El catálogo de la tienda es el fondo de la sala (46 obras con ficha propia);
 * esto de detrás es todo lo demás que se publica en castellano y se puede
 * encargar: novedades, fondo vivo y traducciones de autores extranjeros. La
 * consulta filtra por `language:spa`, así que lo que entra es siempre la
 * edición española, venga el original de donde venga.
 */
const EDITORIALES = [
  'Anagrama', 'Tusquets', 'Seix Barral', 'Siruela', 'Alfaguara', 'Destino',
  'Salamandra', 'Lumen', 'Ediciones B', 'Galaxia Gutenberg', 'Libros del Asteroide',
  'Impedimenta', 'Planeta', 'Espasa', 'Booket', 'Austral', 'Alianza Editorial',
  'Cátedra', 'Crítica', 'Paidós', 'Ariel', 'Debate', 'Random House', 'Plaza & Janés',
  'Grijalbo', 'Bruguera', 'Reservoir Books', 'Blackie Books', 'Periférica', 'Nórdica Libros',
  'Minúscula', 'Acantilado', 'Pre-Textos', 'Renacimiento', 'Valdemar', 'Páginas de Espuma',
  'Candaya', 'Capitán Swing', 'Libros del K.O.', 'RBA', 'DeBolsillo', 'Suma de Letras',
  'Crossbooks', 'Montena', 'Nube de Tinta', 'SM', 'Anaya', 'Edebé', 'Kalandraka', 'Nube de Tinta'
];

/**
 * Open Library marca el idioma a nivel de OBRA, no de edición: una novela
 * francesa de Lumen entra como `spa` porque existe una traducción. El resultado
 * era un escaparate con «Et la joie de vivre» y «Les Belles Promesses».
 *
 * Hasta que la fuente lo arregle, la puerta la cierra el título: si lleva
 * marcadores claros de francés, inglés, italiano o alemán, no entra.
 */
const MARCAS_OTRO_IDIOMA = new RegExp(
  [
    // francés (sin «sur», «entre», «plus» ni «tout»: son castellanas normales)
    String.raw`\b(les|des|aux|une|belles|joie|dans|pour|avec|nuit|monde|femme|homme|fille|guerre|amour|sang|ciel|petite|maison|années|temps|jamais|encore|visit[ea]|catastrophique)\b`,
    // inglés
    String.raw`\b(the|of|and|with|from|into|night|house|girl|boy|world|book|story|love|war|dead|secret|sister|wife|husband|river|mountain|winter|summer|never|always|between|after|before|little|long|last|first|psycho|victorian)\b`,
    // italiano / alemán
    String.raw`\b(il|gli|della|delle|degli|notte|mondo|vita|amore|guerra|und|der|die|das|nacht|welt|haus|anniversario)\b`
  ].join('|'),
  'i'
);

/** Diacríticos que el castellano no usa y sí el francés, el italiano o el portugués. */
const DIACRITICOS_AJENOS = /[èêàìòùçÈÊÀÌÒÙÇ]/;

/** Elisión tipo «l'anniversario», «d'amore»: en castellano no existe. */
const ELISION_AJENA = /(^|\s)[ldj]'/i;

function esTituloEnEspanol(titulo: string): boolean {
  const limpio = String(titulo ?? '').trim();
  if (!limpio) return false;
  // La ñ y los signos de apertura solo existen en castellano
  if (/[ñÑ¿¡]/.test(limpio)) return true;
  if (DIACRITICOS_AJENOS.test(limpio)) return false;
  if (ELISION_AJENA.test(limpio)) return false;
  return !MARCAS_OTRO_IDIOMA.test(limpio);
}

const feedUrl = (editorial: string, desde: number, hasta: number, limite: number, pagina = 1) =>
  `https://openlibrary.org/search.json?q=${encodeURIComponent(
    `publisher:"${editorial}" language:spa first_publish_year:[${desde} TO ${hasta}]`
  )}&sort=new&limit=${limite}&page=${pagina}&fields=key,title,author_name,first_publish_year,publisher,number_of_pages_median,cover_i,language`;

type FeedRow = {
  id: string;
  titulo: string;
  autor: string | null;
  anio: number | null;
  editorial: string | null;
  paginas: number | null;
  portada_url: string | null;
};

async function unaEditorial(
  editorial: string,
  desde: number,
  hasta: number,
  limite: number,
  pagina = 1
): Promise<FeedRow[]> {
  try {
    const response = await fetch(feedUrl(editorial, desde, hasta, limite, pagina), {
      headers: { 'User-Agent': 'LibreriaAI-Salamanca/1.0 (demo)' },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return [];
    const data: any = await response.json();
    const docs: any[] = Array.isArray(data?.docs) ? data.docs : [];

    return docs
      .filter(
        (doc) =>
          doc?.title &&
          Array.isArray(doc.author_name) &&
          doc.author_name.length &&
          Array.isArray(doc.language) &&
          doc.language.includes('spa')
      )
      .map((doc) => ({
        id: String(doc.key ?? '').replace('/works/', ''),
        titulo: text(doc.title, 200),
        autor: text(doc.author_name[0], 120) || null,
        anio: Number.isInteger(doc.first_publish_year) ? doc.first_publish_year : null,
        editorial,
        paginas: Number.isInteger(doc.number_of_pages_median) ? doc.number_of_pages_median : null,
        portada_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null
      }))
      .filter((row) => row.id && row.titulo && esTituloEnEspanol(row.titulo));
  } catch {
    return [];
  }
}

/**
 * Dos barridos sobre las mismas editoriales:
 *
 *  - `novedades`: lo de los dos últimos años, para la franja de la portada.
 *  - `fondo`: veinticinco años hacia atrás y muchos más títulos por editorial.
 *    Es lo que hace que el catálogo encargable no sean cuatro novedades: incluye
 *    el fondo vivo y las traducciones que siguen en distribución.
 *
 * El segundo pide más a la fuente, así que se lanza desde el cron del mes, no
 * en cada visita.
 */
async function traerNovedades(modo: 'novedades' | 'fondo' = 'novedades'): Promise<FeedRow[]> {
  const hasta = new Date().getFullYear();
  const desde = modo === 'fondo' ? hasta - 40 : hasta - 1;
  const limite = modo === 'fondo' ? 100 : 12;
  // En el barrido de fondo se piden dos páginas por editorial: con una sola
  // salían mil seiscientos títulos y el fondo de cada sello es mucho mayor.
  const paginas = modo === 'fondo' ? [1, 2] : [1];

  // La fuente limita por IP: cincuenta peticiones a la vez la tumban. Se piden
  // de seis en seis con una pausa corta, que cabe de sobra en el tiempo de la
  // función y no provoca respuestas vacías.
  const TANDA = 6;
  const porId = new Map<string, FeedRow>();

  for (let i = 0; i < EDITORIALES.length; i += TANDA) {
    const grupo = EDITORIALES.slice(i, i + TANDA);
    const filas = await Promise.all(
      grupo.flatMap((editorial) =>
        paginas.map((pagina) => unaEditorial(editorial, desde, hasta, limite, pagina))
      )
    );
    for (const fila of filas.flat()) {
      if (!porId.has(fila.id)) porId.set(fila.id, fila);
    }
    if (i + TANDA < EDITORIALES.length) await new Promise((r) => setTimeout(r, 350));
  }

  return [...porId.values()]
    .filter((fila) => !/autoeditad|independently published|createspace|lulu/i.test(fila.editorial ?? ''))
    .slice(0, modo === 'fondo' ? 1600 : 60);
}

async function handleNovedades(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const rows = await sql.query(
      `select id, titulo, autor, anio, editorial, paginas, portada_url, fuente, creado_en
         from novedades_feed where activo order by anio desc nulls last, creado_en desc limit 80`,
      []
    );
    // Lo ya guardado también pasa el filtro: las filas en francés que entraron
    // antes de este arreglo desaparecen del escaparate sin tocar la base.
    const visibles = (rows as any[]).filter((fila) => esTituloEnEspanol(fila.titulo)).slice(0, 24);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    return json(res, 200, { libros: visibles });
  } catch (error) {
    console.error('[novedades]', error);
    return json(res, 500, { error: 'error_interno', libros: [] });
  }
}

async function handleNovedadesSync(req: any, res: any) {
  const url = new URL(String(req.url ?? '/'), 'http://localhost');
  const modo = url.searchParams.get('modo') === 'fondo' ? 'fondo' : 'novedades';
  const desdeCron = typeof req.headers?.['x-vercel-cron'] === 'string';
  if (req.method !== 'POST' && req.method !== 'GET') return methodNotAllowed(res, ['POST']);
  if (!desdeCron && !validAdminToken(req.headers?.authorization)) return json(res, 401, { error: 'no_autorizado' });

  try {
    const novedades = await traerNovedades(modo);
    let nuevas = 0;

    // Inserción por tandas: el barrido de fondo trae más de mil filas y una a
    // una se comería el tiempo de la función.
    const TANDA = 200;
    for (let i = 0; i < novedades.length; i += TANDA) {
      const trozo = novedades.slice(i, i + TANDA);
      const rows = await sql.query(
        `insert into novedades_feed (id, titulo, autor, anio, editorial, paginas, portada_url)
         select * from unnest($1::text[], $2::text[], $3::text[], $4::int[], $5::text[], $6::int[], $7::text[])
         on conflict (id) do nothing
         returning id`,
        [
          trozo.map((f) => f.id),
          trozo.map((f) => f.titulo),
          trozo.map((f) => f.autor),
          trozo.map((f) => f.anio),
          trozo.map((f) => f.editorial),
          trozo.map((f) => f.paginas),
          trozo.map((f) => f.portada_url)
        ]
      );
      nuevas += rows.length;
    }

    const total = (await sql.query(`select count(*)::int as n from novedades_feed where activo`, [])).at(0)?.n ?? 0;
    return json(res, 200, { ok: true, modo, recibidas: novedades.length, nuevas, total });
  } catch (error) {
    console.error('[novedades-sync]', error);
    return json(res, 502, { error: 'fuente_no_disponible', detalle: errorMessage(error).slice(0, 200) });
  }
}

/**
 * Catálogo encargable: todo lo que hay en la base procedente de las editoriales
 * españolas, con buscador y paginación. Es lo que hace que la web no se quede
 * en las 46 obras de la sala: aquí entra el fondo vivo y todo lo traducido.
 */
async function handleCatalogo(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const url = new URL(String(req.url ?? '/'), 'http://localhost');
  const q = text(url.searchParams.get('q') ?? '', 80);
  const pagina = Math.max(1, Number(url.searchParams.get('pagina') ?? 1) || 1);
  const limite = Math.min(48, Math.max(6, Number(url.searchParams.get('limite') ?? 24) || 24));
  const desde = Number(url.searchParams.get('desde') ?? 0) || 0;
  const hasta = Number(url.searchParams.get('hasta') ?? 0) || 0;
  const normaliza = (texto: string) =>
  texto
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n');
const patron = `%${normaliza(q).replace(/[%_]/g, '')}%`;

  try {
    // `busqueda` es una columna generada sin acentos ni mayúsculas (ver schema.sql)
    // Sin casts explícitos Postgres no sabe de qué tipo es cada parámetro cuando
    // la misma condición se usa en dos consultas con distinto número de ellos.
    const filtro = `activo and ($1::text = '' or busqueda like $2::text) and ($3::int = 0 or anio >= $3::int) and ($4::int = 0 or anio <= $4::int)`;

    const [filas, cuenta, editoriales] = await Promise.all([
      sql.query(
        `select id, titulo, autor, anio, editorial, paginas, portada_url
           from novedades_feed
          where ${filtro}
          order by anio desc nulls last, titulo asc
          limit $5 offset $6`,
        [q, patron, desde, hasta, limite, (pagina - 1) * limite]
      ),
      sql.query(`select count(*)::int as n from novedades_feed where ${filtro}`, [q, patron, desde, hasta]),
      sql.query(`select count(distinct editorial)::int as n from novedades_feed where activo`, [])
    ]);

    const total = cuenta.at(0)?.n ?? 0;

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600');
    return json(res, 200, {
      libros: filas,
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / limite)),
      editoriales: editoriales.at(0)?.n ?? 0,
      idioma: 'es'
    });
  } catch (error) {
    console.error('[catalogo]', error);
    return json(res, 500, { error: 'error_interno', libros: [], total: 0 });
  }
}

/* ------------------------------------------------------------------ rutas */

async function handleStock(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const rows = await sql.query(`select id, stock from libros order by id`, []);
    // Cache muy corta: el stock cambia con cada pedido y la exactitud importa.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5, stale-while-revalidate=10');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ stock: rows }));
  } catch (error) {
    console.error('[stock]', error);
    return json(res, 500, { error: 'error_interno', stock: [] });
  }
}

async function handleDisponibilidad(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const rows = await sql.query(
      `select e.id,
              e.titulo,
              e.plazas,
              coalesce(sum(r.personas), 0)::int as ocupadas,
              greatest(e.plazas - coalesce(sum(r.personas), 0), 0)::int as restantes
         from eventos e
         left join reservas r on r.tipo = 'tertulia' and r.referencia = e.id
        group by e.id, e.titulo, e.plazas
        order by e.id`,
      []
    );
    return json(res, 200, { eventos: rows });
  } catch (error) {
    console.error('[disponibilidad]', error);
    return json(res, 500, { error: 'error_interno', eventos: [] });
  }
}

async function handlePedidos(req: any, res: any) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!rateLimit(req, 'pedidos', 8)) return json(res, 429, { error: 'demasiadas_peticiones' });

  const body = readBody(req);
  if (text(body.website, 50)) return json(res, 200, { ok: true, referencia: null });

  const nombre = text(body.nombre, 120);
  const email = text(body.email, 254).toLowerCase();
  const entrega = text(body.entrega, 12);
  const direccion = text(body.direccion, 200);
  const ciudad = text(body.ciudad, 80);
  const cp = text(body.cp, 10);
  const notas = text(body.notas, 500);
  const idempotencyKey = text(body.idempotencyKey, 80);

  if (nombre.length < 2) return json(res, 400, { error: 'nombre_invalido' });
  if (!isEmail(email)) return json(res, 400, { error: 'email_invalido' });
  if (!['recogida', 'envio'].includes(entrega)) return json(res, 400, { error: 'entrega_invalida' });

  if (entrega === 'envio') {
    if (direccion.length < 4) return json(res, 400, { error: 'direccion_invalida' });
    if (ciudad.length < 2) return json(res, 400, { error: 'ciudad_invalida' });
    if (!/^\d{5}$/.test(cp)) return json(res, 400, { error: 'cp_invalido' });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .slice(0, 20)
    .map((item: any) => ({
      libro_id: typeof item?.id === 'string' ? item.id.slice(0, 80) : '',
      cantidad: Number.isInteger(item?.cantidad) ? item.cantidad : 0
    }))
    .filter((item: { libro_id: string; cantidad: number }) => item.libro_id && item.cantidad >= 1 && item.cantidad <= 20);

  if (items.length === 0) return json(res, 400, { error: 'cesta_vacia' });

  try {
    const rows = await sql.query(
      `select * from crear_pedido($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
      [
        nombre,
        email,
        entrega,
        entrega === 'envio' ? direccion : null,
        entrega === 'envio' ? ciudad : null,
        entrega === 'envio' ? cp : null,
        notas || null,
        JSON.stringify(items),
        idempotencyKey || null
      ]
    );

    const pedido = rows[0];
    if (!pedido) return json(res, 500, { error: 'pedido_no_creado' });

    return json(res, 201, {
      ok: true,
      id: Number(pedido.id),
      referencia: pedido.referencia,
      subtotal: Number(pedido.subtotal),
      envio: Number(pedido.envio),
      total: Number(pedido.total),
      creadoEn: pedido.creado_en
    });
  } catch (error) {
    const message = errorMessage(error);

    if (message.includes('STOCK:')) {
      const id = message.split('STOCK:')[1]?.trim();
      const rows = await sql
        .query(`select id, titulo, stock from libros where id = $1`, [id])
        .catch(() => [] as any[]);
      const libro = rows[0];
      return json(res, 409, {
        error: 'sin_stock',
        libroId: id,
        titulo: libro?.titulo ?? null,
        disponibles: libro?.stock ?? 0,
        mensaje: libro
          ? `Ahora mismo nos quedan ${libro.stock} ejemplares de «${libro.titulo}».`
          : 'Uno de los libros ya no tiene ejemplares disponibles.'
      });
    }
    if (message.includes('LIBRO_DESCONOCIDO')) return json(res, 400, { error: 'libro_desconocido' });
    if (message.includes('CESTA_VACIA')) return json(res, 400, { error: 'cesta_vacia' });

    console.error('[pedidos]', message);
    return json(res, 500, { error: 'error_interno' });
  }
}

const HORAS_MESA = ['11:00', '12:30', '17:00', '18:30', '20:00'];
const AFORO_MESA = 12 * 4;

async function handleReservas(req: any, res: any) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!rateLimit(req, 'reservas', 10)) return json(res, 429, { error: 'demasiadas_peticiones' });

  const body = readBody(req);
  if (text(body.website, 50)) return json(res, 200, { ok: true });

  const tipo = text(body.tipo, 12);
  const nombre = text(body.nombre, 120);
  const email = text(body.email, 254).toLowerCase();
  const personas = Number.isInteger(body.personas) ? body.personas : 1;

  if (nombre.length < 2) return json(res, 400, { error: 'nombre_invalido' });
  if (email && !isEmail(email)) return json(res, 400, { error: 'email_invalido' });
  if (personas < 1 || personas > 6) return json(res, 400, { error: 'personas_invalidas' });

  try {
    if (tipo === 'tertulia') {
      const evento = text(body.referencia, 60);
      if (!evento) return json(res, 400, { error: 'evento_invalido' });
      if (!email) return json(res, 400, { error: 'email_requerido' });

      const rows = await sql.query(`select * from reservar_tertulia($1, $2, $3, $4)`, [
        evento,
        nombre,
        email,
        personas
      ]);
      const reserva = rows[0];
      const plazasRestantes = Number(reserva.plazas_restantes);
      const eventoInfo = await sql
        .query(`select titulo from eventos where id = $1`, [evento])
        .catch(() => [] as any[]);
      await queueEmail(draftTertulia(nombre, eventoInfo[0]?.titulo ?? evento, plazasRestantes), email);
      return json(res, 201, {
        ok: true,
        id: Number(reserva.id),
        plazasRestantes
      });
    }

    // No hay local físico: las mesas del café dejaron de existir. Se responde
    // con 410 para que cualquier cliente viejo no crea que se ha guardado nada.
    if (tipo === 'mesa') {
      return json(res, 410, {
        error: 'no_disponible',
        mensaje: 'No tenemos local físico, así que no hay mesas. Escríbenos y te ayudamos por correo.'
      });
    }

    return json(res, 400, { error: 'tipo_invalido' });
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes('SIN_PLAZAS:')) {
      const restantes = Number(message.split('SIN_PLAZAS:')[1] ?? 0);
      return json(res, 409, {
        error: 'sin_plazas',
        plazasRestantes: restantes,
        mensaje:
          restantes === 0
            ? 'Ese encuentro está completo. Apúntate al siguiente.'
            : `Solo quedan ${restantes} plazas para ese encuentro.`
      });
    }
    if (message.includes('EVENTO_DESCONOCIDO')) return json(res, 404, { error: 'evento_desconocido' });

    console.error('[reservas]', message);
    return json(res, 500, { error: 'error_interno' });
  }
}

async function handleNewsletter(req: any, res: any) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!rateLimit(req, 'newsletter', 6)) return json(res, 429, { error: 'demasiadas_peticiones' });

  const body = readBody(req);
  if (text(body.website, 50)) return json(res, 200, { ok: true, nuevo: false });

  const email = text(body.email, 254).toLowerCase();
  if (!isEmail(email)) return json(res, 400, { error: 'email_invalido' });

  try {
    const rows = await sql.query(
      `insert into suscriptores (email) values ($1)
       on conflict (email) do nothing
       returning email`,
      [email]
    );
    if (rows.length > 0) await queueEmail(draftBienvenida(email), email);
    return json(res, 201, { ok: true, nuevo: rows.length > 0 });
  } catch (error) {
    console.error('[newsletter]', error);
    return json(res, 500, { error: 'error_interno' });
  }
}

async function handleAdmin(res: any, req: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!validAdminToken(req.headers?.authorization)) return json(res, 401, { error: 'no_autorizado' });

  try {
    const [pedidos, lineas, reservas, suscriptores, eventos, stockBajo, totales] = await Promise.all([
      sql.query(
        `select id, referencia, nombre, email, entrega, ciudad, subtotal, envio, total, estado, creado_en
           from pedidos order by creado_en desc limit 60`,
        []
      ),
      sql.query(`select pedido_id, titulo, cantidad, precio from pedido_lineas order by pedido_id desc`, []),
      sql.query(
        `select id, tipo, referencia, nombre, email, fecha, hora, personas, creado_en
           from reservas order by creado_en desc limit 60`,
        []
      ),
      sql.query(`select email, creado_en from suscriptores order by creado_en desc limit 60`, []),
      sql.query(
        `select e.id, e.plazas, coalesce(sum(r.personas),0)::int as ocupadas
           from eventos e
           left join reservas r on r.tipo = 'tertulia' and r.referencia = e.id
          group by e.id, e.plazas order by e.id`,
        []
      ),
      sql.query(`select id, titulo, stock from libros where stock <= 3 order by stock asc, titulo`, []),
      sql.query(
        `select
           (select count(*) from pedidos)::int as pedidos,
           (select coalesce(sum(total),0) from pedidos where estado <> 'cancelado')::numeric as facturado,
           (select count(*) from reservas)::int as reservas,
           (select count(*) from suscriptores)::int as suscriptores`,
        []
      )
    ]);

    const lineasPorPedido = new Map<number, { titulo: string; cantidad: number }[]>();
    for (const linea of lineas) {
      const key = Number(linea.pedido_id);
      const list = lineasPorPedido.get(key) ?? [];
      list.push({ titulo: linea.titulo, cantidad: Number(linea.cantidad) });
      lineasPorPedido.set(key, list);
    }

    return json(res, 200, {
      totales: totales[0] ?? {},
      pedidos: pedidos.map((pedido) => ({
        ...pedido,
        id: Number(pedido.id),
        subtotal: Number(pedido.subtotal),
        envio: Number(pedido.envio),
        total: Number(pedido.total),
        lineas: lineasPorPedido.get(Number(pedido.id)) ?? []
      })),
      reservas: reservas.map((reserva) => ({ ...reserva, id: Number(reserva.id) })),
      suscriptores,
      eventos,
      stockBajo
    });
  } catch (error) {
    console.error('[admin]', error);
    return json(res, 500, { error: 'error_interno' });
  }
}

/* ---------------------------------------------------------------- reseñas */

/**
 * Opiniones de lectores.
 *
 * `GET /api/resenas?libro=<id>` devuelve media, distribución y reseñas.
 * `POST /api/resenas` guarda una (nombre, valoración de 1 a 5 y texto).
 *
 * Reglas: nada de medias inventadas — la media se calcula con lo que hay en la
 * tabla, y si no hay reseñas la ficha sigue enseñando la valoración editorial.
 */
async function handleResenas(req: any, res: any) {
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (req.method === 'GET') {
    // El runtime no siempre rellena req.query: se lee también de la URL real.
    const url = new URL(String(req.url ?? '/'), 'http://localhost');
    const libroId = text(req.query?.libro ?? url.searchParams.get('libro') ?? '', 120);
    if (!libroId) return json(res, 400, { error: 'falta_libro' });
    try {
      const rows = await sql.query(
        `select id, nombre, valoracion, texto, origen, creado_en
           from resenas
          where libro_id = $1 and aprobada
          order by origen = 'casa' desc, creado_en desc
          limit 40`,
        [libroId]
      );
      const resenas = rows.map((row: any) => ({
        id: Number(row.id),
        nombre: row.nombre,
        valoracion: Number(row.valoracion),
        texto: row.texto,
        origen: row.origen,
        creado_en: row.creado_en
      }));
      const total = resenas.length;
      const media = total ? resenas.reduce((sum: number, r: any) => sum + r.valoracion, 0) / total : null;
      const distribucion = [5, 4, 3, 2, 1].map((estrellas) => ({
        estrellas,
        cuantas: resenas.filter((r: any) => r.valoracion === estrellas).length
      }));
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=120');
      return json(res, 200, { resenas, total, media, distribucion });
    } catch (error) {
      console.error('[resenas:get]', error);
      return json(res, 500, { error: 'error_interno', resenas: [] });
    }
  }

  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
  if (!rateLimit(req, 'resenas', 8)) return json(res, 429, { error: 'demasiadas_peticiones' });

  const body = readBody(req);
  if (text(body.website, 50)) return json(res, 200, { ok: true, guardada: false });

  const libroId = text(body.libro_id, 120);
  const nombre = text(body.nombre, 40);
  const valoracion = Number(body.valoracion);
  const textoResena = text(body.texto, 600);

  if (!libroId) return json(res, 400, { error: 'falta_libro' });
  if (nombre.length < 2) return json(res, 400, { error: 'nombre_corto' });
  if (!Number.isInteger(valoracion) || valoracion < 1 || valoracion > 5) {
    return json(res, 400, { error: 'valoracion_invalida' });
  }
  if (textoResena.length < 12) return json(res, 400, { error: 'texto_corto' });

  try {
    const rows = await sql.query(
      `insert into resenas (libro_id, nombre, valoracion, texto)
       values ($1, $2, $3, $4)
       returning id, nombre, valoracion, texto, origen, creado_en`,
      [libroId, nombre, valoracion, textoResena]
    );
    const row: any = rows[0];
    return json(res, 201, {
      ok: true,
      resena: {
        id: Number(row.id),
        nombre: row.nombre,
        valoracion: Number(row.valoracion),
        texto: row.texto,
        origen: row.origen,
        creado_en: row.creado_en
      }
    });
  } catch (error) {
    console.error('[resenas:post]', error);
    return json(res, 500, { error: 'error_interno' });
  }
}

/* --------------------------------------------------------------- asistente */

/**
 * Asistente del mostrador.
 *
 * Responde a las cuatro cosas que hoy se preguntan por teléfono —«¿lo tenéis?»,
 * «¿hasta qué hora abrís?», «¿quedan plazas?», «¿dónde está mi pedido?»— y
 * recomienda delegando en el fondo. Todo lo que dice sale de la base o de los
 * datos fijos de la casa: si no está ahí, contesta que no lo sabe y da el
 * correo. Nunca inventa un título, un precio ni una plaza.
 */

const DATOS_CASA = `Librería AI Salamanca. Tienda SOLO online: no hay local físico, no se puede recoger en mano.
Correo hola@libreriaiasalamanca.es · teléfono 923 21 40 14 (lunes a viernes, 9–18 h).
Envío a toda España en 24–48 h; gratis desde 35 €. Encargos de títulos que no están en el catálogo: 2–4 días.
Club de lectura y talleres en directo por videollamada, con plazas limitadas.`;

const PROMPT_ASISTENTE = `Eres el librero de guardia de una librería ONLINE con acento salmantino (no hay tienda física). Hablas en castellano de España, cercano y sin florituras.

Reglas estrictas:
- Responde SOLO con la información del CONTEXTO. Si algo no aparece, di que no lo sabes y ofrece el correo hola@libreriaiasalamanca.es o el teléfono 923 21 40 14.
- Nunca inventes títulos, precios, stock, plazas ni fechas.
- Máximo 90 palabras. Sin listas de más de tres elementos. Nada de Markdown complicado.
- Si el cliente pide una recomendación, propone como mucho tres títulos del contexto y una razón breve de cada uno, apoyándote solo en los temas que aparecen entre corchetes.
- Para recomendar puedes usar los títulos de FONDO DISPONIBLE PARA RECOMENDAR; no inventes otros.
- Si pregunta por un pedido y falta la referencia o el correo, pídelos.

CONTEXTO:
`;

function normaliza(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type AccionLibro = { id: string; titulo: string };

async function contextoAsistente(
  mensaje: string,
  referencia?: string,
  email?: string,
  catalogoCliente?: { id: string; titulo: string; autor?: string; temas?: string[] }[]
) {
  const lineas: string[] = [DATOS_CASA];
  const acciones: AccionLibro[] = [];
  let nombres: AccionLibro[] = [];

  // 1. ¿Pregunta por un título concreto? Se compara contra el fondo de la sala.
  try {
    const catalogo = await sql.query(`select id, titulo, precio, stock from libros`, []);
    nombres = catalogo.map((libro: any) => ({ id: String(libro.id), titulo: String(libro.titulo) }));
    // Solo cuentan las palabras con peso: sin esta lista, «regalar algo» casaba
    // con cualquier título que llevara «algo» y el asistente respondía con un
    // libro que nadie había pedido.
    const SIN_PESO = new Set([
      'algo', 'libro', 'libros', 'quiero', 'queria', 'teneis', 'tienen', 'tienes', 'queda',
      'quedan', 'cuantos', 'cuanto', 'cuesta', 'precio', 'regalo', 'regalar', 'comprar',
      'busco', 'buscar', 'sobre', 'para', 'donde', 'cuando', 'como', 'esta', 'este', 'esto',
      'algun', 'alguna', 'podeis', 'podrias', 'necesito', 'recomiendas', 'recomendar'
    ]);
    const buscado = normaliza(mensaje);
    const palabras = buscado
      .split(/[^a-z0-9ñ]+/)
      .filter((w) => w.length >= 5 && !SIN_PESO.has(w));

    const aciertos = catalogo
      .map((libro: any) => {
        const titulo = normaliza(String(libro.titulo));
        const aciertos = palabras.filter((w) => titulo.includes(w));
        return { libro, puntos: aciertos.length, larga: aciertos.some((w) => w.length >= 6) };
      })
      .filter((fila: { puntos: number; larga: boolean }) => fila.puntos >= 2 || (fila.puntos === 1 && fila.larga))
      .sort((a: any, b: any) => b.puntos - a.puntos)
      .slice(0, 4);

    if (!aciertos.length) {
      // Para una recomendación sin título concreto se le da una lista corta del
      // fondo. Si el cliente manda sus temas, se eligen por afinidad con lo que
      // ha preguntado; si no, se toma el fondo disponible tal cual.
      const porTitulo = new Map(catalogo.map((libro: any) => [String(libro.titulo), libro]));
      const todos = catalogoCliente?.length
        ? catalogoCliente.map((ficha) => ({ ficha, datos: porTitulo.get(ficha.titulo) }))
        : [];

      const afinidad = (texto: string, temas: string[] = []) => {
        const plano = normaliza(`${texto} ${temas.join(' ')}`);
        return palabras.filter((w) => plano.includes(w)).length;
      };

      const ordenados = todos
        .filter((fila) => fila.datos && Number(fila.datos.stock) > 0)
        .sort((a, b) => afinidad(b.ficha.titulo, b.ficha.temas) - afinidad(a.ficha.titulo, a.ficha.temas));

      const sugerencias = (ordenados.length ? ordenados.map((fila) => fila.datos) : catalogo.filter((libro: any) => Number(libro.stock) > 0))
        .slice(0, 6);
      if (sugerencias.length) {
        lineas.push('FONDO DISPONIBLE PARA RECOMENDAR (elige como mucho tres):');
        for (const libro of sugerencias as any[]) {
          const ficha = catalogoCliente?.find((c) => c.titulo === libro.titulo);
          const temas = ficha?.temas?.length ? ` [${ficha.temas.slice(0, 3).join(', ')}]` : '';
          lineas.push(`- ${libro.titulo}: ${Number(libro.precio).toFixed(2)} €, ${libro.stock} ejemplar(es).${temas}`);
        }
      }
    }

    if (aciertos.length) {
      lineas.push('FONDO DE LA SALA QUE ENCAJA CON LA PREGUNTA:');
      for (const fila of aciertos) {
        const libro: any = fila.libro;
        lineas.push(
          `- ${libro.titulo}: ${Number(libro.precio).toFixed(2)} €, ${libro.stock} ejemplar(es) en el almacén.`
        );
        acciones.push({ id: String(libro.id), titulo: String(libro.titulo) });
      }
    }
  } catch {
    /* sin catálogo se sigue con lo demás */
  }

  // 2. Agenda y plazas libres, en vivo.
  try {
    const eventos = await sql.query(
      `select e.titulo, e.plazas, coalesce(sum(r.personas), 0)::int as ocupadas
         from eventos e
         left join reservas r on r.tipo = 'tertulia' and r.referencia = e.id
        group by e.titulo, e.plazas
        order by e.titulo`,
      []
    );
    if (eventos.length) {
      lineas.push('TERTULIAS Y TALLERES (plazas libres ahora mismo):');
      for (const fila of eventos as any[]) {
        lineas.push(`- ${fila.titulo}: ${Math.max(0, Number(fila.plazas) - Number(fila.ocupadas))} plazas libres de ${fila.plazas}.`);
      }
    }
  } catch {
    /* seguimos */
  }

  // 3. Estado del pedido, solo con referencia y correo.
  if (referencia && email) {
    try {
      const filas = await sql.query(
        `select referencia, estado, entrega, total, creado_en from pedidos
          where upper(referencia) = upper($1) and lower(email) = lower($2) limit 1`,
        [referencia, email]
      );
      if (filas.length) {
        const pedido: any = filas[0];
        lineas.push(
          `PEDIDO ${pedido.referencia}: estado ${pedido.estado}, entrega ${pedido.entrega}, total ${Number(pedido.total).toFixed(2)} €, del ${pedido.creado_en}.`
        );
      } else {
        lineas.push('No hay ningún pedido con esa referencia y ese correo.');
      }
    } catch {
      /* seguimos */
    }
  }

  return { contexto: lineas.join('\n'), acciones, nombres };
}

async function llamarModelo(prompt: string, apiKey: string, modelo: string, maxTokens = 700): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: maxTokens,
          topP: 0.9,
          // Sin esto el modelo se gasta el presupuesto razonando y devuelve
          // la frase cortada a la mitad.
          thinkingConfig: { thinkingBudget: 0 }
        }
      }),
      signal: AbortSignal.timeout(20000)
    }
  );
  if (!res.ok) throw new Error(`modelo ${res.status}`);
  const data: any = await res.json();
  const texto = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  return String(texto).trim();
}

/** Respuesta sin modelo: sale del mismo contexto, con plantilla. Sirve de red. */
function respuestaPlantilla(mensaje: string, contexto: string, acciones: AccionLibro[]): string {
  const bajo = normaliza(mensaje);

  if (/pedido|envio|llega|referencia/.test(bajo)) {
    return 'Para mirarte el pedido necesito la referencia (empieza por LAI-) y el correo con el que lo hiciste. Si prefieres, llámanos al 923 21 40 14.';
  }
  if (/hora|abierto|abris|cierra|donde|direccion/.test(bajo)) {
    return 'Estamos en Rúa Mayor 14. Abrimos de lunes a jueves de 9 a 21, viernes y sábado de 9 a 23 y domingo de 10 a 20.';
  }
  if (acciones.length) {
    const primera = acciones[0];
    const linea = contexto.split('\n').find((l) => l.includes(primera.titulo));
    return linea
      ? `Sí lo tenemos. ${linea.replace(/^- /, '')} ¿Te lo guardo?`
      : `Sí, está en la sala: ${primera.titulo}.`;
  }
  if (/tertulia|plaza|taller|club/.test(bajo)) {
    const linea = contexto.split('\n').find((l) => l.includes('plazas libres'));
    return linea ? linea.replace(/^- /, '') : 'Escríbenos y te digo las plazas que quedan.';
  }
  return 'Eso no lo sé con seguridad. Escríbenos a hola@libreriaiasalamanca.es o llámanos al 923 21 40 14 y te lo miramos.';
}

async function handleAsistente(req: any, res: any) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!rateLimit(req, 'asistente', 20)) return json(res, 429, { error: 'demasiadas_peticiones' });

  const body = readBody(req);
  if (text(body.website, 50)) return json(res, 200, { ok: true, respuesta: '' });

  const mensaje = text(body.mensaje, 500);
  // En un chat la gente pega la referencia y el correo en la misma frase, así
  // que se sacan de ahí antes de pedírselos otra vez.
  const referencia =
    text(body.referencia, 20) || (mensaje.match(/LAI-\d+/i)?.[0] ?? '');
  const email =
    text(body.email, 254).toLowerCase() ||
    (mensaje.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() ?? '');

  if (mensaje.length < 2) return json(res, 400, { error: 'mensaje_corto' });

  const catalogoCliente = Array.isArray(body.catalogo) ? body.catalogo.slice(0, 80) : undefined;
  const { contexto, acciones, nombres } = await contextoAsistente(mensaje, referencia, email, catalogoCliente);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(res, 200, {
      respuesta: respuestaPlantilla(mensaje, contexto, acciones),
      fuente: 'plantilla',
      acciones
    });
  }

  try {
    const modelo = process.env.ORACULO_MODEL || 'gemini-3.8-flash';
    const cruda = await llamarModelo(`${PROMPT_ASISTENTE}${contexto}\n\nCLIENTE: ${mensaje}\nLIBRERO:`, apiKey, modelo);
    if (!cruda) throw new Error('respuesta vacía');
    // El chat no pinta Markdown: fuera los asteriscos de énfasis.
    const respuesta = cruda.replace(/\*\*?([^*\n]+)\*\*?/g, '$1').trim();

    // Las fichas que se pintan son las que la respuesta nombra, no las que le
    // pasamos por si acaso: nada de seis portadas al preguntar por el horario.
    const respuestaPlana = normaliza(respuesta).replace(/[*_]/g, '');
    const citados = nombres
      .filter((n) => respuestaPlana.includes(normaliza(n.titulo)))
      .slice(0, 3);

    return json(res, 200, { respuesta, fuente: 'modelo', acciones: citados });
  } catch (error) {
    console.error('[asistente]', errorMessage(error).slice(0, 200));
    return json(res, 200, {
      respuesta: respuestaPlantilla(mensaje, contexto, acciones),
      fuente: 'plantilla',
      acciones
    });
  }
}

/* ---------------------------------------------------------------- router */


export default async function handler(req: any, res: any) {
  // En el runtime de Vercel el catch-all no siempre rellena req.query.route,
  // así que la ruta se deduce de la URL real de la petición.
  const pathname = String(req.url ?? '').split('?')[0];
  const fromUrl = pathname.replace(/^\/api\/?/, '');
  const raw = req.query?.route;
  const fromQuery = Array.isArray(raw) ? raw.join('/') : typeof raw === 'string' ? raw : '';
  const route = (fromUrl || fromQuery).replace(/^\/+|\/+$/g, '');

  switch (route) {
    case 'stock':
      return handleStock(req, res);
    case 'disponibilidad':
      return handleDisponibilidad(req, res);
    case 'pedidos':
      return handlePedidos(req, res);
    case 'reservas':
      return handleReservas(req, res);
    case 'newsletter':
      return handleNewsletter(req, res);
    case 'admin-resumen':
    case 'admin/resumen':
      return handleAdmin(res, req);
    case 'admin-emails':
    case 'admin/correos':
      return handleAdminEmails(req, res);
    case 'emails-prueba':
      return handleEmailsPrueba(req, res);
    case 'emails-reenviar':
      return handleEmailReenviar(req, res);
    case 'asistente':
      return handleAsistente(req, res);
    case 'resenas':
    case 'reseñas':
      return handleResenas(req, res);
    case 'novedades':
      return handleNovedades(req, res);
    case 'catalogo':
    case 'catálogo':
      return handleCatalogo(req, res);
    case 'novedades-sync':
      return handleNovedadesSync(req, res);
    default:
      return json(res, 404, { error: 'ruta_desconocida' });
  }
}
