/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  getLocalState,
  saveLocalState,
  resetLocalState,
  INITIAL_CONFIG,
  INITIAL_SERVICES,
  INITIAL_PROFESSIONALS,
  INITIAL_CLIENTS,
  INITIAL_APPOINTMENTS,
  LocalState,
} from './data';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ClientBooking from './features/booking/ClientBooking';
import ClientAppointmentsPage from './features/client/ClientAppointmentsPage';
import OwnerDashboard from './features/owner/OwnerDashboard';
import ProfessionalDashboard from './features/professional/ProfessionalDashboard';
import FirstAccessPage from './features/auth/FirstAccessPage';
import MasterDashboard from './features/master/MasterDashboard';
import { supabase } from './lib/supabase';
import { Appointment } from './types';
import { Loader2, Zap } from 'lucide-react';

type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'owner-dashboard'
  | 'professional-dashboard'
  | 'client-booking'
  | 'client-appointments'
  | 'first-access'
  | 'master-dashboard';

type SessionUser = {
  email: string;
  role: 'owner' | 'professional';
  name: string;
  professionalId?: string;
  tenantId?: string;
  tenantSlug?: string;
};

type OwnerContext = {
  id?: string;
  profile_id?: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_developer: boolean | null;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: string;
  tenant_plan: string;
  max_professionals: number;
  user_role: 'owner' | 'manager' | 'admin' | string;
  user_active?: boolean;
  is_active?: boolean;
};


function isProductionLikeEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return Boolean(import.meta.env.PROD);
  }

  const hostname = window.location.hostname;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

  return Boolean(import.meta.env.PROD && !isLocalHost);
}

function getFallbackLocalState(): LocalState {
  return {
    config: { ...INITIAL_CONFIG },
    services: [...INITIAL_SERVICES],
    professionals: [...INITIAL_PROFESSIONALS],
    clients: [...INITIAL_CLIENTS],
    appointments: [...INITIAL_APPOINTMENTS],
  };
}

