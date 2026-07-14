/**
 * Tela de Mensalidade do Painel do Dono - AgendaSpeed.
 *
 * Mostra apenas dados oficiais da assinatura retornados pelo Supabase.
 * O dono não altera valor, vencimento ou status.
 */

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  History,
  Loader2,
  MessageCircle,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';

import {
  OwnerSaasInvoice,
  OwnerSaasSubscription,
} from '../owner.types';

interface SubscriptionViewProps {
  subscription: OwnerSaasSubscription | null;
  invoices: OwnerSaasInvoice[];
  loading: boolean;
  errorMessage: string;
  onRefresh: () => Promise<void>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

function formatDate(value: string): string {
  if (!value) return '—';

  const date = new Date(`${value.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function getStatusLabel(status: string): string {
  if (status === 'trial') return 'Período de teste';
  if (status === 'active') return 'Em dia';
  if (status === 'paid') return 'Paga';
  if (status === 'pending') return 'Pendente';
  if (status === 'waiting_payment') return 'Aguardando pagamento';
  if (status === 'manual_review') return 'Em análise';
  if (status === 'overdue' || status === 'past_due') return 'Em atraso';
  if (status === 'blocked') return 'Em atraso';
  if (status === 'cancelled') return 'Cancelada';
  if (status === 'refunded') return 'Estornada';

  return status || '—';
}

function getStatusClasses(status: string): string {
  if (status === 'trial') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  if (status === 'active' || status === 'paid') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (
    status === 'overdue' ||
    status === 'past_due' ||
    status === 'blocked' ||
    status === 'cancelled'
  ) {
    return 'border-red-200 bg-red-50 text-red-800';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function formatPixKey(type: string, value: string): string {
  const digits = value.replace(/\D/g, '');

  if (type === 'cpf' && digits.length === 11) {
    return digits.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4',
    );
  }

  if (type === 'cnpj' && digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5',
    );
  }

  return value;
}

function getPixTypeLabel(type: string): string {
  if (type === 'cpf') return 'CPF';
  if (type === 'cnpj') return 'CNPJ';
  if (type === 'email') return 'E-mail';
  if (type === 'phone') return 'Telefone';
  if (type === 'random') return 'Chave aleatória';
  return 'Chave';
}

export default function SubscriptionView({
  subscription,
  invoices,
  loading,
  errorMessage,
  onRefresh,
}: SubscriptionViewProps) {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const currentInvoice = useMemo(() => {
    return invoices.find((invoice) =>
      ['pending', 'waiting_payment', 'manual_review', 'overdue'].includes(
        invoice.status,
      ),
    );
  }, [invoices]);

  const handleCopyPix = async () => {
    if (!subscription?.pixKey) return;

    try {
      await navigator.clipboard.writeText(subscription.pixKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copie sua chave Pix:', subscription.pixKey);
    }
  };

  const handleSendReceipt = () => {
    if (!subscription?.whatsappSupport) {
      alert(
        'O WhatsApp para envio do comprovante ainda não foi configurado pelo AgendaSpeed.',
      );
      return;
    }

    const phone = subscription.whatsappSupport.replace(/\D/g, '');
    const message = [
      'Olá! Realizei o pagamento da mensalidade do AgendaSpeed.',
      '',
      `Empresa: ${subscription.tenantName}`,
      `Valor: ${formatCurrency(subscription.monthlyPrice)}`,
      `Vencimento: ${formatDate(subscription.dueDate)}`,
      '',
      'Vou enviar o comprovante nesta conversa.',
    ].join('\n');

    window.open(
      `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  if (loading && !subscription) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-[#0f4c5c]" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
        <p className="font-black">Não foi possível carregar sua mensalidade.</p>
        <p className="mt-1 text-sm font-semibold">
          {errorMessage || 'Atualize a página e tente novamente.'}
        </p>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white"
        >
          <RefreshCcw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  const mainStatus = subscription.isOverdue
    ? 'past_due'
    : subscription.subscriptionStatus;

  return (
    <div id="view-mensalidade" className="space-y-3 text-left">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AGENDASPEED
            </p>
            <h2 className="text-lg font-black tracking-tight text-neutral-950">
              Mensalidade
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Acompanhe sua assinatura e escolha a forma de pagamento.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {(subscription.isDueSoon || subscription.isOverdue) && (
        <div
          className={`rounded-2xl border p-4 ${
            subscription.isOverdue
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <p className="text-sm font-black">
            {subscription.isOverdue
              ? 'Sua mensalidade está em atraso.'
              : subscription.subscriptionStatus === 'trial'
                ? `Seu período de teste termina em ${Math.max(0, subscription.daysUntilDue)} dia${Math.max(0, subscription.daysUntilDue) === 1 ? '' : 's'}.`
                : `Sua mensalidade vence em ${Math.max(0, subscription.daysUntilDue)} dia${Math.max(0, subscription.daysUntilDue) === 1 ? '' : 's'}.`}
          </p>
          <p className="mt-1 text-xs font-semibold opacity-80">
            Realize o pagamento para evitar interrupções no acesso.
          </p>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Plano atual
              </p>
              <h3 className="mt-1 text-lg font-black text-[#10232A]">
                AgendaSpeed
              </h3>
            </div>

            <span
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${getStatusClasses(mainStatus)}`}
            >
              {getStatusLabel(mainStatus)}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Valor mensal
              </p>
              <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                {formatCurrency(subscription.monthlyPrice)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Vencimento
              </p>
              <p className="mt-1 text-lg font-black text-slate-800">
                {formatDate(subscription.dueDate || subscription.trialEndsAt)}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
              <CalendarDays className="h-4 w-4 text-[#0f4c5c]" />
              Situação da assinatura
            </div>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">
              {subscription.subscriptionStatus === 'trial'
                ? 'Você está usando o período gratuito. Após o término, a mensalidade será de R$ 49,90.'
                : subscription.isOverdue
                  ? 'O pagamento está pendente. Após a confirmação, a assinatura será atualizada automaticamente.'
                  : 'Sua assinatura está ativa e o acesso ao sistema está liberado.'}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#0f4c5c]" />
            <div>
              <h3 className="text-sm font-black text-neutral-950">
                Pagar por Pix
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Copie a chave e pague pelo aplicativo do seu banco.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">
                Valor
              </p>
              <p className="mt-1 text-sm font-black text-[#0f4c5c]">
                {formatCurrency(currentInvoice?.amount || subscription.monthlyPrice)}
              </p>
            </div>

            <div className="mt-3">
              <p className="text-[10px] font-black uppercase text-slate-400">
                {getPixTypeLabel(subscription.pixKeyType)}
              </p>
              <p className="mt-1 break-all font-mono text-sm font-black text-slate-900">
                {formatPixKey(subscription.pixKeyType, subscription.pixKey)}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleCopyPix}
                disabled={!subscription.pixKey}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0f4c5c] px-4 py-3 text-xs font-black text-white transition hover:bg-[#123945] disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Chave copiada' : 'Copiar chave Pix'}
              </button>

              <button
                type="button"
                onClick={handleSendReceipt}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar comprovante
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-black text-slate-800">
                  Cartão de crédito
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Pagamento recorrente e baixa automática pelo Asaas.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="mt-3 w-full rounded-xl bg-slate-200 px-4 py-3 text-xs font-black text-slate-500"
            >
              Integração em preparação
            </button>
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => setShowHistory((current) => !current)}
        className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#0f4c5c]/30 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-sm font-black text-neutral-950">
          <History className="h-5 w-5 text-[#0f4c5c]" />
          Histórico de mensalidades
        </span>
        <span className="text-xs font-black text-[#0f4c5c]">
          {showHistory ? 'Ocultar' : 'Consultar'}
        </span>
      </button>

      {showHistory && (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <History className="h-5 w-5 text-[#0f4c5c]" />
          <h3 className="text-sm font-black text-neutral-950">
            Histórico de mensalidades
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Competência</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Forma</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {formatDate(invoice.referenceMonth)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600">
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getStatusClasses(invoice.status)}`}
                    >
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600">
                    {invoice.paymentMethod === 'pix_manual'
                      ? 'Pix'
                      : invoice.paymentMethod || '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600">
                    {invoice.paidAt ? formatDate(invoice.paidAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-[#0f4c5c]">
                    {formatCurrency(invoice.amount)}
                  </td>
                </tr>
              ))}

              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Nenhuma mensalidade foi gerada até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
}
