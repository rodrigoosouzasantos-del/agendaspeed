/**
 * Tela Financeira do Painel do Dono - AgendaZap.
 *
 * Responsável por:
 * - dividir a análise entre Faturamento e Comissões;
 * - abrir primeiro uma escolha simples para mobile;
 * - filtrar os dados por período;
 * - exibir faturamento por tipo de serviço;
 * - exibir recebimentos por forma de pagamento;
 * - exibir produção por colaborador;
 * - exibir comissões devidas por colaborador;
 * - imprimir comissões em A4 ou filipeta térmica.
 */

import React, {
  useMemo,
  useState
} from 'react';

import {
  BarChart3,
  Coins
} from 'lucide-react';

import {
  Appointment,
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

type FinanceInternalTab = 'faturamento' | 'comissoes';

interface FinanceViewProps {
  professionals: Professional[];
  services: Service[];
  completedAppointments: Appointment[];
  companyName: string;
  companyAddress: string;
  companyPhone: string;
}

interface FinancePeriod {
  startDate: string;
  endDate: string;
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

function getAppointmentDateStr(dateTime: string): string {
  if (!dateTime || !dateTime.includes('T')) {
    return '';
  }

  return dateTime.split('T')[0];
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
    <div class="header center">
      <h2>${companyName}</h2>
      ${companyAddress ? `<p class="muted">END.: ${companyAddress}</p>` : ''}
      ${companyPhone ? `<p class="muted">TELEFONE: ${companyPhone}</p>` : ''}
      <br />
      <h3>${reportTitle}</h3>
      <p class="muted">Período: ${formatDateBr(period.startDate)} a ${formatDateBr(period.endDate)}</p>
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
        <title>${title}</title>
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
            color: #111;
            font-size: ${fontSize};
            background: #fff;
          }

          h1, h2, h3, p {
            margin: 0;
          }

          .center {
            text-align: center;
          }

          .muted {
            color: #666;
          }

          .header {
            border-bottom: 1px solid #111;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border-bottom: 1px solid #ddd;
            padding: 7px 4px;
            text-align: left;
            vertical-align: top;
          }

          th {
            font-size: 10px;
            text-transform: uppercase;
          }

          .right {
            text-align: right;
          }

          .item {
            border-bottom: 1px dashed #999;
            padding: 8px 0;
          }

          .total {
            margin-top: 10px;
            border-top: 1px solid #111;
            padding-top: 8px;
            font-weight: 700;
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

export default function FinanceView({
  professionals,
  services,
  completedAppointments,
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
  };

  const handlePrintCommissionsA4 = () => {
    const rowsHtml = commissionRows.map((row) => {
      return `
        <tr>
          <td>${row.professional.name}</td>
          <td>${getRemunerationLabel(row.professional)}</td>
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
          reportTitle: 'COMISSÕES',
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
            <tr>
              <td colspan="3" class="right"><strong>Total</strong></td>
              <td class="right"><strong>${formatCurrency(totalRevenue)}</strong></td>
              <td class="right"><strong>${formatCurrency(totalCommissions)}</strong></td>
            </tr>
          </tbody>
        </table>
      `
    });
  };

  const handlePrintCommissionsThermal = () => {
    const rowsHtml = commissionRows.map((row) => {
      return `
        <div class="item">
          <strong>${row.professional.name}</strong><br />
          <span>Atend.: ${row.completedCount}</span><br />
          <span>Fat.: ${formatCurrency(row.totalProduced)}</span><br />
          <span>Comissão: ${formatCurrency(row.commissionValue)}</span>
        </div>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Comissões - Filipeta',
      thermal: true,
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'COMISSÕES',
          period
        })}

        ${rowsHtml}

        <div class="total">
          <p>Total comissão: ${formatCurrency(totalCommissions)}</p>
          <p>Faturamento: ${formatCurrency(totalRevenue)}</p>
        </div>
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
          reportTitle: 'FECHAMENTO DE COMISSÃO',
          period
        })}

        <table>
          <tbody>
            <tr>
              <th>Profissional</th>
              <td>${row.professional.name}</td>
            </tr>
            <tr>
              <th>Remuneração</th>
              <td>${getRemunerationLabel(row.professional)}</td>
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

        <div class="total">
          <p>Recebi o valor de comissão acima informado.</p>
          <br /><br />
          <p>Assinatura: ______________________________</p>
          <br />
          <p>Data: ____/____/________</p>
        </div>
      `
    });
  };

  return (
    <div id="view-financeiro" className="space-y-6 text-left animate-none">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
            Financeiro
          </h2>

          <p className="text-xs text-neutral-500 mt-0.5">
            Escolha o relatório que deseja consultar.
          </p>
        </div>

        {activeFinanceTab && (
          <button
            type="button"
            onClick={() => setActiveFinanceTab(null)}
            className="w-full sm:w-max rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs font-black text-neutral-700 hover:bg-neutral-50 transition"
          >
            Voltar para opções
          </button>
        )}
      </div>

      {!activeFinanceTab && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <button
            type="button"
            onClick={() => setActiveFinanceTab('faturamento')}
            className="min-h-[132px] rounded-2xl border border-blue-800 bg-blue-700 px-6 py-7 text-center transition-colors duration-200 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            <span className="flex h-full flex-col items-center justify-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
                <BarChart3 className="h-6 w-6" />
              </span>

              <span className="text-center text-[15px] font-black uppercase tracking-[0.14em] text-white">
                Faturamento
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFinanceTab('comissoes')}
            className="min-h-[132px] rounded-2xl border border-orange-700 bg-orange-600 px-6 py-7 text-center transition-colors duration-200 hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-500/20"
          >
            <span className="flex h-full flex-col items-center justify-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
                <Coins className="h-6 w-6" />
              </span>

              <span className="text-center text-[15px] font-black uppercase tracking-[0.14em] text-white">
                Comissões
              </span>
            </span>
          </button>
        </div>
      )}

      {activeFinanceTab && (
        <div className="bg-white border rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                  Data inicial
                </span>

                <input
                  type="date"
                  value={draftPeriod.startDate}
                  onChange={(event) => handleChangeStartDate(event.target.value)}
                  className="w-full sm:w-44 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                  Data final
                </span>

                <input
                  type="date"
                  value={draftPeriod.endDate}
                  onChange={(event) => handleChangeEndDate(event.target.value)}
                  className="w-full sm:w-44 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500"
                />
              </label>

              <button
                type="button"
                onClick={handleApplyPeriodFilter}
                disabled={isInvalidDraftPeriod}
                className={`rounded-xl px-4 py-3 text-xs font-black transition ${
                  isInvalidDraftPeriod
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                Filtrar
              </button>
            </div>

            {activeFinanceTab === 'comissoes' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handlePrintCommissionsThermal}
                  className="rounded-xl bg-neutral-950 px-4 py-3 text-xs font-black text-white hover:bg-neutral-800 transition"
                >
                  Imprimir Filipeta
                </button>

                <button
                  type="button"
                  onClick={handlePrintCommissionsA4}
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs font-black text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Imprimir A4
                </button>
              </div>
            )}
          </div>

          {isInvalidDraftPeriod && (
            <p className="text-xs font-bold text-red-600">
              A data inicial não pode ser maior que a data final.
            </p>
          )}
        </div>
      )}

      {activeFinanceTab === 'faturamento' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-3xl shadow-xs overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest font-mono">
                Faturamento por Tipo de Serviço
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-100 border-b text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">
                      Serviço
                    </th>

                    <th className="py-3 px-4 text-center">
                      Atendimento
                    </th>

                    <th className="py-3 px-4 text-right">
                      Valor individual
                    </th>

                    <th className="py-3 px-4 text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {serviceRevenueRows.map((row) => (
                    <tr key={row.serviceId}>
                      <td className="py-3.5 px-4 font-bold text-neutral-900">
                        {row.serviceName}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold">
                        {row.quantity}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {formatCurrency(row.unitValue)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}

                  {serviceRevenueRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-neutral-400"
                      >
                        Nenhum atendimento finalizado neste período.
                      </td>
                    </tr>
                  )}

                  <tr className="bg-neutral-50">
                    <td
                      colSpan={3}
                      className="py-3.5 px-4 text-right font-black uppercase"
                    >
                      Total
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-black">
                      {formatCurrency(totalRevenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border rounded-3xl shadow-xs overflow-hidden">
              <div className="p-5 border-b">
                <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest font-mono">
                  Recebimento por Forma de Pagamento
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 border-b text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">
                        Forma
                      </th>

                      <th className="py-3 px-4 text-right">
                        Valor
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {paymentRevenueRows.map((row) => (
                      <tr key={row.paymentType}>
                        <td className="py-3.5 px-4 font-bold text-neutral-900">
                          {getPaymentLabel(row.paymentType)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-neutral-50">
                      <td className="py-3.5 px-4 text-right font-black uppercase">
                        Total
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black">
                        {formatCurrency(totalRevenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border rounded-3xl shadow-xs overflow-hidden">
              <div className="p-5 border-b">
                <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest font-mono">
                  Produzido por Colaborador
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 border-b text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">
                        Colaborador
                      </th>

                      <th className="py-3 px-4 text-right">
                        Valor
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {professionalRevenueRows.map((row) => (
                      <tr key={row.professional.id}>
                        <td className="py-3.5 px-4 font-bold text-neutral-900">
                          {row.professional.name}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-neutral-50">
                      <td className="py-3.5 px-4 text-right font-black uppercase">
                        Total
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black">
                        {formatCurrency(totalRevenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-neutral-950 text-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-mono">
              Resumo do período
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase">
                  Faturamento
                </span>

                <p className="text-lg font-black">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase">
                  Comissões
                </span>

                <p className="text-lg font-black text-red-300">
                  {formatCurrency(totalCommissions)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase">
                  Líquido
                </span>

                <p className="text-lg font-black">
                  {formatCurrency(totalRevenue - totalCommissions)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeFinanceTab === 'comissoes' && (
        <div className="bg-white border rounded-3xl shadow-xs overflow-hidden">
          <div className="p-5 border-b">
            <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest font-mono">
              Comissões da Equipe
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-100 border-b text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-mono">
                    Colaborador
                  </th>

                  <th className="py-3.5 px-4 font-mono">
                    Remuneração
                  </th>

                  <th className="py-3.5 px-4 font-mono text-center">
                    Atendimento
                  </th>

                  <th className="py-3.5 px-4 font-mono text-right">
                    Faturamento
                  </th>

                  <th className="py-3.5 px-4 font-mono text-right">
                    Comissão Devida
                  </th>

                  <th className="py-3.5 px-4 font-mono text-right">
                    Fechamento
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y font-medium text-neutral-800">
                {commissionRows.map((row) => (
                  <tr
                    id={`row-fin-comm-${row.professional.id}`}
                    key={row.professional.id}
                    className="hover:bg-neutral-50/50 transition"
                  >
                    <td className="py-4 px-4 flex items-center gap-2.5">
                      <img
                        src={row.professional.avatar}
                        alt="foto avatar"
                        className="w-8 h-8 rounded-full border object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />

                      <span className="font-extrabold text-neutral-900">
                        {row.professional.name}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="uppercase text-[9px] font-bold font-mono tracking-wide px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 block w-max">
                        {getRemunerationLabel(row.professional)}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center font-bold">
                      {row.completedCount}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-right text-neutral-950">
                      {formatCurrency(row.totalProduced)}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-right text-red-650">
                      {formatCurrency(row.commissionValue)}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handlePrintProfessionalCommission(row)}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[10px] font-black text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        Imprimir
                      </button>
                    </td>
                  </tr>
                ))}

                {professionals.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-neutral-400"
                    >
                      Nenhum profissional cadastrado para cálculo de comissões.
                    </td>
                  </tr>
                )}

                <tr className="bg-neutral-50">
                  <td
                    colSpan={3}
                    className="py-3.5 px-4 text-right font-black uppercase"
                  >
                    Total
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-black">
                    {formatCurrency(totalRevenue)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-black text-red-650">
                    {formatCurrency(totalCommissions)}
                  </td>

                  <td className="py-3.5 px-4" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
