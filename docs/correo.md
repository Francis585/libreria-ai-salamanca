# Correo transaccional · bandeja de salida y pruebas

Complemento de la Demo A. No hay proveedor configurado todavía, así que **hoy
ningún correo sale del sistema**: se componen, se guardan y se leen en el admin.

## Por qué así

- **Nada se envía sin quedar registrado.** Todo mensaje se escribe primero en la
  tabla `outbox` (tipo, destinatario, asunto, HTML, texto, estado) y después se
  intenta entregar. Se puede enseñar y auditar sin depender de un proveedor.
- **Un fallo de correo no rompe una reserva.** `queueEmail()` captura sus
  propios errores: si el correo falla, la plaza sigue confirmada y el fallo
  queda anotado en `outbox.error`.
- **Sin clave, sigue sirviendo.** Estado `simulado`: el mensaje existe, se
  previsualiza y se puede enseñar en la presentación.

## Estados

| Estado | Significado |
|---|---|
| `encolado` | insertado, entrega en curso |
| `simulado` | compuesto y guardado; no hay `RESEND_API_KEY` |
| `enviado` | aceptado por el proveedor (con `proveedor` y `enviado_en`) |
| `error` | el proveedor lo rechazó; el motivo está en `error` |

## Correos que existen

1. **Reserva de tertulia** — se dispara desde `POST /api/reservas` con
   `tipo: "tertulia"`. Lleva el título del encuentro y **las plazas que quedan
   después** de esa reserva (no las de antes).
2. **Reserva de mesa** — `tipo: "mesa"`, con fecha, hora y comensales.
3. **Bienvenida al boletín** — solo cuando el alta es nueva (`nuevo: true`), no
   en cada intento duplicado.

## Cómo probarlo

En el admin (`/admin` → pestaña **Correos**):

1. Escribe un destino cualquiera y pulsa **Probar**: genera los tres correos de
   la casa y los lista.
2. Selecciona uno y se previsualiza tal cual llegaría, en un iframe sin scripts.

O por API, con `Authorization: Bearer $ADMIN_SECRET`:

```bash
POST /api/emails-prueba   {"email":"tu@correo.com","nombre":"Tu nombre"}
GET  /api/admin-emails    # últimos 40, con html
```

## Activar el envío real

1. Crear cuenta en Resend y una API key.
2. Añadir en Vercel (preview y producción) `RESEND_API_KEY`.
3. Opcional: `EMAIL_FROM` con un remitente de un dominio verificado.

Con el dominio de pruebas de Resend (`onboarding@resend.dev`) **solo se puede
enviar al correo con el que te registraste**: suficiente para comprobar la
cadena completa, no para escribir a clientes. Para eso hace falta un dominio
con SPF y DKIM; `libreriaaisalamanca.es` no existe, así que hoy no hay forma de
enviar correo legítimo a terceros.

**Gmail no se usa**: exigiría `nodemailer` y una contraseña de aplicación,
pondría tu cuenta personal como remitente y tiene límite de ~500 envíos al día.
Resend por HTTP no añade dependencias y es lo que quedó implementado.

## Límites conocidos

- No hay reintentos ni cola con backoff: un `error` se queda así hasta que se
  reintente a mano.
- No hay baja automática del boletín: el texto pide responder «baja», pero nadie
  procesa esa respuesta.
- Los correos no llevan `List-Unsubscribe` ni versión AMP.
- El HTML está probado en Chromium y en la vista previa del admin; no en
  Outlook de escritorio (usa tablas, así que debería aguantar).

## Pruebas automatizadas

```bash
npm run test:correos   # 13 comprobaciones, sin salir a internet
npm run test:smtp      # cadena SMTP con captura de los 3 mensajes
```

`test:correos` levanta un SMTP local que captura los mensajes y comprueba:
reserva de tertulia (201 y correo generado), que el correo diga **las plazas que
quedan de verdad**, asunto con el título del encuentro, reserva de mesa con fecha
y hora, honeypot que no genera correo, email mal formado rechazado con 400,
estado `enviado` por smtp, HTML sin marcadores sin sustituir, dirección de la
librería presente, versión en texto plano, `multipart/alternative` en el mensaje
capturado y estado `simulado` cuando no hay proveedor. Deja la base como estaba.
