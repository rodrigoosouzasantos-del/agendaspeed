import React, {
  useMemo,
  useState
} from 'react';

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  ReceiptText,
  TrendingUp
} from 'lucide-react';

import {
  ProfessionalCommissionPaymentRecord,
  ProfessionalReportsViewProps
} from '../professional.types';

import { formatCurrency } from '../professional.utils';

type ProfessionalReportPeriodPreset =
  | 'today'
  | 'week'
  | 'month'
  | 'custom';

interface ProfessionalReportPeriod {
  startDate: string;
  endDate: string;
}

interface SummaryCardProps {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  accent?: 'default' | 'orange' | 'green';
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

function getTodayDateStr(): string {
  return formatLocalDateStr(new Date());
}

function getCurrentWeekPeriod(): ProfessionalReportPeriod {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysSinceMonday);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    startDate: formatLocalDateStr(startDate),
    endDate: formatLocalDateStr(endDate)
  };
}

function getCurrentMonthPeriod(): ProfessionalReportPeriod {
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

function formatDateTimeBr(dateTime: string): string {
  if (!dateTime || !dateTime.includes('T')) {
    return dateTime;
  }

  const [date, time] = dateTime.split('T');

  return `${formatDateBr(date)} ${time}`;
}

function getAppointmentDateStr(dateTime: string): string {
  if (!dateTime || !dateTime.includes('T')) {
    return '';
  }

  return dateTime.split('T')[0];
}

function getPeriodLabel(period: ProfessionalReportPeriod): string {
  return `${formatDateBr(period.startDate)} até ${formatDateBr(period.endDate)}`;
}

function getPeriodByPreset(
  preset: ProfessionalReportPeriodPreset
): ProfessionalReportPeriod {
  if (preset === 'today') {
    const today = getTodayDateStr();

    return {
      startDate: today,
      endDate: today
    };
  }

  if (preset === 'month') {
    return getCurrentMonthPeriod();
  }

  return getCurrentWeekPeriod();
}

function getPaymentTypeLabel(
  paymentType: ProfessionalCommissionPaymentRecord['paymentType']
): string {
  const labels: Partial<Record<
    ProfessionalCommissionPaymentRecord['paymentType'],
    string
  >> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    debito: 'Débito',
    credito: 'Crédito',
    pendente: 'Pendente',
    cortesia: 'Cortesia'
  };

  return labels[paymentType] || paymentType;
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  accent = 'default'
}: SummaryCardProps) {
  const styles = {
    default: {
      card: 'border-neutral-200 bg-white',
      icon: 'bg-[#0f4c5c]/10 text-[#0f4c5c]',
      value: 'text-neutral-950'
    },
    orange: {
      card: 'border-orange-200 bg-orange-50/70',
      icon: 'bg-orange-100 text-orange-700',
      value: 'text-orange-900'
    },
    green: {
      card: 'border-emerald-200 bg-emerald-50/70',
      icon: 'bg-emerald-100 text-emerald-700',
      value: 'text-emerald-800'
    }
  }[accent];

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${styles.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            {label}
          </p>

          <p className={`mt-2 break-words text-xl font-semibold tracking-tight ${styles.value}`}>
            {value}
          </p>
        </div>

        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          {icon}
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-4 text-neutral-500">
        {description}
      </p>
    </div>
  );
}

