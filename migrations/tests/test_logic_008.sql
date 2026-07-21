\set ON_ERROR_STOP 0
-- ============================================================================
-- Testes de LÓGICA da 008 — roda DEPOIS de test_logic.sql (007, 28/28) na
-- MESMA sessão/container, reaproveitando o seed e o programa cccc...0001 já
-- publicado duas vezes (v1, v2) por aquele arquivo. Prova que a 008 não
-- quebra o fluxo da 007 e exercita: snapshot com biblioteca/musculos/
-- coaching, hash mudando com o coaching, derivação de simulado (inclusive
-- contra tentativa explícita), e imutabilidade de modo_teste/simulado.
-- ============================================================================
-- Resultados (tabela própria, não reaproveita _res de outro arquivo)
drop table if exists _res008;
create temp table _res008(id serial, nome text, passou boolean, detalhe text);

create or replace function _expect_fail008(p_nome text, p_sql text) returns void
language plpgsql as $$
begin
  begin execute p_sql; insert into _res008(nome,passou,detalhe) values(p_nome,false,'NAO falhou (deveria)');
  exception when others then insert into _res008(nome,passou,detalhe) values(p_nome,true,'falhou como esperado: '||sqlerrm); end;
end $$;
create or replace function _expect_ok008(p_nome text, p_sql text) returns void
language plpgsql as $$
begin
  begin execute p_sql; insert into _res008(nome,passou,detalhe) values(p_nome,true,'ok');
  exception when others then insert into _res008(nome,passou,detalhe) values(p_nome,false,'erro inesperado: '||sqlerrm); end;
end $$;

-- ===========================================================================
-- A. Triggers novos ship no estado certo ANTES de habilitar p/ teste
-- ===========================================================================
insert into _res008(nome,passou,detalhe)
select 'A1 execucoes_deriva_simulado_trg LIGADO (so deriva)', bool_and(tgenabled='O'), string_agg(tgname||'='||tgenabled::text,', ')
from pg_trigger where tgname = 'execucoes_deriva_simulado_trg';

insert into _res008(nome,passou,detalhe)
select 'A2 imutabilidades (modo_teste/simulado) DESLIGADAS na migration', bool_and(tgenabled='D'), string_agg(tgname||'='||tgenabled::text,', ')
from pg_trigger where tgname in ('programas_modo_teste_imutavel_trg','execucoes_simulado_imutavel_trg');

-- Habilita SÓ para testar a lógica de imutabilidade (DB descartável)
alter table public.programas enable trigger programas_modo_teste_imutavel_trg;
alter table public.execucoes enable trigger execucoes_simulado_imutavel_trg;

-- Este arquivo republica cccc...0001 mais de uma vez (C/D/G) para exercitar
-- o snapshot com coaching — precisa do gate da 007 (programas_publicar_trg)
-- realmente ligado para criar as linhas de programa_publicacoes. Ligamos
-- explicitamente aqui em vez de depender do que test_logic.sql deixou (esse
-- vazamento entre arquivos foi corrigido lá — cada arquivo agora liga só o
-- que precisa e desliga de volta no seu próprio final).
alter table public.programas enable trigger programas_publicar_trg;

-- ===========================================================================
-- B. musculos / exercicio_musculos — estrutura mínima e taxonomia seedada
-- ===========================================================================
insert into _res008(nome,passou,detalhe)
select 'B1 taxonomia de musculos seedada (16 slugs)', count(*)=16, 'count='||count(*)
from public.musculos;

-- ===========================================================================
-- C. Reabre o programa cccc...0001 (deixado 'publicado' em v2 pela 007) para
--    acrescentar coaching — precisa despublicar primeiro (trigger 007 ligado
--    na mesma sessão bloqueia edição de sessao_exercicios em programa publicado)
-- ===========================================================================
select _expect_ok008('C1 despublicar p/ adicionar coaching (rascunho de novo)',
 $$update public.programas set status='rascunho' where id='cccc0000-0000-0000-0000-000000000001'$$);

