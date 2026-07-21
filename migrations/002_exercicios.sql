-- ============================================================================
-- 002_exercicios — Biblioteca de exercícios do coach (Release 1, Bloco 3)
-- ADITIVA: cria tabela exercicios, policies, grants, índice.
--
-- Visibilidade do aluno: adicionada na migration 003 (policy que referencia
-- sessao_exercicios/programas — tabelas que ainda não existem aqui).
-- Exclusão física NÃO existe (sem policy DELETE): o fluxo é inativar.
--
-- ROLLBACK (manual, só com autorização humana):
--   drop trigger trg_exercicios_updated_at on public.exercicios;
--   drop table public.exercicios;
-- ============================================================================

create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid not null references public.profiles(id),
  nome text not null,
  grupo_muscular text,
  descricao text,
  instrucoes text,
  equipamento text,
  dificuldade text check (dificuldade in ('iniciante','intermediario','avancado')),
  video_url text,
  imagem_url text,
  seguranca text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.exercicios is
  'Biblioteca de exercícios do coach. Vídeos são opcionais — o fluxo não depende deles.';

create index idx_exercicios_criado_por on public.exercicios (criado_por);

create trigger trg_exercicios_updated_at
  before update on public.exercicios
  for each row execute function public.set_updated_at();

alter table public.exercicios enable row level security;

-- coach dono: leitura e escrita completas do próprio catálogo
create policy exercicios_select_dono on public.exercicios
  for select to authenticated
  using (public.is_coach(auth.uid()) and criado_por = auth.uid());

create policy exercicios_insert_dono on public.exercicios
  for insert to authenticated
  with check (public.is_coach(auth.uid()) and criado_por = auth.uid());

create policy exercicios_update_dono on public.exercicios
  for update to authenticated
  using (public.is_coach(auth.uid()) and criado_por = auth.uid())
  with check (public.is_coach(auth.uid()) and criado_por = auth.uid());

-- Grants por coluna (anon: nada)
grant select on public.exercicios to authenticated;
grant insert (
  criado_por, nome, grupo_muscular, descricao, instrucoes, equipamento,
  dificuldade, video_url, imagem_url, seguranca, ativo
) on public.exercicios to authenticated;
grant update (
  nome, grupo_muscular, descricao, instrucoes, equipamento,
  dificuldade, video_url, imagem_url, seguranca, ativo
) on public.exercicios to authenticated;
-- (UPDATE não inclui criado_por: autoria imutável)
