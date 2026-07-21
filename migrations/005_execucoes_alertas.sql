-- ============================================================================
-- 005_execucoes_alertas — Execução de treino + alertas de dor (R1, Bloco 6)
-- ADITIVA: cria execucoes, execucao_series, alertas; policies; grants; índices.
--
-- Decisões de modelagem:
--  · Histórico IMUTÁVEL: execucao_series.sessao_exercicio_id e
--    execucoes.sessao_id são ON DELETE RESTRICT — o banco impede apagar
--    sessões/itens já executados (mesmo via cascata de programa).
--  · Séries granulares com timestamps (registrada_em) e SNAPSHOT do
--    prescrito (exercicio_nome, reps/carga prescritas) — edições futuras
--    do programa não reescrevem o que foi feito. Portas abertas para
--    wearables sem nada implementado agora.
--  · Alerta de dor >= 7: criado pelo próprio fluxo do aluno, visível ao
--    aluno dono e ao coach vinculado. Sem diagnóstico, sem tratamento.
--
-- ROLLBACK (manual, só com autorização humana):
--   drop table public.alertas;
--   drop table public.execucao_series;
--   drop table public.execucoes;
-- ============================================================================

create table public.execucoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  programa_id uuid not null references public.programas(id) on delete restrict,
  sessao_id uuid not null references public.sessoes(id) on delete restrict,
  status text not null default 'iniciado'
    check (status in ('iniciado','concluido','parcial','abandonado')),
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  duracao_seg int check (duracao_seg >= 0),
  esforco int check (esforco between 1 and 10),
  dor int check (dor between 0 and 10),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.execucao_series (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references public.execucoes(id) on delete cascade,
  sessao_exercicio_id uuid not null references public.sessao_exercicios(id) on delete restrict,
  exercicio_nome text not null,
  serie int not null check (serie between 1 and 10),
  reps_prescritas text,
  carga_prescrita text,
  reps_realizadas int check (reps_realizadas between 0 and 200),
  carga_realizada text,
  concluida boolean not null default false,
  registrada_em timestamptz not null default now(),
  unique (execucao_id, sessao_exercicio_id, serie)
);

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  coach_id uuid not null references public.profiles(id),
  execucao_id uuid references public.execucoes(id) on delete cascade,
  tipo text not null default 'dor' check (tipo in ('dor')),
  dor int check (dor between 0 and 10),
  mensagem text,
  lido boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_execucoes_aluno on public.execucoes (aluno_id);
create index idx_execucoes_sessao on public.execucoes (sessao_id);
create index idx_exec_series_execucao on public.execucao_series (execucao_id);
create index idx_exec_series_sessao_ex on public.execucao_series (sessao_exercicio_id);
create index idx_alertas_coach on public.alertas (coach_id, lido);
create index idx_alertas_aluno on public.alertas (aluno_id);

create trigger trg_execucoes_updated_at
  before update on public.execucoes
  for each row execute function public.set_updated_at();

alter table public.execucoes enable row level security;
alter table public.execucao_series enable row level security;
alter table public.alertas enable row level security;

-- ------------------------------- execucoes --------------------------------
-- aluno dono: cria execução apenas de sessão de programa PUBLICADO dele
create policy execucoes_insert_aluno on public.execucoes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.alunos a
      where a.id = execucoes.aluno_id and a.profile_id = auth.uid()
    )
    and exists (
      select 1 from public.sessoes s
      join public.programas p on p.id = s.programa_id
      where s.id = execucoes.sessao_id
        and p.id = execucoes.programa_id
        and p.aluno_id = execucoes.aluno_id
        and p.status = 'publicado'
    )
  );

create policy execucoes_select_aluno on public.execucoes
  for select to authenticated
  using (
    exists (
      select 1 from public.alunos a
      where a.id = execucoes.aluno_id and a.profile_id = auth.uid()
    )
  );

create policy execucoes_update_aluno on public.execucoes
  for update to authenticated
  using (
    exists (
      select 1 from public.alunos a
      where a.id = execucoes.aluno_id and a.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.alunos a
      where a.id = execucoes.aluno_id and a.profile_id = auth.uid()
    )
  );

create policy execucoes_select_coach on public.execucoes
  for select to authenticated
  using (
    public.is_coach(auth.uid()) and exists (
      select 1 from public.alunos a
      where a.id = execucoes.aluno_id and a.coach_id = auth.uid()
    )
  );

-- ---------------------------- execucao_series -----------------------------
create policy exec_series_all_aluno on public.execucao_series
  for all to authenticated
  using (
    exists (
      select 1 from public.execucoes e
      join public.alunos a on a.id = e.aluno_id
      where e.id = execucao_series.execucao_id and a.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.execucoes e
      join public.alunos a on a.id = e.aluno_id
      where e.id = execucao_series.execucao_id and a.profile_id = auth.uid()
    )
  );

create policy exec_series_select_coach on public.execucao_series
  for select to authenticated
  using (
    public.is_coach(auth.uid()) and exists (
      select 1 from public.execucoes e
      join public.alunos a on a.id = e.aluno_id
      where e.id = execucao_series.execucao_id and a.coach_id = auth.uid()
    )
  );

-- --------------------------------- alertas --------------------------------
-- aluno cria alerta apenas para si e endereçado ao SEU coach
create policy alertas_insert_aluno on public.alertas
  for insert to authenticated
  with check (
    exists (
      select 1 from public.alunos a
      where a.id = alertas.aluno_id
        and a.profile_id = auth.uid()
        and a.coach_id = alertas.coach_id
    )
  );

create policy alertas_select_aluno on public.alertas
  for select to authenticated
  using (
    exists (
      select 1 from public.alunos a
      where a.id = alertas.aluno_id and a.profile_id = auth.uid()
    )
  );

create policy alertas_select_coach on public.alertas
  for select to authenticated
  using (public.is_coach(auth.uid()) and coach_id = auth.uid());

-- coach marca como lido (grant restringe o UPDATE à coluna lido)
create policy alertas_update_coach on public.alertas
  for update to authenticated
  using (public.is_coach(auth.uid()) and coach_id = auth.uid())
  with check (public.is_coach(auth.uid()) and coach_id = auth.uid());

-- --------------------------------- grants ---------------------------------
grant select on public.execucoes to authenticated;
grant insert (aluno_id, programa_id, sessao_id, status, iniciado_em, finalizado_em,
              duracao_seg, esforco, dor, observacao)
  on public.execucoes to authenticated;
grant update (status, finalizado_em, duracao_seg, esforco, dor, observacao)
  on public.execucoes to authenticated;

grant select on public.execucao_series to authenticated;
grant insert (execucao_id, sessao_exercicio_id, exercicio_nome, serie,
              reps_prescritas, carga_prescrita, reps_realizadas, carga_realizada,
              concluida, registrada_em)
  on public.execucao_series to authenticated;
grant update (reps_realizadas, carga_realizada, concluida, registrada_em)
  on public.execucao_series to authenticated;

grant select on public.alertas to authenticated;
grant insert (aluno_id, coach_id, execucao_id, tipo, dor, mensagem)
  on public.alertas to authenticated;
grant update (lido) on public.alertas to authenticated;
