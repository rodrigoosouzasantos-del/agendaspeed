import React from 'react';
import { ArrowLeft, ArrowUpDown, BarChart3, Coins, FileText, Filter, Plus, Printer, WalletCards } from 'lucide-react';

interface FinanceReportsViewProps {
  context: Record<string, any>;
}

export default function FinanceReportsView({ context }: FinanceReportsViewProps) {
  const {
    activeFinanceTab,
    cashBookExpenseTotal,
    cashBookFinalBalance,
    cashBookIncomeTotal,
    cashBookRows,
    draftPeriod,
    financialMovementBalance,
    financialMovementExpenseTotal,
    financialMovementIncomeTotal,
    financialMovementPaymentTotals,
    financialMovementRows,
    formatCurrency,
    formatCurrencyInput,
    formatDateBr,
    getPaymentLabel,
    handleApplyPeriodFilter,
    handleChangeEndDate,
    handleChangeInitialCashBalance,
    handleChangeStartDate,
    handleOpenNewExpenseTemplate,
    handlePrintCashBook,
    handlePrintFinancialMovement,
    handlePrintRevenueReport,
    initialCashBalance,
    isDraftPeriodTooLong,
    isInvalidDraftPeriod,
    paymentRevenueRows,
    productRevenueRows,
    professionalRevenueRows,
    serviceRevenueRows,
    setActiveFinanceTab,
    totalCommissions,
    totalGrossRevenue,
    totalProductsRevenue,
    totalRevenue,
    PanelCard
  } = context;

  const renderFinanceOption = ({ tab, title, description, icon }: any) => (
    <button
      type="button"
      onClick={() => setActiveFinanceTab(tab)}
      className="min-h-[190px] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#0f4c5c]/40 hover:shadow-md"
    >
      <div className="flex h-full items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0f4c5c]/10 text-[#0f4c5c]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0f4c5c]">Relatório</p>
          <h3 className="mt-1 min-h-[48px] text-[15px] font-semibold leading-6 text-neutral-950">{title}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </button>
  );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AgendaBless
            </p>

            <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
              Financeiro
            </h2>
          </div>

          {activeFinanceTab && (
            <button
              type="button"
              onClick={() => setActiveFinanceTab(null)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#0f4c5c]/40 hover:bg-slate-50 sm:w-max flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4 text-[#0f4c5c]" />
              Voltar para opções
            </button>
          )}
        </div>
      </div>

      {!activeFinanceTab && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {renderFinanceOption({
            tab: 'faturamento',
            title: 'Faturamento',
            description: 'Analise serviços, formas de pagamento, produção por colaborador e resumo do período.',
            icon: <BarChart3 className="h-5 w-5" />
          })}

          {renderFinanceOption({
            tab: 'comissoes',
            title: 'Comissões',
            description: 'Consulte comissões por profissional e imprima fechamento individual ou geral.',
            icon: <Coins className="h-5 w-5" />
          })}

          {renderFinanceOption({
            tab: 'movimentacao',
            title: 'Movimentação',
            description: 'Entradas e saídas por dinheiro, PIX, débito, crédito e cortesia.',
            icon: <ArrowUpDown className="h-5 w-5" />
          })}

          {renderFinanceOption({
            tab: 'livroCaixa',
            title: 'Livro Caixa',
            description: 'Controle do caixa físico, somente com entradas e saídas em dinheiro.',
            icon: <WalletCards className="h-5 w-5" />
          })}

          {renderFinanceOption({
            tab: 'despesas',
            title: 'Despesas',
            description: 'Cadastre despesas fixas ou avulsas, vencimentos e pagamentos.',
            icon: <FileText className="h-5 w-5" />
          })}
        </div>
      )}

      {activeFinanceTab && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Data inicial
                </span>

                <input
                  type="date"
                  value={draftPeriod.startDate}
                  onChange={(event) => handleChangeStartDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-[#0f4c5c] sm:w-44"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Data final
                </span>

                <input
                  type="date"
                  value={draftPeriod.endDate}
                  onChange={(event) => handleChangeEndDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-[#0f4c5c] sm:w-44"
                />
              </label>

              <button
                type="button"
                onClick={handleApplyPeriodFilter}
                disabled={isInvalidDraftPeriod || isDraftPeriodTooLong}
                className={`h-10 rounded-xl px-4 text-xs font-black transition flex items-center justify-center gap-2 ${
                  isInvalidDraftPeriod || isDraftPeriodTooLong
                    ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                    : 'bg-[#0f4c5c] text-white hover:bg-[#123945]'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filtrar
              </button>
            </div>

            {activeFinanceTab === 'faturamento' && (
              <button
                type="button"
                onClick={handlePrintRevenueReport}
                className="h-10 rounded-xl bg-[#0f4c5c] px-4 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir Faturamento
              </button>
            )}

      {activeFinanceTab === 'despesas' && (
              <button
                type="button"
                onClick={handleOpenNewExpenseTemplate}
                className="h-10 rounded-xl bg-[#0f4c5c] px-4 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                INCLUIR DESPESA
              </button>
            )}

            {activeFinanceTab === 'livroCaixa' && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Saldo inicial
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(initialCashBalance)}
                    onChange={(event) => handleChangeInitialCashBalance(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black outline-none focus:border-[#0f4c5c] sm:w-40"
                  />
                </label>

                <button
                  type="button"
                  onClick={handlePrintCashBook}
                  className="h-10 rounded-xl bg-[#0f4c5c] px-4 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Caixa em Dinheiro
                </button>
              </div>
            )}
          </div>

          {isInvalidDraftPeriod && (
            <p className="px-4 pb-3 text-xs font-bold text-red-600">
              A data inicial não pode ser maior que a data final.
            </p>
          )}

          {!isInvalidDraftPeriod && isDraftPeriodTooLong && (
            <p className="px-4 pb-3 text-xs font-bold text-red-600">
              O período máximo permitido é de 31 dias corridos.
            </p>
          )}
        </div>
      )}
      {activeFinanceTab === 'faturamento' && (
        <div className="space-y-3">
          <PanelCard title="Faturamento por Tipo de Serviço">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Serviço</th>
                    <th className="px-4 py-3 text-center">Atendimento</th>
                    <th className="px-4 py-3 text-right">Valor individual</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {serviceRevenueRows.map((row: any) => (
                    <tr key={row.serviceId} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {row.serviceName}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold">
                        {row.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                        {formatCurrency(row.unitValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-700">
                        {row.percentage}%
                      </td>
                    </tr>
                  ))}

                  {serviceRevenueRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum atendimento finalizado neste período.
                      </td>
                    </tr>
                  )}

                  <tr className="bg-slate-50">
                    <td colSpan={3} className="px-4 py-3.5 text-right font-black uppercase">
                      Total de serviços
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                      {formatCurrency(totalRevenue)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-700">
                      100%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </PanelCard>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <PanelCard title="Recebimento por Forma de Pagamento">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Forma</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-right">%</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paymentRevenueRows.map((row: any) => (
                      <tr key={row.paymentType}>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {getPaymentLabel(row.paymentType)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                          {formatCurrency(row.total)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-700">
                          {row.percentage}%
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50">
                      <td className="px-4 py-3.5 text-right font-black uppercase">
                        Total por formas
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(totalRevenue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-700">
                        100%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </PanelCard>

            <PanelCard title="Produzido por Colaborador">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-right">%</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {professionalRevenueRows.map((row: any) => (
                      <tr key={row.professional.id}>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {row.professional.name}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                          {formatCurrency(row.total)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-700">
                          {row.percentage}%
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50">
                      <td className="px-4 py-3.5 text-right font-black uppercase">
                        Total produzido
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(totalRevenue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-700">
                        100%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </PanelCard>
          </div>

          <PanelCard title="Vendas por Produto">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-center">Quantidade</th>
                    <th className="px-4 py-3 text-right">Valor médio</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {productRevenueRows.map((row: any) => (
                    <tr key={row.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {row.description}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold">
                        {row.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                        {formatCurrency(row.unitValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-700">
                        {row.percentage}%
                      </td>
                    </tr>
                  ))}

                  {productRevenueRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum produto vendido neste período.
                      </td>
                    </tr>
                  )}

                  <tr className="bg-slate-50">
                    <td colSpan={3} className="px-4 py-3.5 text-right font-black uppercase">
                      Total vendido em produtos
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                      {formatCurrency(totalProductsRevenue)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-700">
                      {totalProductsRevenue > 0 ? '100%' : '0%'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </PanelCard>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
              Resumo do período
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Serviços
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Produtos
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalProductsRevenue)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#0f4c5c]/30 bg-[#0f4c5c]/5 p-3">
                <span className="text-[10px] font-black uppercase text-[#0f4c5c]">
                  Faturamento bruto total
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalGrossRevenue)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Comissões
                </span>
                <p className="text-lg font-black text-slate-700">
                  {formatCurrency(totalCommissions)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Líquido estimado
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalGrossRevenue - totalCommissions)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeFinanceTab === 'movimentacao' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total de entradas
              </p>
              <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                {formatCurrency(financialMovementIncomeTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total de saídas
              </p>
              <p className="mt-1 text-xl font-black text-red-600">
                -{formatCurrency(financialMovementExpenseTotal).replace('R$', '').trim()}
              </p>
            </div>

            <div className="rounded-2xl border border-[#0f4c5c]/30 bg-[#0f4c5c]/5 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0f4c5c]">
                Saldo do período
              </p>
              <p className={`mt-1 text-xl font-black ${
                financialMovementBalance < 0
                  ? 'text-red-600'
                  : 'text-[#0f4c5c]'
              }`}>
                {formatCurrency(financialMovementBalance)}
              </p>
            </div>
          </div>

          <PanelCard title="Movimentação Financeira">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Forma</th>
                    <th className="px-4 py-3 text-right">Entrada</th>
                    <th className="px-4 py-3 text-right">Saída</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {financialMovementRows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {formatDateBr(row.date)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {row.type === 'despesa'
                          ? 'Saída'
                          : row.type === 'cortesia'
                            ? 'Cortesia'
                            : 'Entrada'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {row.description}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {getPaymentLabel(row.paymentType)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-[#0f4c5c]">
                        {row.entryValue > 0
                          ? formatCurrency(row.entryValue)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-red-600">
                        {row.exitValue > 0
                          ? formatCurrency(row.exitValue)
                          : '-'}
                      </td>
                    </tr>
                  ))}

                  {financialMovementRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma movimentação financeira neste período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PanelCard>

          <PanelCard title="Entradas por Forma de Pagamento">
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-5">
              {financialMovementPaymentTotals.map((row: any) => (
                <div
                  key={row.paymentType}
                  className="border-b border-slate-100 p-4 sm:border-r"
                >
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    {getPaymentLabel(row.paymentType)}
                  </p>
                  <p className="mt-1 text-lg font-black text-[#0f4c5c]">
                    {formatCurrency(row.total)}
                  </p>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      )}

      {activeFinanceTab === 'livroCaixa' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Saldo inicial
              </p>
              <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                {formatCurrency(initialCashBalance)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Entradas dinheiro
              </p>
              <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                {formatCurrency(cashBookIncomeTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Saídas dinheiro
              </p>
              <p className="mt-1 text-xl font-black text-red-600">
                -{formatCurrency(cashBookExpenseTotal).replace('R$', '').trim()}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Saldo final
              </p>
              <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                {formatCurrency(cashBookFinalBalance)}
              </p>
            </div>
          </div>

          <PanelCard title="Livro Caixa — Dinheiro">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Descrição do Serviço</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {cashBookRows.map((row: any, index: number) => (
                    <tr key={`${row.date}-${row.type}-${index}`}>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {formatDateBr(row.date)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {row.type === 'despesa' ? 'Despesa' : 'Recebimento'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {row.description}
                      </td>
                      <td className={`px-4 py-3 text-right font-black ${
                        row.type === 'despesa' ? 'text-red-600' : 'text-[#0f4c5c]'
                      }`}>
                        {row.type === 'despesa'
                          ? `-${formatCurrency(Math.abs(row.value)).replace('R$', '').trim()}`
                          : formatCurrency(row.value)}
                      </td>
                    </tr>
                  ))}

                  {cashBookRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Nenhuma movimentação em dinheiro neste período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </div>
      )}
            {activeFinanceTab === 'movimentacao' && (
              <button
                type="button"
                onClick={handlePrintFinancialMovement}
                className="h-10 rounded-xl bg-[#0f4c5c] px-4 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir Movimentação
              </button>
            )}
    </>
  );
}
