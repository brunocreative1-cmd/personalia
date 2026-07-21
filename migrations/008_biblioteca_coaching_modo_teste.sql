-- ============================================================================
-- 008_biblioteca_coaching_modo_teste.sql
-- Biblioteca canônica de músculos + camada de coaching por prescrição +
-- separação modo_teste/simulado — Personal IA 30 Dias OS
--
-- PRINCÍPIOS:
--   * Exclusivamente ADITIVA: nenhum objeto existente é alterado/destruído,
--     com UMA exceção declarada abaixo.
--   * ÚNICA função da 007 alterada: montar_snapshot_programa — e só para
--     ACRESCENTAR 'biblioteca' e 'musculos' dentro de cada item de
--     'exercicios'. Mesma assinatura, mesmo SECURITY DEFINER, mesmo
--     search_path=public, mesmas demais chaves do retorno inalteradas.
--     programas_publicar e os 6 triggers da 007 NÃO são tocados.
--   * Triggers novos:
--       - execucoes_deriva_simulado_trg: nasce LIGADO. Só deriva um valor
--         (todo programa hoje tem modo_teste=false por DEFAULT, então não
--         muda nenhum comportamento observável hoje).
--       - programas_modo_teste_imutavel_trg e execucoes_simulado_imutavel_trg:
--         nascem DESLIGADOS. Ligar em 008b, DEPOIS de
--         008_patch_modo_teste.sql rodar (arquivo separado, não aplicado).
--   * exercicios.grupo_muscular NÃO é migrado nem removido: continua sendo o
--     fallback de exibição quando exercicio_musculos estiver vazio para um
--     exercício (decisão de UI, fora do escopo desta migration).
--   * Este arquivo seeda APENAS a taxonomia estável de músculos (16 slugs,
--     vendor-agnostic — não depende de qual fornecedor de vídeo for usado).
--     NÃO seeda orientacoes_base / erro_comum / exercicio_musculos por
--     exercício real: esse conteúdo exige julgamento profissional do CREF
--     responsável e fica para preenchimento posterior (UI futura).
--
-- ROLLBACK (manual, só com autorização humana):
--   drop trigger execucoes_simulado_imutavel_trg on public.execucoes;
--   drop function public.execucoes_simulado_imutavel();
--   drop trigger programas_modo_teste_imutavel_trg on public.programas;
--   drop function public.programas_modo_teste_imutavel();
--   drop trigger execucoes_deriva_simulado_trg on public.execucoes;
--   drop function public.execucoes_deriva_simulado();
--   -- montar_snapshot_programa: reverter para a definição anterior (007)
--   drop table public.exercicio_musculos;
--   drop table public.musculos;
--   alter table public.exercicios drop constraint exercicios_orientacoes_base_check;
--   -- colunas novas: manter (perda de dado se dropadas) ou avaliar caso a caso
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA musculos — taxonomia canônica e estável (16 slugs)
-- ----------------------------------------------------------------------------
create table if not exists public.musculos (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,            -- identificador interno estável
  label      text not null,
  vista      text not null check (vista in ('frente','costas')),
  created_at timestamptz not null default now()
);

comment on table public.musculos is
  'Taxonomia canônica de músculos (frente/costas), independente de fornecedor de vídeo/conteúdo.';

insert into public.musculos (slug, label, vista) values
  ('deltoides',      'Ombros (deltoides)',   'frente'),
  ('peitoral',       'Peitoral',             'frente'),
  ('biceps',         'Bíceps',               'frente'),
  ('antebraco',      'Antebraços',           'frente'),
  ('abdomen',        'Abdômen',              'frente'),
  ('obliquos',       'Oblíquos',             'frente'),
  ('quadriceps',     'Quadríceps',           'frente'),
  ('adutores',       'Adutores',             'frente'),
  ('tibial',         'Tibial anterior',      'frente'),
  ('trapezio',       'Trapézio',             'costas'),
  ('dorsal',         'Dorsais',              'costas'),
  ('lombar',         'Lombar',               'costas'),
  ('triceps',        'Tríceps',              'costas'),
  ('gluteos',        'Glúteos',              'costas'),
  ('isquiotibiais',  'Posteriores de coxa',  'costas'),
  ('panturrilha',    'Panturrilhas',         'costas')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- 2. TABELA exercicio_musculos — junção exercicio<->musculo, com papel
