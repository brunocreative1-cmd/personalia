-- ============================================================================
-- 009_fix_policy_profiles_update.sql — ENSAIO (rollback no fim; nada persiste)
-- NÃO APLICADO EM PRODUÇÃO. Aplicação real: 009_..._APPLY.sql, só com ordem.
--
-- BUG (descoberto na Sessão 10, 20/07/2026, via restore provado + suíte R7):
--   a policy profiles_update_safe_own tem WITH CHECK com subselect na PRÓPRIA
--   public.profiles:
--     ((id = auth.uid()) AND (role = (SELECT p2.role FROM profiles p2
--                                      WHERE p2.id = auth.uid())))
--   Policy de T que consulta T dispara "infinite recursion detected in policy
--   for relation profiles" em QUALQUER UPDATE por authenticated. O alcance é
--   real: authenticated TEM grant de UPDATE em nome/whatsapp/cidade (lido
--   read-only em 20/07). Hoje nenhuma tela faz esse UPDATE — bug latente,
--   nenhum usuário real afetado — mas qualquer feature "editar meu perfil"
--   quebraria na primeira gravação.
--
-- CORREÇÃO (aditiva, padrão is_coach): função SECURITY DEFINER role_of()
-- faz a leitura do role SEM passar pela RLS de profiles (dono postgres tem
-- bypassrls), e a policy é recriada trocando SÓ o subselect por essa função.
-- USING, roles-alvo e semântica (role imutável no UPDATE) ficam idênticos.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) PROVA DO BUG (pré-fix), com ator sintético e o auth.uid() REAL (claims)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
) values (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000909',
  'authenticated', 'authenticated', 'ensaio009@teste.local', '', now(),
  '{"provider":"email","providers":["email"]}', '{"nome":"Ensaio 009"}',
  now(), now(), '', '', '', '', ''
);  -- handle_new_user cria o profile (role aluno)

do $$
begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-000000000909","role":"authenticated"}', true);
  execute 'set local role authenticated';
  begin
    update public.profiles set nome = 'Prova Pre-Fix'
     where id = '00000000-0000-4000-8000-000000000909';
    raise exception '009 ENSAIO ABORTADO: UPDATE passou ANTES do fix — o bug nao se reproduziu (ambiente diverge do lido em 20/07?)';
  exception
    when others then
      if sqlerrm not like '%infinite recursion%' then raise; end if;
      raise notice 'PASS pre-fix: recursao infinita reproduzida como esperado';
  end;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 1) FIX: role_of() — mesma família do is_coach (SECDEF, search_path fixo)
-- ---------------------------------------------------------------------------
create or replace function public.role_of(user_id uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = user_id
$$;

-- padrão da 008 p/ funções sensíveis: EXECUTE default de PUBLIC é revogado;
-- só quem precisa (avaliação de policy como authenticated) recebe.
revoke execute on function public.role_of(uuid) from public;
grant execute on function public.role_of(uuid) to authenticated;

-- 2) Recria a policy: MESMOS using/roles; só o subselect vira role_of()
drop policy profiles_update_safe_own on public.profiles;
create policy profiles_update_safe_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.role_of(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) PROVA PÓS-FIX (mesmo ator, mesmas condições)
-- ---------------------------------------------------------------------------
do $$
begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-000000000909","role":"authenticated"}', true);
  execute 'set local role authenticated';

  -- (a) update de coluna permitida FUNCIONA
  update public.profiles set nome = 'Prova Pos-Fix'
   where id = '00000000-0000-4000-8000-000000000909';
  if not found then
    raise exception '009 ENSAIO ABORTADO: UPDATE de nome nao afetou linha apos o fix';
  end if;
  raise notice 'PASS pos-fix (a): aluno atualiza o proprio nome';

  -- (b) cref segue travado (sem grant de coluna)
  begin
    update public.profiles set cref = '9999'
     where id = '00000000-0000-4000-8000-000000000909';
    raise exception '009 ENSAIO ABORTADO: cref foi gravavel por authenticated';
  exception
    when insufficient_privilege then
      raise notice 'PASS pos-fix (b): cref segue negado (permission denied)';
  end;

  -- (c) role segue travado (sem grant de coluna; dupla trava c/ with check)
  begin
    update public.profiles set role = 'coach'
     where id = '00000000-0000-4000-8000-000000000909';
    raise exception '009 ENSAIO ABORTADO: role foi gravavel por authenticated';
  exception
    when insufficient_privilege then
      raise notice 'PASS pos-fix (c): role segue negado (permission denied)';
  end;
end $$;
reset role;

-- conferência manual antes de decidir pelo APPLY:
--   select policyname, qual, with_check from pg_policies
--    where tablename='profiles' and cmd='UPDATE';

rollback;   -- ENSAIO: nada persiste. Aplicação real é o _APPLY, só com ordem.
