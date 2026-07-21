-- ============================================================================
-- 004_profiles_coach_visivel_ao_aluno (Release 1, Bloco 5)
-- ADITIVA: apenas uma CREATE POLICY.
--
-- O aluno precisa ler nome/whatsapp do PRÓPRIO coach para o botão
-- "falar com o coach" (canal oficial do produto é o WhatsApp).
-- Escopo mínimo: só o profile do coach vinculado ao aluno logado —
-- nenhum outro usuário fica visível.
--
-- ROLLBACK (manual, só com autorização humana):
--   drop policy profiles_select_meu_coach on public.profiles;
-- ============================================================================

create policy profiles_select_meu_coach on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.alunos a
      where a.coach_id = profiles.id
        and a.profile_id = auth.uid()
    )
  );
