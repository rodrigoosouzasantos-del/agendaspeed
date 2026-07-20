import React from 'react';

import { Appointment } from '../../../types';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Plus,
  Printer,
  Search,
  WalletCards
} from 'lucide-react';

interface ReceiptsHistoryViewProps {
  context: Record<string, any>;
}

export default function ReceiptsHistoryView({
  context
}: ReceiptsHistoryViewProps) {
  const {
    cashSearch,
    currentDayKey,
    dailyBalance,
    expenseAmount,
    expenseDescription,
    expenseNotes,
    expensePaymentOptions,
    expensePaymentType,
    formatCurrency,
    formatCurrencyInput,
    formatDateBr,
    formatPhoneForDisplay,
    getAppointmentDate,
    getAppointmentProfessionalName,
    getAppointmentServiceDescription,
    getAppointmentServiceName,
    getAppointmentTime,
    getReceivableStatusLabel,
    getReceiptPaymentLabel,
    handleAuthorizePendingReceipt,
    handleBackToSearch,
    handleConfirmExpense,
    handleOpenCheckout,
    handleOpenManualReceipt,
    handleOpenPendingReceipts,
    handlePrintDailySummary,
    handlePrintReceipt,
    handlePrintConfirmedReceipt,
    handleSkipConfirmedReceiptPrint,
    isExpenseOpen,
    isHistoryOpen,
    isPendingAuthorizationOpen,
    isSubmittingExpense,
    parseCurrencyInput,
    pendingAuthorizationAmount,
    pendingReceipts,
    printAfterConfirmHtml,
    professionals,
    receivableAppointmentsList,
    renderMode,
    services,
    setCashSearch,
    setExpenseAmount,
    setExpenseDescription,
    setExpenseNotes,
    setExpensePaymentType,
    setIsHistoryOpen,
    setIsPendingAuthorizationOpen,
    setPendingAuthorizationAmount,
    setValidationPopupMessage,
    todayExpenses,
    todayReceipts,
    todayTotalsByPayment,
    totalExpensesToday,
    totalReceivedToday,
    validationPopupMessage
  } = context;

const renderReceivableAppointmentCard = (appointment: Appointment) => {
    const serviceName = getAppointmentServiceName(appointment, services);
    const professionalName = getAppointmentProfessionalName(appointment, professionals);
    const serviceDescription = getAppointmentServiceDescription(appointment, services);
    const appointmentDate = getAppointmentDate(appointment);
    const isOverdue = appointmentDate < currentDayKey;

    return (
      <div
        key={appointment.id}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-sm transition hover:border-slate-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              {getAppointmentTime(appointment)} • {getReceivableStatusLabel(appointment.status)}
            </p>
            <h3 className="mt-1 text-base font-black text-slate-950 truncate">
              {appointment.clientName || 'Cliente'}
            </h3>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {formatPhoneForDisplay(appointment.clientPhone)}
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700">
            {formatCurrency(appointment.price)}
          </span>
        </div>

        <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-sm font-black text-slate-900 truncate">
            {serviceName}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 truncate">
            Profissional: {professionalName}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 truncate">
            {formatDateBr(appointmentDate)} às {getAppointmentTime(appointment)}
          </p>
          {serviceDescription && (
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
              {serviceDescription}
            </p>
          )}
        </div>

        {isOverdue && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[11px] font-bold text-amber-700">
              Valor antigo sem baixa. Priorize este recebimento.
            </p>
          </div>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => handleOpenCheckout(appointment.id)}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Baixar pagamento
          </button>
        </div>
      </div>
    );
  };

const renderHistory = () => (
    <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsHistoryOpen((current) => !current)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-neutral-50 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            {isHistoryOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-neutral-950">
              Histórico de recebimentos do dia
            </h2>
            <p className="text-xs font-semibold text-neutral-500">
              Fica fechado para não poluir a tela. Clique para abrir o resumo do caixa.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs font-black text-neutral-700 shrink-0">
          {todayReceipts.length} recebimento(s)
        </span>
      </button>

      {isHistoryOpen && (
        <div className="border-t border-neutral-200">
          <div className="p-4 flex justify-end">
            <button
              type="button"
              onClick={handlePrintDailySummary}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir resumo do dia
            </button>
          </div>

          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 border-b border-neutral-100">
            <div className="rounded-2xl bg-neutral-950 text-white p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
                Recebido
              </p>
              <p className="text-lg font-black mt-1">
                {formatCurrency(totalReceivedToday)}
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 border border-red-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-400">
                Despesas
              </p>
              <p className="text-sm font-black text-red-700 mt-1">
                {formatCurrency(totalExpensesToday)}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">
                Saldo
              </p>
              <p className="text-sm font-black text-emerald-700 mt-1">
                {formatCurrency(dailyBalance)}
              </p>
            </div>

            {todayTotalsByPayment.map((item) => (
              <div key={item.paymentType} className="rounded-2xl bg-neutral-50 border border-neutral-200 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  {getReceiptPaymentLabel(item.paymentType)}
                </p>
                <p className="text-sm font-black text-neutral-950 mt-1">
                  {formatCurrency(item.total)}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 space-y-2">
            {todayReceipts.length === 0 && todayExpenses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                <p className="text-sm font-black text-neutral-700">
                  Nenhuma movimentação confirmada hoje.
                </p>
              </div>
            )}

            {todayReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="rounded-2xl border border-neutral-200 bg-white p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-neutral-950">
                    {receipt.clientName}
                  </p>
                  <p className="text-xs font-bold text-neutral-500">
                    {new Date(receipt.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' '}• {getReceiptPaymentLabel(receipt.paymentType)} • {receipt.items.length} item(ns)
                  </p>
                </div>

                <div className="flex flex-row gap-2 items-center justify-end">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-black text-emerald-700 text-center">
                    {formatCurrency(Number(receipt.amountPaid) || 0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(receipt)}
                    className="h-9 w-9 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition flex items-center justify-center"
                    title="Imprimir"
                    aria-label="Imprimir recebimento"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {todayExpenses.map((expense) => (
              <div
                key={expense.id}
                className="rounded-2xl border border-red-100 bg-red-50 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-red-800">
                    {expense.description}
                  </p>
                  <p className="text-xs font-bold text-red-500">
                    {new Date(expense.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' '}• Despesa • {getReceiptPaymentLabel(expense.paymentType)}
                  </p>
                </div>

                <span className="rounded-full bg-white border border-red-200 px-3 py-1 text-xs font-black text-red-700 text-center">
                  - {formatCurrency(expense.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );


if (isExpenseOpen) {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <button
            type="button"
            onClick={handleBackToSearch}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="text-left lg:text-right">
            <h1 className="text-2xl font-black tracking-tight text-neutral-950">
              Lançar despesa extra
            </h1>
            <p className="text-sm text-neutral-500 font-medium">
              Use para saída de caixa: compra rápida, vale, material ou despesa do dia.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden max-w-3xl">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-lg font-black text-neutral-950">
              Dados da despesa
            </h2>
            <p className="text-xs font-semibold text-neutral-500">
              Despesa reduz o saldo do caixa do dia, mas não entra como recebimento.
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                Descrição
              </label>
              <input
                value={expenseDescription}
                onChange={(event) => setExpenseDescription(event.target.value)}
                placeholder="Ex.: compra de toalhas, vale, material"
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                  Valor
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyInput(expenseAmount)}
                  onChange={(event) => setExpenseAmount(parseCurrencyInput(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-black outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 mb-2">
                  Forma de pagamento
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {expensePaymentOptions().map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setExpensePaymentType(option)}
                      className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                        expensePaymentType === option
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-orange-200'
                      }`}
                    >
                      {getReceiptPaymentLabel(option)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                Observações
              </label>
              <textarea
                value={expenseNotes}
                onChange={(event) => setExpenseNotes(event.target.value)}
                rows={3}
                placeholder="Observação opcional."
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-red-700">Saída do caixa</span>
              <span className="text-xl font-black text-red-700">- {formatCurrency(Number(expenseAmount) || 0)}</span>
            </div>

            <button
              type="button"
              onClick={handleConfirmExpense}
              disabled={isSubmittingExpense}
              className="w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmittingExpense ? 'Salvando despesa...' : 'Confirmar despesa'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (renderMode === 'home') {
return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AGENDASPEED
            </p>
            <h1 className="text-lg font-black tracking-tight text-neutral-950">
              Recebimentos
            </h1>
          </div>

          <div className="flex w-full flex-col gap-2 lg:max-w-2xl lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={cashSearch}
                onChange={(event) => setCashSearch(event.target.value)}
                placeholder="Buscar por cliente, telefone, serviço ou profissional"
                className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm font-semibold text-neutral-700 outline-none focus:border-[#0f4c5c] focus:bg-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenManualReceipt}
                className="rounded-xl bg-[#0f4c5c] px-3 py-2 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Manual
              </button>

              <button
                type="button"
                onClick={handleOpenPendingReceipts}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100 flex items-center justify-center gap-1.5"
              >
                <WalletCards className="w-3.5 h-3.5" />
                Pendentes
                {pendingReceipts.length > 0 && (
                  <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-black text-white">
                    {pendingReceipts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[360px]">
        <div className="bg-[#0f4c5c] px-4 py-3 text-white flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">
              Atendimentos para receber
            </h2>
            <p className="mt-0.5 text-[11px] font-semibold text-white/80">
              Selecione o atendimento e faça a baixa diretamente.
            </p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
            {receivableAppointmentsList.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
          {receivableAppointmentsList.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center xl:col-span-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-black text-neutral-800">
                Nenhum atendimento aguardando baixa.
              </p>
              <p className="text-xs font-semibold text-neutral-500 mt-1">
                Os atendimentos concluídos ou pendentes de pagamento aparecerão aqui.
              </p>
            </div>
          )}

          {receivableAppointmentsList.map((appointment) =>
            renderReceivableAppointmentCard(appointment)
          )}
        </div>
      </div>

      {renderHistory()}

      {validationPopupMessage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-amber-500" />

            <div className="p-5 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <AlertCircle className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-lg font-black text-neutral-950">
                Verifique os dados
              </h3>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                {validationPopupMessage}
              </p>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setValidationPopupMessage('')}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-3 text-sm font-black text-white transition hover:bg-[#123945]"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPendingAuthorizationOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-amber-500" />
            <div className="p-5 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-black text-neutral-950">
                Valor inferior ao total
              </h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                O valor informado é menor que o total dos serviços e produtos.
                Restará pendente <strong>{formatCurrency(pendingAuthorizationAmount)}</strong>.
              </p>
              <p className="mt-2 text-sm font-black text-amber-700">
                Deseja baixar este pagamento com valor pendente?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPendingAuthorizationOpen(false);
                    setPendingAuthorizationAmount(0);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Não, corrigir
                </button>
                <button
                  type="button"
                  onClick={handleAuthorizePendingReceipt}
                  className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-700"
                >
                  Sim, autorizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {printAfterConfirmHtml && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-neutral-950 text-center">
              Pagamento confirmado
            </h3>
            <p className="text-sm font-semibold text-neutral-500 text-center mt-2">
              Deseja imprimir o comprovante agora?
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={handlePrintConfirmedReceipt}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Sim
              </button>
              <button
                type="button"
                onClick={handleSkipConfirmedReceiptPrint}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 transition"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

  return null;
}