function getInitialAppState(): LocalState {
  if (isProductionLikeEnvironment()) {
    return getFallbackLocalState();
  }

  return getLocalState();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function getClientPhoneKey(client: {
  phone: string;
  phoneNormalized?: string;
}): string {
  return client.phoneNormalized || normalizePhone(client.phone);
}

function getProfessionalAccessTokenFromPath(): string {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const accessIndex = parts.findIndex((part) => part === 'profissional-acesso');

  if (accessIndex === -1) return '';

  return parts[accessIndex + 1] ?? '';
}


function getClientAppointmentsTokenFromPath(): string {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const appointmentsIndex = parts.findIndex((part) => part === 'meus-agendamentos');

  if (appointmentsIndex === -1) return '';

  return parts[appointmentsIndex + 1] ?? '';
}

const RESERVED_PUBLIC_PATHS = new Set([
  'login',
  'cadastro',
  'owner',
  'painel',
  'master',
  'profissional',
  'profissional-acesso',
  'primeiro-acesso',
  'meus-agendamentos',
]);

function getPathParts(): string[] {
  return window.location.pathname.split('/').filter(Boolean);
}

function isPublicBookingPath(): boolean {
  const parts = getPathParts();
  const firstPart = parts[0] || '';

  if (!firstPart) {
    return false;
  }

  if (firstPart === 'agendar') {
    return true;
  }

  return !RESERVED_PUBLIC_PATHS.has(firstPart);
}

function normalizePublicSlug(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
}

function getPublicBookingPath(slug?: string | null): string {
  const normalizedSlug = normalizePublicSlug(slug);

  if (!normalizedSlug) {
    return '/agendar';
  }

  return `/${normalizedSlug}`;
}

function getPublicBookingUrl(slug?: string | null): string {
  return `${window.location.origin}${getPublicBookingPath(slug)}`;
}

function getInitialViewFromPath(): AppView {
  const pathname = window.location.pathname;

  if (pathname.startsWith('/primeiro-acesso/')) {
    return 'first-access';
  }

  if (pathname.startsWith('/meus-agendamentos/')) {
    return 'client-appointments';
  }

  if (pathname === '/login') {
    return 'login';
  }

  if (pathname === '/cadastro') {
    return 'register';
  }

  if (pathname === '/painel' || pathname === '/owner') {
    return 'owner-dashboard';
  }

  if (pathname === '/master') {
    return 'master-dashboard';
  }

  if (pathname === '/profissional' || pathname.startsWith('/profissional-acesso/')) {
    return 'professional-dashboard';
  }

  if (isPublicBookingPath()) {
    return 'client-booking';
  }

  return 'landing';
}

function getInitialSessionUser(initialView: AppView): SessionUser | null {
  if (initialView === 'professional-dashboard') {
    const professionalAccessToken = getProfessionalAccessTokenFromPath();

    if (professionalAccessToken) {
      return {
        email: '',
        role: 'professional',
        name: 'Profissional',
        professionalId: '',
      };
    }

    return {
      email: 'joao@agendazap.com',
      role: 'professional',
      name: 'João Silva',
      professionalId: 'prof-1',
    };
  }

  return null;
}

function getNextClientInternalCode(clients: LocalState['clients']): string {
  const highestCodeNumber = clients.reduce((highest, client) => {
    const codeNumber = Number(String(client.internalCode || '').replace(/\D/g, ''));

    if (Number.isFinite(codeNumber) && codeNumber > highest) {
      return codeNumber;
    }

    return highest;
  }, 0);

  const nextCodeNumber = highestCodeNumber > 0
    ? highestCodeNumber + 1
    : clients.length + 1;

  return `CLI-${String(nextCodeNumber).padStart(6, '0')}`;
}

export default function App() {
  const initialView = getInitialViewFromPath();
  const isProductionLike = isProductionLikeEnvironment();

  // Estado local é apenas fallback visual para telas herdadas.
  // Em produção, a fonte oficial é sempre Supabase/RPC, nunca localStorage.
  const [appState, setAppState] = useState<LocalState>(getInitialAppState);

  // Simple view router state.
  const [currentView, setCurrentView] = useState<AppView>(initialView);

  // Logged-in session state.
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(() => getInitialSessionUser(initialView));
  const [ownerContext, setOwnerContext] = useState<OwnerContext | null>(null);
  const [professionalAccessToken] = useState<string>(() => getProfessionalAccessTokenFromPath());
  const [clientAppointmentsToken] = useState<string>(() => getClientAppointmentsTokenFromPath());
  const [authChecking, setAuthChecking] = useState(true);

  // Preseed helper for redirecting directly to specific screens from header/landing CTAs.
  const [preseedRole, setPreseedRole] = useState<'owner' | 'professional' | null>(null);

  const navigateTo = (view: AppView, path?: string) => {
    setCurrentView(view);

    if (path) {
      window.history.pushState({}, '', path);
    }
  };

  const loadSupabaseOwnerSession = async () => {
    const sessionResult = await supabase.auth.getSession();
    const activeSession = sessionResult.data.session;

    if (!activeSession?.user) {
      setOwnerContext(null);
      setSessionUser((current) => {
        if (current?.role === 'professional') return current;
        return null;
      });
      return null;
    }

    const { data, error } = await supabase.rpc('get_my_owner_context');

    if (error) {
      console.error('Erro ao buscar contexto do dono:', error.message);
      setOwnerContext(null);
      return null;
    }

    const firstContext = (Array.isArray(data) ? data[0] : null) as OwnerContext | null;

    const ownerIsActive =
      firstContext?.user_active === true || firstContext?.is_active === true;

    if (!firstContext?.tenant_id || !ownerIsActive) {
      setOwnerContext(null);
      return null;
    }

    setOwnerContext(firstContext);

    const user: SessionUser = {
      email: firstContext.email || activeSession.user.email || '',
      role: 'owner',
      name: firstContext.full_name || firstContext.tenant_name || 'Dono',
      tenantId: firstContext.tenant_id,
      tenantSlug: firstContext.tenant_slug,
    };

    setSessionUser(user);
    return user;
  };

  useEffect(() => {
    let isMounted = true;

    async function checkInitialAuth() {
      setAuthChecking(true);

      const pathname = window.location.pathname;
      const currentProfessionalAccessToken = getProfessionalAccessTokenFromPath();

      if (pathname.startsWith('/profissional-acesso/') && currentProfessionalAccessToken) {
        setOwnerContext(null);
        setSessionUser({
          email: '',
          role: 'professional',
          name: 'Profissional',
          professionalId: '',
        });

        if (isMounted) {
          setAuthChecking(false);
        }

        return;
      }

      const user = await loadSupabaseOwnerSession();

      if (!isMounted) return;

      if ((pathname === '/painel' || pathname === '/owner') && !user) {
        navigateTo('login', '/login');
      }

      if (pathname === '/owner' && user) {
        navigateTo('owner-dashboard', '/painel');
      }

      if ((pathname === '/login' || pathname === '/cadastro') && user?.role === 'owner') {
        navigateTo('owner-dashboard', '/painel');
      }

      setAuthChecking(false);
    }

    checkInitialAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async () => {
      const currentProfessionalAccessToken = getProfessionalAccessTokenFromPath();

      if (window.location.pathname.startsWith('/profissional-acesso/') && currentProfessionalAccessToken) {
        setOwnerContext(null);
        setSessionUser({
          email: '',
          role: 'professional',
          name: 'Profissional',
          professionalId: '',
        });
        return;
      }

      await loadSupabaseOwnerSession();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Atualiza o fallback em memória.
  // localStorage fica restrito ao desenvolvimento para evitar banco paralelo em produção.
  const handleUpdateState = (newState: LocalState) => {
    setAppState(newState);

    if (!isProductionLike) {
      saveLocalState(newState);
    }
  };

  // Callback legado para sincronizar fallback visual após agendamento.
  // O agendamento real já é gravado no Supabase pela tela/RPC de origem.
  const handleAddAppointment = (newAppt: Appointment) => {
    const updatedAppts = [newAppt, ...appState.appointments];
    const clientPhoneNormalized = normalizePhone(newAppt.clientPhone);

    const existingClient = appState.clients.find((client) => {
      return getClientPhoneKey(client) === clientPhoneNormalized;
    });

    let updatedClients = [...appState.clients];

    if (existingClient) {
      updatedClients = appState.clients.map((client) => {
        if (client.id !== existingClient.id) {
          return client;
        }

        return {
          ...client,
          name: newAppt.clientName || client.name,
          phone: newAppt.clientPhone,
          phoneNormalized: clientPhoneNormalized,
          preferredProfessionalId: newAppt.professionalId || client.preferredProfessionalId,
        };
      });
    } else {
      updatedClients.push({
        id: `cli-autogen-${Date.now()}`,
        internalCode: getNextClientInternalCode(appState.clients),
        name: newAppt.clientName,
        phone: newAppt.clientPhone,
        phoneNormalized: clientPhoneNormalized,
        phoneHistory: [],
        preferredProfessionalId: newAppt.professionalId,
        notes: 'Cliente agendou automaticamente pelo Link de Clientes.',
        absences: 0,
        cancellations: 0,
        totalSpent: 0,
      });
    }

    handleUpdateState({
      ...appState,
      appointments: updatedAppts,
      clients: updatedClients,
    });
  };

  // Callback legado para sincronizar fallback visual de status.
  // A alteração real de status deve continuar passando pelas RPCs protegidas.
  const handleModifyAppointment = (apptId: string, updates: Partial<Appointment>) => {
    const updatedAppts = appState.appointments.map((appt) => {
      if (appt.id === apptId) {
        return { ...appt, ...updates };
      }
      return appt;
    });

    let updatedClients = [...appState.clients];

    // If marked as completed, increment total spent.
    if (updates.status === 'completed') {
      const matchAppt = appState.appointments.find((appt) => appt.id === apptId);
      if (matchAppt) {
        updatedClients = appState.clients.map((client) => {
          if (getClientPhoneKey(client) === normalizePhone(matchAppt.clientPhone)) {
            return {
              ...client,
              totalSpent: client.totalSpent + matchAppt.price,
            };
          }
          return client;
        });
      }
    } else if (updates.status === 'absent') {
      const matchAppt = appState.appointments.find((appt) => appt.id === apptId);
      if (matchAppt) {
        updatedClients = appState.clients.map((client) => {
          if (getClientPhoneKey(client) === normalizePhone(matchAppt.clientPhone)) {
            return {
              ...client,
              absences: client.absences + 1,
            };
          }
          return client;
        });
      }
    }

    handleUpdateState({
      ...appState,
      appointments: updatedAppts,
      clients: updatedClients,
    });
  };

  const handleAuthSuccess = (user: SessionUser) => {
    setSessionUser(user);
    if (user.role === 'owner') {
      navigateTo('owner-dashboard', '/painel');
    } else {
      navigateTo('professional-dashboard', '/profissional');
    }
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    setOwnerContext(null);
    setPreseedRole(null);
    navigateTo('login', '/login');
  };

  const getActiveTenantSlug = (): string => {
    return normalizePublicSlug(
      ownerContext?.tenant_slug ||
        sessionUser?.tenantSlug ||
        ''
    );
  };

  const handleOpenPublicBookingLink = () => {
    const publicBookingUrl = getPublicBookingUrl(getActiveTenantSlug());

    window.open(
      publicBookingUrl,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleResetData = () => {
    if (isProductionLike) {
      alert('Reset de dados fictícios disponível apenas no ambiente de desenvolvimento.');
      return;
    }

    if (confirm('Tem certeza de que deseja restaurar as tabelas simulação para o formato padrão do sistema? Todos os novos registros serão reiniciados.')) {
      const defaultState = resetLocalState();
      setAppState(defaultState);
      alert('Tabelas redefinidas com sucesso!');
      navigateTo('login', '/login');
    }
  };

  const showDemoFloatingBar = !isProductionLike && false;

  if (authChecking && currentView === 'owner-dashboard') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-orange-500" />
          <p className="text-lg font-black text-neutral-900">Verificando acesso...</p>
          <p className="mt-2 text-sm text-neutral-500">Aguarde alguns segundos.</p>
        </div>
      </main>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-neutral-50 flex flex-col justify-between">
      {/* Route Switch Pane */}
      <div className="flex-1 w-full">
        {currentView === 'first-access' && (
          <FirstAccessPage />
        )}

        {currentView === 'landing' && (
          <LandingPage
            onNavigate={(dest) => {
              if (dest === 'register') {
                navigateTo('register', '/cadastro');
              } else if (dest === 'login') {
                navigateTo('login', '/login');
              } else if (dest === 'client-booking') {
                navigateTo('client-booking', '/agendar');
              }
            }}
            onSetInitialRole={(role) => setPreseedRole(role)}
          />
        )}

        {(currentView === 'login' || currentView === 'register') && (
          <AuthPage
            initialMode={currentView === 'register' ? 'register' : 'login'}
            initialRolePreseed={preseedRole}
            onAuthSuccess={handleAuthSuccess}
            onNavigateBack={() => {
              setPreseedRole(null);
              navigateTo('login', '/login');
            }}
          />
        )}


        {currentView === 'client-appointments' && (
          <ClientAppointmentsPage
            token={clientAppointmentsToken}
            state={appState}
          />
        )}

        {currentView === 'client-booking' && (
          <ClientBooking
            state={appState}
            onAddAppointment={handleAddAppointment}
            onNavigateBack={() => navigateTo('landing', '/')}
          />
        )}

        {currentView === 'master-dashboard' && (
          <MasterDashboard
            onLogOut={handleLogOut}
            onNavigateToLogin={() => navigateTo('login', '/login')}
          />
        )}

        {currentView === 'owner-dashboard' && sessionUser?.role === 'owner' && (
          <OwnerDashboard
            state={appState}
            onUpdateState={handleUpdateState}
            onNavigateToClient={handleOpenPublicBookingLink}
            onLogOut={handleLogOut}
          />
        )}

        {currentView === 'owner-dashboard' && !authChecking && sessionUser?.role !== 'owner' && (
          <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
            <div className="rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-sm">
              <p className="text-xl font-black text-neutral-900">Acesso necessário</p>
              <p className="mt-2 text-sm text-neutral-500">Faça login para acessar o painel protegido.</p>
              <button
                onClick={() => navigateTo('login', '/login')}
                className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase text-white hover:bg-orange-600"
              >
                Ir para login
              </button>
            </div>
          </div>
        )}

        {currentView === 'professional-dashboard' && (professionalAccessToken || sessionUser?.role === 'professional') && (
          <ProfessionalDashboard
            state={appState}
            professionalId={professionalAccessToken ? '' : sessionUser?.professionalId || ''}
            professionalAccessToken={professionalAccessToken || undefined}
            onModifyAppointment={handleModifyAppointment}
            onAddManualAppointment={handleAddAppointment}
            onLogOut={handleLogOut}
          />
        )}
      </div>

      {/* Modern, elegant Floating Presentation Toolbar at the bottom of the screen */}
      {showDemoFloatingBar && (
        <div id="demo-floating-bar" className="sticky bottom-4 left-0 right-0 max-w-xl mx-auto px-4 pb-4 z-40">
          <div className="bg-neutral-900 border border-neutral-800 text-white rounded-2xl p-3.5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="bg-orange-500 p-1.5 rounded-lg text-white">
                <Zap className="w-4 h-4 text-white fill-current animate-pulse" />
              </div>
              <div className="text-left">
                <h4 className="text-[11px] font-bold tracking-tight uppercase text-orange-400">Barra de Simulação de Vendas</h4>
                <p className="text-[10px] text-zinc-400">Navegue pelas telas do AgendaZap sem travar o app.</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                id="switch-landing"
                onClick={() => { setPreseedRole(null); navigateTo('landing', '/'); }}
                className={`text-[10px] px-2.5 py-1 rounded-lg transition font-extrabold cursor-pointer ${currentView === 'landing' ? 'bg-orange-600 text-white' : 'bg-neutral-800 hover:bg-neutral-755 text-zinc-300'}`}
              >
                Landing
              </button>
              <button
                id="switch-booking"
                onClick={() => navigateTo('client-booking', '/agendar')}
                className={`text-[10px] px-2.5 py-1 rounded-lg transition font-extrabold cursor-pointer ${currentView === 'client-booking' ? 'bg-orange-600 text-white' : 'bg-neutral-800 hover:bg-neutral-755 text-zinc-300'}`}
              >
                Link Clientes
              </button>
              <button
                id="switch-owner-panel"
                onClick={async () => {
                  const user = await loadSupabaseOwnerSession();

                  if (user) {
                    navigateTo('owner-dashboard', '/painel');
                    return;
                  }

                  navigateTo('login', '/login');
                }}
                className={`text-[10px] px-2.5 py-1 rounded-lg transition font-extrabold cursor-pointer ${currentView === 'owner-dashboard' ? 'bg-orange-600 text-white' : 'bg-neutral-850 hover:bg-neutral-800 text-zinc-300 border border-orange-500/35'}`}
              >
                Painel Dono
              </button>
              <button
                id="switch-prof-panel"
                onClick={() => {
                  sessionUser?.role === 'professional' && sessionUser.professionalId === 'prof-1'
                    ? navigateTo('professional-dashboard', '/profissional')
                    : handleAuthSuccess({ email: 'joao@agendazap.com', role: 'professional', name: 'João Silva', professionalId: 'prof-1' });
                }}
                className={`text-[10px] px-2.5 py-1 rounded-lg transition font-extrabold cursor-pointer ${currentView === 'professional-dashboard' ? 'bg-orange-600 text-white' : 'bg-neutral-850 hover:bg-neutral-800 text-zinc-300 border border-sky-400/35'}`}
              >
                Painel João
              </button>
              <button
                title="Redefinir Dados Fictícios"
                onClick={handleResetData}
                className="text-[10px] px-2 py-1 bg-neutral-800 hover:bg-red-950 hover:text-red-300 rounded-lg text-zinc-400 transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}