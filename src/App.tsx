import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleGate } from './components/RoleGate'
import { LoadingScreen } from './components/LoadingScreen'
import { AuthPage } from './pages/AuthPage'
import { CoachLayout } from './components/CoachLayout'
import { CoachDashboard } from './pages/coach/Dashboard'
import { AlunosList } from './pages/coach/AlunosList'
import { AlunoFicha } from './pages/coach/AlunoFicha'
import { VincularAluno } from './pages/coach/VincularAluno'
import { Exercicios } from './pages/coach/Exercicios'
import { ProgramaBuilder } from './pages/coach/ProgramaBuilder'
import { AlunoLayout } from './components/AlunoLayout'
import { HojePage } from './pages/aluno/HojePage'
import { TreinoPage } from './pages/aluno/TreinoPage'
import { ProgressoPage } from './pages/aluno/ProgressoPage'
import { AnamnesePage } from './pages/aluno/AnamnesePage'
import { TreinoPlayer } from './pages/aluno/TreinoPlayer'
import { SemPerfil } from './pages/SemPerfil'

/** Rota raiz: decide o destino conforme sessão e papel do usuário. */
function HomeRedirect() {
  const { sessionLoading, session, profileStatus, role } = useAuth()

  if (sessionLoading) return <LoadingScreen />
  if (!session) return <Navigate to="/auth" replace />
  if (profileStatus === 'loading') return <LoadingScreen />
  if (profileStatus === 'missing' || profileStatus === 'error') {
    return <SemPerfil kind={profileStatus} />
  }
  return <Navigate to={role === 'coach' ? '/coach' : '/aluno'} replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/coach"
              element={
                <RoleGate expected="coach">
                  <CoachLayout />
                </RoleGate>
              }
            >
              <Route index element={<CoachDashboard />} />
              <Route path="alunos" element={<AlunosList />} />
              <Route path="alunos/vincular" element={<VincularAluno />} />
              <Route path="alunos/:id" element={<AlunoFicha />} />
              <Route path="exercicios" element={<Exercicios />} />
              <Route path="programas/:programaId" element={<ProgramaBuilder />} />
            </Route>
            <Route
              path="/aluno"
              element={
                <RoleGate expected="aluno">
                  <AlunoLayout />
                </RoleGate>
              }
            >
              <Route index element={<HojePage />} />
              <Route path="treino" element={<TreinoPage />} />
              <Route path="progresso" element={<ProgressoPage />} />
            </Route>
            <Route
              path="/aluno/anamnese"
              element={
                <RoleGate expected="aluno">
                  <AnamnesePage />
                </RoleGate>
              }
            />
            <Route
              path="/aluno/treino/sessao/:sessaoId"
              element={
                <RoleGate expected="aluno">
                  <TreinoPlayer />
                </RoleGate>
              }
            />
          </Route>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
