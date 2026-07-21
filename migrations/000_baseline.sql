-- ============================================================================
-- 000_baseline — DOCUMENTAÇÃO DO SCHEMA PRÉ-EXISTENTE. NÃO EXECUTAR.
-- Estado do banco em 2026-07-13, criado originalmente via Dashboard (Blocos
-- 1–4 do go-live). Serve de contexto para as migrations seguintes.
-- Rollback: n/a (nada é aplicado por este arquivo).
-- ============================================================================

/*
TABELAS (RLS ativo em ambas; event trigger rls_auto_enable garante RLS em
tabelas novas do schema public):

profiles (
  id uuid PK REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'aluno' CHECK (role IN ('aluno','coach')),
  nome text, whatsapp text, cidade text,
  created_at timestamptz NOT NULL DEFAULT now()
)

alunos (
  id uuid PK DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','ativo','pausado','concluido')),
  objetivo text, nivel text,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,  -- calculada por trigger: data_inicio + 30
  created_at timestamptz NOT NULL DEFAULT now()
)

FUNÇÕES: is_coach(uuid) · handle_new_user() (AFTER INSERT auth.users → cria
profile 'aluno' com nome/whatsapp/cidade do raw_user_meta_data) ·
set_aluno_data_fim() (BEFORE INSERT/UPDATE alunos) · first_coach_id() ·
rls_auto_enable() (event trigger CREATE TABLE → enable RLS).

POLICIES (todas TO authenticated, nenhuma "true"):
  profiles: select_own · select_coach_all · update_safe_own (CHECK role imutável)
  alunos:   select_own · select_coach · insert_coach · update_coach

GRANTS (padrão do projeto: por COLUNA; anon tem zero grants):
  profiles: SELECT tudo; UPDATE nome, whatsapp, cidade
  alunos:   SELECT tudo; INSERT sem id/created_at; UPDATE status, objetivo,
            nivel, data_inicio, data_fim
*/
