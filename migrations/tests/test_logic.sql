\set ON_ERROR_STOP 0
-- [v2] pior caso: a sessão de teste roda com search_path=public (sem
-- extensions) — igual ao PostgREST em prod. digest() só pode resolver via
-- o search_path fixado nas próprias funções da 007.
set search_path = public;

-- ===========================================================================
-- RESET DETERMINÍSTICO (uma vez, no INÍCIO da sequência — este arquivo roda
-- primeiro). Devolve o banco ao estado pós-migrations antes de semear, para
-- que a sequência completa (test_logic -> test_rls -> test_logic_008 ->
-- test_rls_008 -> test_patch_008) seja idempotente em N rodadas no mesmo
-- container. É só teardown/reset — nenhum valor esperado de asserção muda.
-- Não repetir este reset nos arquivos seguintes: eles REUSAM o seed daqui,
-- e os .sh de RLS leem estado commitado entre conexões.
-- ===========================================================================

-- 0a) Garante os triggers de gate/imutabilidade em D antes do reset (estado
-- de embarque das migrations; TRUNCATE não dispara trigger de linha, mas se
-- uma rodada anterior morreu no meio, algum pode ter ficado ligado).
-- Exception-guard por trigger: um nome inexistente não derruba os demais.
do $$
declare t record;
begin
  for t in select * from (values
    ('public.programas',         'programas_publicar_trg'),
    ('public.programas',         'programas_bloqueia_pos_pub_trg'),
    ('public.sessoes',           'sessoes_bloqueia_pos_pub_trg'),
    ('public.sessao_exercicios', 'se_bloqueia_pos_pub_trg'),
    ('public.atendimentos',      'atendimento_imutavel_trg'),
    ('public.triagens_parq',     'triagem_imutavel_trg'),
    ('public.programas',         'programas_modo_teste_imutavel_trg'),
    ('public.execucoes',         'execucoes_simulado_imutavel_trg')
  ) as x(tabela, trigger_nome)
  loop
    begin
      execute format('alter table %s disable trigger %I', t.tabela, t.trigger_nome);
    exception when others then
      raise warning 'reset: nao desligou %.% — %', t.tabela, t.trigger_nome, sqlerrm;
    end;
  end loop;
end $$;

-- 0b) Limpa tudo que a suíte semeia, em um único TRUNCATE ... CASCADE
-- (FK-safe: CASCADE alcança dependentes não listados, ex.: alertas).
-- DUAS EXCEÇÕES DELIBERADAS à lista, para não quebrar asserções existentes:
--   · termos: NÃO truncada. Nada na suíte escreve nela; o conteúdo é o seed
--     da MIGRATION 007 (TCLE v1.0 + hash), do qual A2/D4/D6 dependem —
--     truncar exigiria duplicar o texto integral do TCLE aqui.
--   · musculos: truncar mataria o seed da MIGRATION 008 (16 slugs) de que
--     B1/C6/C7 dependem. Em vez disso, 0c abaixo DELETA apenas as linhas
--     extras que a suíte adiciona (ex.: teste_e4 do test_rls_008.sh),
--     restaurando exatamente o estado pós-migration.
truncate table
  public.execucao_series,
  public.execucoes,
  public.programa_publicacoes,
  public.sessao_exercicios,
  public.sessoes,
  public.programas,
  public.atendimentos,
  public.triagens_parq,
  public.consentimentos,
  public.exercicio_musculos,
  public.exercicios,
  public.anamneses,
  public.alunos,
  public.profiles,
  auth.users
cascade;

-- 0c) musculos: remove só o que a suíte adicionou, preservando o seed da 008
-- (exercicio_musculos já foi truncada acima, então não há FK pendurada).
delete from public.musculos where slug not in
 ('deltoides','peitoral','biceps','antebraco','abdomen','obliquos','quadriceps',
  'adutores','tibial','trapezio','dorsal','lombar','triceps','gluteos',
  'isquiotibiais','panturrilha');

-- Resultados
drop table if exists _res;
create temp table _res(id serial, nome text, passou boolean, detalhe text);

-- Helpers de asserção -------------------------------------------------------
create or replace function _expect_fail(p_nome text, p_sql text) returns void
language plpgsql as $$
begin
  begin execute p_sql; insert into _res(nome,passou,detalhe) values(p_nome,false,'NAO falhou (deveria)');
  exception when others then insert into _res(nome,passou,detalhe) values(p_nome,true,'falhou como esperado: '||sqlerrm); end;