-- ----------------------------------------------------------------------------
create table if not exists public.exercicio_musculos (
  id           uuid primary key default gen_random_uuid(),
  exercicio_id uuid not null references public.exercicios(id) on delete cascade,
  musculo_id   uuid not null references public.musculos(id),
  papel        text not null check (papel in ('primario','secundario')),
  created_at   timestamptz not null default now(),
  unique (exercicio_id, musculo_id)
);

-- ----------------------------------------------------------------------------
-- 3. COLUNAS NOVAS em exercicios (aditivas, nullable — SEM seed de conteúdo)
-- ----------------------------------------------------------------------------
alter table public.exercicios add column if not exists orientacoes_base text[];
alter table public.exercicios add column if not exists erro_comum text;

-- CHECK com cardinality() (corrige o loophole da versão anterior baseada em
-- array_length: cardinality('{}'::text[]) = 0, não NULL, então array vazio
-- agora é corretamente rejeitado). NULL explícito é permitido pelo primeiro
-- ramo do OR (coluna nullable — nenhum dos 74 exercícios reais tem conteúdo
-- ainda).
alter table public.exercicios add constraint exercicios_orientacoes_base_check
  check (orientacoes_base is null or (
    cardinality(orientacoes_base) between 1 and 3
    and array_position(orientacoes_base, null) is null
    and not ('' = any(orientacoes_base))
  ));

-- ----------------------------------------------------------------------------
-- 4. COLUNAS NOVAS em sessao_exercicios — camada de coaching por prescrição.
--    NÃO duplica exercicio_alternativo_id: alternativa_nota é só o comentário
--    do coach sobre a alternativa já referenciada pela FK existente.
-- ----------------------------------------------------------------------------
alter table public.sessao_exercicios add column if not exists motivo_no_plano text;
alter table public.sessao_exercicios add column if not exists orientacao_personalizada text;
alter table public.sessao_exercicios add column if not exists alternativa_nota text;

-- ----------------------------------------------------------------------------
-- 5. programas.modo_teste — imutável após criação (trigger nasce DESLIGADO)
-- ----------------------------------------------------------------------------
alter table public.programas add column if not exists modo_teste boolean not null default false;

create or replace function public.programas_modo_teste_imutavel() returns trigger
language plpgsql as $$
begin
  if old.modo_teste is distinct from new.modo_teste then
    raise exception '008: programas.modo_teste e imutavel apos a criacao';
  end if;
  return new;
end $$;
create trigger programas_modo_teste_imutavel_trg before update on public.programas
  for each row execute function public.programas_modo_teste_imutavel();
alter table public.programas disable trigger programas_modo_teste_imutavel_trg;   -- ligar em 008b

-- ----------------------------------------------------------------------------
-- 6. execucoes.simulado — derivado de programas.modo_teste no INSERT (LIGADO);
--    imutável no UPDATE (trigger nasce DESLIGADO)
-- ----------------------------------------------------------------------------
alter table public.execucoes add column if not exists simulado boolean not null default false;

create or replace function public.execucoes_deriva_simulado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select coalesce(p.modo_teste, false) into new.simulado
    from public.programas p where p.id = new.programa_id;
  return new;
end $$;
create trigger execucoes_deriva_simulado_trg before insert on public.execucoes
  for each row execute function public.execucoes_deriva_simulado();
-- nasce LIGADO: só deriva um valor (unconditional overwrite de NEW.simulado);
-- não bloqueia nada que já funcionava — todo programa hoje tem modo_teste=false.

create or replace function public.execucoes_simulado_imutavel() returns trigger
language plpgsql as $$
begin
  if old.simulado is distinct from new.simulado then
    raise exception '008: execucoes.simulado e imutavel (derivado na criacao)';
  end if;
  return new;
end $$;
create trigger execucoes_simulado_imutavel_trg before update on public.execucoes
  for each row execute function public.execucoes_simulado_imutavel();
alter table public.execucoes disable trigger execucoes_simulado_imutavel_trg;     -- ligar em 008b

