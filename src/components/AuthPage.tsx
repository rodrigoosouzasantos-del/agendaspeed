/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Building, HelpCircle, Info, Loader2, Lock, Mail, Phone, ShieldCheck, User, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  initialRolePreseed?: 'owner' | 'professional' | null;
  onAuthSuccess: (user: {
    email: string;
    role: 'owner' | 'professional';
    name: string;
    professionalId?: string;
    tenantId?: string;
    tenantSlug?: string;
  }) => void;
  onNavigateBack: () => void;
}

type OwnerContext = {
  profile_id: string;
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
  user_role: 'owner' | 'admin' | string;
  is_active: boolean;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const onlyNumbers = (value: string) => value.replace(/\D/g, '');

const formatPhone = (value: string) => {
  const numbers = onlyNumbers(value).slice(0, 11);

  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

export default function AuthPage({
  initialMode = 'login',
  initialRolePreseed = null,
  onAuthSuccess,
  onNavigateBack,
}: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [salonName, setSalonName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (initialRolePreseed === 'owner') {
      setEmail('agendazap10@gmail.com');
      setPassword('');
    }
  }, [initialRolePreseed]);

  const handleOwnerLogin = async () => {
    const loginEmail = normalizeEmail(email);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (loginError) {
      setError('E-mail ou senha inválidos. Confira os dados e tente novamente.');
      return;
    }

    const { data, error: contextError } = await supabase.rpc('get_my_owner_context');

    if (contextError) {
      await supabase.auth.signOut();
      setError(contextError.message || 'Não foi possível carregar os dados da empresa.');
      return;
    }

    const ownerContext = (Array.isArray(data) ? data[0] : null) as OwnerContext | null;

    if (!ownerContext?.tenant_id || !ownerContext.is_active) {
      await supabase.auth.signOut();
      setError('Usuário autenticado, mas sem empresa ativa vinculada.');
      return;
    }

    if (!['owner', 'admin'].includes(ownerContext.user_role)) {
      await supabase.auth.signOut();
      setError('Este usuário não possui permissão para acessar o painel do proprietário.');
      return;
    }

    onAuthSuccess({
      email: ownerContext.email || loginEmail,
      role: 'owner',
      name: ownerContext.full_name || ownerContext.tenant_name || 'Responsável',
      tenantId: ownerContext.tenant_id,
      tenantSlug: ownerContext.tenant_slug,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Por favor, preencha e-mail e senha.');
        return;
      }

      setLoading(true);
      await handleOwnerLogin();
      setLoading(false);
      return;
    }

    if (!salonName.trim() || !ownerName.trim() || !phone.trim() || !email.trim()) {
      setError('Preencha os dados principais para solicitar a criação da empresa.');
      return;
    }

    setMessage('Cadastro recebido. Nesta fase, a liberação da empresa é feita pelo painel do desenvolvedor.');
  };

  const handleForgotPassword = async () => {
    setError('');
    setMessage('');

    const loginEmail = normalizeEmail(email);

    if (!loginEmail) {
      setError('Informe o e-mail para receber as instruções de redefinição de senha.');
      return;
    }

    setResetLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/login`,
    });

    setResetLoading(false);

    if (resetError) {
      setError(resetError.message || 'Não foi possível enviar a recuperação de senha.');
      return;
    }

    setMessage('Se este e-mail estiver cadastrado, enviaremos as instruções de redefinição de senha.');
  };

  return (
    <div id="auth-page" className="min-h-screen bg-neutral-50 flex flex-col justify-between font-sans">
      {/* Header element */}
      <header className="bg-white border-b border-neutral-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            id="btn-back-home"
            onClick={onNavigateBack}
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 text-sm font-medium transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para início
          </button>

          <div className="flex items-center space-x-1.5">
            <div className="bg-orange-600 text-white p-1 rounded-lg">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="text-lg font-bold tracking-tight">Agenda<span className="text-orange-600">Speed</span></span>
          </div>
        </div>
      </header>

      {/* Main card stage */}
      <main id="auth-main" className="flex-1 flex items-center justify-center p-4 py-12 md:py-16">
        <div className="w-full max-w-5xl bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left panel: Auth form */}
          <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-neutral-950">
                  {mode === 'login' ? 'Acesse o AgendaSpeed' : 'Solicitar criação da empresa'}
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  {mode === 'login'
                    ? 'Insira as credenciais cadastradas no primeiro acesso.'
                    : 'A liberação do acesso será feita pelo administrador do sistema.'}
                </p>
              </div>

              {/* Status messaging */}
              {error && (
                <div id="auth-error-msg" className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs leading-relaxed font-medium">
                  {error}
                </div>
              )}
              {message && (
                <div id="auth-success-msg" className="bg-orange-50 border border-orange-200 text-orange-850 rounded-xl p-3 text-xs leading-relaxed font-medium">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">Nome do Estabelecimento</label>
                      <div className="relative">
                        <Building className="absolute left-3.5 top-3.5 text-neutral-400 w-4 h-4" />
                        <input
                          id="input-reg-salon"
                          type="text"
                          placeholder="Ex: Salão da Paty, Barbearia Silva"
                          value={salonName}
                          onChange={(event) => setSalonName(event.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-250 focus:border-orange-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 caret-orange-600 outline-none transition [color-scheme:light]"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">Nome do Responsável</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 text-neutral-400 w-4 h-4" />
                        <input
                          id="input-reg-owner"
                          type="text"
                          placeholder="Ex: João da Silva"
                          value={ownerName}
                          onChange={(event) => setOwnerName(event.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-250 focus:border-orange-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 caret-orange-600 outline-none transition [color-scheme:light]"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">Telefone / WhatsApp Comercial</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 text-neutral-400 w-4 h-4" />
                        <input
                          id="input-reg-phone"
                          type="tel"
                          placeholder="(99) 99999-9999"
                          value={phone}
                          onChange={(event) => setPhone(formatPhone(event.target.value))}
                          className="w-full bg-neutral-50 border border-neutral-250 focus:border-orange-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 caret-orange-600 outline-none transition [color-scheme:light]"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">Endereço de E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 text-neutral-400 w-4 h-4" />
                    <input
                      id="input-auth-email"
                      type="email"
                      placeholder="Ex: agendazap10@gmail.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-250 focus:border-orange-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 caret-orange-600 outline-none transition [color-scheme:light] animate-none"
                      required
                    />
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Senha de Acesso</label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={resetLoading}
                        className="text-xs text-orange-600 hover:underline hover:text-orange-700 font-semibold cursor-pointer disabled:opacity-60"
                      >
                        {resetLoading ? 'Enviando...' : 'Esqueci minha senha'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 text-neutral-400 w-4 h-4" />
                      <input
                        id="input-auth-password"
                        type="password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-250 focus:border-orange-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 caret-orange-600 outline-none transition [color-scheme:light]"
                        required
                      />
                    </div>
                  </div>
                )}

                <button
                  id="btn-auth-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all mt-6 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'login' ? 'Entrar no Sistema' : 'Solicitar Cadastro'}
                </button>
              </form>
            </div>

            <div className="pt-8 border-t border-neutral-100 mt-6 text-center text-xs text-neutral-500">
              {mode === 'login' ? (
                <p>
                  Não tem uma conta comercial ainda?{' '}
                  <button
                    onClick={() => { setMode('register'); setError(''); setMessage(''); }}
                    className="text-orange-600 hover:underline font-bold cursor-pointer"
                  >
                    Solicitar criação da empresa
                  </button>
                </p>
              ) : (
                <p>
                  Já possui uma conta registrada?{' '}
                  <button
                    onClick={() => { setMode('login'); setError(''); setMessage(''); }}
                    className="text-orange-600 hover:underline font-bold cursor-pointer"
                  >
                    Acesse seu painel
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Right panel: Real access information */}
          <div className="lg:col-span-6 bg-neutral-950 text-white p-8 sm:p-10 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-neutral-800">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-orange-500/30">
                  Acesso Seguro
                </span>
                <span className="text-zinc-500 text-xs">• Supabase Auth</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold tracking-tight">Login real do proprietário</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Use o e-mail e a senha definidos no primeiro acesso. O sistema valida a sessão e abre somente a empresa vinculada ao usuário.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-orange-500/10 p-2 text-orange-400">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block font-mono">Empresa protegida</span>
                      <span className="text-sm font-semibold text-white block mt-0.5">Acesso por vínculo no Supabase</span>
                      <span className="text-[11px] text-zinc-500 block mt-1">O dono visualiza apenas a empresa em que está vinculado como owner/admin.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-sky-500/10 p-2 text-sky-400">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-widest block font-mono">DOM CABELO</span>
                      <span className="text-sm font-semibold text-white block mt-0.5">Primeira empresa cadastrada</span>
                      <span className="text-[11px] text-zinc-500 block mt-1">Login atual esperado: agendazap10@gmail.com.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-teal-500/10 p-2 text-teal-400">
                      <HelpCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block font-mono">Sem atalhos demo</span>
                      <span className="text-sm font-semibold text-white block mt-0.5">Fluxo real iniciado</span>
                      <span className="text-[11px] text-zinc-500 block mt-1">Os acessos profissionais serão ligados ao Supabase em uma próxima etapa.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-900 text-zinc-500 text-xs space-y-2 mt-6">
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Login validado com <strong>Supabase Auth</strong>.</span>
              </div>
              <p>Após o login, o AgendaSpeed busca a empresa vinculada ao usuário autenticado.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Mini footer */}
      <footer className="py-6 border-t border-neutral-200 bg-white text-center text-xs text-neutral-400">
        <p>© 2026 AgendaSpeed. Sistema seguro de agendamento de negócios de beleza.</p>
      </footer>
    </div>
  );
}