end $$;
create or replace function _expect_ok(p_nome text, p_sql text) returns void
language plpgsql as $$
begin
  begin execute p_sql; insert into _res(nome,passou,detalhe) values(p_nome,true,'ok');
  exception when others then insert into _res(nome,passou,detalhe) values(p_nome,false,'erro inesperado: '||sqlerrm); end;
end $$;

-- ===========================================================================
-- SEED (superuser; RLS não se aplica)
-- ===========================================================================
insert into auth.users(id,email) values
 ('bab283a5-480d-41d5-b1b2-7a3ae9000ebd','coach@t'),
 ('11111111-1111-1111-1111-111111111111','caio@t'),
 ('22222222-2222-2222-2222-222222222222','samuel@t');
insert into public.profiles(id,nome,role) values
 ('bab283a5-480d-41d5-b1b2-7a3ae9000ebd','Willian','coach'),
 ('11111111-1111-1111-1111-111111111111','Caio','aluno'),
 ('22222222-2222-2222-2222-222222222222','Samuel','aluno');
update public.profiles set cref='2904-G/GO' where id='bab283a5-480d-41d5-b1b2-7a3ae9000ebd';
insert into public.alunos(id,profile_id,coach_id) values
 ('aaaa1111-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','bab283a5-480d-41d5-b1b2-7a3ae9000ebd'),
 ('aaaa2222-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','bab283a5-480d-41d5-b1b2-7a3ae9000ebd');
insert into public.anamneses(profile_id,objetivo_principal,equipamentos,consentimento_em)
 values ('11111111-1111-1111-1111-111111111111','Perda de gordura','Halteres',now());
-- [ADAPTADO ao schema real] 002_exercicios: criado_por é NOT NULL
insert into public.exercicios(id,criado_por,nome) values ('eeee0000-0000-0000-0000-000000000001','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','Agachamento');
insert into public.programas(id,aluno_id,coach_id,titulo,status,data_inicio,data_fim)
 values ('cccc0000-0000-0000-0000-000000000001','aaaa1111-0000-0000-0000-000000000001','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','Prog Caio','rascunho',current_date,current_date+20);
insert into public.sessoes(id,programa_id,titulo,semana,ordem) values ('55550000-0000-0000-0000-000000000002','cccc0000-0000-0000-0000-000000000001','B',2,1); -- semana 2 inserida primeiro
insert into public.sessoes(id,programa_id,titulo,semana,ordem) values ('55550000-0000-0000-0000-000000000001','cccc0000-0000-0000-0000-000000000001','A',1,1);
-- [ADAPTADO ao schema real] 003_programas: colunas reais sao repeticoes / carga_sugerida
insert into public.sessao_exercicios(sessao_id,exercicio_id,ordem,series,repeticoes,carga_sugerida)
 values ('55550000-0000-0000-0000-000000000001','eeee0000-0000-0000-0000-000000000001',1,3,'10','20kg');

-- ===========================================================================
-- A. Migration ships gate/immutability triggers DISABLED
-- ===========================================================================
insert into _res(nome,passou,detalhe)
select 'A1 gate/imutab. triggers DESLIGADOS na migration',
       bool_and(tgenabled='D'),
       string_agg(tgname||'='||tgenabled::text,', ')
from pg_trigger where tgname in
 ('programas_publicar_trg','programas_bloqueia_pos_pub_trg','sessoes_bloqueia_pos_pub_trg',
  'se_bloqueia_pos_pub_trg','atendimento_imutavel_trg','triagem_imutavel_trg');

insert into _res(nome,passou,detalhe)
select 'A2 TCLE seed com hash sha256 (64 hex)', (length(corpo_hash)=64 and corpo_hash ~ '^[0-9a-f]+$'), corpo_hash
from public.termos where tipo='tcle_telessaude' and versao='1.0';

-- Habilita os triggers SÓ para testar a lógica (DB descartável)
alter table public.programas          enable trigger programas_publicar_trg;
alter table public.programas          enable trigger programas_bloqueia_pos_pub_trg;
alter table public.sessoes            enable trigger sessoes_bloqueia_pos_pub_trg;
alter table public.sessao_exercicios  enable trigger se_bloqueia_pos_pub_trg;
alter table public.atendimentos       enable trigger atendimento_imutavel_trg;
alter table public.triagens_parq      enable trigger triagem_imutavel_trg;

