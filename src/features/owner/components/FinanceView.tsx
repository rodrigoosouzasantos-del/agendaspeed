/**
 * Tela Financeira do Painel do Dono - AgendaSpeed.
 *
 * Responsável por:
 * - analisar faturamento do período;
 * - analisar comissões da equipe;
 * - emitir relatório de livro caixa apenas com dinheiro;
 * - manter visual padronizado em azul petróleo.
 */

import React, {
  useMemo,
  useState
} from 'react';

import {
  ArrowLeft,
  BarChart3,
  Coins,
  Filter,
  Printer,
  WalletCards
} from 'lucide-react';

import {
  Appointment,
  CashExpense,
  Professional,
  Service
} from '../../../types';

import {
  calculateProfessionalCommission,
  calculateProfessionalGrossRevenue,
  countProfessionalCompletedAppointments,
  formatCurrency,
  getPaymentLabel,
  getRemunerationLabel
} from '../owner.utils';

type FinanceInternalTab = 'faturamento' | 'comissoes' | 'livroCaixa';

interface FinanceViewProps {
  professionals: Professional[];
  services: Service[];
  completedAppointments: Appointment[];
  cashExpenses: CashExpense[];
  companyName: string;
  companyAddress: string;
  companyPhone: string;
}

interface FinancePeriod {
  startDate: string;
  endDate: string;
}

interface CashBookRow {
  date: string;
  type: 'recebimento' | 'despesa';
  description: string;
  value: number;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function formatLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}

function getCurrentMonthPeriod(): FinancePeriod {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    startDate: formatLocalDateStr(startDate),
    endDate: formatLocalDateStr(endDate)
  };
}

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

function formatEmissionDate(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date());
}

function getAppointmentDateStr(dateTime: string): string {
  if (!dateTime || !dateTime.includes('T')) {
    return '';
  }

  return dateTime.split('T')[0];
}

function getCashBookStorageKey(period: FinancePeriod): string {
  const monthKey = period.startDate.slice(0, 7) || 'geral';

  return `agendaspeed-cashbook-initial-balance-${monthKey}`;
}

function parseCurrencyInput(value: string): number {
  const onlyNumbers = value.replace(/\D/g, '');

  if (!onlyNumbers) {
    return 0;
  }

  return Number(onlyNumbers) / 100;
}

function formatCurrencyInput(value: number): string {
  return formatCurrency(Number(value) || 0);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getServiceName(
  services: Service[],
  serviceId: string
): string {
  const service = services.find((item) => item.id === serviceId);

  return service?.name || 'Serviço personalizado';
}

function buildEstablishmentPrintHeader(params: {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  reportTitle: string;
  period: FinancePeriod;
}) {
  const {
    companyName,
    companyAddress,
    companyPhone,
    reportTitle,
    period
  } = params;

  return `
    <div class="header">
      <h1>${escapeHtml(companyName || 'AgendaSpeed')}</h1>
      ${companyAddress ? `<p>Endereço: ${escapeHtml(companyAddress)}</p>` : ''}
      ${companyPhone ? `<p>Telefone: ${escapeHtml(companyPhone)}</p>` : ''}
      <h2>${escapeHtml(reportTitle)}</h2>
      <p>Período: ${formatDateBr(period.startDate)} a ${formatDateBr(period.endDate)}</p>
      <p>Data da emissão: ${formatEmissionDate()}</p>
    </div>
  `;
}

function buildPrintWindow(params: {
  title: string;
  body: string;
  thermal?: boolean;
}) {
  const { title, body, thermal = false } = params;

  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
    return;
  }

  const width = thermal ? '80mm' : '210mm';
  const fontSize = thermal ? '11px' : '12px';
  const pageSize = thermal ? '80mm auto' : 'A4';
  const margin = thermal ? '4mm' : '14mm';

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${pageSize};
            margin: ${margin};
          }

          * {
            box-sizing: border-box;
          }

          body {
            width: ${width};
            margin: 0 auto;
            font-family: Arial, sans-serif;
            color: #111827;
            font-size: ${fontSize};
            background: #fff;
          }

          h1, h2, h3, p {
            margin: 0;
          }

          h1 {
            font-size: 18px;
            text-align: center;
            text-transform: uppercase;
          }

          h2 {
            margin-top: 12px;
            font-size: 15px;
            text-align: center;
            text-transform: uppercase;
          }

          p {
            font-size: 11px;
            color: #475569;
            text-align: center;
            margin-top: 3px;
          }

          .header {
            border-bottom: 2px solid #0f4c5c;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 5px;
            text-align: left;
            vertical-align: top;
          }

          th {
            font-size: 10px;
            text-transform: uppercase;
            background: #0f4c5c;
            color: #fff;
          }

          .right {
            text-align: right;
          }

          .negative {
            color: #b91c1c;
            font-weight: 700;
          }

          .positive {
            color: #0f4c5c;
            font-weight: 700;
          }

          .summary {
            margin-top: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 700;
          }

          .summary-row:last-child {
            border-bottom: none;
            background: #f8fafc;
            color: #0f4c5c;
            font-size: 14px;
          }
        </style>
      </head>

      <body>
        ${body}
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 350);
}

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

