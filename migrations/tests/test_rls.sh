#!/usr/bin/env bash
# Testes de RLS/grants da 007 num Postgres local (papéis authenticated/anon).
# Pré: mock_base.sql + 007 + test_logic.sql já aplicados no cluster de teste.
# Uso: PGPORT=5433 ./test_rls.sh
set -u
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}; PORT=${PGPORT:-5433}
CAIO='11111111-1111-1111-1111-111111111111'; SAM='22222222-2222-2222-2222-222222222222'
CO='bab283a5-480d-41d5-b1b2-7a3ae9000ebd'
psqls(){ su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"$1\"" 2>&1; }

# Setup: grant/policy de update em profiles p/ isolar o teste do cref (nome grava, cref não)
psqls "grant update(nome) on public.profiles to authenticated;
       drop policy if exists prof_upd on public.profiles;
       create policy prof_upd on public.profiles for update to authenticated using (id=auth.uid());" >/dev/null

num(){ su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"select set_config('app.uid','$1',false); set role $2; $3; reset role;\"" 2>&1 | grep -E '^[0-9]+$' | tail -1; }
den(){ su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"select set_config('app.uid','$1',false); set role $2; $3; reset role;\"" 2>&1 | grep -ci 'denied\|permission'; }
chk(){ printf "%-60s %s\n" "$1" "$2"; }

r=$(num $CO authenticated "select count(*) from public.atendimentos");           [ "${r:-0}" -ge 1 ] 2>/dev/null && chk "R1 coach vê atendimentos dos alunos ($r)" PASS || chk "R1 ($r)" FAIL
r=$(num $CAIO authenticated "select count(*) from public.atendimentos"); a=$(num $CAIO authenticated "select count(*) from public.atendimentos t join public.alunos al on al.id=t.aluno_id where al.profile_id<>'$CAIO'")
{ [ "${r:-0}" -ge 1 ] && [ "${a:-1}" = "0" ]; } 2>/dev/null && chk "R2 aluno só vê os seus (vê=$r alheios=$a)" PASS || chk "R2 (vê=$r alheios=$a)" FAIL
r=$(num $SAM authenticated "select count(*) from public.atendimentos");          [ "${r:-1}" = "0" ] && chk "R3 aluno sem vínculo não vê ($r)" PASS || chk "R3 ($r)" FAIL
[ "$(den $CAIO authenticated "update public.termos set vigente=false")" -ge 1 ]              && chk "R4 termos UPDATE negado (imutável)" PASS || chk "R4" FAIL
[ "$(den $CAIO authenticated "update public.consentimentos set metodo='x'")" -ge 1 ]         && chk "R5 consentimentos UPDATE negado (imutável)" PASS || chk "R5" FAIL
[ "$(den $CAIO authenticated "update public.programa_publicacoes set versao=9")" -ge 1 ]     && chk "R6 programa_publicacoes UPDATE negado (imutável)" PASS || chk "R6" FAIL
ra=$(su postgres -c "$PGBIN/psql -p $PORT -tA -X -c \"select set_config('app.uid','$CAIO',false); set role authenticated; update public.profiles set nome='Caio2' where id='$CAIO'; reset role;\"" 2>&1 | grep -ci 'UPDATE 1')
rb=$(den $CAIO authenticated "update public.profiles set cref='9999' where id='$CAIO'")
{ [ "$ra" -ge 1 ] && [ "$rb" -ge 1 ]; } && chk "R7 cref travado (nome ok, cref negado)" PASS || chk "R7 (nome=$ra cref-negado=$rb)" FAIL
[ "$(den '' anon "select count(*) from public.atendimentos")" -ge 1 ]                        && chk "R8 anon acesso negado" PASS || chk "R8" FAIL
