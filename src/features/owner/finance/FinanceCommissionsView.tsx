// Responsabilidades preservadas:
// - cálculo e fechamento por profissional;
// - edição de data já paga;
// - impressão individual e histórico geral;
// - feedback visual das operações.
/**
 * Bloco completo de comissões, histórico, pagamentos e comprovantes.
 * Mantém o visual e as regras já aprovadas no módulo financeiro.
 * A extração reduz o tamanho do componente principal sem pulverizar arquivos.
 */
import React from 'react';
import { History } from 'lucide-react';
import { PaymentType, Professional } from '../../../types';

interface FinanceCommissionsViewProps {
  context: Record<string, any>;
}

interface CommissionRow {
  professional: Professional;
  completedCount: number;
  totalProduced: number;
  commissionValue: number;
  items: CommissionPaymentItem[];
  payableItems: CommissionPaymentItem[];
  paidItems: CommissionPaymentItem[];
  payableCount: number;
  payableProduced: number;
  payableCommissionValue: number;
}

interface CommissionPaymentItem {
  appointmentId: string;
  appointmentDate: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  serviceValue: number;
  commissionValue: number;
}

interface CommissionPaymentRecord {
  id: string;
  professionalId: string;
  professionalName: string;
  periodStart: string;
  periodEnd: string;
  calculatedCommission: number;
  extraValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  paidAt: string;
  notes?: string;
  createdAt?: string;
  items?: CommissionPaymentItem[];
}

