import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Phone, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type FirstAccessContext = {
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  owner_email: string | null;
  is_valid: boolean;
  message: string;
};

type CompleteFirstAccessResponse = {
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  user_id: string | null;
  user_role: string | null;
  success: boolean;
  message: string;
};

const onlyNumbers = (value: string) => value.replace(/\D/g, '');

const getTokenFromUrl = () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const firstAccessIndex = parts.findIndex((part) => part === 'primeiro-acesso');

  if (firstAccessIndex === -1) return '';

  return parts[firstAccessIndex + 1] ?? '';
};

const formatPhone = (value: string) => {
  const numbers = onlyNumbers(value).slice(0, 11);

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

export default function FirstAccessPage() {
  const token = useMemo(() => getTokenFromUrl(), []);

  const [context, setContext] = useState<FirstAccessContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadFirstAccessContext() {
      setLoadingContext(true);
      setErrorMessage('');

      if (!token) {
        setContext(null);
        setErrorMessage('Token de primeiro acesso não informado.');
        setLoadingContext(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_first_access_context', {
        access_token: token,
      });

      if (!isMounted) return;

      if (error) {
        setContext(null);
        setErrorMessage(error.message || 'Não foi possível validar o link de primeiro acesso.');
        setLoadingContext(false);
        return;
      }

      const firstRow = Array.isArray(data) ? data[0] : null;

      setContext(firstRow ?? null);

      if (!firstRow?.is_valid) {
        setErrorMessage(firstRow?.message || 'Link de primeiro acesso inválido.');
      }

      setLoadingContext(false);
    }

    loadFirstAccessContext();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const validateForm = () => {
    const phoneNumbers = onlyNumbers(ownerPhone);

    if (!context?.owner_email) {
      return 'E-mail do responsável não encontrado no token de primeiro acesso.';
    }

    if (!ownerName.trim()) {
      return 'Informe o nome do responsável.';
    }

    if (ownerName.trim().length < 3) {
      return 'O nome do responsável precisa ter pelo menos 3 caracteres.';
    }

    if (phoneNumbers.length < 10) {
      return 'Informe um WhatsApp válido.';
    }

    if (password.length < 6) {
      return 'A senha precisa ter pelo menos 6 caracteres.';
    }

    if (password !== confirmPassword) {
      return 'As senhas não conferem.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!context?.is_valid || !context.owner_email) return;

    setErrorMessage('');
    setSuccessMessage('');

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);

    const email = context.owner_email;
    const phoneNumbers = onlyNumbers(ownerPhone);

    const signUpResult = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: ownerName.trim(),
          phone: phoneNumbers,
          tenant_slug: context.tenant_slug,
        },
      },
    });

    if (signUpResult.error) {
      const message = signUpResult.error.message.toLowerCase();

      if (!message.includes('already registered') && !message.includes('already been registered')) {
        setErrorMessage(signUpResult.error.message || 'Não foi possível criar o usuário.');
        setSubmitting(false);
        return;
      }
    }

    let currentSession = signUpResult.data.session;

    if (!currentSession) {
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInResult.error) {
        setErrorMessage(
          'Usuário criado, mas ainda não foi possível autenticar. Verifique se a confirmação de e-mail está desativada no Supabase durante o desenvolvimento.'
        );
        setSubmitting(false);
        return;
      }

      currentSession = signInResult.data.session;
    }

    if (!currentSession) {
      setErrorMessage('Não foi possível iniciar a sessão do responsável.');
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.rpc('complete_tenant_first_access', {
      access_token: token,
      owner_full_name: ownerName.trim(),
      owner_phone: phoneNumbers,
    });

    if (error) {
      setErrorMessage(error.message || 'Não foi possível concluir o primeiro acesso.');
      setSubmitting(false);
      return;
    }

    const firstRow = (Array.isArray(data) ? data[0] : null) as CompleteFirstAccessResponse | null;

    if (!firstRow?.success) {
      setErrorMessage(firstRow?.message || 'Não foi possível concluir o primeiro acesso.');
      setSubmitting(false);
      return;
    }

    setSuccessMessage(firstRow.message || 'Primeiro acesso concluído com sucesso.');
    setSubmitting(false);

    window.setTimeout(() => {
      window.location.href = '/owner';
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[1fr_1.1fr]">
          <aside className="relative hidden min-h-[620px] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-10 lg:block">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-8 inline-flex rounded-2xl bg-orange-500 px-4 py-3 text-xl font-black tracking-tight text-white shadow-lg shadow-orange-950/30">
                  AgendaZap
                </div>

                <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-orange-200">
                  Primeiro acesso
                </p>

                <h1 className="text-4xl font-black leading-tight text-white">
                  Configure o acesso do dono e comece a usar a agenda real.
                </h1>

                <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
                  Este link vincula o usuário autenticado à empresa cadastrada no Supabase como dono do salão.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                <p className="text-sm font-semibold text-slate-200">Empresa</p>
                <p className="mt-2 text-2xl font-black text-white">{context?.tenant_name || 'Carregando...'}</p>
                <p className="mt-1 text-sm text-orange-200">/{context?.tenant_slug || 'slug'}</p>
              </div>
            </div>
          </aside>

          <section className="bg-slate-50 p-6 text-slate-900 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-xl">
              <div className="mb-8 lg:hidden">
                <div className="mb-4 inline-flex rounded-2xl bg-orange-500 px-4 py-3 text-xl font-black tracking-tight text-white">
                  AgendaZap
                </div>
                <h1 className="text-3xl font-black text-slate-950">Primeiro acesso</h1>
              </div>

              {loadingContext ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <Loader2 className="mb-4 h-10 w-10 animate-spin text-orange-500" />
                  <p className="text-lg font-black text-slate-900">Validando link de acesso...</p>
                  <p className="mt-2 text-sm text-slate-500">Aguarde alguns segundos.</p>
                </div>
              ) : !context?.is_valid ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-black text-red-900">Link inválido</h2>
                  <p className="mt-3 text-sm leading-relaxed text-red-700">
                    {errorMessage || context?.message || 'Não foi possível validar este link.'}
                  </p>
                </div>
              ) : successMessage ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-black text-emerald-900">Acesso criado</h2>
                  <p className="mt-3 text-sm leading-relaxed text-emerald-700">{successMessage}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Redirecionando para o painel...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-7">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">Primeiro acesso</p>
                    <h2 className="mt-2 text-3xl font-black text-slate-950">Criar senha</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      Confirme os dados abaixo para liberar o painel da empresa.
                    </p>
                  </div>

                  <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Empresa</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{context.tenant_name}</p>
                    <p className="mt-1 text-sm text-slate-500">E-mail: {context.owner_email}</p>
                  </div>

                  {errorMessage && (
                    <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>{errorMessage}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-700">Nome do responsável</span>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                        <User className="h-5 w-5 text-slate-400" />
                        <input
                          value={ownerName}
                          onChange={(event) => setOwnerName(event.target.value)}
                          className="h-12 w-full border-0 bg-transparent px-3 text-sm font-semibold outline-none placeholder:text-slate-400"
                          placeholder="Ex.: João da Silva"
                          autoComplete="name"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-700">WhatsApp da empresa</span>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                        <Phone className="h-5 w-5 text-slate-400" />
                        <input
                          value={ownerPhone}
                          onChange={(event) => setOwnerPhone(formatPhone(event.target.value))}
                          className="h-12 w-full border-0 bg-transparent px-3 text-sm font-semibold outline-none placeholder:text-slate-400"
                          placeholder="(99) 99999-9999"
                          inputMode="tel"
                          autoComplete="tel"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-700">Senha</span>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                        <Lock className="h-5 w-5 text-slate-400" />
                        <input
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="h-12 w-full border-0 bg-transparent px-3 text-sm font-semibold outline-none placeholder:text-slate-400"
                          placeholder="Mínimo 6 caracteres"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-700">Confirmar senha</span>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                        <Lock className="h-5 w-5 text-slate-400" />
                        <input
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="h-12 w-full border-0 bg-transparent px-3 text-sm font-semibold outline-none placeholder:text-slate-400"
                          placeholder="Digite a senha novamente"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((current) => !current)}
                          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-7 flex h-13 w-full items-center justify-center rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Criando acesso...
                      </>
                    ) : (
                      'Criar acesso'
                    )}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}