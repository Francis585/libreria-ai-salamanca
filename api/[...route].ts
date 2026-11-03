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
      <div style="font:400 10px/1.6 -apple-system,Segoe UI,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${b.muted};margin-top:4px;">Rúa Mayor 14 · desde 1987</div>
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
      Librería AI Salamanca · Rúa Mayor 14, 37002 Salamanca · 923 21 40 14<br>
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
    texto: `${nombre}, te guardamos sitio para «${evento}». Quedan ${plazasRestantes} plazas. Si no puedes venir, avísanos. Librería AI Salamanca, Rúa Mayor 14.`
  };
}

function draftMesa(nombre: string, fecha: string, hora: string, personas: number): EmailDraft {
  return {
    tipo: 'reserva_mesa',
    destinatario: '',
    asunto: `Mesa reservada · ${fecha} a las ${hora}`,
    html: emailHtml({
      titulo: 'Mesa reservada',
      entradilla: `${nombre}, os esperamos en el Café Melchor Cano.`,
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
    asunto: 'Aquí empieza el boletín de la Rúa Mayor',
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

    const nombre = text(cuerpo.nombre, 120) || 'Lectora de la Rúa Mayor';
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

    if (tipo === 'mesa') {
      const fecha = text(body.fecha, 10);
      const hora = text(body.hora, 5);
      if (!isDate(fecha, 90)) return json(res, 400, { error: 'fecha_invalida' });
      if (!HORAS_MESA.includes(hora)) return json(res, 400, { error: 'hora_invalida' });

      const ocupadas = await sql.query(
        `select coalesce(sum(personas), 0)::int as personas from reservas
          where tipo = 'mesa' and fecha = $1 and hora = $2`,
        [fecha, hora]
      );
      if (Number(ocupadas[0]?.personas ?? 0) + personas > AFORO_MESA) {
        return json(res, 409, { error: 'sin_mesas', mensaje: 'Esa franja está completa. Prueba otra hora.' });
      }

      const rows = await sql.query(
        `insert into reservas (tipo, referencia, nombre, email, fecha, hora, personas)
         values ('mesa', 'cafe', $1, $2, $3, $4, $5)
         returning id`,
        [nombre, email || null, fecha, hora, personas]
      );
      if (email) await queueEmail(draftMesa(nombre, fecha, hora, personas), email);
      return json(res, 201, { ok: true, id: Number(rows[0].id) });
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
    default:
      return json(res, 404, { error: 'ruta_desconocida' });
  }
}