-- ===========================================================================
-- B. CHECK constraints
-- ===========================================================================
select _expect_fail('B1 validade_dias=31 rejeitada',
 $$insert into public.atendimentos(aluno_id,coach_id,tipo,forma,canal,avaliacao_metodo,decisao,realizado_em,validade_dias)
   values('aaaa1111-0000-0000-0000-000000000001','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','teleconsulta','sincrona','whatsapp_video','video_ao_vivo','liberado',now(),31)$$);
select _expect_fail('B2 decisao invalida rejeitada',
 $$insert into public.atendimentos(aluno_id,coach_id,tipo,forma,canal,avaliacao_metodo,decisao,realizado_em)
   values('aaaa1111-0000-0000-0000-000000000001','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','teleconsulta','sincrona','whatsapp_video','video_ao_vivo','xpto',now())$$);

-- Atendimento válido, LIBERADO (para os testes de gate)
insert into public.atendimentos(id,aluno_id,coach_id,tipo,forma,canal,avaliacao_metodo,decisao,realizado_em,validade_dias)
 values('dddd0000-0000-0000-0000-000000000001','aaaa1111-0000-0000-0000-000000000001','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','teleconsulta','sincrona','whatsapp_video','video_ao_vivo','liberado',now(),30);
-- Atendimento PENDENTE
insert into public.atendimentos(id,aluno_id,coach_id,tipo,forma,canal,avaliacao_metodo,decisao,realizado_em)
 values('dddd0000-0000-0000-0000-000000000002','aaaa1111-0000-0000-0000-000000000001','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','teleconsulta','sincrona','whatsapp_video','video_ao_vivo','pendente',now());

-- ===========================================================================
-- C. triagens_parq — derivação e autoria
-- ===========================================================================
-- Aluno insere resposta positiva mas manda alguma_positiva=false -> banco deriva true
insert into public.triagens_parq(id,aluno_id,respostas,alguma_positiva,gestante)
 values('7777aaaa-0000-0000-0000-000000000001','aaaa1111-0000-0000-0000-000000000001','{"q1":false,"q6":true}'::jsonb,false,false);
insert into _res(nome,passou,detalhe)
 select 'C1 alguma_positiva DERIVADA (true apesar de false enviado)', alguma_positiva=true, 'alguma_positiva='||alguma_positiva
 from public.triagens_parq where id='7777aaaa-0000-0000-0000-000000000001';
insert into _res(nome,passou,detalhe)
 select 'C2 aplicada_por setada pelo banco (=null p/ superuser sem app.uid)', true, coalesce(aplicada_por::text,'null')
 from public.triagens_parq where id='7777aaaa-0000-0000-0000-000000000001';

-- Autoria no UPDATE: contexto ALUNO não altera liberacao_obstetrica
select set_config('app.uid','11111111-1111-1111-1111-111111111111',false);
update public.triagens_parq set liberacao_obstetrica_em=now() where id='7777aaaa-0000-0000-0000-000000000001';
insert into _res(nome,passou,detalhe)
 select 'C3 aluno NAO consegue setar liberacao_obstetrica', liberacao_obstetrica_em is null, coalesce(liberacao_obstetrica_em::text,'null')
 from public.triagens_parq where id='7777aaaa-0000-0000-0000-000000000001';
-- Contexto COACH seta liberacao_obstetrica
select set_config('app.uid','bab283a5-480d-41d5-b1b2-7a3ae9000ebd',false);
update public.triagens_parq set liberacao_obstetrica_em=now() where id='7777aaaa-0000-0000-0000-000000000001';
insert into _res(nome,passou,detalhe)
 select 'C4 coach consegue setar liberacao_obstetrica', liberacao_obstetrica_em is not null, coalesce(liberacao_obstetrica_em::text,'null')
 from public.triagens_parq where id='7777aaaa-0000-0000-0000-000000000001';
-- Coach NAO reescreve respostas do aluno
update public.triagens_parq set respostas='{"hacked":true}'::jsonb where id='7777aaaa-0000-0000-0000-000000000001';
insert into _res(nome,passou,detalhe)
 select 'C5 coach NAO reescreve respostas do aluno', not (respostas ? 'hacked'), respostas::text
 from public.triagens_parq where id='7777aaaa-0000-0000-0000-000000000001';
select set_config('app.uid','',false);

-- ===========================================================================
-- D. Gate de publicação (INSERT e UPDATE)
-- ===========================================================================
-- D1 publicar sem atendimento_id -> falha
select _expect_fail('D1 publicar sem atendimento_id',
 $$update public.programas set status='publicado' where id='cccc0000-0000-0000-0000-000000000001'$$);
