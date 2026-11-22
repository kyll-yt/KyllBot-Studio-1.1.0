create table if not exists public.kyll_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.kyll_state enable row level security;

-- Aucune policy publique : seule la clé service_role (côté serveur) accède à cette table.
