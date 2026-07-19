import React from 'react';
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { PaymentType } from '../../../types';
import {
  ExpensePaymentRecord,
  ExpenseTemplateRecord
} from './useFinanceViewModel';

interface FinanceExpensesViewProps {
  context: Record<string, any>;
}

interface ExpenseRow {
  template: ExpenseTemplateRecord;
  payment?: ExpensePaymentRecord;
  dueDate: string;
}

export default function FinanceExpensesView({ context }: FinanceExpensesViewProps) {
  const {
    activeFinanceTab,
    competenceMonth,
    editingExpensePayment,
    editingExpenseTemplate,
    expenseDescription,
    expenseDiscountValue,
    expenseDueDate,
    expenseDueDay,
    expenseExpectedAmount,
    expenseFeedback,
    expenseFineValue,
    expenseInterestValue,
    expenseIsMonthly,
    expensePaidAt,
    expensePaymentNotes,
    expensePaymentToDelete,
    expensePaymentTotal,
    expensePaymentType,
    expenseRows,
    expenseTemplateNotes,
    expenseTemplateToDelete,
    expenseToPay,
    formatCurrency,
    formatCurrencyInput,
    formatDateBr,
    handleConfirmDeleteExpensePayment,
    handleConfirmDeleteExpenseTemplate,
    handleConfirmExpensePayment,
    handleConfirmExpensePaymentUpdate,
    handleOpenEditExpensePayment,
    handleOpenEditExpenseTemplate,
    handleOpenExpensePayment,
    handleSaveExpenseTemplate,
    isDeletingExpensePayment,
    isDeletingExpenseTemplate,
    isPayingExpense,
    isSavingExpenseTemplate,
    isUpdatingExpensePayment,
    parseCurrencyInput,
    resetExpensePaymentForm,
    resetExpenseTemplateForm,
    setEditingExpensePayment,
    setExpenseDescription,
    setExpenseDiscountValue,
    setExpenseDueDate,
    setExpenseDueDay,
    setExpenseExpectedAmount,
    setExpenseFeedback,
    setExpenseFineValue,
    setExpenseInterestValue,
    setExpenseIsMonthly,
    setExpensePaidAt,
    setExpensePaymentNotes,
    setExpensePaymentToDelete,
    setExpensePaymentType,
    setExpenseTemplateNotes,
    setExpenseTemplateToDelete,
    showExpenseTemplateModal,
    PanelCard
  } = context;



  return (
    <>
      {activeFinanceTab === 'despesas' && (
        <PanelCard title="Despesas do Mês">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Despesa</th>
                  <th className="px-4 py-3.5 text-right">Valor previsto</th>
                  <th className="px-4 py-3.5 text-center">Vencimento</th>
                  <th className="px-4 py-3.5 text-center">Recorrência</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5">Observações</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(expenseRows as ExpenseRow[]).map(({ template, payment, dueDate }) => {
                  const isPaid = payment?.status === 'paid';

                  return (
                    <tr key={template.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-black text-slate-900">
                        {template.description}
                      </td>

                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(template.expectedAmount)}
                      </td>

                      <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                        {dueDate
                          ? formatDateBr(dueDate)
                          : 'Sem vencimento'}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                          template.isMonthly
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {template.isMonthly ? 'Mensal' : 'Avulsa'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {isPaid ? 'Paga' : 'Pendente'}
                        </span>
                      </td>

                      <td className="max-w-xs px-4 py-3.5 font-semibold text-slate-500">
                        {template.notes || '-'}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (isPaid && payment) {
                                handleOpenEditExpensePayment(payment);
                                return;
                              }

                              handleOpenEditExpenseTemplate(template);
                            }}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                            title={isPaid ? 'Alterar pagamento' : 'Alterar cadastro'}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isPaid && payment) {
                                setExpensePaymentToDelete(payment);
                                return;
                              }

                              setExpenseTemplateToDelete(template);
                            }}
                            className="rounded-xl border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                            title={isPaid ? 'Excluir lançamento pago' : 'Excluir cadastro'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          {isPaid ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (payment) {
                                  handleOpenEditExpensePayment(payment);
                                }
                              }}
                              className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              PAGA
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenExpensePayment(template)}
                              className="rounded-xl bg-[#0f4c5c] px-3 py-2 text-[10px] font-black text-white hover:bg-[#123945]"
                            >
                              PAGAR
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {expenseRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Nenhuma despesa cadastrada para este mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PanelCard>
      )}

      {showExpenseTemplateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#0f4c5c]" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
                    Despesas
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {editingExpenseTemplate
                      ? 'Alterar despesa'
                      : 'Incluir despesa'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={resetExpenseTemplateForm}
                  disabled={isSavingExpenseTemplate}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Descrição
                  </span>
                  <input
                    type="text"
                    value={expenseDescription}
                    onChange={(event) =>
                      setExpenseDescription(event.target.value.toUpperCase())
                    }
                    placeholder="Ex.: ENERGIA"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Valor previsto
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(expenseExpectedAmount)}
                    onChange={(event) =>
                      setExpenseExpectedAmount(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                {expenseIsMonthly ? (
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Dia do vencimento
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={expenseDueDay}
                      onChange={(event) => setExpenseDueDay(event.target.value)}
                      placeholder="Ex.: 10"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                    />
                  </label>
                ) : (
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Data da despesa
                    </span>
                    <input
                      type="date"
                      value={expenseDueDate}
                      onChange={(event) => setExpenseDueDate(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                    />
                  </label>
                )}
              </div>

              <label className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={expenseIsMonthly}
                  onChange={(event) => {
                    const nextIsMonthly = event.target.checked;
                    setExpenseIsMonthly(nextIsMonthly);

                    if (nextIsMonthly) {
                      setExpenseDueDate('');
                    } else {
                      setExpenseDueDay('');
                    }
                  }}
                  className="h-4 w-4 accent-[#0f4c5c]"
                />
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Repetir mensalmente
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    A despesa será preparada automaticamente nos próximos meses.
                  </p>
                </div>
              </label>

              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Observações
                </span>
                <textarea
                  value={expenseTemplateNotes}
                  onChange={(event) =>
                    setExpenseTemplateNotes(event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetExpenseTemplateForm}
                  disabled={isSavingExpenseTemplate}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveExpenseTemplate}
                  disabled={isSavingExpenseTemplate}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:opacity-60"
                >
                  {isSavingExpenseTemplate ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expenseToPay && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#0f4c5c]" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
                    Pagamento de despesa
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {expenseToPay.description}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Competência {formatDateBr(competenceMonth)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetExpensePaymentForm}
                  disabled={isPayingExpense}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Data do pagamento
                  </span>
                  <input
                    type="date"
                    value={expensePaidAt}
                    onChange={(event) => setExpensePaidAt(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Forma de pagamento
                  </span>
                  <select
                    value={expensePaymentType}
                    onChange={(event) =>
                      setExpensePaymentType(event.target.value as PaymentType)
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
                    Valor previsto
                  </span>
                  <input
                    type="text"
                    value={formatCurrencyInput(expenseToPay.expectedAmount)}
                    disabled
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-500"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Juros
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(expenseInterestValue)}
                    onChange={(event) =>
                      setExpenseInterestValue(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Multa
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(expenseFineValue)}
                    onChange={(event) =>
                      setExpenseFineValue(
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
                    value={formatCurrencyInput(expenseDiscountValue)}
                    onChange={(event) =>
                      setExpenseDiscountValue(
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
                  value={expensePaymentNotes}
                  onChange={(event) =>
                    setExpensePaymentNotes(event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <div className="mt-4 rounded-2xl border border-[#0f4c5c]/25 bg-[#0f4c5c]/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-black uppercase text-[#0f4c5c]">
                    Total a pagar
                  </span>
                  <strong className="text-xl font-black text-[#0f4c5c]">
                    {formatCurrency(expensePaymentTotal)}
                  </strong>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  Valor previsto + juros + multa - desconto.
                </p>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetExpensePaymentForm}
                  disabled={isPayingExpense}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmExpensePayment}
                  disabled={isPayingExpense}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:opacity-60"
                >
                  {isPayingExpense ? 'Salvando...' : 'Confirmar pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingExpensePayment && (
        <div className="fixed inset-0 z-[128] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-emerald-600" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                    Despesa paga
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {editingExpensePayment.description}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Competência {formatDateBr(editingExpensePayment.competenceMonth)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingExpensePayment(null);
                    resetExpensePaymentForm();
                  }}
                  disabled={isUpdatingExpensePayment}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Data do pagamento
                  </span>
                  <input
                    type="date"
                    value={expensePaidAt}
                    onChange={(event) => setExpensePaidAt(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Forma de pagamento
                  </span>
                  <select
                    value={expensePaymentType}
                    onChange={(event) =>
                      setExpensePaymentType(event.target.value as PaymentType)
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
                    Valor previsto
                  </span>
                  <input
                    type="text"
                    value={formatCurrencyInput(editingExpensePayment.expectedAmount)}
                    disabled
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-500"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Juros
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(expenseInterestValue)}
                    onChange={(event) =>
                      setExpenseInterestValue(parseCurrencyInput(event.target.value))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Multa
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(expenseFineValue)}
                    onChange={(event) =>
                      setExpenseFineValue(parseCurrencyInput(event.target.value))
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
                    value={formatCurrencyInput(expenseDiscountValue)}
                    onChange={(event) =>
                      setExpenseDiscountValue(parseCurrencyInput(event.target.value))
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
                  value={expensePaymentNotes}
                  onChange={(event) => setExpensePaymentNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-black uppercase text-emerald-700">
                    Total atualizado
                  </span>
                  <strong className="text-xl font-black text-emerald-700">
                    {formatCurrency(
                      Math.max(
                        0,
                        editingExpensePayment.expectedAmount +
                          expenseInterestValue +
                          expenseFineValue -
                          expenseDiscountValue
                      )
                    )}
                  </strong>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingExpensePayment(null);
                    resetExpensePaymentForm();
                  }}
                  disabled={isUpdatingExpensePayment}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmExpensePaymentUpdate}
                  disabled={isUpdatingExpensePayment}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:opacity-60"
                >
                  {isUpdatingExpensePayment ? 'Salvando...' : 'Salvar alteração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expensePaymentToDelete && (
        <div className="fixed inset-0 z-[132] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-red-600" />

            <div className="p-5">
              <h2 className="text-lg font-black text-slate-950">
                Excluir lançamento pago?
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                O pagamento de “{expensePaymentToDelete.description}” será excluído e retirado dos relatórios financeiros.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExpensePaymentToDelete(null)}
                  disabled={isDeletingExpensePayment}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeleteExpensePayment}
                  disabled={isDeletingExpensePayment}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeletingExpensePayment ? 'Excluindo...' : 'Excluir lançamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expenseTemplateToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-red-500" />

            <div className="p-5">
              <h2 className="text-lg font-black text-slate-950">
                Excluir despesa?
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                O cadastro “{expenseTemplateToDelete.description}” será removido.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseTemplateToDelete(null)}
                  disabled={isDeletingExpenseTemplate}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeleteExpenseTemplate}
                  disabled={isDeletingExpenseTemplate}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeletingExpenseTemplate ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expenseFeedback && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#E0A96D]" />
            <div className="p-5">
              <h2 className="text-lg font-black text-slate-950">
                {expenseFeedback.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                {expenseFeedback.message}
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setExpenseFeedback(null)}
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