export default function FinanceView({
  professionals,
  services,
  completedAppointments,
  cashExpenses,
  companyName,
  companyAddress,
  companyPhone
}: FinanceViewProps) {
  const initialPeriod = useMemo(() => {
    return getCurrentMonthPeriod();
  }, []);

  const [activeFinanceTab, setActiveFinanceTab] =
    useState<FinanceInternalTab | null>(null);

  const [period, setPeriod] =
    useState<FinancePeriod>(initialPeriod);

  const [draftPeriod, setDraftPeriod] =
    useState<FinancePeriod>(initialPeriod);

  const [initialCashBalance, setInitialCashBalance] = useState<number>(() => {
    const storedValue = localStorage.getItem(getCashBookStorageKey(initialPeriod));

    return storedValue ? Number(storedValue) || 0 : 0;
  });

  const isInvalidDraftPeriod =
    Boolean(draftPeriod.startDate && draftPeriod.endDate) &&
    draftPeriod.startDate > draftPeriod.endDate;

  const isInvalidPeriod =
    Boolean(period.startDate && period.endDate) &&
    period.startDate > period.endDate;

  const filteredAppointments = useMemo(() => {
    if (isInvalidPeriod) {
      return [];
    }

    return completedAppointments.filter((appointment) => {
      const appointmentDate = getAppointmentDateStr(appointment.dateTime);

      if (!appointmentDate) {
        return false;
      }

      return (
        appointmentDate >= period.startDate &&
        appointmentDate <= period.endDate
      );
    });
  }, [
    completedAppointments,
    isInvalidPeriod,
    period
  ]);

  const filteredCashExpenses = useMemo(() => {
    if (isInvalidPeriod) {
      return [];
    }

    return cashExpenses.filter((expense) => {
      const expenseDate = getAppointmentDateStr(expense.paidAt) || expense.paidAt.slice(0, 10);

      return (
        expense.status === 'paid' &&
        expenseDate >= period.startDate &&
        expenseDate <= period.endDate
      );
    });
  }, [
    cashExpenses,
    isInvalidPeriod,
    period
  ]);

  const totalRevenue = useMemo(() => {
    return filteredAppointments.reduce((sum, appointment) => {
      return sum + appointment.price;
    }, 0);
  }, [filteredAppointments]);

  const totalCommissions = useMemo(() => {
    return filteredAppointments.reduce((sum, appointment) => {
      return sum + appointment.commissionValue;
    }, 0);
  }, [filteredAppointments]);

  const serviceRevenueRows = useMemo(() => {
    const map = new Map<string, {
      serviceId: string;
      serviceName: string;
      quantity: number;
      unitValue: number;
      total: number;
    }>();

    filteredAppointments.forEach((appointment) => {
      const current = map.get(appointment.serviceId);
      const service = services.find((item) => item.id === appointment.serviceId);

      if (current) {
        current.quantity += 1;
        current.total += appointment.price;
        current.unitValue = current.total / current.quantity;
        return;
      }

      map.set(appointment.serviceId, {
        serviceId: appointment.serviceId,
        serviceName: service?.name || 'Serviço personalizado',
        quantity: 1,
        unitValue: service?.price || appointment.price,
        total: appointment.price
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      return a.serviceName.localeCompare(b.serviceName);
    });
  }, [
    filteredAppointments,
    services
  ]);

  const paymentRevenueRows = useMemo(() => {
    const paymentTypes = [
      'pix',
      'dinheiro',
      'credito',
      'debito',
      'cortesia'
    ];

    return paymentTypes.map((paymentType) => {
      const total = filteredAppointments
        .filter((appointment) => appointment.paymentType === paymentType)
        .reduce((sum, appointment) => sum + appointment.price, 0);

      return {
        paymentType,
        total
      };
    });
  }, [filteredAppointments]);

  const professionalRevenueRows = useMemo(() => {
    return professionals
      .map((professional) => {
        const total = filteredAppointments
          .filter((appointment) => appointment.professionalId === professional.id)
          .reduce((sum, appointment) => sum + appointment.price, 0);

        return {
          professional,
          total
        };
      })
      .sort((a, b) => {
        return a.professional.name.localeCompare(b.professional.name);
      });
  }, [
    filteredAppointments,
    professionals
  ]);

  const commissionRows = useMemo(() => {
    return professionals
      .map((professional) => {
        const completedCount = countProfessionalCompletedAppointments({
          professionalId: professional.id,
          completedAppointments: filteredAppointments
        });

        const totalProduced = calculateProfessionalGrossRevenue({
          professionalId: professional.id,
          completedAppointments: filteredAppointments
        });

        const commissionValue = calculateProfessionalCommission({
          professional,
          services,
          completedAppointments: filteredAppointments
        });

        return {
          professional,
          completedCount,
          totalProduced,
          commissionValue
        };
      })
      .sort((a, b) => {
        return a.professional.name.localeCompare(b.professional.name);
      });
  }, [
    filteredAppointments,
    professionals,
    services
  ]);

  const cashBookRows = useMemo<CashBookRow[]>(() => {
    const cashAppointmentRows = filteredAppointments
      .filter((appointment) => appointment.paymentType === 'dinheiro')
      .map((appointment) => ({
        date: getAppointmentDateStr(appointment.dateTime),
        type: 'recebimento' as const,
        description: getServiceName(services, appointment.serviceId),
        value: Number(appointment.price) || 0
      }));

    const cashExpenseRows = filteredCashExpenses
      .filter((expense) => expense.paymentType === 'dinheiro')
      .map((expense) => ({
        date: getAppointmentDateStr(expense.paidAt) || expense.paidAt.slice(0, 10),
        type: 'despesa' as const,
        description: expense.description || 'Despesa manual',
        value: -Math.abs(Number(expense.amount) || 0)
      }));

    return [
      ...cashAppointmentRows,
      ...cashExpenseRows
    ].sort((firstRow, secondRow) => {
      return firstRow.date.localeCompare(secondRow.date);
    });
  }, [
    filteredAppointments,
    filteredCashExpenses,
    services
  ]);

  const cashBookIncomeTotal = useMemo(() => {
    return cashBookRows
      .filter((row) => row.type === 'recebimento')
      .reduce((sum, row) => sum + row.value, 0);
  }, [cashBookRows]);

  const cashBookExpenseTotal = useMemo(() => {
    return cashBookRows
      .filter((row) => row.type === 'despesa')
      .reduce((sum, row) => sum + Math.abs(row.value), 0);
  }, [cashBookRows]);

  const cashBookFinalBalance =
    initialCashBalance + cashBookIncomeTotal - cashBookExpenseTotal;

  const handleChangeStartDate = (startDate: string) => {
    setDraftPeriod((currentPeriod) => ({
      ...currentPeriod,
      startDate
    }));
  };

  const handleChangeEndDate = (endDate: string) => {
    setDraftPeriod((currentPeriod) => ({
      ...currentPeriod,
      endDate
    }));
  };

  const handleApplyPeriodFilter = () => {
    if (isInvalidDraftPeriod) {
      return;
    }

    setPeriod(draftPeriod);

    const nextStoredValue =
      localStorage.getItem(getCashBookStorageKey(draftPeriod));

    setInitialCashBalance(nextStoredValue ? Number(nextStoredValue) || 0 : 0);
  };

  const handleChangeInitialCashBalance = (value: string) => {
    const parsedValue = parseCurrencyInput(value);

    setInitialCashBalance(parsedValue);
    localStorage.setItem(getCashBookStorageKey(period), String(parsedValue));
  };

  const handlePrintCommissionsA4 = () => {
    const rowsHtml = commissionRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.professional.name)}</td>
          <td>${escapeHtml(getRemunerationLabel(row.professional))}</td>
          <td class="right">${row.completedCount}</td>
          <td class="right">${formatCurrency(row.totalProduced)}</td>
          <td class="right">${formatCurrency(row.commissionValue)}</td>
        </tr>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Relatório de Comissões',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Comissões',
          period
        })}

        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Remuneração</th>
              <th class="right">Atendimento</th>
              <th class="right">Faturamento</th>
              <th class="right">Comissão</th>
            </tr>
          </thead>

          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `
    });
  };

  const handlePrintCommissionsThermal = () => {
    const rowsHtml = commissionRows.map((row) => {
      return `
        <div style="border-bottom:1px dashed #999;padding:7px 0;">
          <strong>${escapeHtml(row.professional.name)}</strong><br />
          Atend.: ${row.completedCount}<br />
          Prod.: ${formatCurrency(row.totalProduced)}<br />
          Comissão: ${formatCurrency(row.commissionValue)}
        </div>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Filipeta de Comissões',
      thermal: true,
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Comissões',
          period
        })}

        ${rowsHtml}
      `
    });
  };

  const handlePrintProfessionalCommission = (
    row: {
      professional: Professional;
      completedCount: number;
      totalProduced: number;
      commissionValue: number;
    }
  ) => {
    buildPrintWindow({
      title: `Fechamento - ${row.professional.name}`,
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Fechamento de Comissão',
          period
        })}

        <table>
          <tbody>
            <tr>
              <th>Profissional</th>
              <td>${escapeHtml(row.professional.name)}</td>
            </tr>
            <tr>
              <th>Remuneração</th>
              <td>${escapeHtml(getRemunerationLabel(row.professional))}</td>
            </tr>
            <tr>
              <th>Atendimento</th>
              <td>${row.completedCount}</td>
            </tr>
            <tr>
              <th>Faturamento</th>
              <td>${formatCurrency(row.totalProduced)}</td>
            </tr>
            <tr>
              <th>Comissão devida</th>
              <td>${formatCurrency(row.commissionValue)}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Recebi o valor de comissão acima informado.</span>
          </div>
          <div class="summary-row">
            <span>Assinatura: ______________________________</span>
          </div>
          <div class="summary-row">
            <span>Data: ____/____/________</span>
          </div>
        </div>
      `
    });
  };

  const handlePrintCashBook = () => {
    const rowsHtml = cashBookRows.map((row) => {
      const formattedValue =
        row.type === 'despesa'
          ? `-${formatCurrency(Math.abs(row.value)).replace('R$', '').trim()}`
          : formatCurrency(row.value);

      return `
        <tr>
          <td>${formatDateBr(row.date)}</td>
          <td>${row.type === 'despesa' ? 'Despesa' : 'Recebimento'}</td>
          <td>${escapeHtml(row.description)}</td>
          <td class="right ${row.type === 'despesa' ? 'negative' : 'positive'}">${formattedValue}</td>
        </tr>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Livro Caixa',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Livro Caixa - Dinheiro',
          period
        })}

        <div class="summary">
          <div class="summary-row">
            <span>Saldo inicial</span>
            <span>${formatCurrency(initialCashBalance)}</span>
          </div>
          <div class="summary-row">
            <span>Entradas em dinheiro</span>
            <span>${formatCurrency(cashBookIncomeTotal)}</span>
          </div>
          <div class="summary-row">
            <span>Saídas em dinheiro</span>
            <span class="negative">-${formatCurrency(cashBookExpenseTotal).replace('R$', '').trim()}</span>
          </div>
          <div class="summary-row">
            <span>Saldo final</span>
            <span>${formatCurrency(cashBookFinalBalance)}</span>
          </div>
        </div>

        <br />

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição do Serviço</th>
              <th class="right">Valor</th>
            </tr>
          </thead>

          <tbody>
            ${rowsHtml || '<tr><td colspan="4" style="text-align:center;color:#64748b;">Nenhuma movimentação em dinheiro no período.</td></tr>'}
          </tbody>
        </table>
      `
    });
  };

  const renderFinanceOption = (params: {
    tab: FinanceInternalTab;
    title: string;
    description: string;
    icon: React.ReactNode;
  }) => {
    const { tab, title, description, icon } = params;

    return (
      <button
        type="button"
        onClick={() => setActiveFinanceTab(tab)}
        className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#0f4c5c]/40 hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0f4c5c]/10 text-[#0f4c5c]">
            {icon}
          </span>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0f4c5c]">
              Relatório
            </p>

            <h3 className="mt-1 text-base font-black text-neutral-950">
              {title}
            </h3>

            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
              {description}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const renderTableHeader = (title: string) => (
    <div className="bg-[#0f4c5c] px-4 py-3 text-white">
      <h3 className="text-sm font-black uppercase tracking-tight">
        {title}
      </h3>
    </div>
  );

  return (
    <div id="view-financeiro" className="space-y-3 text-left animate-none">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AGENDASPEED
            </p>

            <h2 className="text-lg font-black tracking-tight text-neutral-950">
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
            tab: 'livroCaixa',
            title: 'Livro Caixa',
            description: 'Relatório simples apenas com entradas e saídas em dinheiro, com saldo inicial.',
            icon: <WalletCards className="h-5 w-5" />
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
                disabled={isInvalidDraftPeriod}
                className={`h-10 rounded-xl px-4 text-xs font-black transition flex items-center justify-center gap-2 ${
                  isInvalidDraftPeriod
                    ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                    : 'bg-[#0f4c5c] text-white hover:bg-[#123945]'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filtrar
              </button>
            </div>

            {activeFinanceTab === 'comissoes' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePrintCommissionsThermal}
                  className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#123945]"
                >
                  Imprimir Filipeta
                </button>

                <button
                  type="button"
                  onClick={handlePrintCommissionsA4}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-slate-50"
                >
                  Imprimir A4
                </button>
              </div>
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
                  Imprimir Livro Caixa
                </button>
              </div>
            )}
          </div>

          {isInvalidDraftPeriod && (
            <p className="px-4 pb-3 text-xs font-bold text-red-600">
              A data inicial não pode ser maior que a data final.
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
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {serviceRevenueRows.map((row) => (
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
                    </tr>
                  ))}

                  {serviceRevenueRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Nenhum atendimento finalizado neste período.
                      </td>
                    </tr>
                  )}

                  <tr className="bg-slate-50">
                    <td colSpan={3} className="px-4 py-3.5 text-right font-black uppercase">
                      Total
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                      {formatCurrency(totalRevenue)}
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
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paymentRevenueRows.map((row) => (
                      <tr key={row.paymentType}>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {getPaymentLabel(row.paymentType)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50">
                      <td className="px-4 py-3.5 text-right font-black uppercase">Total</td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(totalRevenue)}
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
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {professionalRevenueRows.map((row) => (
                      <tr key={row.professional.id}>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {row.professional.name}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50">
                      <td className="px-4 py-3.5 text-right font-black uppercase">Total</td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(totalRevenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </PanelCard>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
              Resumo do período
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Faturamento
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalRevenue)}
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
                  Líquido
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalRevenue - totalCommissions)}
                </p>
              </div>
            </div>
          </div>
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

          <PanelCard title="Livro Caixa - Dinheiro">
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
                  {cashBookRows.map((row, index) => (
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

      {activeFinanceTab === 'comissoes' && (
        <PanelCard title="Comissões da Equipe">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Colaborador</th>
                  <th className="px-4 py-3.5">Remuneração</th>
                  <th className="px-4 py-3.5 text-center">Atendimento</th>
                  <th className="px-4 py-3.5 text-right">Faturamento</th>
                  <th className="px-4 py-3.5 text-right">Comissão Devida</th>
                  <th className="px-4 py-3.5 text-right">Fechamento</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {commissionRows.map((row) => (
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

                    <td className="px-4 py-4 text-right font-bold text-slate-950">
                      {formatCurrency(row.totalProduced)}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-[#0f4c5c]">
                      {formatCurrency(row.commissionValue)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handlePrintProfessionalCommission(row)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-slate-50"
                      >
                        Imprimir
                      </button>
                    </td>
                  </tr>
                ))}

                {professionals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Nenhum profissional cadastrado para cálculo de comissões.
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-50">
                  <td colSpan={3} className="px-4 py-3.5 text-right font-black uppercase">
                    Total
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                    {formatCurrency(totalCommissions)}
                  </td>
                  <td className="px-4 py-3.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </PanelCard>
      )}
    </div>
  );
}
