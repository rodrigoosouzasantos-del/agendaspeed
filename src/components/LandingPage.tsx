/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import {
  CalendarCheck2,
  Check,
  ChevronRight,
  Clock3,
  Gift,
  Link as LinkIcon,
  MessageCircle,
  PartyPopper,
  PhoneOff,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  XCircle,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'client-booking') => void;
  onSetInitialRole: (role: 'owner' | 'professional') => void;
}

const businessTypes = [
  'Barbearias',
  'Salões de beleza',
  'Esmalterias',
  'Clínicas de estética',
  'Sobrancelhas',
  'Massagens',
  'Consultórios',
  'Studios',
  'Profissionais autônomos',
  'Atendimento com hora marcada',
];

const pains = [
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: 'WhatsApp vira fila',
    text: 'Você atende, responde, confirma e ainda tenta descobrir qual horário está livre.',
  },
  {
    icon: <PhoneOff className="h-5 w-5" />,
    title: 'Cliente chama e some',
    text: 'Quando você consegue responder, muitas vezes ele já marcou em outro lugar.',
  },
  {
    icon: <XCircle className="h-5 w-5" />,
    title: 'Horário duplicado',
    text: 'Dois clientes no mesmo profissional geram atraso, estresse e perda de confiança.',
  },
  {
    icon: <Clock3 className="h-5 w-5" />,
    title: 'Agenda manual trava o negócio',
    text: 'Print, caderno e conversa perdida deixam a rotina lenta e confusa.',
  },
];

const benefits = [
  {
    icon: <CalendarCheck2 className="h-5 w-5" />,
    title: 'Agendamento automático',
    text: 'O cliente escolhe serviço, profissional, data e horário sozinho pelo link.',
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: 'Reagendamento e cancelamento',
    text: 'Links para o cliente confirmar, remarcar ou cancelar conforme as regras do sistema.',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Agenda por profissional',
    text: 'Cada profissional com agenda, dias de trabalho, horários, bloqueios e permissões.',
  },
  {
    icon: <Scissors className="h-5 w-5" />,
    title: 'Controle de comissões',
    text: 'Acompanhe produção e comissão por profissional de forma simples.',
  },
  {
    icon: <WalletCards className="h-5 w-5" />,
    title: 'Recebimentos e financeiro',
    text: 'Baixa de pagamentos, métodos de recebimento, livro caixa e relatórios.',
  },
  {
    icon: <PartyPopper className="h-5 w-5" />,
    title: 'Clientes aniversariantes',
    text: 'Cadastro de clientes com aniversário para relacionamento e ações comerciais.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Monte sua vitrine',
    text: 'Cadastre serviços, categorias, preços, duração e profissionais.',
  },
  {
    number: '02',
    title: 'Compartilhe o link',
    text: 'Coloque na bio, envie no WhatsApp, use no Google e nas redes sociais.',
  },
  {
    number: '03',
    title: 'Cliente agenda sozinho',
    text: 'Sem baixar aplicativo e sem ocupar espaço no celular do cliente.',
  },
  {
    number: '04',
    title: 'Você acompanha tudo',
    text: 'Painel do dono, agenda geral, recebimentos, clientes e relatórios.',
  },
];

const planItems = [
  '21 dias de teste grátis',
  'Sem fidelidade',
  'Sem limite de profissionais',
  'Link público para clientes',
  'Agendamento automático',
  'Reagendamento e cancelamento',
  'Controle de comissões',
  'Controle financeiro',
  'Cadastro de clientes',
  'Aniversariantes do dia',
  'Painel do dono',
  'Acesso dos profissionais',
];

function SectionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.20em] text-orange-600">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function LogoMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_16px_32px_rgba(249,115,22,0.28)]">
      <Zap className="h-5 w-5 fill-current" />
    </span>
  );
}