-- captura o hash da v2 (007) ANTES de qualquer mudança de coaching
create temp table _hash_v2 as
select conteudo_hash from public.programa_publicacoes
 where programa_id='cccc0000-0000-0000-0000-000000000001' order by versao desc limit 1;

select _expect_ok008('C2 coach adiciona motivo/orientacao/alternativa_nota',
 $$update public.sessao_exercicios
     set motivo_no_plano='Seu joelho pediu progressao controlada.',
         orientacao_personalizada='Desça só até onde mantiver a lombar neutra.',
         alternativa_nota='Se doer, troque por afundo — mais facil de dosar.'
   where sessao_id='55550000-0000-0000-0000-000000000001'
     and exercicio_id='eeee0000-0000-0000-0000-000000000001'$$);

select _expect_ok008('C3 coach preenche orientacoes_base + erro_comum do exercicio',
 $$update public.exercicios
     set orientacoes_base=array['Pes na largura dos ombros','Desca controlando o quadril'],
         erro_comum='Deixar os joelhos caírem para dentro na subida.'
   where id='eeee0000-0000-0000-0000-000000000001'$$);

select _expect_fail008('C4 orientacoes_base com 4 itens rejeitada (CHECK max 3)',
 $$update public.exercicios set orientacoes_base=array['a','b','c','d'] where id='eeee0000-0000-0000-0000-000000000001'$$);

select _expect_fail008('C5 orientacoes_base com item vazio rejeitada (CHECK nao-vazio)',
 $$update public.exercicios set orientacoes_base=array['ok',''] where id='eeee0000-0000-0000-0000-000000000001'$$);

-- C5b: prova especifica do fix pedido (cardinality em vez de array_length).
-- Com array_length, '{}'::text[] tinha array_length=NULL e passava pelo
-- CHECK sem querer; com cardinality, '{}' tem cardinality=0 e e rejeitado.
select _expect_fail008('C5b orientacoes_base=ARRAY VAZIO rejeitada (fix cardinality)',
 $$update public.exercicios set orientacoes_base='{}'::text[] where id='eeee0000-0000-0000-0000-000000000001'$$);

select _expect_ok008('C6 coach tagueia musculo primario (quadriceps)',
 $$insert into public.exercicio_musculos(exercicio_id,musculo_id,papel)
   select 'eeee0000-0000-0000-0000-000000000001', id, 'primario' from public.musculos where slug='quadriceps'$$);
select _expect_ok008('C7 coach tagueia musculo secundario (gluteos)',
 $$insert into public.exercicio_musculos(exercicio_id,musculo_id,papel)
   select 'eeee0000-0000-0000-0000-000000000001', id, 'secundario' from public.musculos where slug='gluteos'$$);

-- ===========================================================================
-- D. Republica (v3) reaproveitando o atendimento dddd...0003 (reavaliacao,
--    ja usado na v2 pela 007 — reuso da FK e permitido, so a EDICAO do
--    atendimento em si e que e imutavel)
-- ===========================================================================
select _expect_ok008('D1 republicar com coaching novo (gera v3)',
 $$update public.programas set status='publicado', atendimento_id='dddd0000-0000-0000-0000-000000000003', data_fim=current_date+15 where id='cccc0000-0000-0000-0000-000000000001'$$);

insert into _res008(nome,passou,detalhe)
 select 'D2 v3 criada (versao=3)', max(versao)=3, 'maior versao='||max(versao)
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001';

