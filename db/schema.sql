-- Librería AI Salamanca · esquema Postgres (Neon)
-- Ejecutable varias veces: usa IF NOT EXISTS / ON CONFLICT.

begin;

create table if not exists libros (
  id            text primary key,
  titulo        text not null,
  precio        numeric(10,2) not null check (precio >= 0),
  stock         integer not null default 0 check (stock >= 0),
  actualizado_en timestamptz not null default now()
);

create table if not exists eventos (
  id     text primary key,
  titulo text not null,
  plazas integer not null check (plazas > 0)
);

create sequence if not exists pedido_ref_seq;

create table if not exists pedidos (
  id              bigserial primary key,
  referencia      text not null unique,
  nombre          text not null,
  email           text not null,
  entrega         text not null check (entrega in ('recogida', 'envio')),
  direccion       text,
  ciudad          text,
  cp              text,
  notas           text,
  subtotal        numeric(10,2) not null,
  envio           numeric(10,2) not null default 0,
  total           numeric(10,2) not null,
  estado          text not null default 'pendiente',
  idempotency_key text unique,
  creado_en       timestamptz not null default now()
);

create table if not exists pedido_lineas (
  id        bigserial primary key,
  pedido_id bigint not null references pedidos(id) on delete cascade,
  libro_id  text not null references libros(id),
  titulo    text not null,
  precio    numeric(10,2) not null,
  cantidad  integer not null check (cantidad > 0)
);

create table if not exists reservas (
  id         bigserial primary key,
  tipo       text not null check (tipo in ('tertulia', 'mesa')),
  referencia text not null,
  nombre     text not null,
  email      text,
  fecha      date,
  hora       text,
  personas   integer not null default 1 check (personas between 1 and 12),
  creado_en  timestamptz not null default now()
);

create table if not exists suscriptores (
  email     text primary key,
  creado_en timestamptz not null default now()
);

create index if not exists pedidos_creado_idx on pedidos (creado_en desc);
create index if not exists lineas_pedido_idx on pedido_lineas (pedido_id);
create index if not exists reservas_evento_idx on reservas (tipo, referencia);
create index if not exists reservas_creado_idx on reservas (creado_en desc);

-- ---------------------------------------------------------------- stock inicial
insert into libros (id, titulo, precio, stock) values
  ('nebrija-gramatica-1492',            'Gramática de la lengua castellana',                    32.00, 6),
  ('celestina-rojas-1499',              'Comedia de Calisto y Melibea (La Celestina)',          21.50, 11),
  ('vitoria-relectio-1539',             'Relectio de Indis',                                    26.00, 8),
  ('luis-leon-nombres-1583',            'De los nombres de Cristo',                             22.00, 9),
  ('cortes-sphera-1551',                'Breve compendio de la sphera y de la arte de navegar', 38.00, 4),
  ('lazarillo-tormes-1554',             'La vida de Lazarillo de Tormes',                       14.00, 16),
  ('castanega-supersticiones-1529',     'Tratado de las supersticiones y hechicerías',          24.00, 7),
  ('huarte-examen-1575',                'Examen de ingenios para las ciencias',                 27.50, 6),
  ('suarez-tractatus-1612',             'Tractatus de legibus ac Deo legislatore',              45.00, 3),
  ('leon-arbol-1605',                   'El árbol de la ciencia y compendio botánico',          28.00, 5),
  ('sanjuan-cantico-1584',              'Cántico espiritual y Noche oscura del alma',           19.50, 10),
  ('unamuno-sentimiento-1912',          'Del sentimiento trágico de la vida',                   18.50, 14),
  ('unamuno-niebla-1914',               'Niebla',                                               18.50, 12),
  ('martin-gaite-cuarto-1978',          'El cuarto de atrás',                                   20.50, 9),
  ('sotomayor-algoritmos-2025',         'Algoritmos de la poesía y el pensamiento',             24.90, 8),
  ('debaran-redes-2026',                'Redes neuronales y creatividad literaria',             26.50, 7),
  ('villanueva-sonetos-2024',           'Sonetos de la Plaza Mayor',                            16.00, 13),
  ('usal-universidad-2023',             'La Universidad del saber libre',                       35.00, 5)
on conflict (id) do update
  set titulo = excluded.titulo,
      precio = excluded.precio;

-- ------------------------------------------------------------------- eventos
insert into eventos (id, titulo, plazas) values
  ('oraculo-poetico', 'El Oráculo: ¿puede una máquina escribir un soneto?', 9),
  ('club-niebla',     'Club de lectura: Niebla, de Unamuno',                14),
  ('taller-archivo',  'Taller: leer un incunable sin miedo',                6)
on conflict (id) do update
  set titulo = excluded.titulo,
      plazas = excluded.plazas;

-- ------------------------------------------------------- alta de pedido atómica
create or replace function crear_pedido(
  p_nombre        text,
  p_email         text,
  p_entrega       text,
  p_direccion     text,
  p_ciudad        text,
  p_cp            text,
  p_notas         text,
  p_items         jsonb,
  p_idempotency   text
) returns table (id bigint, referencia text, subtotal numeric, envio numeric, total numeric, creado_en timestamptz)
language plpgsql as $$
declare
  v_id            bigint;
  v_existente     pedidos%rowtype;
  v_items_validos integer;
  v_falta         text;
  v_subtotal      numeric(10,2);
  v_envio         numeric(10,2);