export default function ProfessionalReportsView({
  professional,
  services,
  completedAppointments,
  commissionPayments
}: ProfessionalReportsViewProps) {
  const initialWeekPeriod = useMemo(() => {
    return getCurrentWeekPeriod();
  }, []);

  const [periodPreset, setPeriodPreset] =
    useState<ProfessionalReportPeriodPreset>('week');

  const [reportPeriod, setReportPeriod] =
    useState<ProfessionalReportPeriod>(initialWeekPeriod);

  const isInvalidPeriod =
    Boolean(reportPeriod.startDate && reportPeriod.endDate) &&
    reportPeriod.startDate > reportPeriod.endDate;

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
        appointmentDate >= reportPeriod.startDate &&
        appointmentDate <= reportPeriod.endDate
      );
    });
  }, [
    completedAppointments,
    isInvalidPeriod,
    reportPeriod
  ]);

  const filteredCommissionPayments = useMemo(() => {
    if (isInvalidPeriod) {
      return [];
    }

    return commissionPayments
      .filter((payment) => {
        return (
          payment.periodStart <= reportPeriod.endDate &&
          payment.periodEnd >= reportPeriod.startDate
        );
      })
      .sort((firstPayment, secondPayment) => {
        if (firstPayment.paidAt !== secondPayment.paidAt) {
          return secondPayment.paidAt.localeCompare(firstPayment.paidAt);
        }

        return (secondPayment.createdAt || '').localeCompare(
          firstPayment.createdAt || ''
        );
      });
  }, [
    commissionPayments,
    isInvalidPeriod,
    reportPeriod
  ]);

  const filteredTotalProduced = useMemo(() => {
    return filteredAppointments.reduce((total, appointment) => {
      return total + appointment.price;
    }, 0);
  }, [filteredAppointments]);

  const filteredCommissionExpected = useMemo(() => {
    return filteredAppointments.reduce((total, appointment) => {
      return total + appointment.commissionValue;
    }, 0);
  }, [filteredAppointments]);

  const totalCalculatedInPayments = useMemo(() => {
    return filteredCommissionPayments.reduce((total, payment) => {
      return total + payment.calculatedCommission;
    }, 0);
  }, [filteredCommissionPayments]);

  const totalPaid = useMemo(() => {
    return filteredCommissionPayments.reduce((total, payment) => {
      return total + payment.amountPaid;
    }, 0);
  }, [filteredCommissionPayments]);

  const totalAdjustments = useMemo(() => {
    return filteredCommissionPayments.reduce((total, payment) => {
      return total + payment.extraValue - payment.discountValue;
    }, 0);
  }, [filteredCommissionPayments]);

  const estimatedOpenCommission = Math.max(
    0,
    filteredCommissionExpected - totalCalculatedInPayments
  );

  const handleChangePreset = (
    nextPreset: ProfessionalReportPeriodPreset
  ) => {
    setPeriodPreset(nextPreset);

    if (nextPreset !== 'custom') {
      setReportPeriod(getPeriodByPreset(nextPreset));
    }
  };

  const handleChangeStartDate = (startDate: string) => {
    setPeriodPreset('custom');

    setReportPeriod((currentPeriod) => ({
      ...currentPeriod,
      startDate
    }));
  };

  const handleChangeEndDate = (endDate: string) => {
    setPeriodPreset('custom');

    setReportPeriod((currentPeriod) => ({
      ...currentPeriod,
      endDate
    }));
  };

  const periodLabel = getPeriodLabel(reportPeriod);

  return (
    <div id="professional-reports" className="space-y-4 text-left">
      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#0f4c5c]">
                Área do profissional
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">
                Meus indicadores e acertos
              </h2>

              <p className="mt-2 text-xs leading-5 text-neutral-500">
                Consulte seus atendimentos finalizados e os pagamentos de comissão
                registrados oficialmente pelo estabelecimento.
              </p>

              <p className="mt-2 text-[11px] font-medium text-orange-700">
                Período exibido: {periodLabel}
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 lg:min-w-[430px]">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  ['today', 'Hoje'],
                  ['week', 'Semana'],
                  ['month', 'Mês'],
                  ['custom', 'Filtrar']
                ] as Array<[ProfessionalReportPeriodPreset, string]>).map(
                  ([preset, label]) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleChangePreset(preset)}
                      className={`rounded-xl px-3 py-2 text-[10px] font-medium uppercase tracking-wider transition ${
                        periodPreset === preset
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    Data inicial
                  </span>

                  <input
                    type="date"
                    value={reportPeriod.startDate}
                    onChange={(event) => handleChangeStartDate(event.target.value)}
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 outline-none focus:border-orange-500"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    Data final
                  </span>

                  <input
                    type="date"
                    value={reportPeriod.endDate}
                    onChange={(event) => handleChangeEndDate(event.target.value)}
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 outline-none focus:border-orange-500"
                  />
                </label>
              </div>

              {isInvalidPeriod && (
                <p className="text-[11px] font-medium text-red-600">
                  A data inicial não pode ser maior que a data final.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Atendimentos finalizados"
          value={String(filteredAppointments.length)}
          description="Total concluído no período selecionado."
          icon={<ClipboardList className="h-4 w-4" />}
        />

        <SummaryCard
          label="Produção bruta"
          value={formatCurrency(filteredTotalProduced)}
          description="Valor dos seus serviços finalizados."
          icon={<TrendingUp className="h-4 w-4" />}
        />

        {professional.permissions.viewCommission && (
          <>
            <SummaryCard
              label="Comissão gerada"
              value={formatCurrency(filteredCommissionExpected)}
              description="Soma gravada nos atendimentos do período."
              icon={<CircleDollarSign className="h-4 w-4" />}
              accent="orange"
            />

            <SummaryCard
              label="Total pago"
              value={formatCurrency(totalPaid)}
              description="Inclui extras e descontos registrados."
              icon={<CheckCircle2 className="h-4 w-4" />}
              accent="green"
            />

            <SummaryCard
              label="Saldo estimado"
              value={formatCurrency(estimatedOpenCommission)}
              description="Comissão gerada ainda não coberta por fechamento."
              icon={<Banknote className="h-4 w-4" />}
            />
          </>
        )}
      </section>

      {professional.permissions.viewCommission && totalAdjustments !== 0 && (
        <section className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
                Ajustes nos pagamentos exibidos
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Resultado líquido de extras menos descontos.
              </p>
            </div>

            <p className={`text-base font-semibold ${
              totalAdjustments < 0 ? 'text-red-600' : 'text-[#0f4c5c]'
            }`}>
              {totalAdjustments > 0 ? '+' : ''}
              {formatCurrency(totalAdjustments)}
            </p>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#0f4c5c]" />

              <h3 className="text-sm font-semibold text-neutral-950">
                Histórico de atendimentos
              </h3>
            </div>

            <p className="mt-1 text-[11px] text-neutral-500">
              Atendimentos finalizados de {periodLabel}.
            </p>
          </div>

          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            {filteredAppointments.length} registro(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Data e hora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Serviço realizado</th>
                <th className="px-4 py-3 text-right">Valor produzido</th>
                <th className="px-4 py-3 text-right">Comissão gerada</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {filteredAppointments.map((appointment) => {
                const service = services.find((item) => {
                  return item.id === appointment.serviceId;
                });

                return (
                  <tr
                    key={appointment.id}
                    className="transition-colors hover:bg-neutral-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-neutral-700">
                      {formatDateTimeBr(appointment.dateTime)}
                    </td>

                    <td className="px-4 py-3.5 font-medium text-neutral-900">
                      {appointment.clientName}
                    </td>

                    <td className="px-4 py-3.5 text-neutral-600">
                      {service?.name || 'Serviço personalizado'}
                    </td>

                    <td className="px-4 py-3.5 text-right font-medium text-neutral-800">
                      {formatCurrency(appointment.price)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-medium text-[#0f4c5c]">
                      {formatCurrency(appointment.commissionValue)}
                    </td>
                  </tr>
                );
              })}

              {filteredAppointments.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-neutral-400"
                  >
                    {isInvalidPeriod
                      ? 'Corrija o período para visualizar o relatório.'
                      : 'Nenhum atendimento finalizado neste período.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {professional.permissions.viewCommission && (
        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-emerald-700" />

                <h3 className="text-sm font-semibold text-neutral-950">
                  Histórico de pagamentos
                </h3>
              </div>

              <p className="mt-1 text-[11px] text-neutral-500">
                Acertos registrados pelo estabelecimento que alcançam o período selecionado.
              </p>
            </div>

            <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
              {filteredCommissionPayments.length} pagamento(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Período fechado</th>
                  <th className="px-4 py-3 text-right">Comissão</th>
                  <th className="px-4 py-3 text-right">Extra</th>
                  <th className="px-4 py-3 text-right">Desconto</th>
                  <th className="px-4 py-3 text-right">Total pago</th>
                  <th className="px-4 py-3">Forma</th>
                  <th className="px-4 py-3">Observações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {filteredCommissionPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="transition-colors hover:bg-neutral-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-neutral-800">
                      {formatDateBr(payment.paidAt)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-neutral-600">
                      {formatDateBr(payment.periodStart)} a{' '}
                      {formatDateBr(payment.periodEnd)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-medium text-neutral-800">
                      {formatCurrency(payment.calculatedCommission)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-medium text-emerald-700">
                      {formatCurrency(payment.extraValue)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-medium text-red-600">
                      {formatCurrency(payment.discountValue)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-semibold text-[#0f4c5c]">
                      {formatCurrency(payment.amountPaid)}
                    </td>

                    <td className="px-4 py-3.5 text-neutral-700">
                      {getPaymentTypeLabel(payment.paymentType)}
                    </td>

                    <td className="max-w-[260px] px-4 py-3.5 text-neutral-500">
                      <span className="line-clamp-3 whitespace-pre-line">
                        {payment.notes || '-'}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredCommissionPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-neutral-400"
                    >
                      {isInvalidPeriod
                        ? 'Corrija o período para visualizar os pagamentos.'
                        : 'Nenhum pagamento de comissão alcança este período.'}
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
