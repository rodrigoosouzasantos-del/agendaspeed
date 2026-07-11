/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
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

function readBooleanRpcResult(data: unknown): boolean {
  const value = Array.isArray(data) ? data[0] : data;
  if (typeof value === 'boolean') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (record.is_master_user ?? record.is_developer ?? record.result ?? record.allowed) === true;
  }
  return false;
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
      setEmail('');
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

    const { data: masterAccessData, error: masterAccessError } =
      await supabase.rpc('is_master_user');

    if (masterAccessError) {
      await supabase.auth.signOut();
      setError(masterAccessError.message || 'Não foi possível validar o tipo de acesso do usuário.');
      return;
    }

    if (readBooleanRpcResult(masterAccessData)) {
      onAuthSuccess({
        email: loginEmail,
        role: 'developer',
        name: 'Rodrigo Souza',
      });
      return;
    }

    const { data, error: contextError } = await supabase.rpc('get_my_owner_context');

    if (contextError) {
      await supabase.auth.signOut();
      setError(contextError.message || 'Não foi possível carregar os dados da empresa.');
      return;
    }

    const ownerContext = (Array.isArray(data) ? data[0] : null) as OwnerContext | null;
    const ownerIsActive = ownerContext?.user_active === true || ownerContext?.is_active === true;

    if (!ownerContext?.tenant_id || !ownerIsActive) {
      await supabase.auth.signOut();
      setError('O acesso desta empresa está suspenso temporariamente. Entre em contato para mais informações..');
      return;
    }

    if (!['owner', 'manager', 'admin'].includes(ownerContext.user_role)) {
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
        setError('Preencha e-mail e senha para entrar.');
        return;
      }

      setLoading(true);
      await handleOwnerLogin();
      setLoading(false);
      return;
    }

    if (!salonName.trim() || !ownerName.trim() || !phone.trim() || !email.trim()) {
      setError('Preencha os dados para solicitar a criação da empresa.');
      return;
    }

    setMessage('Solicitação recebida. Nossa equipe entrará em contato para liberar sua empresa.');
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
      redirectTo: `${window.location.origin}/login`,
    });

    setResetLoading(false);

    if (resetError) {
      setError(resetError.message || 'Não foi possível enviar a recuperação de senha.');
      return;
    }

    setMessage('Se este e-mail estiver cadastrado, enviaremos as instruções de redefinição.');
  };

  return (
    <div id="auth-page" className="min-h-screen overflow-x-hidden bg-[#10232A] text-white font-sans">
      <header className="border-b border-white/10 bg-[#10232A]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onNavigateBack}
            className="inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white/80 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)]">
              <Zap className="h-5 w-5 fill-current" />
            </span>

            <span className="text-lg font-black tracking-tight text-white">
              Agenda<span className="text-orange-500">Speed</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-lg items-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white p-6 text-[#1A3038] shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="mb-7">
            <p className="mb-3 inline-flex rounded-full bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
              {mode === 'login' ? 'Acesso ao painel' : 'Criar empresa'}
            </p>

            <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-[#1A3038]">
              {mode === 'login' ? 'Entrar no AgendaSpeed' : 'Solicitar criação da empresa'}
            </h1>

            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              {mode === 'login'
                ? 'Informe seus dados para acessar o painel.'
                : 'Preencha os dados abaixo para solicitar seu acesso.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-relaxed text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm font-semibold leading-relaxed text-orange-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                    Nome do estabelecimento
                  </span>
                  <div className="relative">
                    <Building className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={salonName}
                      onChange={(event) => setSalonName(event.target.value)}
                      placeholder="Ex: Studio Bella"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold text-[#1A3038] outline-none transition focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                    Nome do responsável
                  </span>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(event) => setOwnerName(event.target.value)}
                      placeholder="Seu nome"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold text-[#1A3038] outline-none transition focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                    WhatsApp comercial
                  </span>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(formatPhone(event.target.value))}
                      placeholder="(99) 99999-9999"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold text-[#1A3038] outline-none transition focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </label>
              </>
            )}

            <label className="block space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                E-mail
              </span>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seuemail@empresa.com"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold text-[#1A3038] outline-none transition focus:border-orange-500 focus:bg-white"
                />
              </div>
            </label>

            {mode === 'login' && (
              <label className="block space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                    Senha
                  </span>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-xs font-black text-orange-600 transition hover:text-orange-700 disabled:opacity-60"
                  >
                    {resetLoading ? 'Enviando...' : 'Esqueci minha senha'}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••••"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-4 text-sm font-semibold text-[#1A3038] outline-none transition focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(249,115,22,0.26)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Entrar no sistema' : 'Solicitar criação'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm font-medium text-slate-500">
            {mode === 'login' ? (
              <p>
                Ainda não tem acesso?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setMessage('');
                  }}
                  className="font-black text-orange-600 hover:text-orange-700"
                >
                  Criar empresa
                </button>
              </p>
            ) : (
              <p>
                Já possui acesso?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setMessage('');
                  }}
                  className="font-black text-orange-600 hover:text-orange-700"
                >
                  Entrar no painel
                </button>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