-- (a) snapshot inclui a camada de coaching + biblioteca + musculos
insert into _res008(nome,passou,detalhe)
 select 'D3a snapshot inclui motivo_no_plano',
        (snapshot_json #>> '{sessoes,0,exercicios,0,motivo_no_plano}') = 'Seu joelho pediu progressao controlada.',
        coalesce(snapshot_json #>> '{sessoes,0,exercicios,0,motivo_no_plano}','NULL')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=3;

insert into _res008(nome,passou,detalhe)
 select 'D3b snapshot inclui orientacao_personalizada',
        (snapshot_json #>> '{sessoes,0,exercicios,0,orientacao_personalizada}') = 'Desça só até onde mantiver a lombar neutra.',
        coalesce(snapshot_json #>> '{sessoes,0,exercicios,0,orientacao_personalizada}','NULL')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=3;

insert into _res008(nome,passou,detalhe)
 select 'D3c snapshot inclui alternativa_nota',
        (snapshot_json #>> '{sessoes,0,exercicios,0,alternativa_nota}') = 'Se doer, troque por afundo — mais facil de dosar.',
        coalesce(snapshot_json #>> '{sessoes,0,exercicios,0,alternativa_nota}','NULL')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=3;

insert into _res008(nome,passou,detalhe)
 select 'D3d snapshot.biblioteca traz orientacoes_base (array)',
        (snapshot_json #> '{sessoes,0,exercicios,0,biblioteca,orientacoes_base}') = '["Pes na largura dos ombros", "Desca controlando o quadril"]'::jsonb,
        (snapshot_json #> '{sessoes,0,exercicios,0,biblioteca,orientacoes_base}')::text
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=3;

insert into _res008(nome,passou,detalhe)
 select 'D3e snapshot.biblioteca traz erro_comum',
        (snapshot_json #>> '{sessoes,0,exercicios,0,biblioteca,erro_comum}') = 'Deixar os joelhos caírem para dentro na subida.',
        coalesce(snapshot_json #>> '{sessoes,0,exercicios,0,biblioteca,erro_comum}','NULL')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=3;

insert into _res008(nome,passou,detalhe)
 select 'D3f snapshot.musculos tem 2 entradas (primario+secundario)',
        jsonb_array_length(snapshot_json #> '{sessoes,0,exercicios,0,musculos}') = 2,
        (snapshot_json #> '{sessoes,0,exercicios,0,musculos}')::text
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=3;

insert into _res008(nome,passou,detalhe)
 select 'D3g musculos ordenados papel,slug (primario=quadriceps primeiro)',
        (snapshot_json #>> '{sessoes,0,exercicios,0,musculos,0,slug}') = 'quadriceps'
        and (snapshot_json #>> '{sessoes,0,exercicios,0,musculos,0,papel}') = 'primario',
        (snapshot_json #> '{sessoes,0,exercicios,0,musculos}')::text
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=3;

-- (b) conteudo_hash muda quando o coaching muda
insert into _res008(nome,passou,detalhe)
 select 'D4 conteudo_hash de v3 difere do hash de v2 (coaching mudou)',
        pp.conteudo_hash <> h.conteudo_hash,
        'v3='||left(pp.conteudo_hash,12)||' v2='||left(h.conteudo_hash,12)
 from public.programa_publicacoes pp, _hash_v2 h
 where pp.programa_id='cccc0000-0000-0000-0000-000000000001' and pp.versao=3;

-- captura o hash da v3 ANTES de adicionar o alternativo (para o teste (c))
create temp table _hash_v3 as
select conteudo_hash from public.programa_publicacoes
 where programa_id='cccc0000-0000-0000-0000-000000000001' order by versao desc limit 1;

-- ===========================================================================
-- G. Alternativo completo no snapshot — UM nível só, sem recursão (item 3)
-- ===========================================================================
select _expect_ok008('G1 despublicar de novo p/ adicionar alternativo',
 $$update public.programas set status='rascunho' where id='cccc0000-0000-0000-0000-000000000001'$$);

-- exercicio B: o alternativo de A (eeee...0001), com sua propria biblioteca
insert into public.exercicios(id,criado_por,nome,instrucoes,orientacoes_base,erro_comum)
 values('eeee0000-0000-0000-0000-000000000002','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','Afundo com Halteres',
        'Passo firme a frente, tronco ereto.',
        array['Passo firme','Joelho de tras quase toca o chao'],
        'Passo curto demais.');
insert into public.exercicio_musculos(exercicio_id,musculo_id,papel)
 select 'eeee0000-0000-0000-0000-000000000002', id, 'primario' from public.musculos where slug='quadriceps';
insert into public.exercicio_musculos(exercicio_id,musculo_id,papel)
 select 'eeee0000-0000-0000-0000-000000000002', id, 'secundario' from public.musculos where slug='gluteos';

-- se1 (A) passa a ter B como alternativo (alternativa_nota ja setada em C2)
select _expect_ok008('G2 se1 ganha exercicio_alternativo_id = B',
 $$update public.sessao_exercicios set exercicio_alternativo_id='eeee0000-0000-0000-0000-000000000002'
   where sessao_id='55550000-0000-0000-0000-000000000001' and exercicio_id='eeee0000-0000-0000-0000-000000000001'$$);

-- se5: B TAMBEM aparece como principal em OUTRA linha, com A como SEU
-- alternativo — completa o "loop" A<->B em duas linhas de sessao_exercicios
-- distintas. Prova que o bloco 'alternativo' de A nao vai atras disso.
select _expect_ok008('G3 nova linha: B principal, A como alternativo de B (para testar nao-recursao)',
 $$insert into public.sessao_exercicios(sessao_id,exercicio_id,exercicio_alternativo_id,ordem,alternativa_nota)
   values('55550000-0000-0000-0000-000000000001','eeee0000-0000-0000-0000-000000000002','eeee0000-0000-0000-0000-000000000001',2,
          'B tem seu proprio alternativo (A) — isso NAO deve aparecer dentro do alternativo de A.')$$);

select _expect_ok008('G4 republicar com o alternativo novo (gera v4)',
 $$update public.programas set status='publicado', atendimento_id='dddd0000-0000-0000-0000-000000000003', data_fim=current_date+10 where id='cccc0000-0000-0000-0000-000000000001'$$);

insert into _res008(nome,passou,detalhe)
 select 'G5 v4 criada (versao=4)', max(versao)=4, 'maior versao='||max(versao)
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001';

-- (a) bloco 'alternativo' completo dentro do item de A (exercicios[0])
insert into _res008(nome,passou,detalhe)
 select 'G6a alternativo.nome = B', (snapshot_json #>> '{sessoes,0,exercicios,0,alternativo,nome}') = 'Afundo com Halteres',
        coalesce(snapshot_json #>> '{sessoes,0,exercicios,0,alternativo,nome}','NULL')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=4;

insert into _res008(nome,passou,detalhe)
 select 'G6b alternativo.instrucoes = instrucoes de B', (snapshot_json #>> '{sessoes,0,exercicios,0,alternativo,instrucoes}') = 'Passo firme a frente, tronco ereto.',
        coalesce(snapshot_json #>> '{sessoes,0,exercicios,0,alternativo,instrucoes}','NULL')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=4;

insert into _res008(nome,passou,detalhe)
 select 'G6c alternativo.orientacoes_base = orientacoes de B',
        (snapshot_json #> '{sessoes,0,exercicios,0,alternativo,orientacoes_base}') = '["Passo firme", "Joelho de tras quase toca o chao"]'::jsonb,
        (snapshot_json #> '{sessoes,0,exercicios,0,alternativo,orientacoes_base}')::text
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=4;

insert into _res008(nome,passou,detalhe)
 select 'G6d alternativo.erro_comum = erro_comum de B', (snapshot_json #>> '{sessoes,0,exercicios,0,alternativo,erro_comum}') = 'Passo curto demais.',
        coalesce(snapshot_json #>> '{sessoes,0,exercicios,0,alternativo,erro_comum}','NULL')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=4;

insert into _res008(nome,passou,detalhe)
 select 'G6e alternativo.musculos tem os 2 tags de B', jsonb_array_length(snapshot_json #> '{sessoes,0,exercicios,0,alternativo,musculos}') = 2,
        (snapshot_json #> '{sessoes,0,exercicios,0,alternativo,musculos}')::text
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=4;

insert into _res008(nome,passou,detalhe)
 select 'G6f alternativo.alternativa_nota = nota da prescricao', (snapshot_json #>> '{sessoes,0,exercicios,0,alternativo,alternativa_nota}') = 'Se doer, troque por afundo — mais facil de dosar.',
        coalesce(snapshot_json #>> '{sessoes,0,exercicios,0,alternativo,alternativa_nota}','NULL')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=4;

-- (b) SEM recursao: o bloco alternativo de A nao tem uma chave 'alternativo'
-- aninhada dentro dele (mesmo B tendo seu proprio alternativo em outra linha)
insert into _res008(nome,passou,detalhe)
 select 'G7 SEM recursao: alternativo.alternativo e NULL (nao existe)',
        (snapshot_json #> '{sessoes,0,exercicios,0,alternativo,alternativo}') is null,
        coalesce((snapshot_json #> '{sessoes,0,exercicios,0,alternativo,alternativo}')::text,'NULL (correto)')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=4;

-- complementar: a linha de B (exercicios[1], propria entrada, ordem=2) TEM
-- o seu proprio alternativo=A resolvido — prova que cada linha resolve o SEU
-- alternativo de forma independente (um nivel cada), sem contaminar a outra
insert into _res008(nome,passou,detalhe)
 select 'G8 linha de B (principal) resolve o SEU alternativo=A independentemente',
        (snapshot_json #>> '{sessoes,0,exercicios,1,alternativo,nome}') = 'Agachamento',
        coalesce(snapshot_json #>> '{sessoes,0,exercicios,1,alternativo,nome}','NULL')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001' and versao=4;

-- (c) conteudo_hash muda quando a biblioteca do ALTERNATIVO muda (nao so a
-- do exercicio principal — prova que o bloco alternativo entra no hash)
insert into _res008(nome,passou,detalhe)
 select 'G9 conteudo_hash de v4 difere do de v3 (alternativo mudou)',
        pp.conteudo_hash <> h.conteudo_hash,
        'v4='||left(pp.conteudo_hash,12)||' v3='||left(h.conteudo_hash,12)
 from public.programa_publicacoes pp, _hash_v3 h
 where pp.programa_id='cccc0000-0000-0000-0000-000000000001' and pp.versao=4;

-- ===========================================================================
-- E. execucoes.simulado — derivado, cliente nao sobrescreve (nem superuser
--    tentando explicitamente: o trigger recalcula incondicionalmente)
-- ===========================================================================
-- programa de teste (modo_teste=true) reaproveitando o aluno Samuel (sem outro uso)
insert into public.programas(id,aluno_id,coach_id,titulo,status,modo_teste)
 values('c0c00000-0000-0000-0000-000000000009','aaaa2222-0000-0000-0000-000000000002','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','Prog Teste QA','rascunho',true);
insert into public.sessoes(id,programa_id,titulo,semana,ordem)
 values('50500000-0000-0000-0000-000000000009','c0c00000-0000-0000-0000-000000000009','Unica',1,1);

-- E1: execucao NORMAL (cliente nao manda simulado) num programa modo_teste=true -> deriva true
insert into public.execucoes(id,aluno_id,programa_id,sessao_id)
 values('e0e00000-0000-0000-0000-000000000001','aaaa2222-0000-0000-0000-000000000002','c0c00000-0000-0000-0000-000000000009','50500000-0000-0000-0000-000000000009');
insert into _res008(nome,passou,detalhe)
 select 'E1 simulado deriva TRUE de programa modo_teste=true (cliente nao mandou nada)', simulado=true, 'simulado='||simulado
 from public.execucoes where id='e0e00000-0000-0000-0000-000000000001';

-- E2: execucao NORMAL num programa modo_teste=false (cccc...0001) -> deriva false
insert into public.execucoes(id,aluno_id,programa_id,sessao_id)
 values('e0e00000-0000-0000-0000-000000000002','aaaa1111-0000-0000-0000-000000000001','cccc0000-0000-0000-0000-000000000001','55550000-0000-0000-0000-000000000001');
insert into _res008(nome,passou,detalhe)
 select 'E2 simulado deriva FALSE de programa modo_teste=false', simulado=false, 'simulado='||simulado
 from public.execucoes where id='e0e00000-0000-0000-0000-000000000002';

-- E3: cliente TENTA setar simulado=true explicitamente num programa modo_teste=false
--     -> trigger recalcula incondicionalmente e sobrescreve para false mesmo assim
insert into public.execucoes(id,aluno_id,programa_id,sessao_id,simulado)
 values('e0e00000-0000-0000-0000-000000000003','aaaa1111-0000-0000-0000-000000000001','cccc0000-0000-0000-0000-000000000001','55550000-0000-0000-0000-000000000001',true);
insert into _res008(nome,passou,detalhe)
 select 'E3 tentativa explicita de simulado=true e IGNORADA (deriva false mesmo assim)', simulado=false, 'simulado='||simulado
 from public.execucoes where id='e0e00000-0000-0000-0000-000000000003';

-- ===========================================================================
-- F. Imutabilidade (triggers habilitados SÓ nesta sessão de teste)
-- ===========================================================================
select _expect_fail008('F1 UPDATE em programas.modo_teste rejeitado (imutavel)',
 $$update public.programas set modo_teste = not modo_teste where id='c0c00000-0000-0000-0000-000000000009'$$);

select _expect_fail008('F2 UPDATE em execucoes.simulado rejeitado (imutavel)',
 $$update public.execucoes set simulado = not simulado where id='e0e00000-0000-0000-0000-000000000001'$$);

-- garante que outras colunas de execucoes/programas continuam editaveis
-- normalmente (a imutabilidade e SO de modo_teste/simulado)
select _expect_ok008('F3 outras colunas de execucoes seguem editaveis',
 $$update public.execucoes set observacao='ok' where id='e0e00000-0000-0000-0000-000000000001'$$);

-- CLEANUP GARANTIDO: desliga de volta os 2 triggers de imutabilidade da 008
-- (habilitados só para o teste F acima) e o programas_publicar_trg da 007
-- (habilitado no topo deste arquivo) — restaura o estado de embarque de
-- ambas as migrations (DESLIGADOS) para não vazar para outros arquivos de
-- teste que rodem depois na mesma sessão (test_rls_008.sh e
-- test_patch_008.sql assumem que esses 3 começam desligados, igual às
-- migrations reais). EXCEPTION WHEN OTHERS: mesma trava de test_logic.sql —
-- roda mesmo que algo acima tenha falhado.
do $$
begin
  execute 'alter table public.programas disable trigger programas_modo_teste_imutavel_trg';
  execute 'alter table public.execucoes disable trigger execucoes_simulado_imutavel_trg';
  execute 'alter table public.programas disable trigger programas_publicar_trg';
exception when others then
  raise warning 'test_logic_008 cleanup: falha ao desligar triggers — %', sqlerrm;
end $$;

insert into _res008(nome,passou,detalhe)
select 'H1 cleanup: os 3 triggers habilitados aqui voltam a DESLIGADOS ao final',
       bool_and(tgenabled='D'),
       string_agg(tgname||'='||tgenabled::text,', ')
from pg_trigger where tgname in
 ('programas_modo_teste_imutavel_trg','execucoes_simulado_imutavel_trg','programas_publicar_trg');

-- Deixa o programa cccc...0001 publicado ao final (estado esperado pelo
-- test_rls_008.sh, que roda depois desta sessao)

-- ===========================================================================
select nome, case when passou then 'PASS' else 'FAIL' end as res, detalhe from _res008 order by id;
select count(*) filter (where passou) as passaram, count(*) filter (where not passou) as falharam, count(*) as total from _res008;
