-- ============================================================================
-- 003_programas — Programas, sessões e exercícios da sessão (R1, Bloco 4)
-- ADITIVA: cria programas, sessoes, sessao_exercicios; policies; grants;
-- índices; e a policy de leitura do aluno em exercicios (prometida na 002).
--
-- Regras de negócio no banco:
--  · aluno só enxerga programa/sessões/exercícios quando status='publicado'
--  · coach só mexe no que é dele (coach_id = auth.uid())
--  · DELETE de programa só em rascunho; sessões/itens deletáveis até existir
--    execução (a migration 004 cria FKs ON DELETE RESTRICT que congelam
--    o histórico executado — proteção no banco, não só na UI)
--
-- ROLLBACK (manual, só com autorização humana):
--   drop policy exercicios_select_aluno_publicado on public.exercicios;
--   drop table public.sessao_exercicios;
--   drop table public.sessoes;
--   drop table public.programas;
-- ============================================================================

create table public.programas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  coach_id uuid not null references public.profiles(id),
  titulo text not null,
  objetivo text,
  descricao text,
  data_inicio date,
  data_fim date,
  status text not null default 'rascunho'
    check (status in ('rascunho','publicado','pausado','concluido')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.programas(id) on delete cascade,
  semana int not null default 1 check (semana between 1 and 6),
  ordem int not null default 1,
  titulo text not null,
  dias_sugeridos text[],
  duracao_estimada_min int check (duracao_estimada_min between 5 and 240),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessao_exercicios (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessoes(id) on delete cascade,
  exercicio_id uuid not null references public.exercicios(id),
  exercicio_alternativo_id uuid references public.exercicios(id),
  ordem int not null default 1,
  series int not null default 3 check (series between 1 and 10),
  repeticoes text not null default '10',
  carga_sugerida text,
  intervalo_seg int check (intervalo_seg between 0 and 600),
  cadencia text,
  rpe text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_programas_aluno on public.programas (aluno_id);
create index idx_programas_coach on public.programas (coach_id);
create index idx_sessoes_programa on public.sessoes (programa_id);
create index idx_sessao_ex_sessao on public.sessao_exercicios (sessao_id);
create index idx_sessao_ex_exercicio on public.sessao_exercicios (exercicio_id);

create trigger trg_programas_updated_at
  before update on public.programas
  for each row execute function public.set_updated_at();
create trigger trg_sessoes_updated_at
  before update on public.sessoes
  for each row execute function public.set_updated_at();
create trigger trg_sessao_ex_updated_at
  before update on public.sessao_exercicios
  for each row execute function public.set_updated_at();

alter table public.programas enable row level security;
alter table public.sessoes enable row level security;
alter table public.sessao_exercicios enable row level security;

-- ------------------------------- programas --------------------------------
create policy programas_select_coach on public.programas
  for select to authenticated
  using (public.is_coach(auth.uid()) and coach_id = auth.uid());

create policy programas_select_aluno_publicado on public.programas
  for select to authenticated
  using (
    status = 'publicado'
    and exists (
      select 1 from public.alunos a
      where a.id = programas.aluno_id and a.profile_id = auth.uid()
    )
  );

create policy programas_insert_coach on public.programas
  for insert to authenticated
  with check (
    public.is_coach(auth.uid()) and coach_id = auth.uid()
    and exists (
      select 1 from public.alunos a
      where a.id = programas.aluno_id and a.coach_id = auth.uid()
    )
  );

create policy programas_update_coach on public.programas
  for update to authenticated
  using (public.is_coach(auth.uid()) and coach_id = auth.uid())
  with check (public.is_coach(auth.uid()) and coach_id = auth.uid());

create policy programas_delete_coach_rascunho on public.programas
  for delete to authenticated
  using (public.is_coach(auth.uid()) and coach_id = auth.uid() and status = 'rascunho');

-- -------------------------------- sessoes ---------------------------------
create policy sessoes_all_coach on public.sessoes
  for all to authenticated
  using (
    public.is_coach(auth.uid()) and exists (
      select 1 from public.programas p
      where p.id = sessoes.programa_id and p.coach_id = auth.uid()
    )
  )
  with check (
    public.is_coach(auth.uid()) and exists (
      select 1 from public.programas p
      where p.id = sessoes.programa_id and p.coach_id = auth.uid()
    )
  );

create policy sessoes_select_aluno_publicado on public.sessoes
  for select to authenticated
  using (
    exists (
      select 1 from public.programas p
      join public.alunos a on a.id = p.aluno_id
      where p.id = sessoes.programa_id
        and a.profile_id = auth.uid()
        and p.status = 'publicado'
    )
  );

-- --------------------------- sessao_exercicios ----------------------------
create policy sessao_ex_all_coach on public.sessao_exercicios
  for all to authenticated
  using (
    public.is_coach(auth.uid()) and exists (
      select 1 from public.sessoes s
      join public.programas p on p.id = s.programa_id
      where s.id = sessao_exercicios.sessao_id and p.coach_id = auth.uid()
    )
  )
  with check (
    public.is_coach(auth.uid()) and exists (
      select 1 from public.sessoes s
      join public.programas p on p.id = s.programa_id
      where s.id = sessao_exercicios.sessao_id and p.coach_id = auth.uid()
    )
  );

create policy sessao_ex_select_aluno_publicado on public.sessao_exercicios
  for select to authenticated
  using (
    exists (
      select 1 from public.sessoes s
      join public.programas p on p.id = s.programa_id
      join public.alunos a on a.id = p.aluno_id
      where s.id = sessao_exercicios.sessao_id
        and a.profile_id = auth.uid()
        and p.status = 'publicado'
    )
  );

-- ------------- exercicios: visibilidade do aluno (prometida na 002) -------
create policy exercicios_select_aluno_publicado on public.exercicios
  for select to authenticated
  using (
    exists (
      select 1 from public.sessao_exercicios se
      join public.sessoes s on s.id = se.sessao_id
      join public.programas p on p.id = s.programa_id
      join public.alunos a on a.id = p.aluno_id
      where (se.exercicio_id = exercicios.id or se.exercicio_alternativo_id = exercicios.id)
        and a.profile_id = auth.uid()
        and p.status = 'publicado'
    )
  );

-- --------------------------------- grants ---------------------------------
grant select, delete on public.programas to authenticated;
grant insert (aluno_id, coach_id, titulo, objetivo, descricao, data_inicio, data_fim, status, observacoes)
  on public.programas to authenticated;
grant update (titulo, objetivo, descricao, data_inicio, data_fim, status, observacoes)
  on public.programas to authenticated;

grant select, delete on public.sessoes to authenticated;
grant insert (programa_id, semana, ordem, titulo, dias_sugeridos, duracao_estimada_min, observacoes)
  on public.sessoes to authenticated;
grant update (semana, ordem, titulo, dias_sugeridos, duracao_estimada_min, observacoes)
  on public.sessoes to authenticated;

grant select, delete on public.sessao_exercicios to authenticated;
grant insert (sessao_id, exercicio_id, exercicio_alternativo_id, ordem, series, repeticoes,
              carga_sugerida, intervalo_seg, cadencia, rpe, observacao)
  on public.sessao_exercicios to authenticated;
grant update (exercicio_id, exercicio_alternativo_id, ordem, series, repeticoes,
              carga_sugerida, intervalo_seg, cadencia, rpe, observacao)
  on public.sessao_exercicios to authenticated;
