import { createClient } from '@supabase/supabase-js'
import { DESIGN_PREVIEW_ROLE } from './flags'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// No modo DESIGN_PREVIEW os dados vêm dos mocks e o cliente nunca chega a
// fazer requisição, então credenciais ausentes são toleradas (usa um destino
// inócuo). Fora do preview, a ausência continua sendo erro fatal.
if ((!rawUrl || !rawKey) && !DESIGN_PREVIEW_ROLE) {
  throw new Error(
    'Variáveis de ambiente ausentes: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env'
  )
}

export const SUPABASE_URL = rawUrl ?? 'https://demo.invalid'
export const SUPABASE_ANON_KEY = rawKey ?? 'demo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
