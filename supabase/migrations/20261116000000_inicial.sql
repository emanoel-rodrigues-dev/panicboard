-- PanicBoard: dados de cada pessoa, isolados por RLS (cada linha é do usuário que a criou).
-- Os ids são os do app (ex.: projeto "folha", demanda "PF-14"), únicos por usuário.

create table public.projetos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  sigla text not null check (sigla ~ '^[A-Z0-9]{1,3}$'),
  nome text not null check (length(nome) between 1 and 120),
  curto text not null check (length(curto) between 1 and 60),
  cor text not null check (cor ~ '^#[0-9a-f]{6}$'),
  tinta text not null check (tinta ~ '^#[0-9a-f]{6}$'),
  arquivado boolean not null default false,
  ordem integer not null default 0,
  primary key (user_id, id)
);

create table public.demandas (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  projeto text not null,
  titulo text not null check (length(titulo) between 1 and 300),
  status text not null check (status in ('backlog', 'fazer', 'fazendo', 'revisao', 'feito')),
  prioridade text not null check (prioridade in ('alta', 'media', 'baixa')),
  prazo timestamptz,
  descricao text not null default '',
  -- passos e histórico vivem com a demanda: são lidos e gravados sempre juntos
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  historico jsonb not null default '[]'::jsonb check (jsonb_typeof(historico) = 'array'),
  criado timestamptz not null,
  atualizado timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, projeto) references public.projetos (user_id, id)
);

create table public.ideias (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  texto text not null check (length(texto) between 1 and 5000),
  criado timestamptz not null,
  promovida text,
  ordem integer not null default 0,
  primary key (user_id, id)
);

-- contadores das chaves (PF-15, ID-6) e do "Trocar o GIF"
create table public.contadores (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  seq jsonb not null default '{}'::jsonb,
  seq_ideia integer not null default 0,
  girar jsonb not null default '{}'::jsonb
);

create index demandas_projeto on public.demandas (user_id, projeto);

do $$
declare t text;
begin
  foreach t in array array['projetos', 'demandas', 'ideias', 'contadores'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "dono" on public.%I for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;
