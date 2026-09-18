# Mi Obra — Las Liebres

App de control financiero para la construcción de la casa en Las Liebres: presupuesto vs.
comprometido vs. pagado, multi-moneda (ARS/USD), compromisos con proveedores, fuentes de
fondeo y cash flow proyectado. Ver el PRD original para el detalle funcional completo.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, con Supabase (Postgres + API) como
backend. Sin ORM: `@supabase/supabase-js` directo contra tipos escritos a mano en
`src/lib/database.types.ts`.

El proyecto Supabase usado es compartido con otra aplicación — todas las tablas de esta app
viven en un schema de Postgres dedicado, `obra_liebres`, no en `public`, para no colisionar
con nada existente (ver `supabase/migrations/0001_init.sql`).

## Setup

1. `npm install`
2. Copiá `.env.local.example` a `.env.local` y completá los 3 valores de tu proyecto
   Supabase (Project URL, Publishable key, connection string de Postgres — usá la del
   **connection pooler**, no la directa, si tu red no tiene salida IPv6).
3. En el dashboard de Supabase: **Project Settings → Data API → Exposed schemas**, agregá
   `obra_liebres` a la lista (sin sacar `public`).
4. `npm run migrate` — crea el schema, los tipos y las tablas.
5. `npm run seed` — carga el proyecto "Obra Las Liebres" con los rubros del PRD y los datos
   reales del Excel de origen (una sola vez; si ya existe un proyecto, no hace nada).
6. `npm run dev` y abrí `http://localhost:3000`.

## Estructura

- `supabase/migrations/` — SQL versionado, aplicado con `scripts/migrate.ts` (no requiere
  Supabase CLI ni Docker: usa `pg` directo contra la connection string).
- `src/lib/database.types.ts` — tipos de la base, a mano (usar `type`, no `interface`: ver
  el comentario en el archivo — con `interface` la inferencia de `@supabase/supabase-js` se
  rompe silenciosamente).
- `src/lib/finance/` — toda la lógica de negocio (EAC, semáforo, fondeo, cash flow) como
  funciones puras sobre las filas crudas de Supabase, sin vistas SQL.
- `src/lib/data.ts` — único punto de carga de datos (`loadProjectData()`), usado por todas
  las pantallas.
- `src/app/*/actions.ts` — Server Actions por módulo (sin API REST intermedia).

## Notas

- Sin autenticación en V1 (uso personal) — RLS deshabilitado a propósito. Antes de deployar
  a un lugar públicamente accesible hay que agregar Supabase Auth + RLS.
- Los pagos conservan su tipo de cambio histórico al momento de crearse; los montos
  pendientes (comprometido no pagado, presupuesto) se convierten a USD con el tipo de
  cambio de referencia configurable en `/configuracion`.