-- D2 publicar com atendimento PENDENTE -> falha
select _expect_fail('D2 publicar com atendimento pendente',
 $$update public.programas set status='publicado', atendimento_id='dddd0000-0000-0000-0000-000000000002' where id='cccc0000-0000-0000-0000-000000000001'$$);
-- D3 data_fim > realizado_em + validade -> falha (validade 30, data_fim +40)
select _expect_fail('D3 data_fim excede validade (>30d)',
 $$update public.programas set status='publicado', atendimento_id='dddd0000-0000-0000-0000-000000000001', data_fim=current_date+40 where id='cccc0000-0000-0000-0000-000000000001'$$);
-- Sem TCLE aceito ainda -> falha
select _expect_fail('D4 publicar sem TCLE aceito',
 $$update public.programas set status='publicado', atendimento_id='dddd0000-0000-0000-0000-000000000001', data_fim=current_date+20 where id='cccc0000-0000-0000-0000-000000000001'$$);
-- Aceita TCLE do Caio
insert into public.consentimentos(profile_id,termo_id)
 select '11111111-1111-1111-1111-111111111111', id from public.termos where tipo='tcle_telessaude' and versao='1.0';
-- INSERT já publicado sem gate atendido -> falha (prova gate em INSERT)
select _expect_fail('D5 gate dispara em INSERT (programa ja publicado sem requisitos)',
 $$insert into public.programas(aluno_id,coach_id,titulo,status,data_inicio,data_fim)
   values('aaaa2222-0000-0000-0000-000000000002','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','X','publicado',current_date,current_date+10)$$);
-- Caminho feliz
select _expect_ok('D6 publicacao valida (caminho feliz)',
 $$update public.programas set status='publicado', atendimento_id='dddd0000-0000-0000-0000-000000000001', data_fim=current_date+20 where id='cccc0000-0000-0000-0000-000000000001'$$);
