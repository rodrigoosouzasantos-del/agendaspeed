/**
 * Área Master / Desenvolvedor - AgendaSpeed.
 *
 * Tela compacta para:
 * - listar empresas em ordem crescente;
 * - criar empresas com 21 dias de teste;
 * - consultar CEP ou preencher endereço manualmente;
 * - gerar primeiro acesso;
 * - controlar status;
 * - acompanhar situação financeira.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Clipboard,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Unlock,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type TenantStatus =
  | "trial"
  | "active"
  | "past_due"
  | "blocked"
  | "cancelled"
  | string;

type MasterView = "companies" | "financial" | "reports" | "settings";

type MasterTenantRow = {
  [key: string]: unknown;
  tenant?: Record<string, unknown>;
  subscription?: Record<string, unknown> | null;
  professionals_count?: number | string | null;
  appointments_count?: number | string | null;
};

type TenantCard = {
  id: string;
  companyCode: number;
  name: string;
  slug: string;
  responsibleName: string;
  email: string;
  whatsapp: string;
  status: TenantStatus;
  monthlyPrice: number;
  createdAt: string;
  trialEndsAt: string;
  dueDate: string;
  professionalsCount: number;
  appointmentsCount: number;
};

type Toast = {
  type: "success" | "error" | "info";
  message: string;
};

type MasterDashboardProps = {
  onLogOut: () => void;
  onNavigateToLogin: () => void;
};

type CreateTenantForm = {
  companyName: string;
  slug: string;
  responsibleName: string;
  email: string;
  whatsapp: string;
  trialStartDate: string;
  zipcode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  unknownZipcode: boolean;
};

type CreatedTenantResult = {
  first_access_token?: string;
};

const STATUS_LABELS: Record<string, string> = {
  trial: "EM TESTE",
  active: "ATIVA",
  past_due: "INADIMPLENTE",
  blocked: "SUSPENSA",
  cancelled: "CANCELADA",
};

const STATUS_DOT_CLASSES: Record<string, string> = {
  trial: "bg-amber-400",
  active: "bg-emerald-500",
  past_due: "bg-red-500",
  blocked: "bg-red-700",
  cancelled: "bg-slate-400",
};

const STATUS_TEXT_CLASSES: Record<string, string> = {
  trial: "text-amber-700",
  active: "text-emerald-700",
  past_due: "text-red-700",
  blocked: "text-red-800",
  cancelled: "text-slate-600",
};

const MENU_ITEMS: Array<{
  id: MasterView;
  label: string;
  icon: React.ElementType;
}> = [
  { id: "companies", label: "Empresas", icon: Building2 },
  { id: "financial", label: "Financeiro", icon: Wallet },
  { id: "reports", label: "Relatórios", icon: FileText },
  { id: "settings", label: "Configurações", icon: Settings },
];

const STATUS_FILTERS: Array<"all" | TenantStatus> = [
  "all",
  "trial",
  "active",
  "past_due",
  "blocked",
  "cancelled",
];

function textValue(value: unknown, fallback = ""): string {
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

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatCompanyCode(value: number): string {
  return String(Math.max(0, value)).padStart(4, "0");
}

function formatZipcode(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatWhatsapp(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status || "—";
}

function getStatusDotClass(status: string): string {
  return STATUS_DOT_CLASSES[status] || "bg-slate-400";
}

function getStatusTextClass(status: string): string {
  return STATUS_TEXT_CLASSES[status] || "text-slate-700";
}

function getInitial(email: string): string {
  return (email || "M").trim().charAt(0).toUpperCase() || "M";
}

function normalizeTenantRow(row: MasterTenantRow): TenantCard {
  const tenant = (row.tenant || row) as Record<string, unknown>;
  const subscription = (row.subscription || {}) as Record<string, unknown>;

  const status = textValue(
    tenant.status ??
      tenant.tenant_status ??
      subscription.status ??
      subscription.subscription_status,
    "trial",
  );

  return {
    id: textValue(tenant.id ?? tenant.tenant_id),
    companyCode: numberValue(tenant.company_code, 0),
    name: textValue(
      tenant.name ?? tenant.tenant_name ?? tenant.business_name,
      "Empresa sem nome",
    ),
    slug: textValue(tenant.slug ?? tenant.tenant_slug),
    responsibleName: textValue(
      tenant.owner_name ??
        tenant.responsible_name ??
        tenant.contact_name ??
        tenant.responsavel,
      "—",
    ),
    email: textValue(
      tenant.owner_email ?? tenant.email ?? tenant.contact_email,
    ),
    whatsapp: textValue(
      tenant.owner_phone ??
        tenant.whatsapp ??
        tenant.phone ??
        tenant.contact_phone,
    ),
    status,
    monthlyPrice: moneyValue(
      tenant.monthly_price ??
        subscription.monthly_price ??
        subscription.amount,
      49.9,
    ),
    createdAt: textValue(tenant.created_at),
    trialEndsAt: textValue(
      tenant.trial_ends_at ?? subscription.trial_ends_at,
    ),
    dueDate: textValue(tenant.due_date ?? subscription.due_date),
    professionalsCount: numberValue(row.professionals_count, 0),
    appointmentsCount: numberValue(row.appointments_count, 0),
  };
}

function getTenantDisplayDueDate(tenant: TenantCard): string {
  return tenant.status === "trial"
    ? tenant.trialEndsAt
    : tenant.dueDate || tenant.trialEndsAt;
}

function getTenantDisplayValue(tenant: TenantCard): number {
  return tenant.status === "trial" ? 0 : tenant.monthlyPrice;
}

function getTrialCountdownLabel(tenant: TenantCard): string {
  if (tenant.status !== "trial" || !tenant.trialEndsAt) return "";

  const endDate = new Date(tenant.trialEndsAt);
  if (Number.isNaN(endDate.getTime())) return "";

  const diffDays = Math.ceil(
    (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "Teste encerrado";
  if (diffDays === 0) return "Último dia de teste";
  if (diffDays <= 5) {
    return `Termina em ${diffDays} dia${diffDays === 1 ? "" : "s"}`;
  }
  return "";
}

function createEmptyForm(): CreateTenantForm {
  return {
    companyName: "",
    slug: "",
    responsibleName: "",
    email: "",
    whatsapp: "",
    trialStartDate: new Date().toISOString().slice(0, 10),
    zipcode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    unknownZipcode: false,
  };
}

function StatusBadge({ status }: { status: TenantStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-black ${getStatusTextClass(
        status,
      )}`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(status)}`}
      />
      {getStatusLabel(status)}
    </span>
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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
      />
    </div>
  );
}

function StatusFilters({
  statusFilter,
  setStatusFilter,
}: {
  statusFilter: "all" | TenantStatus;
  setStatusFilter: (value: "all" | TenantStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_FILTERS.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => setStatusFilter(status)}
          className={`rounded-lg px-3 py-2 text-[11px] font-black uppercase transition ${
            statusFilter === status
              ? "bg-[#10232A] text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {status === "all" ? "Todos" : getStatusLabel(status)}
        </button>
      ))}
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
  handleUpdateStatus: (
    tenantId: string,
    status: TenantStatus,
  ) => Promise<void>;
}) {
  const isActionLoading = actionLoadingId === tenant.id;
  const vitrineUrl = `${origin}/${tenant.slug}`;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <button
        type="button"
        title="Abrir vitrine"
        onClick={() =>
          window.open(vitrineUrl, "_blank", "noopener,noreferrer")
        }
        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
      >
        <ExternalLink className="h-4 w-4" />
      </button>

      <button
        type="button"
        title="Copiar link da agenda"
        onClick={() => copyText(vitrineUrl, "Link da agenda copiado.")}
        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
      >
        <Clipboard className="h-4 w-4" />
      </button>

      <button
        type="button"
        title="Gerar primeiro acesso"
        disabled={isActionLoading}
        onClick={() => handleGenerateFirstAccess(tenant)}
        className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-orange-700 hover:bg-orange-100 disabled:opacity-60"
      >
        {isActionLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Users className="h-4 w-4" />
        )}
      </button>

      <button
        type="button"
        title="Enviar WhatsApp"
        onClick={() => handleOpenWhatsApp(tenant)}
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
      >
        <MessageCircle className="h-4 w-4" />
      </button>

      {tenant.status === "blocked" ? (
        <button
          type="button"
          title="Reativar empresa"
          disabled={isActionLoading}
          onClick={() => handleUpdateStatus(tenant.id, "active")}
          className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Unlock className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          title="Suspender empresa"
          disabled={isActionLoading}
          onClick={() => handleUpdateStatus(tenant.id, "blocked")}
          className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 disabled:opacity-60"
        >
          <Lock className="h-4 w-4" />
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
  handleUpdateStatus: (
    tenantId: string,
    status: TenantStatus,
  ) => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center p-6 text-center">
        <div>
          <Building2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-base font-black text-slate-900">
            Nenhuma empresa encontrada
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-[#F4F6F6] text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
            <th className="px-4 py-3">Cód. empresa</th>
            <th className="px-4 py-3">Empresa</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Vencimento</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => {
            const countdownLabel = getTrialCountdownLabel(tenant);

            return (
              <tr
                key={tenant.id}
                className="border-b border-slate-100 align-middle hover:bg-slate-50/80"
              >
                <td className="px-4 py-3 font-mono text-sm font-black text-[#10232A]">
                  {formatCompanyCode(tenant.companyCode)}
                </td>

                <td className="px-4 py-3">
                  <p className="font-black text-slate-950">{tenant.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {tenant.responsibleName} · {tenant.email || "Sem e-mail"}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    agendaspeed.com.br/{tenant.slug}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <StatusBadge status={tenant.status} />
                  {countdownLabel && (
                    <p className="mt-1 text-[11px] font-black text-amber-700">
                      {countdownLabel}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3 text-sm font-bold text-slate-700">
                  {formatDate(getTenantDisplayDueDate(tenant))}
                </td>

                <td
                  className={`px-4 py-3 font-black ${
                    tenant.status === "past_due"
                      ? "text-red-700"
                      : "text-slate-950"
                  }`}
                >
                  {formatCurrency(getTenantDisplayValue(tenant))}
                </td>

                <td className="px-4 py-3">
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NewTenantModal({
  form,
  setForm,
  isOpen,
  isSaving,
  isLoadingZipcode,
  origin,
  onClose,
  onSubmit,
  onLookupZipcode,
}: {
  form: CreateTenantForm;
  setForm: React.Dispatch<React.SetStateAction<CreateTenantForm>>;
  isOpen: boolean;
  isSaving: boolean;
  isLoadingZipcode: boolean;
  origin: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  onLookupZipcode: () => Promise<void>;
}) {
  if (!isOpen) return null;

  const updateField = (
    field: keyof CreateTenantForm,
    value: string | boolean,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const fieldClass =
    "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 py-6">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-[#10232A] px-5 py-4 text-white">
          <div>
            <h2 className="text-lg font-black">Nova empresa</h2>
            <p className="mt-1 text-xs font-semibold text-white/70">
              A empresa será criada com 21 dias de teste gratuito.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 p-5">
          <section>
            <h3 className="text-sm font-black uppercase tracking-wide text-[#10232A]">
              Dados da empresa
            </h3>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-700">
                  Nome da empresa
                </span>
                <input
                  value={form.companyName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((current) => ({
                      ...current,
                      companyName: value,
                      slug: current.slug || normalizeSlug(value),
                    }));
                  }}
                  required
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-700">
                  Endereço da agenda
                </span>
                <input
                  value={form.slug}
                  onChange={(event) =>
                    updateField("slug", normalizeSlug(event.target.value))
                  }
                  required
                  className={fieldClass}
                />
                <span className="block text-[11px] font-semibold text-slate-500">
                  {origin}/{form.slug || "suaempresa"}
                </span>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-700">
                  Responsável
                </span>
                <input
                  value={form.responsibleName}
                  onChange={(event) =>
                    updateField("responsibleName", event.target.value)
                  }
                  required
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-700">
                  E-mail
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-700">
                  WhatsApp
                </span>
                <input
                  value={form.whatsapp}
                  onChange={(event) =>
                    updateField("whatsapp", formatWhatsapp(event.target.value))
                  }
                  inputMode="numeric"
                  required
                  placeholder="(14) 99999-9999"
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-700">
                  Data inicial do teste
                </span>
                <input
                  type="date"
                  value={form.trialStartDate}
                  onChange={(event) =>
                    updateField("trialStartDate", event.target.value)
                  }
                  required
                  className={fieldClass}
                />
              </label>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-black uppercase tracking-wide text-[#10232A]">
                Endereço da empresa
              </h3>

              <label className="inline-flex items-center gap-2 text-xs font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={form.unknownZipcode}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setForm((current) => ({
                      ...current,
                      unknownZipcode: checked,
                      zipcode: checked ? "" : current.zipcode,
                    }));
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Não sei o CEP
              </label>
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-6">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-black text-slate-700">CEP</span>
                <div className="flex gap-2">
                  <input
                    value={form.zipcode}
                    onChange={(event) =>
                      updateField("zipcode", formatZipcode(event.target.value))
                    }
                    disabled={form.unknownZipcode}
                    inputMode="numeric"
                    placeholder="00000-000"
                    className={`${fieldClass} min-w-0 flex-1 disabled:bg-slate-100`}
                  />
                  <button
                    type="button"
                    onClick={onLookupZipcode}
                    disabled={
                      form.unknownZipcode ||
                      onlyDigits(form.zipcode).length !== 8 ||
                      isLoadingZipcode
                    }
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#10232A] px-3 text-xs font-black text-white disabled:opacity-50"
                  >
                    {isLoadingZipcode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Buscar"
                    )}
                  </button>
                </div>
              </label>

              <label className="space-y-1.5 md:col-span-3">
                <span className="text-xs font-black text-slate-700">
                  Logradouro
                </span>
                <input
                  value={form.street}
                  onChange={(event) => updateField("street", event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5 md:col-span-1">
                <span className="text-xs font-black text-slate-700">
                  Número
                </span>
                <input
                  value={form.number}
                  onChange={(event) => updateField("number", event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5 md:col-span-3">
                <span className="text-xs font-black text-slate-700">
                  Complemento
                </span>
                <input
                  value={form.complement}
                  onChange={(event) =>
                    updateField("complement", event.target.value)
                  }
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5 md:col-span-3">
                <span className="text-xs font-black text-slate-700">
                  Bairro
                </span>
                <input
                  value={form.neighborhood}
                  onChange={(event) =>
                    updateField("neighborhood", event.target.value)
                  }
                  required
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5 md:col-span-4">
                <span className="text-xs font-black text-slate-700">
                  Cidade
                </span>
                <input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-black text-slate-700">
                  Estado
                </span>
                <input
                  value={form.state}
                  onChange={(event) =>
                    updateField(
                      "state",
                      event.target.value.toUpperCase().slice(0, 2),
                    )
                  }
                  required
                  maxLength={2}
                  className={`${fieldClass} uppercase`}
                />
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Criar empresa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FinancialTable({
  tenants,
  loading,
}: {
  tenants: TenantCard[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-[#F4F6F6] text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
            <th className="px-4 py-3">Cód. empresa</th>
            <th className="px-4 py-3">Empresa</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Vencimento</th>
            <th className="px-4 py-3">Valor</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr
              key={tenant.id}
              className="border-b border-slate-100 hover:bg-slate-50/80"
            >
              <td className="px-4 py-3 font-mono font-black text-[#10232A]">
                {formatCompanyCode(tenant.companyCode)}
              </td>
              <td className="px-4 py-3 font-black text-slate-950">
                <span className="inline-flex items-center gap-2">
                  {tenant.status === "past_due" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                  {tenant.name}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={tenant.status} />
              </td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">
                {formatDate(getTenantDisplayDueDate(tenant))}
              </td>
              <td
                className={`px-4 py-3 font-black ${
                  tenant.status === "past_due"
                    ? "text-red-700"
                    : "text-slate-950"
                }`}
              >
                {formatCurrency(getTenantDisplayValue(tenant))}
              </td>
            </tr>
          ))}

          {tenants.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
              >
                Nenhum registro encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function MasterDashboard({
  onLogOut,
  onNavigateToLogin,
}: MasterDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState("");
  const [tenants, setTenants] = useState<TenantCard[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TenantStatus>("all");
  const [activeView, setActiveView] = useState<MasterView>("companies");
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [createTenantForm, setCreateTenantForm] =
    useState<CreateTenantForm>(createEmptyForm());
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [isLoadingZipcode, setIsLoadingZipcode] = useState(false);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin.replace("https://www.", "https://")
      : "https://agendaspeed.com.br";

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4200);
  };

  const loadTenants = async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const activeSession = sessionData.session;

    if (!activeSession?.user) {
      setSessionEmail("");
      setTenants([]);
      setErrorMessage(
        "Faça login com um usuário desenvolvedor para acessar a Área Master.",
      );
      setLoading(false);
      return;
    }

    setSessionEmail(activeSession.user.email || "");

    const { data, error } = await supabase.rpc("get_master_tenants");

    if (error) {
      setTenants([]);
      setErrorMessage(error.message || "Não foi possível carregar as empresas.");
      setLoading(false);
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    setTenants(
      rows
        .map((row) => normalizeTenantRow(row as MasterTenantRow))
        .sort((first, second) => first.companyCode - second.companyCode),
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTenants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tenants
      .filter((tenant) => {
        const matchesStatus =
          statusFilter === "all" || tenant.status === statusFilter;

        const searchable = [
          formatCompanyCode(tenant.companyCode),
          tenant.name,
          tenant.slug,
          tenant.responsibleName,
          tenant.email,
          tenant.whatsapp,
          tenant.status,
        ]
          .join(" ")
          .toLowerCase();

        return (
          matchesStatus &&
          (!normalizedQuery || searchable.includes(normalizedQuery))
        );
      })
      .sort((first, second) => first.companyCode - second.companyCode);
  }, [query, statusFilter, tenants]);

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", successMessage);
    } catch {
      showToast("error", "Não foi possível copiar automaticamente.");
    }
  };

  const handleUpdateStatus = async (
    tenantId: string,
    status: TenantStatus,
  ) => {
    setActionLoadingId(tenantId);

    const { error } = await supabase.rpc("master_update_tenant_status", {
      p_tenant_id: tenantId,
      p_status: status,
    });

    if (error) {
      showToast(
        "error",
        error.message || "Não foi possível atualizar o status.",
      );
      setActionLoadingId(null);
      return;
    }

    setTenants((current) =>
      current.map((tenant) =>
        tenant.id === tenantId ? { ...tenant, status } : tenant,
      ),
    );

    setActionLoadingId(null);
    showToast("success", "Status da empresa atualizado.");
  };

  const handleGenerateFirstAccess = async (tenant: TenantCard) => {
    setActionLoadingId(tenant.id);

    const { data, error } = await supabase.rpc(
      "master_generate_first_access_token",
      { p_tenant_id: tenant.id },
    );

    if (error) {
      showToast(
        "error",
        error.message || "Não foi possível gerar o primeiro acesso.",
      );
      setActionLoadingId(null);
      return;
    }

    const response = Array.isArray(data) ? data[0] : data;
    const token = response?.token || response?.access_token;

    if (!token) {
      showToast("error", "A RPC não retornou o token de primeiro acesso.");
      setActionLoadingId(null);
      return;
    }

    await copyText(
      `${origin}/primeiro-acesso/${token}`,
      "Link de primeiro acesso gerado e copiado.",
    );

    setActionLoadingId(null);
  };

  const handleOpenWhatsApp = (tenant: TenantCard) => {
    const digits = onlyDigits(tenant.whatsapp);

    if (!digits) {
      showToast("error", "Esta empresa não possui WhatsApp cadastrado.");
      return;
    }

    const message = [
      `Olá, ${tenant.responsibleName || tenant.name}.`,
      `Seu acesso ao AgendaSpeed da empresa ${tenant.name} está disponível.`,
      `Link da agenda: ${origin}/${tenant.slug}`,
    ].join("\n");

    window.open(
      `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleLookupZipcode = async () => {
    const zipcode = onlyDigits(createTenantForm.zipcode);

    if (zipcode.length !== 8) {
      showToast("error", "Informe um CEP válido com 8 números.");
      return;
    }

    setIsLoadingZipcode(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipcode}/json/`);
      if (!response.ok) throw new Error("Não foi possível consultar o CEP.");

      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (data.erro) {
        showToast("error", "CEP não encontrado.");
        return;
      }

      setCreateTenantForm((current) => ({
        ...current,
        street: data.logradouro || current.street,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: data.uf || current.state,
      }));

      showToast("success", "Endereço preenchido pelo CEP.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Não foi possível consultar o CEP.",
      );
    } finally {
      setIsLoadingZipcode(false);
    }
  };

  const handleCreateTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSavingTenant) return;

    const digitsWhatsapp = onlyDigits(createTenantForm.whatsapp);

    if (digitsWhatsapp.length < 10 || digitsWhatsapp.length > 11) {
      showToast("error", "Informe um WhatsApp válido.");
      return;
    }

    if (
      !createTenantForm.unknownZipcode &&
      onlyDigits(createTenantForm.zipcode).length !== 8
    ) {
      showToast("error", "Informe um CEP válido ou marque Não sei o CEP.");
      return;
    }

    setIsSavingTenant(true);

    const { data, error } = await supabase.rpc(
      "master_create_trial_tenant",
      {
        p_name: createTenantForm.companyName.trim(),
        p_slug: createTenantForm.slug.trim(),
        p_owner_name: createTenantForm.responsibleName.trim(),
        p_owner_email: createTenantForm.email.trim().toLowerCase(),
        p_owner_phone: digitsWhatsapp,
        p_trial_start_date: createTenantForm.trialStartDate,
        p_address_zipcode: createTenantForm.unknownZipcode
          ? null
          : onlyDigits(createTenantForm.zipcode),
        p_address_street: createTenantForm.street.trim(),
        p_address_number: createTenantForm.number.trim(),
        p_address_complement: createTenantForm.complement.trim() || null,
        p_address_neighborhood: createTenantForm.neighborhood.trim(),
        p_address_city: createTenantForm.city.trim(),
        p_address_state: createTenantForm.state.trim().toUpperCase(),
      },
    );

    setIsSavingTenant(false);

    if (error) {
      showToast("error", error.message || "Não foi possível criar a empresa.");
      return;
    }

    const result = (Array.isArray(data) ? data[0] : data) as
      | CreatedTenantResult
      | null;

    setShowCreateTenantModal(false);
    setCreateTenantForm(createEmptyForm());
    await loadTenants();

    if (result?.first_access_token) {
      await copyText(
        `${origin}/primeiro-acesso/${result.first_access_token}`,
        "Empresa criada. Link de primeiro acesso copiado.",
      );
    } else {
      showToast("success", "Empresa criada com 21 dias de teste.");
    }
  };

  const currentTitle = {
    companies: "Empresas",
    financial: "Financeiro",
    reports: "Relatórios",
    settings: "Configurações",
  }[activeView];

  return (
    <main className="min-h-screen bg-[#F4F6F6] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[210px] flex-col border-r border-[#1A3038] bg-[#10232A] text-white lg:flex">
          <div className="flex h-[62px] items-center gap-3 border-b border-white/10 px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-orange-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black">AgendaSpeed</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                Desenvolvedor
              </p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1.5">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-black transition ${
                      active
                        ? "bg-white text-[#10232A]"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={onLogOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-black text-white/70 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-[210px]">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
            <div className="flex min-h-[62px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
              <div>
                <h1 className="text-xl font-black text-[#10232A]">
                  {currentTitle}
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Controle comercial e financeiro das empresas AgendaSpeed.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeView === "companies" && (
                  <button
                    type="button"
                    onClick={() => setShowCreateTenantModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-black text-white hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                    Nova empresa
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void loadTenants()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Atualizar
                </button>

                <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-[#F4F6F6] px-3 py-2 text-xs font-bold text-slate-700 sm:flex">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10232A] text-white">
                    {getInitial(sessionEmail)}
                  </span>
                  <span className="max-w-[200px] truncate">
                    {sessionEmail || "Master"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-black ${
                      active
                        ? "bg-[#10232A] text-white"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </header>

          <section className="flex-1 p-4 lg:p-5">
            {toast && (
              <div
                className={`mb-4 rounded-lg border px-4 py-3 text-sm font-bold ${
                  toast.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : toast.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                }`}
              >
                {toast.message}
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
                  <div>
                    <p className="font-black">Atenção</p>
                    <p className="mt-1 text-sm font-semibold">{errorMessage}</p>
                    <button
                      type="button"
                      onClick={onNavigateToLogin}
                      className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-black uppercase text-white"
                    >
                      Ir para login
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeView === "companies" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <SearchBox
                      query={query}
                      setQuery={setQuery}
                      placeholder="Buscar por código, empresa, responsável, endereço da agenda, e-mail..."
                    />
                    <StatusFilters
                      statusFilter={statusFilter}
                      setStatusFilter={setStatusFilter}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="text-sm font-black text-[#10232A]">
                      Empresas cadastradas
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {filteredTenants.length} empresa(s) exibida(s)
                    </p>
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
                </div>
              </div>
            )}

            {activeView === "financial" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <SearchBox
                      query={query}
                      setQuery={setQuery}
                      placeholder="Buscar empresa no financeiro..."
                    />
                    <StatusFilters
                      statusFilter={statusFilter}
                      setStatusFilter={setStatusFilter}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="text-sm font-black text-[#10232A]">
                      Controle financeiro
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      Clientes inadimplentes aparecem com indicador vermelho.
                    </p>
                  </div>

                  <FinancialTable
                    tenants={filteredTenants}
                    loading={loading}
                  />
                </div>
              </div>
            )}

            {activeView === "reports" && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-[#10232A]">
                  Relatórios
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Próxima etapa: filtros por período, status, vencimento,
                  receita prevista e receita recebida.
                </p>
              </div>
            )}

            {activeView === "settings" && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-[#10232A]">
                  Configurações da Área Master
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-[#F4F6F6] p-4">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Usuário atual
                    </p>
                    <p className="mt-2 text-sm font-black text-[#10232A]">
                      {sessionEmail || "Nenhum e-mail carregado"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-[#F4F6F6] p-4">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Regra comercial
                    </p>
                    <p className="mt-2 text-sm font-black text-[#10232A]">
                      21 dias de teste · R$ 49,90/mês
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <NewTenantModal
        form={createTenantForm}
        setForm={setCreateTenantForm}
        isOpen={showCreateTenantModal}
        isSaving={isSavingTenant}
        isLoadingZipcode={isLoadingZipcode}
        origin={origin}
        onClose={() => {
          if (isSavingTenant) return;
          setShowCreateTenantModal(false);
          setCreateTenantForm(createEmptyForm());
        }}
        onSubmit={handleCreateTenant}
        onLookupZipcode={handleLookupZipcode}
      />
    </main>
  );
}
