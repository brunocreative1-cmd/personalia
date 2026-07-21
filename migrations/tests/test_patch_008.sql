\set ON_ERROR_STOP 0
-- ============================================================================
-- Teste do PADRÃO usado por 008_patch_modo_teste.sql (item 5e): contagem
-- esperada vs real, abort seguro em caso de divergência, imutabilidades só
-- ligam DEPOIS do backfill confirmado.
--
-- PRÉ-REQUISITO: roda DEPOIS de test_logic.sql (usa o aluno Samuel,
-- aaaa2222-...-002, seedado lá) — mesma convenção de test_logic_008.sql e
-- test_rls_008.sh, que também dependem daquele seed. O PROGRAMA/SESSÃO/
-- EXECUÇÕES usados aqui são criados por este arquivo (IDs com prefixo
-- f0f0.../f5f5.../f1f1..., não usados em nenhum outro arquivo de teste).
--
-- Não executa o arquivo real 008_patch_modo_teste.sql (que tem alvo vazio
-- de propósito) — reproduz o MESMO padrão (temp table de alvo + DO block
-- que reconta/aborta + UPDATEs + ALTER...ENABLE) com valores de teste.
--
-- Cenário 1 (feliz) roda como statements normais e desfaz MANUALMENTE no
-- final (não por ROLLBACK): uma temp table criada dentro de uma transação
-- que sofre rollback desaparece junto — não dava para usar isso para fazer
-- as asserções sobreviverem ao rollback. Cenário 2 (abortado) continua
-- usando BEGIN/ROLLBACK normalmente, porque ali só importa o estado DEPOIS
-- do rollback (tabelas reais, não uma temp table criada dentro dele).
-- ============================================================================
drop table if exists _res_patch;
create temp table _res_patch(id serial, nome text, passou boolean, detalhe text);

-- Seed isolado: aluno solto (Samuel) + 1 programa "de teste" + 2 execucoes,
-- tudo com modo_teste/simulado ainda no default (false).
insert into public.programas(id,aluno_id,coach_id,titulo,status,data_inicio,data_fim)
 values('f0f00000-0000-0000-0000-000000000001','aaaa2222-0000-0000-0000-000000000002','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','Prog Patch Teste','rascunho',current_date,current_date+10);
insert into public.sessoes(id,programa_id,titulo,semana,ordem)
 values('f5f50000-0000-0000-0000-000000000001','f0f00000-0000-0000-0000-000000000001','Unica',1,1);
insert into public.execucoes(id,aluno_id,programa_id,sessao_id)
 values('f1f10000-0000-0000-0000-000000000001','aaaa2222-0000-0000-0000-000000000002','f0f00000-0000-0000-0000-000000000001','f5f50000-0000-0000-0000-000000000001');
insert into public.execucoes(id,aluno_id,programa_id,sessao_id)
 values('f1f10000-0000-0000-0000-000000000002','aaaa2222-0000-0000-0000-000000000002','f0f00000-0000-0000-0000-000000000001','f5f50000-0000-0000-0000-000000000001');

-- ===========================================================================
-- CENÁRIO 1 — contagem BATE: backfill roda, imutabilidades ligam no fim
-- (mesmo padrão do arquivo real). Desfeito manualmente ao final do teste.
-- ===========================================================================
create temp table _patch_alvo_1 as
select p.id from public.programas p where p.id = 'f0f00000-0000-0000-0000-000000000001';

do $$
declare
  _programas_esperado int := 1;   -- contagem correta (simula dry-run acertado)
  _execucoes_esperado int := 2;
  _programas_real int;
  _execucoes_real int;
begin
  select count(*) into _programas_real from _patch_alvo_1;
  select count(*) into _execucoes_real from public.execucoes e where e.programa_id in (select id from _patch_alvo_1);

  if _programas_real <> _programas_esperado then
    raise exception '008_patch ABORTADO: programas-alvo real=% esperado=%', _programas_real, _programas_esperado;
  end if;
  if _execucoes_real <> _execucoes_esperado then
    raise exception '008_patch ABORTADO: execucoes-alvo real=% esperado=%', _execucoes_real, _execucoes_esperado;
  end if;
end $$;

update public.programas set modo_teste = true where id in (select id from _patch_alvo_1);
update public.execucoes set simulado = true
 where programa_id in (select id from _patch_alvo_1) and simulado = false;
alter table public.programas enable trigger programas_modo_teste_imutavel_trg;
alter table public.execucoes enable trigger execucoes_simulado_imutavel_trg;

insert into _res_patch(nome,passou,detalhe)
 select 'E1 cenario feliz: modo_teste=true apos o backfill', modo_teste, 'modo_teste='||modo_teste
 from public.programas where id='f0f00000-0000-0000-0000-000000000001';