function BookingPreviewCard() {
  return (
    <div className="rounded-[2.2rem] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(26,48,56,0.14)]">
      <img
        src="/agenda-vitrine-preview.jpeg"
        alt="Exemplo de vitrine pública AgendaSpeed"
        className="h-auto w-full rounded-[1.8rem] border border-slate-100 object-cover"
      />
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#10232A] p-4 shadow-[0_28px_90px_rgba(16,35,42,0.35)]">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">Painel operacional</p>
          <p className="mt-1 text-lg font-black text-white">Agenda de hoje</p>
        </div>
        <span className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white">Ao vivo</span>
      </div>

      <div className="grid gap-3">
        {[
          ['09:00', 'Corte + barba', 'Rafael', 'Confirmado'],
          ['10:30', 'Manicure completa', 'Amanda', 'Marcado'],
          ['14:00', 'Design de sobrancelha', 'Juliana', 'Confirmado'],
          ['16:30', 'Massagem relaxante', 'Carla', 'Livre'],
        ].map(([hour, service, professional, status]) => (
          <div key={`${hour}-${service}`} className="grid grid-cols-[62px_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <div className="rounded-xl bg-black/25 px-3 py-2 text-center text-sm font-black text-orange-400">{hour}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{service}</p>
              <p className="text-xs font-semibold text-slate-400">{professional}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${status === 'Livre' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-orange-500/15 text-orange-300'}`}>
              {status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold text-slate-400">Hoje</p>
          <p className="mt-1 text-2xl font-black text-white">12</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold text-slate-400">Recebido</p>
          <p className="mt-1 text-2xl font-black text-emerald-300">R$ 840</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold text-slate-400">Livre</p>
          <p className="mt-1 text-2xl font-black text-orange-400">3</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div id="landing-page" className="min-h-screen overflow-hidden bg-[#F4F6F6] text-[#1A3038] font-sans selection:bg-orange-500 selection:text-white">
      <header id="header-nav" className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#F4F6F6]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button id="logo-home" onClick={() => onNavigate('landing')} className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500/70 cursor-pointer" aria-label="Ir para o início">
            <LogoMark />
            <span className="text-lg font-black tracking-tight text-[#1A3038]">Agenda<span className="text-orange-500">Speed</span></span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button id="btn-login-header" onClick={() => onNavigate('login')} className="rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-sm font-bold text-[#1A3038] transition hover:border-orange-500/50 hover:text-orange-600 cursor-pointer">
              Entrar
            </button>
            <button id="btn-register-header" onClick={() => onNavigate('register')} className="hidden rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-[0_16px_32px_rgba(249,115,22,0.26)] transition hover:bg-orange-600 sm:inline-flex cursor-pointer">
              Testar grátis
            </button>
          </div>
        </div>
      </header>

      <main>
        <section id="hero-section" className="relative overflow-hidden border-b border-slate-200/80 bg-[radial-gradient(circle_at_15%_5%,rgba(249,115,22,0.16),transparent_26%),linear-gradient(180deg,#F4F6F6_0%,#ffffff_100%)]">
          <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-orange-600 shadow-sm">
                <Gift className="h-4 w-4" />
                21 dias grátis • sem fidelidade
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[#1A3038] sm:text-6xl lg:text-7xl">
                Agenda online premium
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                O cliente escolhe o serviço, profissional e horário em poucos cliques. Praticidade e comodidade para o seu cliente e agilidade para o seu negócio.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button id="btn-hero-register" onClick={() => onNavigate('register')} className="group inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(249,115,22,0.30)] transition hover:bg-orange-600 cursor-pointer">
                  Testar 21 dias grátis
                  <ChevronRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </button>

                <button id="btn-hero-demo" onClick={() => onNavigate('client-booking')} className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-4 text-sm font-black text-[#1A3038] shadow-sm transition hover:border-orange-500/45 hover:text-orange-600 cursor-pointer">
                  Ver vitrine do cliente
                </button>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {['Sem app para baixar', 'Sem limite de profissionais', 'R$ 49,90/mês', 'Sem fidelidade'].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xs font-black text-[#1A3038] shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] bg-orange-500/10 blur-3xl" />
              <BookingPreviewCard />
            </div>
          </div>
        </section>

        <section id="no-app-section" className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionTag>Sem aplicativo</SectionTag>
              <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[#1A3038] sm:text-5xl">
                O cliente agenda pelo link. Sem baixar nada.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600">
                Mais prático para o cliente e mais rápido para o negócio. O link pode ir na bio, no WhatsApp, no Google, em campanhas e onde sua empresa já recebe clientes.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['01', 'Abre o link', 'O cliente acessa sua vitrine online.'],
                ['02', 'Escolhe horário', 'Serviço, profissional, data e hora.'],
                ['03', 'Você recebe', 'Tudo aparece no painel da empresa.'],
              ].map(([number, title, text]) => (
                <article key={number} className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-sm font-black text-white">{number}</div>
                  <h3 className="text-lg font-black text-[#1A3038]">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pain-section" className="border-y border-slate-200/80 bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionTag>O que resolve</SectionTag>
                <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[#1A3038] sm:text-5xl">
                  Menos conversa perdida. Mais horário preenchido.
                </h2>
              </div>
              <p className="max-w-md text-sm font-medium leading-7 text-slate-600">
                O AgendaSpeed tira sua agenda do improviso e organiza cliente, profissional, serviço, horário e recebimento em uma rotina simples.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pains.map((card) => (
                <article key={card.title} className="min-h-[190px] rounded-[1.7rem] border border-slate-200 bg-[#F4F6F6] p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-500/35 hover:bg-white">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A3038] text-white">{card.icon}</div>
                  <h3 className="mt-6 text-xl font-black text-[#1A3038]">{card.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="solution-section" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <SectionTag>Diferenciais</SectionTag>
              <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[#1A3038] sm:text-5xl">
                Um sistema completo para controlar agenda, cliente e dinheiro.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((card) => (
                <article key={card.title} className="min-h-[200px] rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-500/40">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">{card.icon}</div>
                  <h3 className="mt-6 text-xl font-black text-[#1A3038]">{card.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="mockup-section" className="bg-[#1A3038] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <SectionTag>Na prática</SectionTag>
              <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                O dono acompanha o dia, o profissional atende e o cliente agenda.
              </h2>
              <p className="mt-5 max-w-xl text-base font-medium leading-8 text-slate-300">
                Painel operacional, agenda geral, recebimentos, serviços, clientes, comissões e configurações em um só lugar.
              </p>
            </div>
            <DashboardMockup />
          </div>
        </section>

        <section id="audience-section" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <SectionTag>Para quem é</SectionTag>
                <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.04em] text-[#1A3038] sm:text-5xl">
                  Para qualquer negócio que vive de horário marcado.
                </h2>
                <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-slate-600">
                  Não é preso a um nicho. Serve para quem agenda, atende, controla profissionais e precisa reduzir perda de tempo no atendimento.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                {businessTypes.map((item) => (
                  <span key={item} className="rounded-2xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm font-black text-[#1A3038]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="steps-section" className="border-y border-slate-200/80 bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <SectionTag>Como funciona</SectionTag>
              <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[#1A3038] sm:text-5xl">
                Em poucos passos, sua agenda sai do improviso.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {steps.map((step) => (
                <article key={step.number} className="rounded-[1.7rem] border border-slate-200 bg-[#F4F6F6] p-6">
                  <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-sm font-black text-white">{step.number}</div>
                  <h3 className="text-xl font-black text-[#1A3038]">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing-section" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionTag>Preço simples</SectionTag>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#1A3038] sm:text-5xl">
                R$ 49,90 por mês. Teste 21 dias sem custo.
              </h2>
              <p className="mt-5 max-w-xl text-base font-medium leading-8 text-slate-600">
                Comece sem fidelidade, valide no seu negócio e continue apenas se fizer sentido.
              </p>
            </div>

            <div className="rounded-[2rem] border border-orange-500/35 bg-white p-6 shadow-[0_24px_75px_rgba(26,48,56,0.12)] sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-500">AgendaSpeed Mensal</p>
                  <h3 className="mt-3 text-2xl font-black text-[#1A3038]">Sem limite de profissionais</h3>
                </div>
                <div className="rounded-2xl bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                  21 dias grátis
                </div>
              </div>

              <div className="mt-7 flex items-end gap-2">
                <span className="text-5xl font-black tracking-[-0.06em] text-[#1A3038]">R$ 49,90</span>
                <span className="pb-2 text-sm font-bold text-slate-500">/mês</span>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {planItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/12 text-orange-500">
                      <Check className="h-4 w-4" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button id="btn-pricing-register" onClick={() => onNavigate('register')} className="flex-1 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white transition hover:bg-orange-600 cursor-pointer">
                  Começar teste grátis
                </button>
                <button id="btn-pricing-support" onClick={() => onNavigate('login')} className="flex-1 rounded-2xl border border-slate-300 bg-[#F4F6F6] px-6 py-4 text-sm font-black text-[#1A3038] transition hover:border-orange-500/45 hover:text-orange-600 cursor-pointer">
                  Entrar no sistema
                </button>
              </div>

              <p className="mt-4 text-center text-xs font-semibold text-slate-500">
                Sem fidelidade. Sem aplicativo para o cliente baixar.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer id="main-footer" className="border-t border-slate-200 bg-[#1A3038] px-4 py-10 text-sm text-slate-300 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <LogoMark />
              <span className="text-lg font-black tracking-tight">Agenda<span className="text-orange-500">Speed</span></span>
            </div>
            <p className="mt-3 max-w-md text-slate-300">
              Agenda online premium para negócios que vivem de horário marcado.
            </p>
          </div>

          <button id="footer-login" onClick={() => onNavigate('login')} className="w-fit rounded-xl border border-white/15 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-orange-500/60 hover:text-orange-300 cursor-pointer">
            Entrar no sistema
          </button>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-5 text-xs text-slate-400">
          AgendaSpeed © 2026. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