export default function FinanceCommissionsView({ context }: FinanceCommissionsViewProps) {
  const {
    activeFinanceTab,
    commissionAmountToPay,
    commissionDiscountValue,
    commissionExtraValue,
    commissionFeedback,
    commissionNotes,
    commissionPaidAt,
    commissionPaymentByProfessionalId,
    commissionPaymentType,
    commissionRows,
    editedCommissionDiscountValue,
    editedCommissionExtraValue,
    editedCommissionNotes,
    editedCommissionPaidAt,
    editedCommissionPaymentType,
    editingPaidCommission,
    filteredCommissionPayments,
    formatCurrency,
    formatCurrencyInput,
    parseCurrencyInput,
    formatDateBr,
    getPaymentLabel,
    getRemunerationLabel,
    handleConfirmCommissionPaidAtUpdate,
    handleConfirmCommissionPayment,
    handleOpenCommissionPayment,
    handleOpenPaidCommission,
    handlePrintCommissionHistory,
    handlePrintCommissionPaymentIndividual,
    handlePrintCommissionsA4,
    handlePrintProfessionalCommission,
    handlePrintSavedCommissionPayment,
    isSavingCommissionPayment,
    isUpdatingCommissionPaidAt,
    pendingCommissionPrintHtml,
    period,
    professionals,
    resetCommissionPaymentForm,
    selectedCommissionRow,
    setCommissionDiscountValue,
    setCommissionExtraValue,
    setCommissionFeedback,
    setCommissionNotes,
    setCommissionPaidAt,
    setCommissionPaymentType,
    setEditedCommissionDiscountValue,
    setEditedCommissionExtraValue,
    setEditedCommissionNotes,
    setEditedCommissionPaidAt,
    setEditedCommissionPaymentType,
    setEditingPaidCommission,
    setPendingCommissionPrintHtml,
    setShowCommissionHistory,
    showCommissionHistory,
    PanelCard
  } = context;



  return (
    <>
      {activeFinanceTab === 'comissoes' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setShowCommissionHistory(true)} className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2">
            <History className="h-4 w-4" />
            HISTÓRICO
          </button>
          <button type="button" onClick={handlePrintCommissionsA4} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-slate-50">
            Imprimir A4
          </button>
        </div>
      )}

            {activeFinanceTab === 'comissoes' && (
        <PanelCard title="Comissões da Equipe">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Colaborador</th>
                  <th className="px-4 py-3.5">Remuneração</th>
                  <th className="px-4 py-3.5 text-center">Atendimentos</th>
                  <th className="px-4 py-3.5 text-center">Situação</th>
                  <th className="px-4 py-3.5 text-right">Produção a pagar</th>
                  <th className="px-4 py-3.5 text-right">Comissão a pagar</th>
                  <th className="px-4 py-3.5 text-right">Fechamento</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {(commissionRows as CommissionRow[]).map((row) => {
                  const paidCommission =
                    commissionPaymentByProfessionalId.get(row.professional.id);

                  return (
                  <tr
                    id={`row-fin-comm-${row.professional.id}`}
                    key={row.professional.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="flex items-center gap-2.5 px-4 py-4">
                      {row.professional.avatar ? (
                        <img
                          src={row.professional.avatar}
                          alt="foto avatar"
                          className="h-8 w-8 shrink-0 rounded-full border object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-slate-100 text-xs font-black text-slate-500">
                          {row.professional.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}

                      <span className="font-extrabold text-slate-900">
                        {row.professional.name}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="block w-max rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                        {getRemunerationLabel(row.professional)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center font-bold">
                      {row.completedCount}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {row.payableCount > 0 && (
                          <span className="w-max rounded-md bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                            {row.payableCount} a pagar
                          </span>
                        )}
                        {row.paidItems.length > 0 && (
                          <span className="w-max rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                            {row.paidItems.length} pago{row.paidItems.length === 1 ? '' : 's'}
                          </span>
                        )}
                        {row.completedCount === 0 && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            Sem atendimentos
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-slate-950">
                      {formatCurrency(row.payableProduced)}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-[#0f4c5c]">
                      {formatCurrency(row.payableCommissionValue)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintProfessionalCommission(row)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-slate-50"
                        >
                          Imprimir
                        </button>

                        {paidCommission ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPaidCommission(paidCommission)}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Ver pago
                          </button>
                        ) : null}

                        {row.payableCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenCommissionPayment(row)}
                            disabled={row.payableCommissionValue <= 0}
                            className="rounded-xl bg-[#0f4c5c] px-3 py-2 text-[10px] font-black text-white transition hover:bg-[#123945] disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Gerar lote
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}

                {professionals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Nenhum profissional cadastrado para cálculo de comissões.
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-50">
                  <td colSpan={4} className="px-4 py-3.5 text-right font-black uppercase">
                    Total
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                    {formatCurrency(
                      (commissionRows as CommissionRow[]).reduce(
                        (sum, row) => sum + row.payableProduced,
                        0
                      )
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                    {formatCurrency(
                      (commissionRows as CommissionRow[]).reduce(
                        (sum, row) => sum + row.payableCommissionValue,
                        0
                      )
                    )}
                  </td>
                  <td className="px-4 py-3.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </PanelCard>
      )}
      {showCommissionHistory && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#0f4c5c]" />

            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
                  Comissões
                </p>
                <h2 className="text-xl font-black text-slate-950">
                  Histórico de pagamentos
                </h2>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintCommissionHistory}
                  className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white hover:bg-[#123945]"
                >
                  HISTÓRICO
                </button>

                <button
                  type="button"
                  onClick={() => setShowCommissionHistory(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3">Profissional</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3 text-right">Comissão</th>
                    <th className="px-4 py-3 text-right">Extra</th>
                    <th className="px-4 py-3 text-right">Desconto</th>
                    <th className="px-4 py-3 text-right">Total pago</th>
                    <th className="px-4 py-3">Forma</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {(filteredCommissionPayments as CommissionPaymentRecord[]).map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold">
                        {formatDateBr(payment.paidAt)}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900">
                        {payment.professionalName}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {formatDateBr(payment.periodStart)} a {formatDateBr(payment.periodEnd)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(payment.calculatedCommission)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(payment.extraValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(payment.discountValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(payment.amountPaid)}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {getPaymentLabel(payment.paymentType)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                          Pago
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handlePrintCommissionPaymentIndividual(payment)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50"
                          >
                            Imprimir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPaidCommission(payment)}
                            className="rounded-xl border border-[#0f4c5c]/20 bg-[#0f4c5c]/5 px-3 py-2 text-[10px] font-black text-[#0f4c5c] hover:bg-[#0f4c5c]/10"
                          >
                            Ver / editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredCommissionPayments.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Nenhuma comissão paga no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingPaidCommission && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-emerald-600" />

            <div className="p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                      Lote de comissão
                    </p>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                      Pago
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {editingPaidCommission.professionalName}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    Período fechado: {formatDateBr(editingPaidCommission.periodStart)} a {formatDateBr(editingPaidCommission.periodEnd)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handlePrintCommissionPaymentIndividual(editingPaidCommission)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  Reimprimir comprovante
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-black text-slate-800">
                      Atendimentos do lote
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">
                      Estes itens permanecem congelados e não podem ser excluídos.
                    </p>
                  </div>
                  <span className="text-xs font-black text-emerald-700">
                    {(editingPaidCommission.items || []).length} pago{(editingPaidCommission.items || []).length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="max-h-56 overflow-auto">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="sticky top-0 border-b bg-white text-[9px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5">Data</th>
                        <th className="px-4 py-2.5">Cliente</th>
                        <th className="px-4 py-2.5">Serviço</th>
                        <th className="px-4 py-2.5 text-right">Valor</th>
                        <th className="px-4 py-2.5 text-right">Comissão</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(editingPaidCommission.items || []).map((item: CommissionPaymentItem) => (
                        <tr key={item.appointmentId}>
                          <td className="px-4 py-2.5 font-semibold">{formatDateBr(item.appointmentDate)}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">{item.clientName}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-600">{item.serviceName}</td>
                          <td className="px-4 py-2.5 text-right font-bold">{formatCurrency(item.serviceValue)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#0f4c5c]">{formatCurrency(item.commissionValue)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                              Pago
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(editingPaidCommission.items || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            Pagamento antigo sem atendimentos individualizados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Data do pagamento</span>
                  <input
                    type="date"
                    value={editedCommissionPaidAt}
                    onChange={(event) => setEditedCommissionPaidAt(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Forma de pagamento</span>
                  <select
                    value={editedCommissionPaymentType}
                    onChange={(event) => setEditedCommissionPaymentType(event.target.value as PaymentType)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Extra</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(editedCommissionExtraValue)}
                    onChange={(event) => setEditedCommissionExtraValue(parseCurrencyInput(event.target.value))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Desconto</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(editedCommissionDiscountValue)}
                    onChange={(event) => setEditedCommissionDiscountValue(parseCurrencyInput(event.target.value))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>
              </div>

              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-500">Observações</span>
                <textarea
                  value={editedCommissionNotes}
                  onChange={(event) => setEditedCommissionNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[9px] font-black uppercase text-slate-400">Comissão</span>
                  <p className="mt-1 font-black text-slate-900">{formatCurrency(editingPaidCommission.calculatedCommission)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[9px] font-black uppercase text-slate-400">Extra</span>
                  <p className="mt-1 font-black text-slate-900">{formatCurrency(editedCommissionExtraValue)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[9px] font-black uppercase text-slate-400">Desconto</span>
                  <p className="mt-1 font-black text-slate-900">{formatCurrency(editedCommissionDiscountValue)}</p>
                </div>
                <div className="rounded-2xl border border-[#0f4c5c]/30 bg-[#0f4c5c]/5 p-3">
                  <span className="text-[9px] font-black uppercase text-[#0f4c5c]">Total pago</span>
                  <p className="mt-1 font-black text-[#0f4c5c]">
                    {formatCurrency(Math.max(0, editingPaidCommission.calculatedCommission + editedCommissionExtraValue - editedCommissionDiscountValue))}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[11px] font-semibold text-slate-500">
                O período, os atendimentos e a comissão calculada permanecem congelados. Este pagamento não pode ser excluído.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPaidCommission(null);
                    setEditedCommissionPaidAt('');
                    setEditedCommissionPaymentType('dinheiro');
                    setEditedCommissionExtraValue(0);
                    setEditedCommissionDiscountValue(0);
                    setEditedCommissionNotes('');
                  }}
                  disabled={isUpdatingCommissionPaidAt}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCommissionPaidAtUpdate}
                  disabled={isUpdatingCommissionPaidAt}
                  className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:opacity-60"
                >
                  {isUpdatingCommissionPaidAt ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCommissionRow && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-2 backdrop-blur-sm sm:px-4">
          <div className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-7xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl sm:w-[94vw]">
            <div className="h-1.5 bg-[#0f4c5c]" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
                    Novo lote de comissão
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {selectedCommissionRow.professional.name}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Período de {formatDateBr(period.startDate)} a {formatDateBr(period.endDate)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetCommissionPaymentForm}
                  disabled={isSavingCommissionPayment}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    Produção do lote
                  </span>
                  <p className="mt-1 text-base font-black text-slate-900">
                    {formatCurrency(selectedCommissionRow.payableProduced)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    Atendimentos
                  </span>
                  <p className="mt-1 text-base font-black text-slate-900">
                    {selectedCommissionRow.payableCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#0f4c5c]/30 bg-[#0f4c5c]/5 p-3">
                  <span className="text-[9px] font-black uppercase text-[#0f4c5c]">
                    Comissão calculada
                  </span>
                  <p className="mt-1 text-base font-black text-[#0f4c5c]">
                    {formatCurrency(selectedCommissionRow.payableCommissionValue)}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-black text-slate-800">
                      Atendimentos incluídos
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">
                      Todos os atendimentos abaixo formarão este lote.
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                    A pagar
                  </span>
                </div>

                <div className="max-h-60 overflow-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="sticky top-0 border-b bg-white text-[9px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5">Data</th>
                        <th className="px-4 py-2.5">Cliente</th>
                        <th className="px-4 py-2.5">Serviço</th>
                        <th className="px-4 py-2.5 text-right">Valor</th>
                        <th className="px-4 py-2.5 text-right">Comissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCommissionRow.payableItems.map((item: CommissionPaymentItem) => (
                        <tr key={item.appointmentId}>
                          <td className="px-4 py-2.5 font-semibold">{formatDateBr(item.appointmentDate)}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">{item.clientName}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-600">{item.serviceName}</td>
                          <td className="px-4 py-2.5 text-right font-bold">{formatCurrency(item.serviceValue)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#0f4c5c]">{formatCurrency(item.commissionValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Data do pagamento
                  </span>
                  <input
                    type="date"
                    value={commissionPaidAt}
                    onChange={(event) => setCommissionPaidAt(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Forma de pagamento
                  </span>
                  <select
                    value={commissionPaymentType}
                    onChange={(event) =>
                      setCommissionPaymentType(event.target.value as PaymentType)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Extra
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(commissionExtraValue)}
                    onChange={(event) =>
                      setCommissionExtraValue(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Desconto
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(commissionDiscountValue)}
                    onChange={(event) =>
                      setCommissionDiscountValue(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>
              </div>

              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Observações
                </span>
                <textarea
                  value={commissionNotes}
                  onChange={(event) => setCommissionNotes(event.target.value)}
                  rows={3}
                  placeholder="Ex.: bônus, ajuste de faltas ou adiantamento."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <div className="mt-4 rounded-2xl border border-[#0f4c5c]/25 bg-[#0f4c5c]/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-black uppercase text-[#0f4c5c]">
                    Total a pagar
                  </span>
                  <strong className="text-xl font-black text-[#0f4c5c]">
                    {formatCurrency(commissionAmountToPay)}
                  </strong>
                </div>

                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  Comissão + extra - desconto.
                </p>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetCommissionPaymentForm}
                  disabled={isSavingCommissionPayment}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCommissionPayment}
                  disabled={isSavingCommissionPayment}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCommissionPayment
                    ? 'Salvando pagamento...'
                    : 'Confirmar pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {commissionFeedback && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#E0A96D]" />

            <div className="p-5">
              <h2 className="text-lg font-black text-slate-950">
                {commissionFeedback.title}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                {commissionFeedback.message}
              </p>

              <div className="mt-5 flex justify-end gap-2">
                {pendingCommissionPrintHtml && (
                  <button
                    type="button"
                    onClick={handlePrintSavedCommissionPayment}
                    className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-sm font-black text-white hover:bg-[#123945]"
                  >
                    Imprimir comprovante
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCommissionFeedback(null);
                    setPendingCommissionPrintHtml('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
