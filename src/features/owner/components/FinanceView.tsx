/**
 * Coordenador da área financeira do Painel do Dono - AgendaBless.
 *
 * A lógica financeira permanece separada no useFinanceViewModel,
 * enquanto cada módulo visual é renderizado pelo seu componente.
 */

import React from 'react';

import FinanceReportsView from '../finance/FinanceReportsView';
import FinanceExpensesView from '../finance/FinanceExpensesView';
import FinanceCommissionsView from '../finance/FinanceCommissionsView';

import {
  FinanceViewProps,
  useFinanceViewModel
} from '../finance/useFinanceViewModel';

export type {
  CommissionPaymentPayload,
  CommissionPaymentRecord,
  ExpensePaymentPayload,
  ExpensePaymentRecord,
  ExpensePaymentUpdatePayload,
  ExpenseTemplatePayload,
  ExpenseTemplateRecord
} from '../finance/useFinanceViewModel';

function PanelCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#0f4c5c] px-4 py-3 text-white">
        <h3 className="text-sm font-black uppercase tracking-tight">
          {title}
        </h3>
      </div>

      {children}
    </div>
  );
}

export default function FinanceView(props: FinanceViewProps) {
  const viewModel = useFinanceViewModel(props);

  const context = {
    ...viewModel,
    PanelCard
  };

  return (
    <div
      id="view-financeiro"
      className="space-y-3 text-left animate-none"
    >
      <FinanceReportsView context={context} />
      <FinanceExpensesView context={context} />
      <FinanceCommissionsView context={context} />
    </div>
  );
}
