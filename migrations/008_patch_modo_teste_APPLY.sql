-- ============================================================================
-- 008_patch_modo_teste.sql — PATCH DE DADOS, NÃO É MIGRATION DE SCHEMA.
-- NÃO FOI APLICADO EM PRODUÇÃO. NÃO roda junto da 008. Execução MANUAL.
--
-- Critério confirmado pelo coach (16/07): TODOS os programas existentes
-- hoje são demonstrativos. Alvo CONGELADO como 5 IDs explícitos — não é
-- mais um placeholder aberto por título/data. Lidos read-only em produção:
--
--   select id from public.programas order by created_at;   -- 5 linhas
--
--   7efae48a-ecfd-48bc-99cf-202883147155  Full Body — Teste QA
--   eb626a5c-6efd-43e2-a9a6-f7a6d97ae9e2  Programa de Eliza - Iniciante
--   8df34f14-b377-4d51-a3a9-ac1fb3fcdfd2  Programa de Caio - Iniciante
--   f3eabd76-4a1d-4c12-ac0a-c01913ad2f84  Programa Samuel — Perda de Gordura (30 dias)
--   fc9e1352-d2c3-4675-9625-fb62ed196507  Programa Gustavo — Full Body Teste (30 dias)
--
--   select count(*) from public.execucoes where programa_id in (<esses 5>);
--   -- 9
--
-- Determinístico e auto-verificável: a temp table abaixo é criada com os 5
-- IDs LITERAIS (não uma subquery aberta por título/data — nada de novo
-- programa "entra" no alvo por engano). No momento de rodar, o patch
-- RECONTA o alvo contra as constantes _programas_esperado=5 /
-- _execucoes_esperado=9 e ABORTA (raise exception, nada muda) se algo
-- divergir — protege contra drift entre esta leitura (16/07) e a execução
-- real (ex.: alguém publicou um 6º programa nesse meio-tempo).
--
-- Sequência de segurança: backfill (UPDATEs) roda ANTES de ligar as
-- imutabilidades. As duas imutabilidades só ligam DENTRO desta mesma
-- transação controlada, DEPOIS do backfill confirmado — nunca antes, nunca
-- soltas fora de uma transação com abort automático em caso de contagem
-- errada.
--
-- Para executar de verdade: troque o ROLLBACK final por COMMIT, depois de
-- revisar a conferência. Enquanto isso, ROLLBACK garante que rodar este
-- arquivo hoje não persiste nada — só prova que a lógica funciona.
-- ============================================================================

begin;

-- 0) Alvo determinístico: os 5 programa_id lidos em 16/07 (read-only),
--    como literais explícitos.
create temp table _patch_alvo_programas (id uuid primary key);
insert into _patch_alvo_programas (id) values
  ('7efae48a-ecfd-48bc-99cf-202883147155'),
  ('eb626a5c-6efd-43e2-a9a6-f7a6d97ae9e2'),
  ('8df34f14-b377-4d51-a3a9-ac1fb3fcdfd2'),
  ('f3eabd76-4a1d-4c12-ac0a-c01913ad2f84'),
  ('fc9e1352-d2c3-4675-9625-fb62ed196507');

do $$
declare
  -- Contagens ESPERADAS, coladas da leitura read-only de 16/07.
  _programas_esperado int := 5;
  _execucoes_esperado int := 9;
  _programas_real int;
  _execucoes_real int;
begin
  select count(*) into _programas_real
    from public.programas p where p.id in (select id from _patch_alvo_programas);

  select count(*) into _execucoes_real
    from public.execucoes e where e.programa_id in (select id from _patch_alvo_programas);

  if _programas_real <> _programas_esperado then
    raise exception '008_patch ABORTADO: programas-alvo real=% esperado=% — algum dos 5 IDs sumiu, ou o criterio mudou desde 16/07',
      _programas_real, _programas_esperado;
  end if;

  if _execucoes_real <> _execucoes_esperado then
    raise exception '008_patch ABORTADO: execucoes-alvo real=% esperado=% — surgiu execucao nova nesses programas desde 16/07 (drift)',
      _execucoes_real, _execucoes_esperado;
  end if;

  raise notice '008_patch: contagem confere (programas=%, execucoes=%). Prosseguindo com o backfill...',
    _programas_real, _execucoes_real;
end $$;

-- 1) Marca modo_teste=true nos 5 programas-alvo. Só chega aqui se o DO
--    block acima NÃO abortou (contagem bateu) — se abortou, o Postgres
--    ignora todo o resto até o ROLLBACK final, e nada abaixo executa.
update public.programas
   set modo_teste = true
 where id in (select id from _patch_alvo_programas);

-- 2) Backfill de execucoes.simulado para o histórico desses 5 programas. A
--    trigger de derivação (008) só age em INSERT novo — o histórico
--    precisa deste UPDATE explícito, feito ANTES de ligar a imutabilidade.
update public.execucoes
   set simulado = true
 where programa_id in (select id from _patch_alvo_programas);

-- 3) SÓ AGORA, com o backfill confirmado (o DO block já teria abortado a
--    transação inteira se as contagens não batessem), liga as duas
--    imutabilidades — nunca antes, nunca fora desta transação controlada.
alter table public.programas enable trigger programas_modo_teste_imutavel_trg;
alter table public.execucoes enable trigger execucoes_simulado_imutavel_trg;

-- Conferência final antes de decidir commit/rollback — rode e confira manualmente:
-- select p.titulo, p.modo_teste, count(e.id) filter (where e.simulado) as execs_simuladas
--   from public.programas p left join public.execucoes e on e.programa_id = p.id
--  group by 1,2 order by 1;

-- commit;   -- descomentar SÓ depois de revisar a conferência acima.
--            -- Enquanto isso, ROLLBACK garante que rodar este arquivo
--            -- hoje não persiste nada de verdade.
commit;
