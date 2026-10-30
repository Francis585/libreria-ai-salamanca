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
      return json(res, 201, {
        ok: true,
        id: Number(reserva.id),
        plazasRestantes: Number(reserva.plazas_restantes)
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
    default:
      return json(res, 404, { error: 'ruta_desconocida' });
  }
}
