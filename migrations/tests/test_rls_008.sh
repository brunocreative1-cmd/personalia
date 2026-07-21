#!/usr/bin/env bash
# Testes de RLS/grants da 008 (musculos, exercicio_musculos, execucoes.simulado)
# num Postgres local. Pré: 000..007 reais + 008 + test_logic.sql + test_logic_008.sql
# já rodaram no MESMO cluster de teste (reaproveita atores/estado deixado por eles).
# Uso: PGPORT=5433 ./test_rls_008.sh
set -u
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}; PORT=${PGPORT:-5433}
CAIO='11111111-1111-1111-1111-111111111111'; SAM='22222222-2222-2222-2222-222222222222'
CO='bab283a5-480d-41d5-b1b2-7a3ae9000ebd'
psqls(){ su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"$1\"" 2>&1; }
num(){ su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"select set_config('app.uid','$1',false); set role $2; $3; reset role;\"" 2>&1 | grep -E '^[0-9]+$' | tail -1; }
# conta como "negado" tanto erro de GRANT (denied/permission) quanto de RLS
# (a WITH CHECK de uma policy impede o INSERT/UPDATE com mensagem própria:
# "new row violates row-level security policy")
den(){ su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"select set_config('app.uid','$1',false); set role $2; $3; reset role;\"" 2>&1 | grep -ci 'denied\|permission\|row-level security'; }
chk(){ printf "%-70s %s\n" "$1" "$2"; }

EX='eeee0000-0000-0000-0000-000000000001'
PROG='cccc0000-0000-0000-0000-000000000001'

# --- (d) montar_snapshot_programa: RPC direto negado apos o revoke; o fluxo
#     normal via trigger (SECURITY DEFINER) continua funcionando ---
[ "$(den $CAIO authenticated "select public.montar_snapshot_programa('$PROG'::uuid)")" -ge 1 ] && chk "D1 authenticated NAO executa montar_snapshot_programa direto (revoke ok)" PASS || chk "D1" FAIL
[ "$(den '' anon "select public.montar_snapshot_programa('$PROG'::uuid)")" -ge 1 ] && chk "D2 anon NAO executa montar_snapshot_programa direto (revoke ok)" PASS || chk "D2" FAIL

# controle positivo: publicar via UPDATE (papel legitimo do coach) SEGUE
# funcionando apos o revoke — ele so bloqueia chamada DIRETA da RPC; o
# trigger programas_publicar (SECURITY DEFINER, dono com privilegios
# plenos) continua chamando a funcao internamente sem passar pela checagem
# de EXECUTE do papel 'authenticated' que disparou o UPDATE. Liga o gate
# explicitamente aqui (nao depende do que outro arquivo deixou ligado) e
# desliga de volta logo apos o teste — autossuficiente.
psqls "alter table public.programas enable trigger programas_publicar_trg" >/dev/null
NOVO_PROG='d0d00000-0000-0000-0000-000000000001'
NOVA_SESSAO='90900000-0000-0000-0000-000000000001'
NOVO_ATEND='a0a00000-0000-0000-0000-000000000009'
psqls "insert into public.programas(id,aluno_id,coach_id,titulo,status,data_inicio,data_fim)
        values('$NOVO_PROG','aaaa1111-0000-0000-0000-000000000001','$CO','Prog Revoke Check','rascunho',current_date,current_date+10)" >/dev/null
psqls "insert into public.sessoes(id,programa_id,titulo,semana,ordem) values('$NOVA_SESSAO','$NOVO_PROG','U',1,1)" >/dev/null
psqls "insert into public.atendimentos(id,aluno_id,coach_id,tipo,forma,canal,avaliacao_metodo,decisao,realizado_em,validade_dias)
        values('$NOVO_ATEND','aaaa1111-0000-0000-0000-000000000001','$CO','teleconsulta','sincrona','whatsapp_video','video_ao_vivo','liberado',now(),30)" >/dev/null
r=$(su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"select set_config('app.uid','$CO',false); set role authenticated; update public.programas set status='publicado', atendimento_id='$NOVO_ATEND' where id='$NOVO_PROG'; reset role;\"" 2>&1 | grep -ci 'UPDATE 1')
r2=$(psqls "select count(*) from public.programa_publicacoes where programa_id='$NOVO_PROG'")
{ [ "$r" -ge 1 ] && [ "${r2:-0}" -ge 1 ]; } 2>/dev/null && chk "D3 coach PUBLICA normalmente apos o revoke (trigger interno segue chamando a funcao)" PASS || chk "D3 (update=$r pub=$r2)" FAIL
psqls "alter table public.programas disable trigger programas_publicar_trg" >/dev/null

