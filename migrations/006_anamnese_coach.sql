-- ============================================================================
-- 006_anamnese_coach — Coach edita/cria anamnese de aluno VINCULADO + auditoria
-- ADITIVA: colunas de auditoria, trigger de auditoria/consentimento, duas
-- policies novas e um grant de coluna. O único ALTER existente relaxa o
-- NOT NULL de consentimento_em (não destrói dado): anamnese criada pelo
-- coach nasce com consentimento_em NULL = "consentimento do aluno pendente".
--
-- LGPD:
--   · consentimento é EXCLUSIVO do aluno — o trigger zera qualquer
--     consentimento_em vindo de um editor que não seja o dono, e mantém
--     imutável o consentimento original uma vez registrado;
--   · aluno gravando a própria anamnese continua obrigado a consentir
--     (o trigger recusa INSERT do dono sem consentimento_em — garante o
--     que o NOT NULL garantia antes, agora só para o fluxo do aluno);
--   · atualizado_por / atualizado_por_papel são preenchidos SEMPRE pelo
--     trigger (nunca pelo cliente — não há grant de INSERT/UPDATE neles).
--
-- ROLLBACK (manual, só com autorização humana):
--   drop policy anamneses_update_coach on public.anamneses;
--   drop policy anamneses_insert_coach on public.anamneses;
--   drop trigger trg_anamneses_auditoria on public.anamneses;
--   drop function public.anamneses_auditoria();
--   revoke update (consentimento_em) on public.anamneses from authenticated;
--   -- colunas atualizado_por/atualizado_por_papel: manter (dado de auditoria);
--   -- NOT NULL de consentimento_em só pode voltar se não houver linha NULL.
-- ============================================================================

alter table public.anamneses alter column consentimento_em drop not null;

alter table public.anamneses add column atualizado_por uuid
  references public.profiles(id) on delete set null;
alter table public.anamneses add column atualizado_por_papel text
  check (atualizado_por_papel in ('aluno','coach'));

comment on column public.anamneses.consentimento_em is
  'Consentimento LGPD do aluno. NULL = preenchida pelo coach, consentimento pendente. Uma vez registrado, imutável (trigger).';
comment on column public.anamneses.atualizado_por is
  'Auditoria: profile do último editor. Preenchido pelo trigger, nunca pelo cliente.';
comment on column public.anamneses.atualizado_por_papel is
  'Auditoria: papel do último editor (aluno = dono; coach = qualquer outro). Preenchido pelo trigger.';

create function public.anamneses_auditoria()
returns trigger
language plpgsql
as $$
declare
  editor uuid := auth.uid();
begin
  -- conexões administrativas (postgres: seeds, backup, testes) passam direto
  if current_user <> 'authenticated' or editor is null then
    return new;
  end if;

  new.atualizado_por := editor;
  new.atualizado_por_papel := case when editor = new.profile_id then 'aluno' else 'coach' end;

  if tg_op = 'UPDATE' then
    new.profile_id := old.profile_id; -- identidade imutável (reforça o grant)
    if old.consentimento_em is not null then
      -- consentimento original imutável, inclusive pelo próprio aluno
      new.consentimento_em := old.consentimento_em;
    elsif editor <> new.profile_id then
      -- coach nunca consente pelo aluno
      new.consentimento_em := null;
    end if;
  else -- INSERT
    if editor <> new.profile_id then
      -- coach nunca consente pelo aluno: nasce pendente
      new.consentimento_em := null;
    elsif new.consentimento_em is null then
      raise exception 'consentimento_em é obrigatório quando o próprio aluno grava a anamnese';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_anamneses_auditoria
  before insert or update on public.anamneses
  for each row execute function public.anamneses_auditoria();

-- coach: escrita SOMENTE de alunos vinculados a ele (espelha o select_coach)
create policy anamneses_insert_coach on public.anamneses
  for insert to authenticated
  with check (
    public.is_coach(auth.uid())
    and exists (
      select 1 from public.alunos a
      where a.profile_id = anamneses.profile_id
        and a.coach_id = auth.uid()
    )
  );

create policy anamneses_update_coach on public.anamneses
  for update to authenticated
  using (
    public.is_coach(auth.uid())
    and exists (
      select 1 from public.alunos a
      where a.profile_id = anamneses.profile_id
        and a.coach_id = auth.uid()
    )
  )
  with check (
    public.is_coach(auth.uid())
    and exists (
      select 1 from public.alunos a
      where a.profile_id = anamneses.profile_id
        and a.coach_id = auth.uid()
    )
  );

-- aluno confirma consentimento pendente via UPDATE; o trigger garante que
-- só o dono consegue efetivar (e que o valor original nunca muda depois)
grant update (consentimento_em) on public.anamneses to authenticated;