insert into _res_patch(nome,passou,detalhe)
 select 'E2 cenario feliz: as 2 execucoes viraram simulado=true', bool_and(simulado), 'todas_simuladas='||bool_and(simulado)
 from public.execucoes where programa_id='f0f00000-0000-0000-0000-000000000001';
insert into _res_patch(nome,passou,detalhe)
 select 'E3 cenario feliz: imutabilidades LIGADAS so depois do backfill confirmado',
        bool_and(tgenabled='O'), string_agg(tgname||'='||tgenabled::text,', ')
 from pg_trigger where tgname in ('programas_modo_teste_imutavel_trg','execucoes_simulado_imutavel_trg');

-- Desfaz MANUALMENTE (não por rollback — os INSERTs acima precisavam
-- sobreviver). Ordem importa: desliga o trigger ANTES de reverter os
-- valores, senão a própria imutabilidade que acabamos de ligar bloquearia
-- o UPDATE de volta para false.
alter table public.programas disable trigger programas_modo_teste_imutavel_trg;
alter table public.execucoes disable trigger execucoes_simulado_imutavel_trg;
update public.programas set modo_teste = false where id in (select id from _patch_alvo_1);
update public.execucoes set simulado = false where programa_id in (select id from _patch_alvo_1);

insert into _res_patch(nome,passou,detalhe)
 select 'E4 desfeito manualmente: modo_teste volta a false (nao vaza p/ outros testes)',
        modo_teste = false, 'modo_teste='||modo_teste
 from public.programas where id='f0f00000-0000-0000-0000-000000000001';
insert into _res_patch(nome,passou,detalhe)
 select 'E5 desfeito manualmente: imutabilidades voltam a DESLIGADAS (nao vazam p/ outros testes)',
        bool_and(tgenabled='D'), string_agg(tgname||'='||tgenabled::text,', ')
 from pg_trigger where tgname in ('programas_modo_teste_imutavel_trg','execucoes_simulado_imutavel_trg');

-- ===========================================================================
-- CENÁRIO 2 — contagem NÃO BATE (simula drift entre dry-run e execução): a
-- transação inteira aborta ANTES de qualquer UPDATE; imutabilidades
-- continuam DESLIGADAS. Aqui sim usamos BEGIN/ROLLBACK — só importa o
-- estado das tabelas REAIS depois do rollback, não uma temp table criada
-- dentro dele.
-- ===========================================================================
begin;

create temp table _patch_alvo_2 as
select p.id from public.programas p where p.id = 'f0f00000-0000-0000-0000-000000000001';

do $$
declare
  _programas_esperado int := 99;  -- ERRADO de proposito (simula drift)
  _execucoes_esperado int := 2;
  _programas_real int;
  _execucoes_real int;
begin
  select count(*) into _programas_real from _patch_alvo_2;
  select count(*) into _execucoes_real from public.execucoes e where e.programa_id in (select id from _patch_alvo_2);

  if _programas_real <> _programas_esperado then
    raise exception '008_patch ABORTADO: programas-alvo real=% esperado=%', _programas_real, _programas_esperado;
  end if;
  if _execucoes_real <> _execucoes_esperado then
    raise exception '008_patch ABORTADO: execucoes-alvo real=% esperado=%', _execucoes_real, _execucoes_esperado;
  end if;
end $$;

-- estas linhas NUNCA deveriam rodar (a transacao ja esta abortada pelo raise
-- exception acima) — mantidas aqui só para provar que, mesmo presentes no
-- arquivo, o Postgres as ignora apos o abort ("current transaction is
-- aborted, commands ignored until end of transaction block").
update public.programas set modo_teste = true where id in (select id from _patch_alvo_2);
alter table public.programas enable trigger programas_modo_teste_imutavel_trg;

rollback;

-- Verificação PÓS cenário 2 (nova transação implícita — a anterior já
-- terminou): nada deveria ter mudado.
insert into _res_patch(nome,passou,detalhe)
 select 'E6 cenario abortado: modo_teste continua false (UPDATE nunca rodou)',
        modo_teste = false, 'modo_teste='||modo_teste
 from public.programas where id='f0f00000-0000-0000-0000-000000000001';
insert into _res_patch(nome,passou,detalhe)
 select 'E7 cenario abortado: imutabilidades continuam DESLIGADAS',
        bool_and(tgenabled='D'), string_agg(tgname||'='||tgenabled::text,', ')
 from pg_trigger where tgname in ('programas_modo_teste_imutavel_trg','execucoes_simulado_imutavel_trg');

-- ===========================================================================
select nome, case when passou then 'PASS' else 'FAIL' end as res, detalhe from _res_patch order by id;
select count(*) filter (where passou) as passaram, count(*) filter (where not passou) as falharam, count(*) as total from _res_patch;
