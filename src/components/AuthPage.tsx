/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building,
  CheckCircle2,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  initialRolePreseed?: 'owner' | 'professional' | null;
  onAuthSuccess: (user: {
    email: string;
    role: 'owner' | 'professional' | 'developer';
    name: string;
    professionalId?: string;
    tenantId?: string;
    tenantSlug?: string;
  }) => void;
  onNavigateBack: () => void;
}

type OwnerContext = {
  full_name: string | null;
  email: string | null;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  user_role: 'owner' | 'manager' | 'admin' | string;
  user_active?: boolean;
  is_active?: boolean;
};

type SlugCheckRow = {
  normalized_slug: string;
  available: boolean;
  code: string;
  message: string;
};

type PublicTrialResult = {
  tenant_id: string | null;
  company_code: number | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  success: boolean;
  code: string;
  message: string;
};

type PendingPublicTrial = {
  salonName: string;
  ownerName: string;
  phone: string;
  email: string;
  slug: string;
  zipcode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type FeedbackModalState = {
  title: string;
  description: string;
};

type AuthSuccessUser = Parameters<AuthPageProps['onAuthSuccess']>[0];

const PENDING_PUBLIC_TRIAL_KEY = 'AgendaBless_pending_public_trial_v1';

function readBooleanRpcResult(data: unknown): boolean {
  const value = Array.isArray(data) ? data[0] : data;
  if (typeof value === 'boolean') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (record.is_master_user ?? record.is_developer ?? record.result ?? record.allowed) === true;
  }
  return false;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutId: number | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const onlyNumbers = (value: string) => value.replace(/\D/g, '');

const formatPhone = (value: string) => {
  const numbers = onlyNumbers(value).slice(0, 11);

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

const formatZipcode = (value: string) => {
  const numbers = onlyNumbers(value).slice(0, 8);
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
};

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function loadPendingTrial(): PendingPublicTrial | null {
  try {
    const stored = window.localStorage.getItem(PENDING_PUBLIC_TRIAL_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PendingPublicTrial;
  } catch {
    return null;
  }
}

function savePendingTrial(payload: PendingPublicTrial) {
  window.localStorage.setItem(PENDING_PUBLIC_TRIAL_KEY, JSON.stringify(payload));
}

function clearPendingTrial() {
  window.localStorage.removeItem(PENDING_PUBLIC_TRIAL_KEY);
}

function FeedbackModal({
  state,
  onClose,
}: {
  state: FeedbackModalState | null;
  onClose: () => void;
}) {
  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-[#1A3038] shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black">{state.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                {state.description}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

export default function AuthPage({
  initialMode = 'login',
  initialRolePreseed = null,
  onAuthSuccess,
  onNavigateBack,
}: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [salonName, setSalonName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [slugMessage, setSlugMessage] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [unknownZipcode, setUnknownZipcode] = useState(false);
  const [loadingZipcode, setLoadingZipcode] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState | null>(null);

  const registerFormRef = useRef<HTMLFormElement | null>(null);
  const registerEmailRef = useRef<HTMLInputElement | null>(null);
  const registerPasswordRef = useRef<HTMLInputElement | null>(null);
  const registerConfirmPasswordRef = useRef<HTMLInputElement | null>(null);
  const authRedirectTimerRef = useRef<number | null>(null);
  const loginRecoveryTimerRef = useRef<number | null>(null);

  const publicOrigin = useMemo(() => {
    if (typeof window === 'undefined') return 'https://AgendaBless.com.br';
    return window.location.origin.replace('https://www.', 'https://');
  }, []);

  useEffect(() => {
    if (initialRolePreseed === 'owner') {
      setEmail('');
      setPassword('');
    }
  }, [initialRolePreseed]);

  useEffect(() => {
    return () => {
      if (authRedirectTimerRef.current !== null) {
        window.clearTimeout(authRedirectTimerRef.current);
      }

      if (loginRecoveryTimerRef.current !== null) {
        window.clearTimeout(loginRecoveryTimerRef.current);
      }
    };
  }, []);

  const finishAuthSuccess = (
    authenticatedUser: AuthSuccessUser,
    fallbackPath: '/painel' | '/master',
  ) => {
    if (authRedirectTimerRef.current !== null) {
      window.clearTimeout(authRedirectTimerRef.current);
    }

    onAuthSuccess(authenticatedUser);

    authRedirectTimerRef.current = window.setTimeout(() => {
      if (document.getElementById('auth-page')) {
        window.location.replace(fallbackPath);
      }
    }, 800);
  };

  const recoverPersistedLogin = () => {
    if (loginRecoveryTimerRef.current !== null) {
      window.clearTimeout(loginRecoveryTimerRef.current);
    }

    setMessage('Acesso confirmado. Concluindo a entrada...');

    loginRecoveryTimerRef.current = window.setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const clearSessionWithoutBlocking = () => {
    void supabase.auth.signOut().catch(() => undefined);
  };

  useEffect(() => {
    if (mode !== 'register' || registerStep !== 1) return;
    if (loadPendingTrial()) return;

    const clearRegistrationCredentials = () => {
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      if (registerEmailRef.current) {
        registerEmailRef.current.value = '';
      }

      if (registerPasswordRef.current) {
        registerPasswordRef.current.value = '';
      }

      if (registerConfirmPasswordRef.current) {
        registerConfirmPasswordRef.current.value = '';
      }

      registerFormRef.current?.reset();
    };

    clearRegistrationCredentials();

    const timers = [0, 100, 300, 700, 1500, 3000].map((delay) =>
      window.setTimeout(clearRegistrationCredentials, delay),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [mode, registerStep]);

  useEffect(() => {
    if (mode !== 'register' || slugWasEdited) return;
    setSlug(normalizeSlug(salonName));
  }, [mode, salonName, slugWasEdited]);

  useEffect(() => {
    if (mode !== 'register' || registerStep !== 2) return;

    const normalized = normalizeSlug(slug);
    if (!normalized) {
      setSlugStatus('idle');
      setSlugMessage('');
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setSlugStatus('checking');
      setSlugMessage('Verificando disponibilidade...');

      const { data, error: slugError } = await supabase.rpc('check_public_tenant_slug', {
        p_slug: normalized,
      });

      if (slugError) {
        setSlugStatus('unavailable');
        setSlugMessage('Não foi possível validar este endereço agora.');
        return;
      }

      const firstRow = (Array.isArray(data) ? data[0] : data) as SlugCheckRow | null;
      if (!firstRow) {
        setSlugStatus('unavailable');
        setSlugMessage('Não foi possível validar este endereço.');
        return;
      }

      setSlug(firstRow.normalized_slug || normalized);
      setSlugStatus(firstRow.available ? 'available' : 'unavailable');
      setSlugMessage(firstRow.message || (firstRow.available ? 'Endereço disponível.' : 'Endereço indisponível.'));
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [mode, registerStep, slug]);

  const buildPendingPayload = (): PendingPublicTrial => ({
    salonName: salonName.trim(),
    ownerName: ownerName.trim(),
    phone: onlyNumbers(phone),
    email: normalizeEmail(email),
    slug: normalizeSlug(slug),
    zipcode: unknownZipcode ? '' : onlyNumbers(zipcode),
    street: street.trim(),
    number: number.trim(),
    complement: complement.trim(),
    neighborhood: neighborhood.trim(),
    city: city.trim(),
    state: state.trim().toUpperCase(),
  });

  const completePublicTrial = async (payload: PendingPublicTrial) => {
    const { data, error: trialError } = await supabase.rpc('create_public_trial_tenant', {
      p_name: payload.salonName,
      p_slug: payload.slug,
      p_owner_name: payload.ownerName,
      p_owner_phone: payload.phone,
      p_address_zipcode: payload.zipcode || null,
      p_address_street: payload.street,
      p_address_number: payload.number,
      p_address_complement: payload.complement || null,
      p_address_neighborhood: payload.neighborhood,
      p_address_city: payload.city,
      p_address_state: payload.state,
    });

    if (trialError) {
      const messageLower = String(trialError.message || '').toLowerCase();
      if (trialError.code === '23505' || messageLower.includes('slug') || messageLower.includes('endereço')) {
        setFeedbackModal({
          title: 'Este endereço já está em uso',
          description: `O link ${publicOrigin}/${payload.slug} já pertence a outra empresa. Escolha um endereço diferente para continuar.`,
        });
        setRegisterStep(2);
        setSlugStatus('unavailable');
        setSlugMessage('Este endereço já está em uso.');
        return false;
      }

      setError(trialError.message || 'Não foi possível criar sua empresa de teste.');
      return false;
    }

    const result = (Array.isArray(data) ? data[0] : data) as PublicTrialResult | null;
    if (!result?.success || !result.tenant_id || !result.tenant_slug) {
      if (result?.code === 'SLUG_UNAVAILABLE' || result?.code === 'SLUG_RESERVED') {
        setFeedbackModal({
          title: 'Escolha outro endereço',
          description: result.message || 'Este endereço não pode ser utilizado. Digite outro para continuar.',
        });
        setRegisterStep(2);
        setSlugStatus('unavailable');
        setSlugMessage(result.message || 'Endereço indisponível.');
        return false;
      }

      setError(result?.message || 'Não foi possível concluir a criação da empresa.');
      return false;
    }

    clearPendingTrial();
    finishAuthSuccess(
      {
        email: payload.email,
        role: 'owner',
        name: payload.ownerName || payload.salonName,
        tenantId: result.tenant_id,
        tenantSlug: result.tenant_slug,
      },
      '/painel',
    );
    return true;
  };

  useEffect(() => {
    if (mode !== 'register') return;

    let isMounted = true;

    async function resumePendingRegistration() {
      const pending = loadPendingTrial();
      if (!pending) return;

      const { data } = await supabase.auth.getSession();
      if (!isMounted || !data.session?.user) return;

      setSalonName(pending.salonName);
      setOwnerName(pending.ownerName);
      setPhone(formatPhone(pending.phone));
      setEmail(pending.email);
      setSlug(pending.slug);
      setSlugWasEdited(true);
      setZipcode(formatZipcode(pending.zipcode));
      setStreet(pending.street);
      setNumber(pending.number);
      setComplement(pending.complement);
      setNeighborhood(pending.neighborhood);
      setCity(pending.city);
      setState(pending.state);
      setRegisterStep(2);
      setLoading(true);
      setMessage('E-mail confirmado. Concluindo a criação da sua agenda...');

      await completePublicTrial(pending);
      if (isMounted) setLoading(false);
    }

    void resumePendingRegistration();

    return () => {
      isMounted = false;
    };
    // Executa somente na abertura da tela de cadastro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleOwnerLogin = async () => {
    const loginEmail = normalizeEmail(email);

    try {
      const {
        data: loginData,
        error: loginError,
      } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        }),
        12000,
        'O login demorou mais que o esperado. Verifique sua conexão e tente novamente.',
      );

      if (loginError) {
        setError('E-mail ou senha inválidos. Confira os dados e tente novamente.');
        return;
      }

      if (!loginData.session?.user) {
        throw new Error(
          'A sessão não foi confirmada. Tente entrar novamente.',
        );
      }

      const pending = loadPendingTrial();
      if (pending && pending.email === loginEmail) {
        setMessage('Conta autenticada. Concluindo a criação da sua agenda...');
        const completed = await completePublicTrial(pending);
        if (completed) return;
      }

      const [masterAccessResult, ownerContextResult] = await withTimeout(
        Promise.all([
          supabase.rpc('is_master_user'),
          supabase.rpc('get_my_owner_context'),
        ]),
        12000,
        'A validação do acesso demorou mais que o esperado. Tente novamente.',
      );

      const {
        data: masterAccessData,
        error: masterAccessError,
      } = masterAccessResult;

      const {
        data: ownerContextData,
        error: contextError,
      } = ownerContextResult;

      if (masterAccessError) {
        clearSessionWithoutBlocking();
        setError(
          masterAccessError.message ||
            'Não foi possível validar o tipo de acesso do usuário.',
        );
        return;
      }

      if (readBooleanRpcResult(masterAccessData)) {
        finishAuthSuccess(
          {
            email: loginEmail,
            role: 'developer',
            name: 'Rodrigo Souza',
          },
          '/master',
        );
        return;
      }

      if (contextError) {
        clearSessionWithoutBlocking();
        setError(
          contextError.message ||
            'Não foi possível carregar os dados da empresa.',
        );
        return;
      }

      const ownerContext = (
        Array.isArray(ownerContextData) ? ownerContextData[0] : null
      ) as OwnerContext | null;

      const ownerIsActive =
        ownerContext?.user_active === true ||
        ownerContext?.is_active === true;

      if (!ownerContext?.tenant_id || !ownerIsActive) {
        clearSessionWithoutBlocking();
        setError(
          'O acesso desta empresa está suspenso temporariamente. Entre em contato para mais informações.',
        );
        return;
      }

      if (!['owner', 'manager', 'admin'].includes(ownerContext.user_role)) {
        clearSessionWithoutBlocking();
        setError(
          'Este usuário não possui permissão para acessar o painel do proprietário.',
        );
        return;
      }

      finishAuthSuccess(
        {
          email: ownerContext.email || loginEmail,
          role: 'owner',
          name:
            ownerContext.full_name ||
            ownerContext.tenant_name ||
            'Responsável',
          tenantId: ownerContext.tenant_id,
          tenantSlug: ownerContext.tenant_slug,
        },
        '/painel',
      );
    } catch (loginFlowError) {
      const loginFlowMessage =
        loginFlowError instanceof Error
          ? loginFlowError.message
          : 'Não foi possível concluir o acesso. Tente novamente.';

      if (loginFlowMessage.includes('O login demorou mais que o esperado')) {
        recoverPersistedLogin();
        return;
      }

      clearSessionWithoutBlocking();

      setError(loginFlowMessage);
    }
  };

  const validateFirstStep = () => {
    if (!salonName.trim() || salonName.trim().length < 2) return 'Informe o nome do estabelecimento.';
    if (!ownerName.trim() || ownerName.trim().length < 3) return 'Informe o nome completo do responsável.';
    if (onlyNumbers(phone).length < 10) return 'Informe um WhatsApp válido.';
    if (!normalizeEmail(email)) return 'Informe um e-mail válido.';
    if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (password !== confirmPassword) return 'As senhas não conferem.';
    return '';
  };

  const validateSecondStep = () => {
    if (!normalizeSlug(slug)) return 'Informe o endereço da agenda.';
    if (slugStatus !== 'available') return 'Escolha um endereço disponível para a agenda.';
    if (!unknownZipcode && onlyNumbers(zipcode).length !== 8) return 'Informe um CEP válido ou marque que não sabe o CEP.';
    if (!street.trim()) return 'Informe o logradouro.';
    if (!number.trim()) return 'Informe o número.';
    if (!neighborhood.trim()) return 'Informe o bairro.';
    if (!city.trim()) return 'Informe a cidade.';
    if (state.trim().length !== 2) return 'Informe o estado com duas letras.';
    return '';
  };

  const handleNextRegisterStep = () => {
    setError('');
    setMessage('');
    const validationError = validateFirstStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setRegisterStep(2);
  };

  const handlePublicRegistration = async () => {
    const validationError = validateSecondStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const payload = buildPendingPayload();
    savePendingTrial(payload);

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const completed = await completePublicTrial(payload);
      setLoading(false);
      if (!completed) return;
      return;
    }

    const signUpResult = await supabase.auth.signUp({
      email: payload.email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/cadastro`,
        data: {
          full_name: payload.ownerName,
          phone: payload.phone,
          signup_source: 'public_trial',
        },
      },
    });

    if (signUpResult.error) {
      const lowerMessage = signUpResult.error.message.toLowerCase();
      if (lowerMessage.includes('already registered') || lowerMessage.includes('already been registered')) {
        setError('Este e-mail já possui uma conta. Entre no painel para continuar.');
      } else {
        setError(signUpResult.error.message || 'Não foi possível criar seu usuário.');
      }
      setLoading(false);
      return;
    }

    if (!signUpResult.data.session) {
      setMessage('Conta criada. Confirme o e-mail que enviamos para concluir a criação da sua agenda.');
      setLoading(false);
      return;
    }

    const completed = await completePublicTrial(payload);
    setLoading(false);
    if (!completed) return;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Preencha e-mail e senha para entrar.');
        return;
      }

      setLoading(true);
      await handleOwnerLogin();
      setLoading(false);
      return;
    }

    if (registerStep === 1) {
      handleNextRegisterStep();
      return;
    }

    await handlePublicRegistration();
  };

  const handleLookupZipcode = async () => {
    const digits = onlyNumbers(zipcode);
    if (digits.length !== 8) {
      setError('Informe um CEP válido com 8 números.');
      return;
    }

    setLoadingZipcode(true);
    setError('');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error('Não foi possível consultar o CEP.');
      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (data.erro) throw new Error('CEP não encontrado.');

      setStreet(data.logradouro || '');
      setNeighborhood(data.bairro || '');
      setCity(data.localidade || '');
      setState(data.uf || '');
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Não foi possível consultar o CEP.');
    } finally {
      setLoadingZipcode(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setMessage('');

    const loginEmail = normalizeEmail(email);

    if (!loginEmail) {
      setError('Informe o e-mail para receber as instruções de redefinição.');
      return;
    }

    setResetLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setResetLoading(false);

    if (resetError) {
      setError(resetError.message || 'Não foi possível enviar a recuperação de senha.');
      return;
    }

    setMessage('Se este e-mail estiver cadastrado, enviaremos as instruções de redefinição.');
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setRegisterStep(1);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');

    if (nextMode === 'register' && !loadPendingTrial()) {
      setEmail('');
    }
  };

  return (
    <div id="auth-page" className="min-h-screen overflow-x-hidden bg-[#10232A] text-white font-sans">
      <header className="border-b border-white/10 bg-[#10232A]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={mode === 'register' && registerStep === 2 ? () => setRegisterStep(1) : onNavigateBack}
            className="inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white/80 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {mode === 'register' && registerStep === 2 ? 'Voltar aos dados de acesso' : 'Voltar'}
          </button>

          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)]">
              <Zap className="h-5 w-5 fill-current" />
            </span>

            <span className="text-lg font-black tracking-tight text-white">
              Agenda<span className="text-orange-500">Bless</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-2xl items-center px-4 py-8 sm:px-6">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white p-6 text-[#1A3038] shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="mb-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="inline-flex rounded-full bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                {mode === 'login' ? 'Acesso ao painel' : 'Teste grátis'}
              </p>
              {mode === 'register' && (
                <span className="text-xs font-black text-emerald-700">21 dias grátis</span>
              )}
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#1A3038]">
              {mode === 'login'
                ? 'Entrar no AgendaBless'
                : registerStep === 1
                  ? 'Crie sua agenda grátis'
                  : 'Defina o link e o endereço'}
            </h1>

            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              {mode === 'login'
                ? 'Informe seus dados para acessar o painel.'
                : registerStep === 1
                  ? 'Crie seu acesso para testar todos os recursos por 21 dias.'
                  : 'Escolha o endereço público da agenda e informe os dados do estabelecimento.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-relaxed text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-relaxed text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form
            ref={mode === 'register' ? registerFormRef : undefined}
            onSubmit={handleSubmit}
            autoComplete={mode === 'login' ? 'on' : 'off'}
            className="space-y-4"
          >
            {mode === 'register' && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden opacity-0"
              >
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  tabIndex={-1}
                />
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  tabIndex={-1}
                />
              </div>
            )}

            {mode === 'register' && registerStep === 1 && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Nome do estabelecimento</span>
                  <div className="relative">
                    <Building className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input type="text" name="trial-business-name" autoComplete="organization" value={salonName} onChange={(event) => setSalonName(event.target.value)} placeholder="Ex.: Studio Bella" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white" />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Nome do responsável</span>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input type="text" name="trial-owner-name" autoComplete="name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Seu nome completo" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white" />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">WhatsApp comercial</span>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input type="tel" name="trial-business-phone" autoComplete="tel" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="(99) 99999-9999" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white" />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">E-mail</span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input ref={registerEmailRef} type="email" name="AgendaBless-new-company-contact" autoComplete="new-password" data-1p-ignore="true" data-lpignore="true" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seuemail@empresa.com" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white" />
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Senha</span>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input ref={registerPasswordRef} type={showPassword ? 'text' : 'password'} name="AgendaBless-new-company-password" autoComplete="new-password" data-1p-ignore="true" data-lpignore="true" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-11 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white" />
                      <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-2.5 rounded-xl p-2 text-slate-400 hover:bg-white">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Confirmar senha</span>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input ref={registerConfirmPasswordRef} type={showConfirmPassword ? 'text' : 'password'} name="AgendaBless-new-company-password-confirmation" autoComplete="new-password" data-1p-ignore="true" data-lpignore="true" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repita a senha" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-11 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white" />
                      <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3 top-2.5 rounded-xl p-2 text-slate-400 hover:bg-white">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                </div>
              </>
            )}

            {mode === 'register' && registerStep === 2 && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Endereço da agenda</span>
                  <div className="relative">
                    <Link2 className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      value={slug}
                      onChange={(event) => {
                        setSlugWasEdited(true);
                        setSlug(normalizeSlug(event.target.value));
                      }}
                      placeholder="studio-bella"
                      className={`h-12 w-full rounded-2xl border bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold outline-none transition focus:bg-white ${slugStatus === 'available' ? 'border-emerald-400' : slugStatus === 'unavailable' ? 'border-red-300' : 'border-slate-200 focus:border-orange-500'}`}
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{publicOrigin}/{slug || 'suaempresa'}</p>
                  {slugMessage && (
                    <p className={`text-xs font-black ${slugStatus === 'available' ? 'text-emerald-700' : slugStatus === 'checking' ? 'text-orange-600' : 'text-red-600'}`}>
                      {slugMessage}
                    </p>
                  )}
                </label>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1A3038]">Endereço da empresa</p>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                    <input type="checkbox" checked={unknownZipcode} onChange={(event) => { setUnknownZipcode(event.target.checked); if (event.target.checked) setZipcode(''); }} />
                    Não sei o CEP
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">CEP</span>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input value={zipcode} onChange={(event) => setZipcode(formatZipcode(event.target.value))} disabled={unknownZipcode} placeholder="00000-000" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white disabled:bg-slate-100" />
                    </div>
                  </label>
                  <button type="button" onClick={handleLookupZipcode} disabled={unknownZipcode || onlyNumbers(zipcode).length !== 8 || loadingZipcode} className="self-end rounded-2xl bg-[#10232A] px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">
                    {loadingZipcode ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Buscar CEP'}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                  <label className="block space-y-1.5"><span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Logradouro</span><input value={street} onChange={(event) => setStreet(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] px-4 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white" /></label>
                  <label className="block space-y-1.5"><span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Número</span><input value={number} onChange={(event) => setNumber(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] px-4 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white" /></label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5"><span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Complemento</span><input value={complement} onChange={(event) => setComplement(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] px-4 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white" /></label>
                  <label className="block space-y-1.5"><span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Bairro</span><input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] px-4 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white" /></label>
                </div>

                <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                  <label className="block space-y-1.5"><span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Cidade</span><input value={city} onChange={(event) => setCity(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] px-4 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white" /></label>
                  <label className="block space-y-1.5"><span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Estado</span><input value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))} className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] px-4 text-sm font-semibold uppercase outline-none focus:border-orange-500 focus:bg-white" /></label>
                </div>
              </>
            )}

            {mode === 'login' && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">E-mail</span>
                  <div className="relative"><Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" /><input type="email" name="login-email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seuemail@empresa.com" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white" /></div>
                </label>

                <label className="block space-y-1.5">
                  <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Senha</span><button type="button" onClick={handleForgotPassword} disabled={resetLoading} className="text-xs font-black text-orange-600 hover:text-orange-700 disabled:opacity-60">{resetLoading ? 'Enviando...' : 'Esqueci minha senha'}</button></div>
                  <div className="relative"><Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" /><input type={showPassword ? 'text' : 'password'} name="login-password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••••" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-11 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-2.5 rounded-xl p-2 text-slate-400 hover:bg-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                </label>
              </>
            )}

            <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(249,115,22,0.26)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Entrar no sistema' : registerStep === 1 ? 'Continuar' : 'Criar minha agenda grátis'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm font-medium text-slate-500">
            {mode === 'login' ? (
              <p>Ainda não tem acesso? <button type="button" onClick={() => switchMode('register')} className="font-black text-orange-600 hover:text-orange-700">Criar empresa</button></p>
            ) : (
              <p>Já possui acesso? <button type="button" onClick={() => switchMode('login')} className="font-black text-orange-600 hover:text-orange-700">Entrar no painel</button></p>
            )}
          </div>
        </div>
      </main>

      <FeedbackModal state={feedbackModal} onClose={() => setFeedbackModal(null)} />
    </div>
  );
}
