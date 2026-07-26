import React from 'react';

import {
  ArrowLeft,
  CheckCircle2,
  WalletCards
} from 'lucide-react';

interface PendingReceiptsViewProps {
  context: Record<string, any>;
}

export default function PendingReceiptsView({
  context
}: PendingReceiptsViewProps) {
  const {
    expensePaymentOptions,
    formatCurrency,
    formatCurrencyInput,
    formatPhoneForDisplay,
    getReceiptPaymentLabel,
    handleClosePendingPayment,
    handleClosePendingReceipts,
    handleConfirmPendingPayment,
    handleOpenPendingPayment,
    isPendingReceiptsOpen,
    isSubmittingPendingPayment,
    parseCurrencyInput,
    pendingAmountRemaining,
    pendingAmountToApply,
    pendingPaymentAmount,
    pendingPaymentChange,
    pendingPaymentDate,
    pendingPaymentNotes,
    pendingPaymentType,
    pendingReceipts,
    selectedPendingAmount,
    selectedPendingReceipt,
    setPendingPaymentAmount,
    setPendingPaymentDate,
    setPendingPaymentNotes,
    setPendingPaymentType,
    setValidationPopupMessage,
    totalPendingReceipts,
    validationPopupMessage
  } = context;

if (isPendingReceiptsOpen) {
    return (
      <section className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-[#0f4c5c]" />

          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
                AgendaBless
              </p>
              <h1 className="text-lg font-black text-slate-950">
                Valores pendentes
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                Receba saldos restantes sem gerar uma segunda baixa integral.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClosePendingReceipts}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para recebimentos
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-3 text-white">
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">
                Pendências em aberto
              </h2>
              <p className="mt-0.5 text-[11px] font-semibold text-white/90">
                Clique em receber saldo para registrar o pagamento.
              </p>
            </div>

            <div className="text-right">
              <span className="block text-[10px] font-black uppercase text-white/75">
                Saldo total
              </span>
              <strong className="text-sm font-black">
                {formatCurrency(totalPendingReceipts)}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
            {pendingReceipts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-8 text-center xl:col-span-2">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-amber-500" />
                <p className="text-sm font-black text-amber-800">
                  Nenhum valor pendente.
                </p>
              </div>
            )}

            {pendingReceipts.map((receipt) => (
              <article
                key={receipt.id}
                className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {receipt.clientName || 'Cliente'}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600">
                      {formatPhoneForDisplay(receipt.clientPhone)}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      {receipt.items
                        .map((item) => item.itemDescription || item.serviceName)
                        .filter(Boolean)
                        .join(' + ') || 'Recebimento'}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-700">
                    Pendente
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-2">
                    <span className="text-[9px] font-black uppercase text-slate-400">
                      Total
                    </span>
                    <p className="text-xs font-black text-slate-800">
                      {formatCurrency(receipt.totalAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-white p-2">
                    <span className="text-[9px] font-black uppercase text-emerald-500">
                      Pago
                    </span>
                    <p className="text-xs font-black text-emerald-700">
                      {formatCurrency(Number(receipt.amountPaid) || 0)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-300 bg-white p-2">
                    <span className="text-[9px] font-black uppercase text-amber-500">
                      Restante
                    </span>
                    <p className="text-xs font-black text-amber-700">
                      {formatCurrency(Number(receipt.amountPending) || 0)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPendingPayment(receipt)}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0f4c5c] px-4 text-xs font-black text-white hover:bg-[#123945]"
                >
                  <WalletCards className="h-4 w-4" />
                  RECEBER SALDO
                </button>
              </article>
            ))}
          </div>
        </div>

        {selectedPendingReceipt && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="h-1.5 bg-[#0f4c5c]" />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
                      Receber saldo
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      {selectedPendingReceipt.clientName || 'Cliente'}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Saldo atual: {formatCurrency(
                        Number(selectedPendingReceipt.amountPending) || 0
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleClosePendingPayment}
                    disabled={isSubmittingPendingPayment}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Fechar
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      {pendingPaymentType === 'dinheiro'
                        ? 'Valor entregue'
                        : 'Valor recebido'}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatCurrencyInput(pendingPaymentAmount)}
                      onChange={(event) => {
                        const nextAmount = parseCurrencyInput(event.target.value);

                        setPendingPaymentAmount(
                          pendingPaymentType === 'dinheiro'
                            ? nextAmount
                            : Math.min(
                                nextAmount,
                                Number(selectedPendingReceipt.amountPending) || 0
                              )
                        );
                      }}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black outline-none focus:border-[#0f4c5c]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Data do recebimento
                    </span>
                    <input
                      type="date"
                      value={pendingPaymentDate}
                      onChange={(event) =>
                        setPendingPaymentDate(event.target.value)
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                    />
                  </label>
                </div>

                <div className="mt-3">
                  <p className="text-[10px] font-black uppercase text-slate-500">
                    Forma de pagamento
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {expensePaymentOptions().map((option) => (
                      <button
                        type="button"
                        key={option}
                        onClick={() => {
                          setPendingPaymentType(option);

                          if (option !== 'dinheiro') {
                            setPendingPaymentAmount((currentAmount) =>
                              Math.min(
                                currentAmount,
                                Number(selectedPendingReceipt.amountPending) || 0
                              )
                            );
                          }
                        }}
                        className={`h-10 rounded-xl border px-3 text-xs font-black transition ${
                          pendingPaymentType === option
                            ? 'border-[#0f4c5c] bg-[#0f4c5c] text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-[#0f4c5c]/40'
                        }`}
                      >
                        {getReceiptPaymentLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="mt-3 block space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Observações
                  </span>
                  <textarea
                    value={pendingPaymentNotes}
                    onChange={(event) =>
                      setPendingPaymentNotes(event.target.value)
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-amber-200 bg-white p-3">
                    <p className="text-[9px] font-black uppercase text-amber-600">
                      Saldo pendente
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {formatCurrency(selectedPendingAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-white p-3">
                    <p className="text-[9px] font-black uppercase text-emerald-600">
                      Valor que será baixado
                    </p>
                    <p className="mt-1 text-sm font-black text-emerald-700">
                      {formatCurrency(pendingAmountToApply)}
                    </p>
                  </div>

                  {pendingPaymentType === 'dinheiro' && (
                    <div className="rounded-xl border border-[#0f4c5c]/20 bg-white p-3">
                      <p className="text-[9px] font-black uppercase text-[#0f4c5c]">
                        Troco
                      </p>
                      <p className="mt-1 text-sm font-black text-[#0f4c5c]">
                        {formatCurrency(pendingPaymentChange)}
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-amber-300 bg-white p-3">
                    <p className="text-[9px] font-black uppercase text-amber-600">
                      Restará pendente
                    </p>
                    <p className="mt-1 text-sm font-black text-amber-700">
                      {formatCurrency(pendingAmountRemaining)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClosePendingPayment}
                    disabled={isSubmittingPendingPayment}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmPendingPayment}
                    disabled={
                      isSubmittingPendingPayment ||
                      pendingAmountToApply <= 0
                    }
                    className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:opacity-60"
                  >
                    {isSubmittingPendingPayment
                      ? 'Salvando...'
                      : 'Confirmar recebimento'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {validationPopupMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
              <div className="h-1.5 bg-amber-500" />
              <div className="p-5 text-left">
                <h3 className="text-lg font-black text-neutral-950">
                  Informação
                </h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                  {validationPopupMessage}
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setValidationPopupMessage('')}
                    className="rounded-xl bg-[#0f4c5c] px-5 py-3 text-sm font-black text-white hover:bg-[#123945]"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  return null;
}