begin
  if p_idempotency is not null and length(p_idempotency) > 0 then
    select * into v_existente from pedidos where idempotency_key = p_idempotency;
    if found then
      return query select v_existente.id, v_existente.referencia, v_existente.subtotal,
                          v_existente.envio, v_existente.total, v_existente.creado_en;
      return;
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CESTA_VACIA' using errcode = 'P0001';
  end if;

  select count(*) into v_items_validos
  from jsonb_to_recordset(p_items) as x(libro_id text, cantidad int)
  join libros l on l.id = x.libro_id;

  if v_items_validos <> jsonb_array_length(p_items) then
    raise exception 'LIBRO_DESCONOCIDO' using errcode = 'P0001';
  end if;

  -- Bloquea las filas del pedido para que dos compras simultáneas no sobregiren stock.
  perform 1
  from libros l
  join jsonb_to_recordset(p_items) as x(libro_id text, cantidad int) on x.libro_id = l.id
  order by l.id
  for update;

  select x.libro_id into v_falta
  from jsonb_to_recordset(p_items) as x(libro_id text, cantidad int)
  join libros l on l.id = x.libro_id
  where x.cantidad < 1 or l.stock < x.cantidad
  limit 1;

  if v_falta is not null then
    raise exception 'STOCK:%', v_falta using errcode = 'P0001';
  end if;

  select coalesce(sum(l.precio * x.cantidad), 0) into v_subtotal
  from jsonb_to_recordset(p_items) as x(libro_id text, cantidad int)
  join libros l on l.id = x.libro_id;

  v_envio := case when p_entrega = 'envio' and v_subtotal < 35 then 4.50 else 0 end;

  insert into pedidos (
    referencia, nombre, email, entrega, direccion, ciudad, cp, notas,
    subtotal, envio, total, idempotency_key
  ) values (
    'LAS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('pedido_ref_seq')::text, 5, '0'),
    p_nombre, p_email, p_entrega,
    case when p_entrega = 'envio' then p_direccion end,
    case when p_entrega = 'envio' then p_ciudad end,
    case when p_entrega = 'envio' then p_cp end,
    p_notas, v_subtotal, v_envio, v_subtotal + v_envio,
    nullif(p_idempotency, '')
  ) returning pedidos.id into v_id;

  insert into pedido_lineas (pedido_id, libro_id, titulo, precio, cantidad)
  select v_id, l.id, l.titulo, l.precio, x.cantidad
  from jsonb_to_recordset(p_items) as x(libro_id text, cantidad int)
  join libros l on l.id = x.libro_id;

  update libros l
     set stock = l.stock - x.cantidad,
         actualizado_en = now()
  from jsonb_to_recordset(p_items) as x(libro_id text, cantidad int)
  where l.id = x.libro_id;

  return query
    select p.id, p.referencia, p.subtotal, p.envio, p.total, p.creado_en
    from pedidos p where p.id = v_id;
end;
$$;

-- ------------------------------------------------- reserva de tertulia atómica
create or replace function reservar_tertulia(
  p_evento   text,
  p_nombre   text,
  p_email    text,
  p_personas integer
) returns table (id bigint, plazas_restantes integer)
language plpgsql as $$
declare
  v_plazas   integer;
  v_ocupadas integer;
  v_id       bigint;
begin
  if p_personas is null or p_personas < 1 or p_personas > 6 then
    raise exception 'PERSONAS_INVALIDAS' using errcode = 'P0001';
  end if;

  -- Cualificamos la columna: el OUT param `id` del RETURNS TABLE la ocultaría.
  select e.plazas into v_plazas from eventos e where e.id = p_evento for update;
  if not found then
    raise exception 'EVENTO_DESCONOCIDO' using errcode = 'P0001';
  end if;

  select coalesce(sum(personas), 0) into v_ocupadas
  from reservas where tipo = 'tertulia' and referencia = p_evento;

  if v_ocupadas + p_personas > v_plazas then
    raise exception 'SIN_PLAZAS:%', greatest(v_plazas - v_ocupadas, 0) using errcode = 'P0001';
  end if;

  insert into reservas (tipo, referencia, nombre, email, personas)
  values ('tertulia', p_evento, p_nombre, p_email, p_personas)
  returning reservas.id into v_id;

  return query select v_id, v_plazas - v_ocupadas - p_personas;
end;
$$;


-- Bandeja de salida: todo correo se compone y se guarda antes de intentar
-- enviarse, para poder demostrarlo y auditar qué se dijo y cuándo.
create table if not exists outbox (
  id bigserial primary key,
  tipo text not null,
  destinatario text not null,
  asunto text not null,
  html text not null,
  texto text,
  estado text not null default 'encolado',
  proveedor text,
  error text,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz
);

create index if not exists outbox_creado_idx on outbox (creado_en desc);


-- Novedades traídas de una fuente externa (Open Library). Se sincronizan solas
-- cada semana con un cron de Vercel; la web las pinta sin tocar código.
create table if not exists novedades_feed (
  id          text primary key,
  titulo      text not null,
  autor       text,
  anio        integer,
  editorial   text,
  paginas     integer,
  portada_url text,
  fuente      text not null default 'openlibrary',
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create index if not exists novedades_feed_anio_idx on novedades_feed (anio desc);


-- Opiniones de lectores. `origen = 'casa'` son las reseñas que firma el equipo
-- de la librería (no cuentan como opinión de un cliente); `'lector'` son las que
-- llegan por el formulario de la ficha y se guardan tal cual.
create table if not exists resenas (
  id         bigserial primary key,
  libro_id   text not null,
  nombre     text not null,
  valoracion smallint not null check (valoracion between 1 and 5),
  texto      text not null,
  origen     text not null default 'lector' check (origen in ('lector', 'casa')),
  aprobada   boolean not null default true,
  creado_en  timestamptz not null default now()
);

create index if not exists resenas_libro_idx on resenas (libro_id, creado_en desc);

commit;
