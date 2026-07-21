-- ============================================================================
-- 001_anamneses — Anamnese operacional (Release 1, Bloco 2)
-- ADITIVA: cria função set_updated_at, tabela anamneses, policies, grants.
-- Não toca em nenhum objeto existente.
--
-- LGPD: contém dados sensíveis de saúde (Art. 11). consentimento_em é
-- NOT NULL — o banco recusa anamnese sem consentimento registrado.
-- anon não recebe nenhum grant.
--
-- ROLLBACK (manual, só com autorização humana):
--   drop trigger trg_anamneses_updated_at on public.anamneses;
--   drop table public.anamneses;
--   drop function public.set_updated_at();
-- ============================================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.anamneses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,

  -- treino
  objetivo_principal text,
  historico_treino text,
  nivel text,
  frequencia_semanal int check (frequencia_semanal between 1 and 7),
  dias_disponiveis text[],
  local_treino text,
  equipamentos text,
  duracao_disponivel_min int check (duracao_disponivel_min between 10 and 240),

  -- saúde (dados sensíveis — LGPD Art. 11)
  dores text,
  limitacoes text,
  lesoes text,
  condicoes_saude text,
  medicamentos text,
  restricao_medica text,

  -- rotina e consistência
  qualidade_sono text,
  energia text,
  dificuldade_consistencia text,
  observacoes text,

  -- controle
  consentimento_em timestamptz not null,
  status text not null default 'incompleta' check (status in ('incompleta','concluida')),
  preenchida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.anamneses is
  'Anamnese operacional do aluno. Dados sensíveis (LGPD Art. 11): salvar exige consentimento_em. Sem diagnóstico.';

create trigger trg_anamneses_updated_at
  before update on public.anamneses
  for each row execute function public.set_updated_at();

-- RLS: rls_auto_enable já ativa, mas explicitamos por clareza
alter table public.anamneses enable row level security;

-- aluno: dono total da própria anamnese
create policy anamneses_select_own on public.anamneses
  for select to authenticated
  using (profile_id = auth.uid());

create policy anamneses_insert_own on public.anamneses
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy anamneses_update_own on public.anamneses
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- coach: SOMENTE leitura, SOMENTE de alunos vinculados a ele
create policy anamneses_select_coach on public.anamneses
  for select to authenticated
  using (
    public.is_coach(auth.uid())
    and exists (
      select 1 from public.alunos a
      where a.profile_id = anamneses.profile_id
        and a.coach_id = auth.uid()
    )
  );

-- Grants por coluna (padrão do projeto; anon fica sem nada)
grant select on public.anamneses to authenticated;
grant insert (
  profile_id, objetivo_principal, historico_treino, nivel, frequencia_semanal,
  dias_disponiveis, local_treino, equipamentos, duracao_disponivel_min,
  dores, limitacoes, lesoes, condicoes_saude, medicamentos, restricao_medica,
  qualidade_sono, energia, dificuldade_consistencia, observacoes,
  consentimento_em, status, preenchida_em
) on public.anamneses to authenticated;
grant update (
  objetivo_principal, historico_treino, nivel, frequencia_semanal,
  dias_disponiveis, local_treino, equipamentos, duracao_disponivel_min,
  dores, limitacoes, lesoes, condicoes_saude, medicamentos, restricao_medica,
  qualidade_sono, energia, dificuldade_consistencia, observacoes,
  status, preenchida_em
) on public.anamneses to authenticated;
-- (UPDATE não inclui profile_id nem consentimento_em: identidade e
--  consentimento originais são imutáveis pelo cliente)