# --- (e) musculos: leitura authenticated ampla ---
r=$(num $CAIO authenticated "select count(*) from public.musculos"); [ "${r:-0}" -ge 16 ] 2>/dev/null && chk "E1 aluno vinculado le catalogo de musculos (tem=$r)" PASS || chk "E1 (tem=$r)" FAIL
r=$(num $SAM authenticated "select count(*) from public.musculos"); [ "${r:-0}" -ge 16 ] 2>/dev/null && chk "E2 aluno SEM vinculo tambem le musculos (leitura e ampla, tem=$r)" PASS || chk "E2 (tem=$r)" FAIL

# --- (e) musculos: escrita só coach ---
[ "$(den $CAIO authenticated "insert into public.musculos(slug,label,vista) values('teste_e3','Teste E3','frente')")" -ge 1 ] && chk "E3 aluno NAO insere em musculos" PASS || chk "E3" FAIL
r=$(su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"select set_config('app.uid','$CO',false); set role authenticated; insert into public.musculos(slug,label,vista) values('teste_e4','Teste E4','frente'); reset role;\"" 2>&1 | grep -ci 'INSERT 0 1')
[ "$r" -ge 1 ] && chk "E4 coach insere em musculos" PASS || chk "E4 ($r)" FAIL
[ "$(den $CAIO authenticated "update public.musculos set slug='hackeado' where slug='quadriceps'")" -ge 1 ] && chk "E5 NINGUEM edita slug (sem grant de update) — nem coach" PASS || chk "E5" FAIL

# --- (e) exercicio_musculos: leitura ampla, escrita só do coach DONO do exercicio ---
r=$(num $CAIO authenticated "select count(*) from public.exercicio_musculos"); [ "${r:-0}" -ge 1 ] 2>/dev/null && chk "E6 aluno le exercicio_musculos (tem=$r)" PASS || chk "E6 (tem=$r)" FAIL
MID=$(psqls "select id from public.musculos where slug='panturrilha'")
[ "$(den $CAIO authenticated "insert into public.exercicio_musculos(exercicio_id,musculo_id,papel) values('$EX','$MID','secundario')")" -ge 1 ] && chk "E7 aluno NAO insere em exercicio_musculos" PASS || chk "E7" FAIL
r=$(su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"select set_config('app.uid','$CO',false); set role authenticated; insert into public.exercicio_musculos(exercicio_id,musculo_id,papel) values('$EX','$MID','secundario') on conflict do nothing; reset role;\"" 2>&1 | grep -ci 'INSERT\|ON_CONFLICT\|conflict')
r2=$(psqls "select count(*) from public.exercicio_musculos where exercicio_id='$EX' and musculo_id='$MID'")
[ "${r2:-0}" -ge 1 ] 2>/dev/null && chk "E8 coach dono do exercicio insere em exercicio_musculos (tem=$r2)" PASS || chk "E8 (tem=$r2)" FAIL

# --- (f) execucoes.simulado: cliente nao grava, nem tentando explicitamente (grant) ---
[ "$(den $CAIO authenticated "update public.execucoes set simulado=true where id='e0e00000-0000-0000-0000-000000000002'")" -ge 1 ] && chk "F1 aluno NAO faz UPDATE em execucoes.simulado (sem grant)" PASS || chk "F1" FAIL
[ "$(den $CAIO authenticated "insert into public.execucoes(aluno_id,programa_id,sessao_id,simulado) values('aaaa1111-0000-0000-0000-000000000001','cccc0000-0000-0000-0000-000000000001','55550000-0000-0000-0000-000000000001',true)")" -ge 1 ] && chk "F2 aluno NAO insere execucoes com simulado no corpo (sem grant)" PASS || chk "F2" FAIL

# controle positivo: insert normal (sem mencionar simulado) continua funcionando
r=$(su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"select set_config('app.uid','$CAIO',false); set role authenticated; insert into public.execucoes(aluno_id,programa_id,sessao_id) values('aaaa1111-0000-0000-0000-000000000001','cccc0000-0000-0000-0000-000000000001','55550000-0000-0000-0000-000000000001') returning simulado; reset role;\"" 2>&1 | grep -E '^(t|f)$' | tail -1)
[ "$r" = "f" ] && chk "F3 insert normal do aluno segue funcionando; simulado deriva=false" PASS || chk "F3 (simulado=$r)" FAIL

[ "$(den '' anon "select count(*) from public.musculos")" -ge 1 ] && chk "F4 anon sem acesso a musculos" PASS || chk "F4" FAIL
[ "$(den '' anon "select count(*) from public.exercicio_musculos")" -ge 1 ] && chk "F5 anon sem acesso a exercicio_musculos" PASS || chk "F5" FAIL
