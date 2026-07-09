/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Link as LinkIcon,
  MessageCircle,
  PanelRight,
  PhoneOff,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'client-booking') => void;
  onSetInitialRole: (role: 'owner' | 'professional') => void;
}

const painCards = [
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: 'WhatsApp lotado',
    text: 'Todo mundo pergunta horário ao mesmo tempo.',
  },
  {
    icon: <PhoneOff className="h-5 w-5" />,
    title: 'Cliente chama e some',
    text: 'Você responde depois, ele já marcou em outro lugar.',
  },
  {
    icon: <CalendarDays className="h-5 w-5" />,
    title: 'Horário duplicado',
    text: 'Dois clientes no mesmo profissional viram confusão.',
  },
  {
    icon: <Clock3 className="h-5 w-5" />,
    title: 'Falta sem aviso',
    text: 'Cadeira vazia, profissional parado e dinheiro perdido.',
  },
];

const solutionCards = [
  {
    icon: <LinkIcon className="h-5 w-5" />,
    title: 'Link de agendamento',
    text: 'Cliente escolhe serviço, profissional e horário.',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Agenda por profissional',
    text: 'Cada profissional com dias e horários próprios.',
  },
  {
    icon: <Clock3 className="h-5 w-5" />,
    title: 'Serviços com duração',
    text: 'O sistema respeita o tempo real de cada atendimento.',
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: 'Bloqueio de conflito',
    text: 'Não deixa marcar dois clientes no mesmo horário.',
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: 'WhatsApp no fluxo',
    text: 'Mensagem pronta para confirmação do agendamento.',
  },
  {
    icon: <PanelRight className="h-5 w-5" />,
    title: 'Painel do dono',
    text: 'Visão dos atendimentos, profissionais e agenda.',
  },
];

const audienceChips = [
  'Barbearias',
  'Cabeleireiros',
  'Manicures',
  'Esteticistas',
  'Massagistas',
  'Sobrancelhas',
  'Clínicas de estética',
  'Espaços de beleza',
  'Profissionais autônomos',
  'Atendimento com hora marcada',
];

const steps = [
  {
    number: '01',
    title: 'Cadastre profissionais',
    text: 'Dias, horários, permissões e agenda individual.',
  },
  {
    number: '02',
    title: 'Cadastre serviços',
    text: 'Preço, duração e profissionais que realizam.',
  },
  {
    number: '03',
    title: 'Compartilhe o link',
    text: 'Instagram, WhatsApp, Google e onde o cliente estiver.',
  },
  {
    number: '04',
    title: 'Acompanhe pelo painel',
    text: 'Horários, clientes, profissionais e atendimentos.',
  },
];

const planItems = [
  'Agenda online',
  'Link público para clientes',
  'Cadastro de profissionais',
  'Cadastro de serviços',
  'Controle de horários',
  'Painel do dono',
  'Acesso dos profissionais',
  'Bloqueio de horários duplicados',
];

function SectionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-orange-500/35 bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-white shadow-[0_0_22px_rgba(249,115,22,0.28)]">
      {children}
    </span>
  );
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div id="landing-page" className="min-h-screen overflow-hidden bg-[#070707] text-white font-sans selection:bg-orange-500 selection:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.10),transparent_26%),linear-gradient(180deg,#070707_0%,#0b0b0d_42%,#070707_100%)]" />

      <header id="header-nav" className="sticky top-0 z-50 border-b border-white/10 bg-[#070707]/86 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            id="logo-home"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500/70 cursor-pointer"
            aria-label="Ir para o início"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_0_24px_rgba(249,115,22,0.28)]">
              <Zap className="h-5 w-5 fill-current" />
            </span>
            <span className="text-lg font-black tracking-tight">
              Agenda<span className="text-orange-500">Speed</span>
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-login-header"
              onClick={() => onNavigate('login')}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-zinc-200 transition hover:border-orange-500/45 hover:text-white cursor-pointer"
            >
              Entrar no sistema
            </button>
            <button
              id="btn-register-header"
              onClick={() => onNavigate('register')}
              className="hidden rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-[0_0_18px_rgba(249,115,22,0.30)] transition hover:bg-orange-400 sm:inline-flex cursor-pointer"
            >
              Começar agora
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section id="hero-section" className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.20em] text-orange-300">
              <Sparkles className="h-4 w-4" />
              Agenda online sem enrolação
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
              Agenda online premium
            </h1>

            <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-zinc-300 sm:text-lg">
              O cliente escolhe o serviço, profissional e horário em poucos cliques. Praticidade e comodidade para o seu cliente e agilidade para o seu negócio.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                id="btn-hero-register"
                onClick={() => onNavigate('register')}
                className="group inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-[0_0_28px_rgba(249,115,22,0.32)] transition hover:bg-orange-400 cursor-pointer"
              >
                Começar por R$ 49,90
                <ChevronRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </button>

              <button
                id="btn-hero-demo"
                onClick={() => onNavigate('client-booking')}
                className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-6 py-4 text-sm font-black text-white transition hover:border-orange-500/45 hover:bg-white/[0.07] cursor-pointer"
              >
                Ver demonstração
              </button>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['Até 10 cadeiras', 'Link para clientes', 'Sem horário duplicado', 'R$ 49,90/mês'].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black text-zinc-100"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div id="system-mockup" className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-orange-500/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#101012] p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Na prática</p>
                  <p className="mt-1 text-lg font-black">Agenda de hoje</p>
                </div>
                <div className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white">12 marcados</div>
              </div>

              <div className="grid gap-3">
                {[
                  ['09:00', 'Corte + barba', 'Rafael', 'Confirmado'],
                  ['10:30', 'Design de sobrancelha', 'Amanda', 'Marcado'],
                  ['14:00', 'Manutenção', 'Juliana', 'Confirmado'],
                  ['16:30', 'Massagem relaxante', 'Carla', 'Livre'],
                ].map(([hour, service, professional, status]) => (
                  <div key={`${hour}-${service}`} className="grid grid-cols-[70px_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                    <div className="rounded-xl bg-black/40 px-3 py-2 text-center text-sm font-black text-orange-400">{hour}</div>
                    <div>
                      <p className="text-sm font-black text-white">{service}</p>
                      <p className="text-xs font-semibold text-zinc-500">{professional}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${status === 'Livre' ? 'bg-emerald-500/12 text-emerald-300' : 'bg-orange-500/12 text-orange-300'}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-bold text-zinc-500">Hoje</p>
                  <p className="mt-1 text-2xl font-black">12</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-bold text-zinc-500">Recebido</p>
                  <p className="mt-1 text-2xl font-black text-emerald-300">R$ 840</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-bold text-zinc-500">Livre</p>
                  <p className="mt-1 text-2xl font-black text-orange-400">3</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pain-section" className="border-y border-white/10 bg-black/25 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionTag>O que muda</SectionTag>
                <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                  O problema não é atender. É perder horário no meio da correria.
                </h2>
              </div>
              <p className="max-w-md text-sm font-semibold leading-7 text-zinc-400">
                A agenda deixa de depender de caderno, print e resposta manual. O cliente encontra o horário e confirma pelo link.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {painCards.map((card) => (
                <article key={card.title} className="min-h-[190px] rounded-[1.7rem] border border-white/10 bg-[#101012] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-orange-500/35">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_0_22px_rgba(249,115,22,0.25)]">
                    {card.icon}
                  </div>
                  <h3 className="mt-6 text-xl font-black text-white">{card.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-zinc-400">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="solution-section" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <SectionTag>Agenda online sem enrolação</SectionTag>
              <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                O cliente marca sozinho. Você acompanha tudo.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {solutionCards.map((card) => (
                <article key={card.title} className="min-h-[200px] rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-orange-500/40 hover:bg-white/[0.06]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
                    {card.icon}
                  </div>
                  <h3 className="mt-6 text-xl font-black text-white">{card.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-zinc-400">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="audience-section" className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-[#101012] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <SectionTag>Para quem é</SectionTag>
                <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.04em] text-white sm:text-5xl">
                  Para qualquer profissional que vive de horário marcado.
                </h2>
                <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-zinc-400">
                  Sem puxar para uma área só. O AgendaSpeed serve para quem agenda, atende e precisa manter tudo organizado.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                {audienceChips.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-2xl border border-orange-500/35 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-100 shadow-[0_0_20px_rgba(249,115,22,0.10)] transition hover:-translate-y-0.5 hover:border-orange-400 hover:bg-orange-500 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="steps-section" className="border-y border-white/10 bg-black/25 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <SectionTag>Como funciona</SectionTag>
              <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                Em poucos passos, sua agenda sai do improviso.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {steps.map((step) => (
                <article key={step.number} className="rounded-[1.7rem] border border-white/10 bg-[#101012] p-6">
                  <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-sm font-black text-white">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-black text-white">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-zinc-400">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing-section" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionTag>Preço simples</SectionTag>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                Sem plano escondido. Sem enrolação.
              </h2>
              <p className="mt-5 max-w-xl text-base font-medium leading-8 text-zinc-400">
                Um valor direto para começar a organizar os horários, profissionais e serviços do seu negócio.
              </p>
            </div>

            <div className="rounded-[2rem] border border-orange-500/35 bg-[#101012] p-6 shadow-[0_0_55px_rgba(249,115,22,0.13)] sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">AgendaSpeed Mensal</p>
                  <h3 className="mt-3 text-2xl font-black text-white">Para até 10 cadeiras</h3>
                </div>
                <div className="rounded-2xl bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                  Mais contratado
                </div>
              </div>

              <div className="mt-7 flex items-end gap-2">
                <span className="text-5xl font-black tracking-[-0.06em] text-white">R$ 49,90</span>
                <span className="pb-2 text-sm font-bold text-zinc-500">/mês</span>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {planItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-zinc-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
                      <Check className="h-4 w-4" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  id="btn-pricing-register"
                  onClick={() => onNavigate('register')}
                  className="flex-1 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white transition hover:bg-orange-400 cursor-pointer"
                >
                  Começar agora
                </button>
                <button
                  id="btn-pricing-support"
                  className="flex-1 rounded-2xl border border-white/12 bg-white/[0.04] px-6 py-4 text-sm font-black text-white transition hover:border-orange-500/45 cursor-pointer"
                >
                  Mais de 10? Atendimento
                </button>
              </div>

              <p className="mt-4 text-center text-xs font-semibold text-zinc-500">
                Mais de 10 cadeiras ou profissionais? Chame o atendimento.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer id="main-footer" className="relative z-10 border-t border-white/10 bg-[#070707] px-4 py-10 text-sm text-zinc-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white">
                <Zap className="h-4 w-4 fill-current" />
              </span>
              <span className="text-lg font-black tracking-tight">
                Agenda<span className="text-orange-500">Speed</span>
              </span>
            </div>
            <p className="mt-3 max-w-md text-zinc-500">
              Agendamento online para profissionais que vivem de horário marcado.
            </p>
          </div>

          <button
            id="footer-login"
            onClick={() => onNavigate('login')}
            className="w-fit rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-300 transition hover:border-orange-500/40 hover:text-white cursor-pointer"
          >
            Entrar no sistema
          </button>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-5 text-xs text-zinc-600">
          AgendaSpeed © 2026. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
