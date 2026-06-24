import React, {
  useMemo,
  useState
} from 'react';

import { ProfessionalReportsViewProps } from '../professional.types';

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

export default function ProfessionalReportsView({
  professional,
  services,
  completedAppointments
}: ProfessionalReportsViewProps) {
  const initialWeekPeriod = useMemo(() => {
    return getCurrentWeekPeriod();
  }, []);

  const [periodPreset, setPeriodPreset] =
    useState<ProfessionalReportPeriodPreset>('week');

  const [reportPeriod, setReportPeriod] =
    useState<ProfessionalReportPeriod>(initialWeekPeriod);

  const filteredAppointments = useMemo(() => {
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

  const isInvalidPeriod =
    Boolean(reportPeriod.startDate && reportPeriod.endDate) &&
    reportPeriod.startDate > reportPeriod.endDate;

  const periodLabel = getPeriodLabel(reportPeriod);

  return (
    <div id="professional-reports" className="space-y-6 text-left">
      <div className="bg-white border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-950">
              Meus Indicadores e Acerto
            </h2>

            <p className="text-xs text-neutral-500 mt-1">
              Este extrato é calculado com base exclusivamente em seus próprios atendimentos finalizados. O salão inteiro não é visível aqui.
            </p>

            <p className="text-[11px] text-orange-700 font-bold mt-2">
              Período exibido: {periodLabel}
            </p>
          </div>

          <div className="bg-neutral-50 border rounded-2xl p-3 space-y-3 lg:min-w-[420px]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleChangePreset('today')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  periodPreset === 'today'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => handleChangePreset('week')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  periodPreset === 'week'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Semana
              </button>

              <button
                type="button"
                onClick={() => handleChangePreset('month')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  periodPreset === 'month'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Mês
              </button>

              <button
                type="button"
                onClick={() => handleChangePreset('custom')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  periodPreset === 'custom'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Filtrar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                  Data inicial
                </span>

                <input
                  type="date"
                  value={reportPeriod.startDate}
                  onChange={(event) => handleChangeStartDate(event.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 outline-none focus:border-orange-500"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                  Data final
                </span>

                <input
                  type="date"
                  value={reportPeriod.endDate}
                  onChange={(event) => handleChangeEndDate(event.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 outline-none focus:border-orange-500"
                />
              </label>
            </div>

            {isInvalidPeriod && (
              <p className="text-[11px] text-red-600 font-bold">
                A data inicial não pode ser maior que a data final.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-neutral-50 p-5 rounded-2xl space-y-1">
            <span className="text-xs text-zinc-500 font-semibold uppercase font-mono block">
              Atendimentos Concluídos
            </span>

            <span className="text-2xl font-black text-neutral-950 tracking-tight">
              {isInvalidPeriod ? 0 : filteredAppointments.length}
            </span>

            <p className="text-[10px] text-zinc-400">
              Total no período selecionado
            </p>
          </div>

          <div className="bg-neutral-50 p-5 rounded-2xl space-y-1">
            <span className="text-xs text-zinc-500 font-semibold uppercase font-mono block">
              Faturamento Bruto Gerado
            </span>

            <span className="text-2xl font-black text-neutral-950 tracking-tight">
              {formatCurrency(isInvalidPeriod ? 0 : filteredTotalProduced)}
            </span>

            <p className="text-[10px] text-zinc-400">
              Valor bruto no período selecionado
            </p>
          </div>

          {professional.permissions.viewCommission && (
            <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl space-y-1">
              <span className="text-xs text-orange-800 font-bold uppercase font-mono block">
                Minha Comissão Prevista
              </span>

              <span className="text-2xl font-black text-orange-900 tracking-tight">
                {formatCurrency(isInvalidPeriod ? 0 : filteredCommissionExpected)}
              </span>

              <p className="text-[10px] text-orange-700">
                Prevista no período selecionado
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-950 uppercase tracking-wider">
                Histórico de Atendimentos
              </h3>

              <p className="text-[11px] text-neutral-500 mt-1">
                Exibindo atendimentos finalizados de {periodLabel}.
              </p>
            </div>

            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider font-mono">
              {isInvalidPeriod ? 0 : filteredAppointments.length} registro(s)
            </span>
          </div>

          <div className="overflow-x-auto border rounded-2xl bg-neutral-50/50">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-100 text-neutral-600 font-bold uppercase tracking-wider text-[10px] border-b">
                <tr>
                  <th className="py-3 px-4">
                    Data/Hora
                  </th>

                  <th className="py-3 px-4">
                    Cliente
                  </th>

                  <th className="py-3 px-4">
                    Serviço Realizado
                  </th>

                  <th className="py-3 px-4">
                    Valor Pago
                  </th>

                  <th className="py-3 px-4 text-right">
                    Comissão Devida
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {!isInvalidPeriod && filteredAppointments.map((appointment) => {
                  const service = services.find((item) => {
                    return item.id === appointment.serviceId;
                  });

                  return (
                    <tr
                      key={appointment.id}
                      className="hover:bg-white transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {formatDateTimeBr(appointment.dateTime)}
                      </td>

                      <td className="py-3.5 px-4 font-semibold">
                        {appointment.clientName}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-600">
                        {service?.name || 'Serviço Personalizado'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold">
                        {formatCurrency(appointment.price)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(appointment.commissionValue)}
                      </td>
                    </tr>
                  );
                })}

                {(isInvalidPeriod || filteredAppointments.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-neutral-400"
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
        </div>
      </div>
    </div>
  );
}