-- ----------------------------------------------------------------------------
-- 7. montar_snapshot_programa — ÚNICA função da 007 alterada. Mesma
--    assinatura. Duas mudanças sobre a versão anterior deste mesmo arquivo:
--
--    a) ENDURECIMENTO: search_path = '' (vazio) em vez de 'public'. Todo
--       identificador de tabela já era 100% qualificado com public. (nenhuma
--       mudança de qualificação foi necessária); pg_catalog continua
--       implicitamente pesquisado pelo Postgres mesmo com search_path=''
--       (jsonb_build_object/jsonb_agg/to_jsonb/coalesce/now()/casts vivem
--       lá), então nada quebra. A função não chama digest() (isso é só do
--       programas_publicar, intocado) — confirmado por leitura do corpo;
--       extnamespace do pgcrypto foi checado mesmo assim: extensions.
--
--    b) 'alternativo': quando sessao_exercicios.exercicio_alternativo_id não
--       é nulo, acrescenta ao item um bloco com nome/instrucoes/
--       orientacoes_base/erro_comum (de exercicios) + musculos (de
--       exercicio_musculos) + alternativa_nota (da própria prescrição). UM
--       NÍVEL SÓ por construção: a subquery lê exercicios direto pelo id
--       fixo em se.exercicio_alternativo_id — nunca revisita
--       sessao_exercicios — logo não há como encadear um "alternativo do
--       alternativo" (mesmo que o exercício B, usado como alternativo de A,
--       apareça em OUTRA linha de sessao_exercicios como principal com seu
--       próprio alternativo: essa segunda relação vive numa linha diferente,
--       nunca é seguida a partir do bloco 'alternativo' de A).
-- ----------------------------------------------------------------------------
create or replace function public.montar_snapshot_programa(p_programa_id uuid, p_programa jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_aluno_profile uuid; v_prog jsonb;
begin
  select a.profile_id into v_aluno_profile
    from public.programas pr join public.alunos a on a.id = pr.aluno_id
    where pr.id = p_programa_id;

  v_prog := coalesce(p_programa, (select to_jsonb(pr.*) from public.programas pr where pr.id=p_programa_id));

  return jsonb_build_object(
    'programa',    v_prog,
    'anamnese',    (select to_jsonb(an.*) from public.anamneses an where an.profile_id = v_aluno_profile),
    'atendimento', (select to_jsonb(at.*) from public.atendimentos at
                      where at.id = (v_prog->>'atendimento_id')::uuid),
    'sessoes', (
      select jsonb_agg(jsonb_build_object(
                'sessao', to_jsonb(s.*),
                'exercicios', (
                  select jsonb_agg(
                           to_jsonb(se.*) || jsonb_build_object(
                             'biblioteca', (select to_jsonb(ex.*) from public.exercicios ex where ex.id = se.exercicio_id),
                             'musculos', (
                               select coalesce(jsonb_agg(jsonb_build_object('slug', m.slug, 'papel', em.papel)
                                                order by em.papel, m.slug), '[]'::jsonb)
                               from public.exercicio_musculos em
                               join public.musculos m on m.id = em.musculo_id
                               where em.exercicio_id = se.exercicio_id
                             ),
                             'alternativo', case when se.exercicio_alternativo_id is null then null else (
                               select jsonb_build_object(
                                        'nome', ex2.nome,
                                        'instrucoes', ex2.instrucoes,
                                        'orientacoes_base', ex2.orientacoes_base,
                                        'erro_comum', ex2.erro_comum,
                                        'musculos', (
                                          select coalesce(jsonb_agg(jsonb_build_object('slug', m2.slug, 'papel', em2.papel)
                                                           order by em2.papel, m2.slug), '[]'::jsonb)
                                          from public.exercicio_musculos em2
                                          join public.musculos m2 on m2.id = em2.musculo_id
                                          where em2.exercicio_id = ex2.id
                                        ),
                                        'alternativa_nota', se.alternativa_nota
                                      )
                               from public.exercicios ex2 where ex2.id = se.exercicio_alternativo_id
                             ) end
                           )
                           order by se.ordem
                         )
                  from public.sessao_exercicios se where se.sessao_id = s.id
                )
              ) order by s.semana, s.ordem)   -- ordenacao real do app: semana + ordem
      from public.sessoes s where s.programa_id = p_programa_id
    ),
    'congelado_em', now()
  );
end $$;

-- Hardening: só programas_publicar (SECURITY DEFINER, dono com privilégios
-- plenos) deve chamar esta função — internamente, sem passar por checagem de
-- EXECUTE do papel original, porque dentro de um SECURITY DEFINER o usuário
-- efetivo passa a ser o DONO da função chamadora. Chamada DIRETA via RPC por
-- authenticated/anon bypassaria RLS de anamneses/atendimentos/exercicios
-- para QUALQUER programa_id (a função lê tudo sem filtro de RLS, propositalmente,
-- pois é SECURITY DEFINER) — daí o REVOKE.
--
-- GRANT de EXECUTE em função vai para PUBLIC por padrão no Postgres (ao
-- contrário de tabelas). Revogar só de authenticated/anon SEM revogar de
-- PUBLIC não bloquearia nada — os dois herdam privilégios de PUBLIC. Por
-- isso os dois REVOKEs abaixo.
revoke execute on function public.montar_snapshot_programa(uuid,jsonb) from public;
revoke execute on function public.montar_snapshot_programa(uuid,jsonb) from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. RLS — musculos / exercicio_musculos (leitura authenticated, escrita coach)
-- ----------------------------------------------------------------------------
alter table public.musculos enable row level security;
alter table public.exercicio_musculos enable row level security;

create policy musculos_select on public.musculos for select to authenticated using (true);
create policy musculos_insert_coach on public.musculos for insert to authenticated
  with check (public.is_coach(auth.uid()));
create policy musculos_update_coach on public.musculos for update to authenticated
  using (public.is_coach(auth.uid())) with check (public.is_coach(auth.uid()));

create policy exercicio_musculos_select on public.exercicio_musculos for select to authenticated using (true);
create policy exercicio_musculos_insert_coach on public.exercicio_musculos for insert to authenticated
  with check (exists (select 1 from public.exercicios e where e.id = exercicio_musculos.exercicio_id and e.criado_por = auth.uid()));
create policy exercicio_musculos_update_coach on public.exercicio_musculos for update to authenticated
  using (exists (select 1 from public.exercicios e where e.id = exercicio_musculos.exercicio_id and e.criado_por = auth.uid()))
  with check (exists (select 1 from public.exercicios e where e.id = exercicio_musculos.exercicio_id and e.criado_por = auth.uid()));
create policy exercicio_musculos_delete_coach on public.exercicio_musculos for delete to authenticated
  using (exists (select 1 from public.exercicios e where e.id = exercicio_musculos.exercicio_id and e.criado_por = auth.uid()));

-- ----------------------------------------------------------------------------
-- 9. GRANTS (anon: nada; por coluna onde a tabela já usa esse padrão)
-- ----------------------------------------------------------------------------
grant select on public.musculos to authenticated;
grant insert (slug, label, vista) on public.musculos to authenticated;
grant update (label, vista) on public.musculos to authenticated;      -- slug SEM grant de update: estável

grant select on public.exercicio_musculos to authenticated;
grant insert (exercicio_id, musculo_id, papel) on public.exercicio_musculos to authenticated;
grant update (papel) on public.exercicio_musculos to authenticated;
grant delete on public.exercicio_musculos to authenticated;           -- RLS restringe ao dono do exercicio

grant insert (orientacoes_base, erro_comum) on public.exercicios to authenticated;
grant update (orientacoes_base, erro_comum) on public.exercicios to authenticated;

grant insert (motivo_no_plano, orientacao_personalizada, alternativa_nota) on public.sessao_exercicios to authenticated;
grant update (motivo_no_plano, orientacao_personalizada, alternativa_nota) on public.sessao_exercicios to authenticated;

grant insert (modo_teste) on public.programas to authenticated;       -- SEM update: imutável (dupla trava c/ trigger)

-- GAP DESCOBERTO DA 007 (fechado aqui, aditivo, sem tocar no arquivo 007
-- já aplicado em produção): a 007 criou programas.atendimento_id mas nunca
-- concedeu UPDATE dessa coluna a authenticated. Sem este grant, NENHUM
-- coach real conseguiria publicar um programa quando programas_publicar_trg
-- for ligado (007b) — o gate exige atendimento_id, mas o cliente não tinha
-- permissão de gravá-lo. Hoje esse buraco está dormente (o trigger está
-- desligado em produção), mas precisa estar fechado antes da 007b.
grant update (atendimento_id) on public.programas to authenticated;

-- execucoes.simulado: SEM grant de insert nem update em nenhuma hipótese —
-- só o trigger (SECURITY DEFINER) grava, e o faz incondicionalmente mesmo
-- que o cliente tente enviar um valor. Dupla trava, igual ao padrão da 007
-- (alguma_positiva / aplicada_por / aplicada_em em triagens_parq).

-- FIM 008. execucoes_deriva_simulado_trg LIGADO (só deriva, não bloqueia).
-- programas_modo_teste_imutavel_trg e execucoes_simulado_imutavel_trg
-- DESLIGADOS — ligar em 008b, depois de 008_patch_modo_teste.sql rodar.
