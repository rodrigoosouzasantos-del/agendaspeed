/**
 * Área Master / Desenvolvedor - AgendaZap.
 *
 * Painel exclusivo para administrar empresas/clientes do SaaS.
 * Código isolado da área do dono/cliente para evitar mistura de regras.
 * Esta tela depende das RPCs master_* no Supabase para respeitar RLS e acesso seguro.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Clock3,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Unlock,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TenantStatus = 'trial' | 'active' | 'overdue' | 'blocked' | 'cancelled' | string;
type MasterView = 'dashboard' | 'clients' | 'financial' | 'settings';

type MasterTenantRow = {
  [key: string]: any;
  tenant?: Record<string, any>;
  subscription?: Record<string, any> | null;
  professionals_count?: number | string | null;
  appointments_count?: number | string | null;
};

type TenantCard = {
  id: string;
  name: string;
  slug: string;
  responsibleName: string;
  email: string;
  whatsapp: string;
  plan: string;
  status: TenantStatus;
  monthlyPrice: number;
  maxProfessionals: number;
  createdAt: string;
  trialEndsAt: string;
  subscriptionStatus: string;
  professionalsCount: number;
  appointmentsCount: number;
  raw: Record<string, any>;
};

type Toast = {
  type: 'success' | 'error' | 'info';
  message: string;
};

type MasterDashboardProps = {
  onLogOut: () => void;
  onNavigateToLogin: () => void;
};

type Summary = {
  total: number;
  activeTenants: number;
  trialTenants: number;
  overdueTenants: number;
  blockedTenants: number;
  cancelledTenants: number;
  expectedRevenue: number;
  mrr: number;
  newLast7Days: number;
  newLast30Days: number;
};

const STATUS_LABELS: Record<string, string> = {
  trial: 'Em teste',
  active: 'Ativo',
  overdue: 'Em atraso',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado',
};

const STATUS_CLASSES: Record<string, string> = {
  trial: 'border-sky-200 bg-sky-50 text-sky-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  overdue: 'border-amber-200 bg-amber-50 text-amber-700',
  blocked: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
};

const MENU_ITEMS: Array<{
  id: MasterView;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'financial', label: 'Financeiro', icon: Wallet },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const STATUS_FILTERS: Array<'all' | TenantStatus> = ['all', 'trial', 'active', 'overdue', 'blocked', 'cancelled'];

function textValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function moneyValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(value: string): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status || '—';
}

function getStatusClass(status: string): string {
  return STATUS_CLASSES[status] || 'border-slate-200 bg-slate-100 text-slate-700';
}

function getInitial(email: string): string {
  return (email || 'M').trim().charAt(0).toUpperCase() || 'M';
}

function normalizeTenantRow(row: MasterTenantRow): TenantCard {
  const tenant = row.tenant || row;
  const subscription = row.subscription || {};

  const status = textValue(
    tenant.status ??
      tenant.tenant_status ??
      subscription.status ??
      subscription.subscription_status,
    'trial',
  );

  return {
    id: textValue(tenant.id ?? tenant.tenant_id),
    name: textValue(tenant.name ?? tenant.tenant_name ?? tenant.business_name, 'Empresa sem nome'),
    slug: textValue(tenant.slug ?? tenant.tenant_slug),
    responsibleName: textValue(
      tenant.responsible_name ??
        tenant.owner_name ??
        tenant.contact_name ??
        tenant.responsavel ??
        tenant.responsible,
      '—',
    ),
    email: textValue(tenant.email ?? tenant.owner_email ?? tenant.contact_email),
    whatsapp: textValue(tenant.whatsapp ?? tenant.phone ?? tenant.owner_phone ?? tenant.contact_phone),
    plan: textValue(tenant.plan ?? tenant.plan_code ?? subscription.plan ?? subscription.plan_code, 'starter_10'),
    status,
    monthlyPrice: moneyValue(
      tenant.monthly_price ??
        tenant.monthly_fee ??
        tenant.subscription_price ??
        subscription.monthly_price ??
        subscription.amount,
      79.9,
    ),
    maxProfessionals: numberValue(tenant.max_professionals ?? tenant.professionals_limit, 10),
    createdAt: textValue(tenant.created_at),
    trialEndsAt: textValue(tenant.trial_ends_at ?? tenant.trial_end_at ?? subscription.trial_ends_at),
    subscriptionStatus: textValue(subscription.status ?? subscription.subscription_status ?? status),
    professionalsCount: numberValue(row.professionals_count, 0),
    appointmentsCount: numberValue(row.appointments_count, 0),
    raw: tenant,
  };
}

function isCreatedWithinDays(createdAt: string, days: number): boolean {
  if (!createdAt) return false;

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= days;
}

function buildSummary(tenants: TenantCard[]): Summary {
  const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length;
  const trialTenants = tenants.filter((tenant) => tenant.status === 'trial').length;
  const overdueTenants = tenants.filter((tenant) => tenant.status === 'overdue').length;
  const blockedTenants = tenants.filter((tenant) => tenant.status === 'blocked').length;
  const cancelledTenants = tenants.filter((tenant) => tenant.status === 'cancelled').length;

  const expectedRevenue = tenants
    .filter((tenant) => tenant.status === 'active' || tenant.status === 'trial' || tenant.status === 'overdue')
    .reduce((total, tenant) => total + tenant.monthlyPrice, 0);

  const mrr = tenants
    .filter((tenant) => tenant.status === 'active')
    .reduce((total, tenant) => total + tenant.monthlyPrice, 0);

  return {
    total: tenants.length,
    activeTenants,
    trialTenants,
    overdueTenants,
    blockedTenants,
    cancelledTenants,
    expectedRevenue,
    mrr,
    newLast7Days: tenants.filter((tenant) => isCreatedWithinDays(tenant.createdAt, 7)).length,
    newLast30Days: tenants.filter((tenant) => isCreatedWithinDays(tenant.createdAt, 30)).length,
  };
}

function MasterStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  tone: 'orange' | 'green' | 'blue' | 'yellow' | 'red' | 'slate';
}) {
  const toneClass = {
    orange: 'border-orange-200 bg-orange-50 text-orange-600',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    blue: 'border-sky-200 bg-sky-50 text-sky-600',
    yellow: 'border-amber-200 bg-amber-50 text-amber-600',
    red: 'border-red-200 bg-red-50 text-red-600',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <p className="mt-1 text-lg font-black leading-none text-slate-950">{value}</p>
          {subtitle && <p className="mt-1 text-[11px] font-medium text-slate-500">{subtitle}</p>}
        </div>
        <div className={`rounded-lg border p-1.5 ${toneClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}

function MasterSectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-slate-950">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] font-medium text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function StatusFilterBar({
  statusFilter,
  setStatusFilter,
}: {
  statusFilter: 'all' | TenantStatus;
  setStatusFilter: (value: 'all' | TenantStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_FILTERS.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => setStatusFilter(status)}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase transition ${
            statusFilter === status
              ? 'bg-orange-500 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {status === 'all' ? 'Todos' : getStatusLabel(status)}
        </button>
      ))}
    </div>
  );
}

function SearchBox({
  query,
  setQuery,
  placeholder,
}: {
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold outline-none ring-orange-500/20 focus:border-orange-400 focus:ring-4"
      />
    </div>
  );
}

function TenantActions({
  tenant,
  origin,
  actionLoadingId,
  copyText,
  handleGenerateFirstAccess,
  handleOpenWhatsApp,
  handleUpdateStatus,
}: {
  tenant: TenantCard;
  origin: string;
  actionLoadingId: string | null;
  copyText: (text: string, successMessage: string) => Promise<void>;
  handleGenerateFirstAccess: (tenant: TenantCard) => Promise<void>;
  handleOpenWhatsApp: (tenant: TenantCard) => void;
  handleUpdateStatus: (tenantId: string, status: TenantStatus) => Promise<void>;
}) {
  const vitrineUrl = `${origin}/${tenant.slug}`;
  const isActionLoading = actionLoadingId === tenant.id;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => window.open(vitrineUrl, '_blank', 'noopener,noreferrer')}
        className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[11px] font-black text-orange-700 hover:bg-orange-100"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Vitrine
      </button>

      <button
        type="button"
        onClick={() => copyText(vitrineUrl, 'Link da vitrine copiado.')}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-50"
      >
        <Clipboard className="h-3.5 w-3.5" />
        Copiar
      </button>

      <button
        type="button"
        disabled={isActionLoading}
        onClick={() => handleGenerateFirstAccess(tenant)}
        className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-orange-700 hover:bg-orange-50 disabled:cursor-wait disabled:opacity-60"
      >
        {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
        1º acesso
      </button>

      <button
        type="button"
        onClick={() => handleOpenWhatsApp(tenant)}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-100"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </button>

      {tenant.status === 'blocked' ? (
        <button
          type="button"
          disabled={isActionLoading}
          onClick={() => handleUpdateStatus(tenant.id, 'active')}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
        >
          <Unlock className="h-3.5 w-3.5" />
          Liberar
        </button>
      ) : (
        <button
          type="button"
          disabled={isActionLoading}
          onClick={() => handleUpdateStatus(tenant.id, 'blocked')}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
        >
          <Lock className="h-3.5 w-3.5" />
          Bloquear
        </button>
      )}
    </div>
  );
}

function TenantTable({
  tenants,
  loading,
  origin,
  actionLoadingId,
  copyText,
  handleGenerateFirstAccess,
  handleOpenWhatsApp,
  handleUpdateStatus,
}: {
  tenants: TenantCard[];
  loading: boolean;
  origin: string;
  actionLoadingId: string | null;
  copyText: (text: string, successMessage: string) => Promise<void>;
  handleGenerateFirstAccess: (tenant: TenantCard) => Promise<void>;
  handleOpenWhatsApp: (tenant: TenantCard) => void;
  handleUpdateStatus: (tenantId: string, status: TenantStatus) => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
          <p className="mt-3 text-[13px] font-black text-slate-700">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex min-h-[160px] items-center justify-center p-3 text-center">
        <div>
          <Building2 className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-2 text-base font-black text-slate-900">Nenhuma empresa encontrada</p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Ajuste a busca ou confirme se a RPC master está retornando os tenants.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-black uppercase tracking-[0.10em] text-slate-400">
            <th className="px-3 py-2">Cliente</th>
            <th className="px-3 py-2">Vitrine</th>
            <th className="px-3 py-2">Plano</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Mensalidade</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="border-b border-slate-100 align-middle transition hover:bg-slate-50/80">
              <td className="px-3 py-2">
                <div className="max-w-[260px]">
                  <p className="font-black text-slate-950">{tenant.name}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Responsável: <span className="text-slate-800">{tenant.responsibleName}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    {tenant.email || 'Sem e-mail'} · {tenant.whatsapp || 'Sem WhatsApp'}
                  </p>
                </div>
              </td>
              <td className="px-3 py-2">
                <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">
                  /{tenant.slug}
                </span>
              </td>
              <td className="px-3 py-2">
                <div>
                  <p className="font-black uppercase text-slate-800">{tenant.plan}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Profissionais: {tenant.professionalsCount}/{tenant.maxProfessionals}
                  </p>
                </div>
              </td>
              <td className="px-3 py-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black ${getStatusClass(tenant.status)}`}>
                  {getStatusLabel(tenant.status)}
                </span>
              </td>
              <td className="px-3 py-2">
                <p className="font-black text-slate-900">{formatCurrency(tenant.monthlyPrice)}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  Cadastro: {formatDate(tenant.createdAt)}
                </p>
              </td>
              <td className="px-3 py-2">
                <TenantActions
                  tenant={tenant}
                  origin={origin}
                  actionLoadingId={actionLoadingId}
                  copyText={copyText}
                  handleGenerateFirstAccess={handleGenerateFirstAccess}
                  handleOpenWhatsApp={handleOpenWhatsApp}
                  handleUpdateStatus={handleUpdateStatus}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DashboardView({
  summary,
  tenants,
}: {
  summary: Summary;
  tenants: TenantCard[];
}) {
  const recentTenants = tenants
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-3">
      <MasterSectionCard title="Clientes" subtitle="Situação atual da base" icon={Users}>
        <div className="grid gap-2 p-4 md:grid-cols-2 xl:grid-cols-4">
          <MasterStatCard
            title="Clientes ativos"
            value={summary.activeTenants}
            subtitle="Operando normalmente"
            icon={CheckCircle2}
            tone="green"
          />
          <MasterStatCard
            title="Clientes em teste"
            value={summary.trialTenants}
            subtitle="Período de avaliação"
            icon={Clock3}
            tone="blue"
          />
          <MasterStatCard
            title="Inadimplentes"
            value={summary.overdueTenants}
            subtitle="Precisam de ação"
            icon={AlertTriangle}
            tone="yellow"
          />
          <MasterStatCard
            title="Bloqueados"
            value={summary.blockedTenants}
            subtitle="Acesso suspenso"
            icon={Ban}
            tone="red"
          />
        </div>
      </MasterSectionCard>

      <MasterSectionCard title="Crescimento" subtitle="Entrada recente" icon={TrendingUp}>
        <div className="grid gap-2 p-4 md:grid-cols-3">
          <MasterStatCard title="Novos 7 dias" value={summary.newLast7Days} subtitle="Última semana" icon={UserPlus} tone="slate" />
          <MasterStatCard title="Novos 30 dias" value={summary.newLast30Days} subtitle="Últimos 30 dias" icon={CalendarDays} tone="blue" />
          <MasterStatCard title="Receita prevista" value={formatCurrency(summary.expectedRevenue)} subtitle="Ativos, teste e atraso" icon={Wallet} tone="orange" />
        </div>
      </MasterSectionCard>

      <MasterSectionCard title="Últimos clientes cadastrados" subtitle="Visão rápida dos tenants mais recentes" icon={Building2}>
        <div className="divide-y divide-slate-100">
          {recentTenants.length === 0 ? (
            <p className="p-3 text-xs font-semibold text-slate-500">Nenhum cliente carregado.</p>
          ) : (
            recentTenants.map((tenant) => (
              <div key={tenant.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-slate-950">{tenant.name}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    /{tenant.slug} · Cadastro: {formatDate(tenant.createdAt)}
                  </p>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(tenant.status)}`}>
                  {getStatusLabel(tenant.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </MasterSectionCard>
    </div>
  );
}

function ClientsView({
  filteredTenants,
  loading,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  origin,
  actionLoadingId,
  copyText,
  handleGenerateFirstAccess,
  handleOpenWhatsApp,
  handleUpdateStatus,
}: {
  filteredTenants: TenantCard[];
  loading: boolean;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: 'all' | TenantStatus;
  setStatusFilter: (value: 'all' | TenantStatus) => void;
  origin: string;
  actionLoadingId: string | null;
  copyText: (text: string, successMessage: string) => Promise<void>;
  handleGenerateFirstAccess: (tenant: TenantCard) => Promise<void>;
  handleOpenWhatsApp: (tenant: TenantCard) => void;
  handleUpdateStatus: (tenantId: string, status: TenantStatus) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-4">
        <MasterStatCard title="Cadastrados" value={filteredTenants.length} subtitle="Resultado atual" icon={Users} tone="orange" />
        <MasterStatCard title="Ativos" value={filteredTenants.filter((tenant) => tenant.status === 'active').length} subtitle="Liberados" icon={CheckCircle2} tone="green" />
        <MasterStatCard title="Em teste" value={filteredTenants.filter((tenant) => tenant.status === 'trial').length} subtitle="Avaliação" icon={Clock3} tone="blue" />
        <MasterStatCard title="Inativos" value={filteredTenants.filter((tenant) => tenant.status === 'blocked' || tenant.status === 'cancelled').length} subtitle="Bloqueados/cancelados" icon={AlertTriangle} tone="red" />
      </div>

      <MasterSectionCard
        title="Consulta rápida"
        subtitle={`${filteredTenants.length} cliente(s) exibido(s)`}
        icon={SlidersHorizontal}
        right={<div className="w-full sm:w-[360px]"><SearchBox query={query} setQuery={setQuery} placeholder="Buscar por empresa, responsável, slug, e-mail, plano..." /></div>}
      >
        <div className="border-b border-slate-100 p-3">
          <StatusFilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
        </div>
        <TenantTable
          tenants={filteredTenants}
          loading={loading}
          origin={origin}
          actionLoadingId={actionLoadingId}
          copyText={copyText}
          handleGenerateFirstAccess={handleGenerateFirstAccess}
          handleOpenWhatsApp={handleOpenWhatsApp}
          handleUpdateStatus={handleUpdateStatus}
        />
      </MasterSectionCard>
    </div>
  );
}

function FinancialView({
  summary,
  filteredTenants,
  loading,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
}: {
  summary: Summary;
  filteredTenants: TenantCard[];
  loading: boolean;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: 'all' | TenantStatus;
  setStatusFilter: (value: 'all' | TenantStatus) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-4">
        <MasterStatCard title="MRR" value={formatCurrency(summary.mrr)} subtitle="Clientes ativos" icon={Wallet} tone="green" />
        <MasterStatCard title="Receita prevista" value={formatCurrency(summary.expectedRevenue)} subtitle="Ativos, teste e atraso" icon={TrendingUp} tone="orange" />
        <MasterStatCard title="Ticket médio" value={summary.total ? formatCurrency(summary.expectedRevenue / summary.total) : '—'} subtitle="Base atual" icon={FileText} tone="blue" />
        <MasterStatCard title="Em atraso" value={summary.overdueTenants} subtitle="Precisam de ação" icon={AlertTriangle} tone="yellow" />
      </div>

      <MasterSectionCard
        title="Financeiro"
        subtitle={`${filteredTenants.length} resultado(s)`}
        icon={Wallet}
        right={<div className="w-full sm:w-[360px]"><SearchBox query={query} setQuery={setQuery} placeholder="Buscar por cliente, plano, status..." /></div>}
      >
        <div className="border-b border-slate-100 p-3">
          <StatusFilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
        </div>

        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-black uppercase tracking-[0.10em] text-slate-400">
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Plano</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Teste até</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-black text-slate-950">{tenant.name}</td>
                    <td className="px-3 py-2 font-semibold text-slate-700">{tenant.plan}</td>
                    <td className="px-3 py-2 font-black text-slate-900">{formatCurrency(tenant.monthlyPrice)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-600">{formatDate(tenant.trialEndsAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black ${getStatusClass(tenant.status)}`}>
                        {getStatusLabel(tenant.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </MasterSectionCard>
    </div>
  );
}

function SettingsView({ sessionEmail }: { sessionEmail: string }) {
  return (
    <div className="space-y-3">
      <MasterSectionCard title="Configurações da Área Master" subtitle="Parâmetros iniciais do painel do desenvolvedor" icon={Settings}>
        <div className="grid gap-3 p-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="font-black text-slate-950">Usuário atual</h3>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-600">
              {sessionEmail || 'Nenhum e-mail carregado'}
            </p>
            <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">
              O acesso deve continuar limitado por RPC e pela marcação de desenvolvedor no Supabase.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-600" />
              <h3 className="font-black text-slate-950">Regra de bloqueio</h3>
            </div>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">
              Empresas bloqueadas devem ser impedidas de acessar painel do dono e profissional.
              A vitrine pública pode seguir uma regra comercial separada.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h3 className="font-black text-slate-950">Próximo módulo</h3>
            </div>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">
              O próximo passo é criar o botão <strong>Nova empresa</strong>, com cadastro completo do tenant,
              plano, endereço, responsável e geração automática do primeiro acesso.
            </p>
          </div>
        </div>
      </MasterSectionCard>
    </div>
  );
}

export default function MasterDashboard({
  onLogOut,
  onNavigateToLogin,
}: MasterDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState('');
  const [tenants, setTenants] = useState<TenantCard[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TenantStatus>('all');
  const [activeView, setActiveView] = useState<MasterView>('dashboard');
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4200);
  };

  const loadTenants = async () => {
    setLoading(true);
    setErrorMessage('');

    const { data: sessionData } = await supabase.auth.getSession();
    const activeSession = sessionData.session;

    if (!activeSession?.user) {
      setSessionEmail('');
      setTenants([]);
      setErrorMessage('Faça login com um usuário desenvolvedor para acessar a Área Master.');
      setLoading(false);
      return;
    }

    setSessionEmail(activeSession.user.email || '');

    const { data, error } = await supabase.rpc('get_master_tenants');

    if (error) {
      console.error('Erro ao carregar empresas master:', error);
      setTenants([]);

      if (error.message.includes('function') || error.code === '42883') {
        setErrorMessage('A RPC get_master_tenants ainda não existe no Supabase. Rode o SQL da Área Master antes de usar esta tela.');
      } else {
        setErrorMessage(error.message || 'Não foi possível carregar as empresas.');
      }

      setLoading(false);
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    setTenants(rows.map((row) => normalizeTenantRow(row as MasterTenantRow)));
    setLoading(false);
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const filteredTenants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;

      const searchable = [
        tenant.name,
        tenant.slug,
        tenant.responsibleName,
        tenant.email,
        tenant.whatsapp,
        tenant.plan,
        tenant.status,
      ].join(' ').toLowerCase();

      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, statusFilter, tenants]);

  const summary = useMemo(() => buildSummary(tenants), [tenants]);

  const currentTitle = {
    dashboard: 'Dashboard SaaS',
    clients: 'Gestão de Clientes',
    financial: 'Financeiro',
    settings: 'Configurações',
  }[activeView];

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', successMessage);
    } catch {
      showToast('error', 'Não foi possível copiar automaticamente. Selecione e copie manualmente.');
    }
  };

  const handleUpdateStatus = async (tenantId: string, status: TenantStatus) => {
    setActionLoadingId(tenantId);

    const { error } = await supabase.rpc('master_update_tenant_status', {
      p_tenant_id: tenantId,
      p_status: status,
    });

    if (error) {
      console.error('Erro ao atualizar status da empresa:', error);
      showToast('error', error.message || 'Não foi possível atualizar o status.');
      setActionLoadingId(null);
      return;
    }

    setTenants((current) => current.map((tenant) => (
      tenant.id === tenantId ? { ...tenant, status } : tenant
    )));

    setActionLoadingId(null);
    showToast('success', 'Status da empresa atualizado.');
  };

  const handleGenerateFirstAccess = async (tenant: TenantCard) => {
    setActionLoadingId(tenant.id);

    const { data, error } = await supabase.rpc('master_generate_first_access_token', {
      p_tenant_id: tenant.id,
    });

    if (error) {
      console.error('Erro ao gerar primeiro acesso:', error);
      showToast('error', error.message || 'Não foi possível gerar o link de primeiro acesso.');
      setActionLoadingId(null);
      return;
    }

    const response = Array.isArray(data) ? data[0] : data;
    const token = response?.token || response?.access_token;

    if (!token) {
      showToast('error', 'A RPC não retornou o token de primeiro acesso.');
      setActionLoadingId(null);
      return;
    }

    await copyText(`${origin}/primeiro-acesso/${token}`, 'Link de primeiro acesso gerado e copiado.');
    setActionLoadingId(null);
  };

  const handleOpenWhatsApp = (tenant: TenantCard) => {
    const digits = onlyDigits(tenant.whatsapp);

    if (!digits) {
      showToast('error', 'Esta empresa não possui WhatsApp cadastrado.');
      return;
    }

    const firstAccessHint = `${origin}/primeiro-acesso/SEU_TOKEN`;
    const message = [
      `Olá, ${tenant.responsibleName || tenant.name}.`,
      `Seu acesso ao AgendaZap da empresa ${tenant.name} está sendo preparado.`,
      `Link da vitrine: ${origin}/${tenant.slug}`,
      `Link de primeiro acesso: ${firstAccessHint}`,
    ].join('\n');

    window.open(`https://wa.me/55${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[200px] flex-col border-r border-slate-800 bg-slate-900 text-white lg:flex">
          <div className="flex h-[56px] items-center gap-2 border-b border-slate-800 px-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[13px] font-black">AgendaZap</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Master</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-3">
            <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Menu</p>
            <div className="space-y-2">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-black transition ${
                      active
                        ? 'border border-orange-500/70 bg-orange-500/15 text-orange-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-800 p-3">
            <button
              type="button"
              onClick={onLogOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-black text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-[200px]">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
            <div className="flex min-h-[56px] flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between lg:px-4">
              <div>
                <h1 className="text-lg font-black text-slate-950">{currentTitle}</h1>
                <p className="text-xs font-semibold text-slate-500">
                  Controle interno dos clientes, planos e acesso do SaaS.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-slate-700 sm:flex">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 text-[13px] font-black text-emerald-700">
                    {getInitial(sessionEmail)}
                  </span>
                  <span className="max-w-[190px] truncate">{sessionEmail || 'Master'}</span>
                </div>

                <button
                  type="button"
                  onClick={loadTenants}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-black text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Atualizar
                </button>

                <button
                  type="button"
                  onClick={onLogOut}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-1.5 text-[13px] font-black text-white shadow-sm hover:bg-slate-800 lg:hidden"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 lg:hidden">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-black ${
                      active ? 'bg-orange-500 text-white' : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </header>

          <section className="flex-1 px-4 py-3 lg:px-4">
            {toast && (
              <div
                className={`mb-4 rounded-lg border px-3 py-2 text-sm font-bold shadow-sm ${
                  toast.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : toast.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-sky-200 bg-sky-50 text-sky-700'
                }`}
              >
                {toast.message}
              </div>
            )}

            {errorMessage && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 shadow-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                  <div>
                    <p className="font-black">Atenção</p>
                    <p className="mt-1 text-sm font-semibold">{errorMessage}</p>
                    <button
                      type="button"
                      onClick={onNavigateToLogin}
                      className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-black uppercase text-white hover:bg-red-700"
                    >
                      Ir para login
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'dashboard' && (
              <DashboardView summary={summary} tenants={tenants} />
            )}

            {activeView === 'clients' && (
              <ClientsView
                filteredTenants={filteredTenants}
                loading={loading}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                origin={origin}
                actionLoadingId={actionLoadingId}
                copyText={copyText}
                handleGenerateFirstAccess={handleGenerateFirstAccess}
                handleOpenWhatsApp={handleOpenWhatsApp}
                handleUpdateStatus={handleUpdateStatus}
              />
            )}

            {activeView === 'financial' && (
              <FinancialView
                summary={summary}
                filteredTenants={filteredTenants}
                loading={loading}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />
            )}

            {activeView === 'settings' && (
              <SettingsView sessionEmail={sessionEmail} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
