/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CalendarCheck2,
  Check,
  ChevronRight,
  Gift,
  Link as LinkIcon,
  MessageCircle,
  PanelRight,
  RefreshCw,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'client-booking') => void;
  onSetInitialRole: (role: 'owner' | 'professional') => void;
}

const features = [
  {
    icon: <CalendarCheck2 className="h-5 w-5" />,
    title: 'Agenda automática',
    text: 'Cliente agenda facilmente pelo link.',
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: 'Reagendar e cancelar',
    text: 'Sem conversa perdida no WhatsApp.',
  },
  {
    icon: <WalletCards className="h-5 w-5" />,
    title: 'Comissões e financeiro',
    text: 'Tenha o controle e gestão do seu negócio.',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Clientes e aniversários',
    text: 'Organize sua base e faça relacionamento.',
  },
];

const planItems = [
  'Agenda online',
  'Link público para clientes',
  'Painel do dono',
  'Acesso dos profissionais',
  'Recebimentos',
  'Comissões',
  'Financeiro',
  'Clientes',
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_14px_28px_rgba(249,115,22,0.28)]">
        <Zap className="h-5 w-5 fill-current" />
      </span>

      <span className="text-lg font-black tracking-tight text-white">
        Agenda<span className="text-orange-500">Speed</span>
      </span>
    </div>
  );
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#10232A] text-white font-sans">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#10232A]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Ir para o início"
          >
            <Logo />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="rounded-xl border border-white/15 px-3 py-2 text-xs font-black text-white/85 transition hover:border-orange-500/60 hover:text-white"
            >
              Entrar
            </button>

            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="hidden rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 sm:inline-flex"
            >
              Testar grátis
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-300">
              <Gift className="h-4 w-4" />
              21 dias grátis • sem fidelidade
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">
              Agenda online premium
            </h1>

            <p className="mt-5 max-w-xl text-base font-medium leading-8 text-slate-300 sm:text-lg">
              Proporcione comodidade ao seu cliente e agilize o seu atendimento.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="group inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(249,115,22,0.30)] transition hover:bg-orange-600"
              >
                Testar grátis por 21 dias
                <ChevronRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('client-booking')}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 text-sm font-black text-white transition hover:border-orange-500/60 hover:bg-white/[0.07]"
              >
                Ver exemplo
              </button>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {['R$ 49,90/mês', 'Sem app para baixar', 'Sem limite de profissionais'].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-center text-xs font-black text-white"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-orange-500/12 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-white p-2 shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
              <img
                src="/agenda-vitrine-preview.jpeg"
                alt="Exemplo da vitrine pública AgendaSpeed"
                className="h-auto w-full rounded-[1.55rem] object-cover"
              />
            </div>
          </div>
        </section>

        <section className="bg-[#F4F6F6] px-4 py-14 text-[#1A3038] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 max-w-2xl">
              <span className="inline-flex rounded-full bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                O que muda na rotina
              </span>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Menos dependência do WhatsApp. Mais controle no painel.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A3038] text-white">
                    {feature.icon}
                  </div>

                  <h3 className="mt-5 text-lg font-black text-[#1A3038]">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    {feature.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.20)] sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-orange-500 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                Plano simples
              </span>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                R$ 49,90/mês
              </h2>

              <p className="mt-4 max-w-lg text-base font-medium leading-8 text-slate-300">
                Teste por 21 dias sem custo. Sem fidelidade. Sem instalação para o cliente.
              </p>

              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="mt-7 inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(249,115,22,0.30)] transition hover:bg-orange-600"
              >
                Começar teste grátis
                <ChevronRight className="ml-2 h-4 w-4" />
              </button>
            </div>

            <div className="rounded-[1.6rem] border border-white/10 bg-[#0D1B20] p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black text-white">
                <PanelRight className="h-5 w-5 text-orange-400" />
                Incluído no AgendaSpeed
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {planItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
                      <Check className="h-4 w-4" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-orange-500/25 bg-orange-500/10 p-4">
                <div className="flex items-start gap-3">
                  <LinkIcon className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
                  <p className="text-sm font-medium leading-6 text-slate-200">
                    O cliente agenda pelo link, sem precisar baixar aplicativo e sem ocupar espaço no celular.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <Logo />

          <p>
            AgendaSpeed © 2026. Agendamento online para negócios que vivem de horário marcado.
          </p>
        </div>
      </footer>
    </div>
  );
}
