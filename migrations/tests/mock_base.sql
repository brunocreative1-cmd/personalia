-- ============================================================================
-- MOCK BASE (andaime de teste local) — reconstrução mínima de 000..006
-- NÃO faz parte da migration 007. Serve só para ancorar o teste no Postgres.
-- Colunas assumidas a partir do relatório de auditoria; divergências reais
-- devem ser reconciliadas contra os arquivos 000..006 antes de executar.
-- ============================================================================

-- [v2] pior caso realista (layout Supabase): pgcrypto vive SÓ no schema
-- extensions — nada de digest() em public. A 007 v2 precisa funcionar assim.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Supabase-like auth --------------------------------------------------------
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
-- auth.uid() lê um GUC de sessão (padrão de teste de RLS Supabase local)
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('app.uid', true), '')::uuid
$$;

-- Papéis Supabase
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
end $$;
grant usage on schema auth to authenticated, anon;
grant usage on schema public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;

-- Helpers do projeto --------------------------------------------------------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- Tabelas base --------------------------------------------------------------
create table public.profiles (
  id uuid primary key,
  nome text, whatsapp text, cidade text,
  role text not null default 'aluno' check (role in ('aluno','coach')),
  created_at timestamptz default now()
);

create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  coach_id uuid not null references public.profiles(id),
  status text not null default 'novo' check (status in ('novo','ativo','pausado','concluido')),
  objetivo text,
  data_inicio date, data_fim date,
  created_at timestamptz default now()
);

create table public.anamneses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id),
  objetivo_principal text, equipamentos text, local_treino text,
  dores text, lesoes text, condicoes_saude text, medicamentos text,
  restricao_medica text, observacoes text,
  consentimento_em timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table public.programas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id),
  coach_id uuid not null references public.profiles(id),
  titulo text, objetivo text, descricao text,
  status text not null default 'rascunho' check (status in ('rascunho','publicado','pausado','concluido')),
  data_inicio date, data_fim date,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.programas(id) on delete restrict,
  titulo text, semana int not null default 1, ordem int default 0, observacoes text,
  created_at timestamptz default now()
);

create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  nome text not null, grupo_muscular text,
  instrucoes text, seguranca text, video_url text, imagem_url text,
  ativo boolean default true, criado_por uuid
);

create table public.sessao_exercicios (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessoes(id) on delete restrict,
  exercicio_id uuid references public.exercicios(id),
  exercicio_alternativo_id uuid references public.exercicios(id),
  ordem int default 0,
  series int, reps text, carga text, intervalo text, cadencia text, rpe text,
  observacoes text,
  created_at timestamptz default now()
);

create table public.execucoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references public.alunos(id),
  sessao_id uuid references public.sessoes(id) on delete restrict,
  created_at timestamptz default now()
);

create table public.execucao_series (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid references public.execucoes(id),
  sessao_exercicio_id uuid references public.sessao_exercicios(id) on delete restrict,
  exercicio_nome text, reps_prescritas text, carga_prescrita text,
  created_at timestamptz default now()
);

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references public.alunos(id),
  created_at timestamptz default now()
);

-- is_coach() e first_coach_id() ---------------------------------------------
create or replace function public.is_coach(p uuid default auth.uid()) returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles pr where pr.id = coalesce(p, auth.uid()) and pr.role = 'coach')
$$;
create or replace function public.first_coach_id() returns uuid language sql stable security definer as $$
  select id from public.profiles where role='coach' order by created_at limit 1
$$;

-- RLS base (simplificada, só o necessário p/ os testes) ----------------------
alter table public.profiles enable row level security;
alter table public.alunos enable row level security;
alter table public.anamneses enable row level security;
alter table public.programas enable row level security;
alter table public.sessoes enable row level security;
alter table public.sessao_exercicios enable row level security;

create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid() or public.is_coach(auth.uid()));
create policy alunos_coach on public.alunos for select to authenticated using (coach_id = auth.uid() or profile_id = auth.uid());
create policy anam_self on public.anamneses for all to authenticated using (profile_id = auth.uid() or public.is_coach(auth.uid())) with check (profile_id = auth.uid() or public.is_coach(auth.uid()));
create policy prog_coach on public.programas for all to authenticated
  using (coach_id = auth.uid() or exists(select 1 from public.alunos a where a.id=programas.aluno_id and a.profile_id=auth.uid()))
  with check (coach_id = auth.uid());
create policy sess_coach on public.sessoes for all to authenticated
  using (exists(select 1 from public.programas p where p.id=sessoes.programa_id and (p.coach_id=auth.uid() or exists(select 1 from public.alunos a where a.id=p.aluno_id and a.profile_id=auth.uid()))))
  with check (exists(select 1 from public.programas p where p.id=sessoes.programa_id and p.coach_id=auth.uid()));
create policy se_coach on public.sessao_exercicios for all to authenticated
  using (exists(select 1 from public.sessoes s join public.programas p on p.id=s.programa_id where s.id=sessao_exercicios.sessao_id and (p.coach_id=auth.uid() or exists(select 1 from public.alunos a where a.id=p.aluno_id and a.profile_id=auth.uid()))))
  with check (exists(select 1 from public.sessoes s join public.programas p on p.id=s.programa_id where s.id=sessao_exercicios.sessao_id and p.coach_id=auth.uid()));

grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.programas, public.sessoes, public.sessao_exercicios, public.anamneses to authenticated;
