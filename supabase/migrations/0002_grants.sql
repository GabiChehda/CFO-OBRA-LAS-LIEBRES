-- Un schema custom (no `public`) no tiene privilegios por defecto para los
-- roles de PostgREST. Sin autenticación en V1 y con RLS deshabilitado (ver
-- 0001_init.sql), el rol `anon` necesita acceso directo a los datos — esto es
-- el equivalente de lo que Supabase ya deja pre-configurado en `public`.

grant usage on schema obra_liebres to anon, authenticated, service_role;

grant all on all tables in schema obra_liebres to anon, authenticated, service_role;
grant all on all sequences in schema obra_liebres to anon, authenticated, service_role;

alter default privileges in schema obra_liebres
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema obra_liebres
  grant all on sequences to anon, authenticated, service_role;
