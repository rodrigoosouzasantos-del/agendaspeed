import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function validateRecoverySession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error || !data.session?.user) {
        setHasRecoverySession(false);
        setErrorMessage(
          'Este link de redefinição é inválido ou expirou. Solicite um novo link na tela de login.',
        );
        setCheckingSession(false);
        return;
      }

      setHasRecoverySession(true);
      setCheckingSession(false);
    }

    void validateRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const validateForm = () => {
    if (password.length < 6) {
      return 'A nova senha precisa ter pelo menos 6 caracteres.';
    }

    if (password !== confirmPassword) {
      return 'As senhas não conferem.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasRecoverySession || saving) return;

    setErrorMessage('');
    setSuccessMessage('');

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(
        error.message || 'Não foi possível redefinir sua senha. Tente novamente.',
      );
      setSaving(false);
      return;
    }

    setSuccessMessage('Senha redefinida com sucesso.');
    setSaving(false);

    window.setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }, 1800);
  };

  return (
    <main className="min-h-screen bg-[#10232A] px-4 py-8 text-[#1A3038]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                Segurança
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#1A3038]">
                Redefina sua senha
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                Informe uma nova senha para voltar a acessar o AgendaBless.
              </p>
            </div>

            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)]">
              <Zap className="h-5 w-5 fill-current" />
            </span>
          </div>

          {checkingSession ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
              <Loader2 className="mb-4 h-9 w-9 animate-spin text-orange-500" />
              <p className="text-base font-black text-slate-900">
                Validando seu link...
              </p>
            </div>
          ) : successMessage ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="mt-4 text-xl font-black text-emerald-900">
                Senha atualizada
              </h2>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                {successMessage}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                Retornando para o login...
              </p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-relaxed text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {hasRecoverySession ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                      Nova senha
                    </span>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-11 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-2.5 rounded-xl p-2 text-slate-400 hover:bg-white"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                      Confirmar nova senha
                    </span>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Digite a senha novamente"
                        autoComplete="new-password"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-11 pr-11 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        className="absolute right-3 top-2.5 rounded-xl p-2 text-slate-400 hover:bg-white"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(249,115,22,0.26)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Salvando nova senha...' : 'Redefinir senha'}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/login';
                  }}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white hover:bg-orange-600"
                >
                  Voltar para o login
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