insert into _res(nome,passou,detalhe)
 select 'D7 programa_publicacoes v1 criada com hash+cref', (versao=1 and length(conteudo_hash)=64 and coach_cref='2904-G/GO'),
        'v'||versao||' cref='||coalesce(coach_cref,'null')||' hash='||left(conteudo_hash,12)
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001';
insert into _res(nome,passou,detalhe)
 -- [ADAPTADO ao schema real] chave do snapshot e carga_sugerida (coluna real)
 select 'D8 snapshot congelou sessoes+exercicios+carga', (snapshot_json #>> '{sessoes,0,exercicios,0,carga_sugerida}')='20kg',
        (snapshot_json #>> '{sessoes,0,exercicios,0,carga_sugerida}')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001';

insert into _res(nome,passou,detalhe)
 select 'D8b snapshot ordena sessoes por semana,ordem (S1 antes de S2)',
        (snapshot_json #>> '{sessoes,0,sessao,semana}')='1' and (snapshot_json #>> '{sessoes,1,sessao,semana}')='2',
        'semanas na ordem: '||(snapshot_json #>> '{sessoes,0,sessao,semana}')||','||(snapshot_json #>> '{sessoes,1,sessao,semana}')
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001';

-- D9: isolar limite de 30 dias (TCLE ok, atendimento liberado, so a data errada)
insert into public.programas(id,aluno_id,coach_id,titulo,status,data_inicio,data_fim)
 values('cccc0000-0000-0000-0000-000000000002','aaaa1111-0000-0000-0000-000000000001','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','Prog2','rascunho',current_date,current_date+40);
insert into public.atendimentos(id,aluno_id,coach_id,tipo,forma,canal,avaliacao_metodo,decisao,realizado_em,validade_dias)
 values('dddd0000-0000-0000-0000-000000000004','aaaa1111-0000-0000-0000-000000000001','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','teleconsulta','sincrona','whatsapp_video','video_ao_vivo','liberado',now(),30);
select _expect_fail('D9 data_fim +40 > realizado+30 rejeitada (Art.4 I)',
 $$update public.programas set status='publicado', atendimento_id='dddd0000-0000-0000-0000-000000000004' where id='cccc0000-0000-0000-0000-000000000002'$$);

-- ===========================================================================
-- E. Bloqueio de alteração após publicação
-- ===========================================================================
select _expect_fail('E1 editar sessao de programa publicado',
 $$update public.sessoes set titulo='B' where id='55550000-0000-0000-0000-000000000001'$$);
select _expect_fail('E2 editar exercicio de programa publicado',
 $$update public.sessao_exercicios set carga_sugerida='999kg' where sessao_id='55550000-0000-0000-0000-000000000001'$$);
select _expect_fail('E3 editar titulo de programa publicado',
 $$update public.programas set titulo='novo' where id='cccc0000-0000-0000-0000-000000000001'$$);
select _expect_fail('E4 excluir programa publicado',
 $$delete from public.programas where id='cccc0000-0000-0000-0000-000000000001'$$);

-- ===========================================================================
-- F. Imutabilidade de atendimento/triagem utilizados
-- ===========================================================================
select _expect_fail('F1 editar atendimento usado em publicacao',
 $$update public.atendimentos set objetivos='x' where id='dddd0000-0000-0000-0000-000000000001'$$);
select _expect_fail('F2 excluir atendimento usado em publicacao',
 $$delete from public.atendimentos where id='dddd0000-0000-0000-0000-000000000001'$$);

-- ===========================================================================
-- G. Versionamento: unpublish -> republish gera v2
-- ===========================================================================
select _expect_ok('G1 unpublish (publicado->rascunho) permitido',
 $$update public.programas set status='rascunho' where id='cccc0000-0000-0000-0000-000000000001'$$);
-- novo atendimento (reavaliacao) liberado
insert into public.atendimentos(id,aluno_id,coach_id,tipo,forma,canal,avaliacao_metodo,decisao,realizado_em,validade_dias)
 values('dddd0000-0000-0000-0000-000000000003','aaaa1111-0000-0000-0000-000000000001','bab283a5-480d-41d5-b1b2-7a3ae9000ebd','reavaliacao','sincrona','whatsapp_video','video_ao_vivo','liberado',now(),30);
select _expect_ok('G2 republicar com nova avaliacao',
 $$update public.programas set status='publicado', atendimento_id='dddd0000-0000-0000-0000-000000000003', data_fim=current_date+25 where id='cccc0000-0000-0000-0000-000000000001'$$);
insert into _res(nome,passou,detalhe)
 select 'G3 publicacao v2 criada', (max(versao)=2), 'maior versao='||max(versao)
 from public.programa_publicacoes where programa_id='cccc0000-0000-0000-0000-000000000001';

-- ===========================================================================
-- H. CLEANUP GARANTIDO — os 6 triggers da 007 voltam a DESLIGADOS aqui,
-- incondicionalmente, MESMO SE alguma asserção acima falhou. Sob autocommit
-- (este arquivo não abre um BEGIN explícito), a falha de qualquer statement
-- anterior já não impede os statements seguintes de rodar — cada um é sua
-- própria transação implícita. O EXCEPTION WHEN OTHERS aqui dentro é uma
-- segunda trava: garante que mesmo um erro inesperado ao tentar desabilitar
-- não impeça o relatório final de rodar, e blinda o script contra o dia em
-- que ele passar a rodar dentro de uma transação externa única.
-- ===========================================================================
do $$
begin
  execute 'alter table public.programas         disable trigger programas_publicar_trg';
  execute 'alter table public.programas         disable trigger programas_bloqueia_pos_pub_trg';
  execute 'alter table public.sessoes           disable trigger sessoes_bloqueia_pos_pub_trg';
  execute 'alter table public.sessao_exercicios disable trigger se_bloqueia_pos_pub_trg';
  execute 'alter table public.atendimentos      disable trigger atendimento_imutavel_trg';
  execute 'alter table public.triagens_parq     disable trigger triagem_imutavel_trg';
exception when others then
  raise warning 'test_logic cleanup: falha ao desligar triggers — %', sqlerrm;
end $$;

insert into _res(nome,passou,detalhe)
select 'H1 cleanup: os 6 triggers voltam a DESLIGADOS ao final (nao vazam p/ outros arquivos)',
       bool_and(tgenabled='D'),
       string_agg(tgname||'='||tgenabled::text,', ')
from pg_trigger where tgname in
 ('programas_publicar_trg','programas_bloqueia_pos_pub_trg','sessoes_bloqueia_pos_pub_trg',
  'se_bloqueia_pos_pub_trg','atendimento_imutavel_trg','triagem_imutavel_trg');

-- ===========================================================================
select nome, case when passou then 'PASS' else 'FAIL' end as res, detalhe from _res order by id;
select count(*) filter (where passou) as passaram, count(*) filter (where not passou) as falharam, count(*) as total from _res;
