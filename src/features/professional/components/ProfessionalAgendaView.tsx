import React from 'react';

import {
  Calendar,
  Phone,
  Plus
} from 'lucide-react';

import {
  AppointmentStatus
} from '../../../types';

import {
  ProfessionalAgendaViewProps,
  ProfessionalDayFilter,
  ProfessionalStatusFilter
} from '../professional.types';

import {
  buildProfessionalWhatsAppUrl,
  formatCurrency,
  formatDateBr,
  getProfessionalAppointmentDate,
  getProfessionalAppointmentTime,
  getRemunerationDescription,
  getStatusBadgeClassName,
  getStatusLabel
} from '../professional.utils';

export default function ProfessionalAgendaView({
  configName,
  professional,
  services,
  filteredAppointments,
  dayFilter,
  statusFilter,
  canCreateAppointments,
  onChangeDayFilter,
  onChangeStatusFilter,
  onOpenManualAppointmentModal,
  onModifyAppointment
}: ProfessionalAgendaViewProps) {
  const completedFilteredCount = filteredAppointments.filter((appointment) => {
    return appointment.status === 'completed';
  }).length;

  const getDayButtonClassName = (filter: ProfessionalDayFilter) => {
    return [
      'py-1.5 px-1 text-[11px] font-bold rounded-lg transition',
      dayFilter === filter
        ? 'bg-white text-neutral-900 shadow-sm'
        : 'text-neutral-500 hover:text-neutral-800'
    ].join(' ');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest font-mono">
            Resumo Hoje
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 p-3 rounded-xl">
              <span className="text-[10px] text-zinc-400 block font-bold uppercase">
                Atendimento
              </span>

              <span className="text-xl font-black text-neutral-900">
                {filteredAppointments.length}
              </span>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl">
              <span className="text-[10px] text-zinc-400 block font-bold uppercase">
                Concluídos
              </span>

              <span className="text-xl font-black text-emerald-600">
                {completedFilteredCount}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-widest font-mono">
            Filtros da Agenda
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400">
              Período de Tempo
            </label>

            <div className="grid grid-cols-3 gap-1 bg-neutral-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onChangeDayFilter('today')}
                className={getDayButtonClassName('today')}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => onChangeDayFilter('week')}
                className={getDayButtonClassName('week')}
              >
                7 dias
              </button>

              <button
                type="button"
                onClick={() => onChangeDayFilter('all')}
                className={getDayButtonClassName('all')}
              >
                Todos
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="select-prof-status-filter"
              className="text-xs font-semibold text-neutral-400 block"
            >
              Status do Horário
            </label>

            <select
              id="select-prof-status-filter"
              value={statusFilter}
              onChange={(event) => {
                onChangeStatusFilter(event.target.value as ProfessionalStatusFilter);
              }}
              className="w-full bg-neutral-50 border rounded-xl p-2.5 text-xs font-medium outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="scheduled">Agendados</option>
              <option value="confirmed">Confirmados</option>
              <option value="attending">Em atendimento</option>
              <option value="completed">Finalizados</option>
              <option value="cancelled">Cancelados</option>
              <option value="absent">Faltaram</option>
              <option value="rescheduled">Remarcados</option>
            </select>
          </div>
        </div>

        <div className="bg-orange-50/50 border border-orange-250 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-orange-900 uppercase tracking-widest font-mono">
            Minha Remuneração
          </h4>

          <div className="text-xs text-orange-850 space-y-2 leading-relaxed">
            <p>
              {getRemunerationDescription(professional)}
            </p>

            {professional.remType === 'chair_rental' && (
              <p className="text-[10px] text-orange-700 bg-white/60 px-2 py-1 rounded inline-block">
                Você fica com 100% dos valores brutos gerados.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-9 space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
              Visualização de Agenda
            </h2>

            <p className="text-xs text-neutral-500 mt-0.5">
              Mostrando {filteredAppointments.length} agendamentos de acordo com os filtros aplicados.
            </p>
          </div>

          {canCreateAppointments && (
            <button
              id="btn-add-manual-appt"
              type="button"
              onClick={onOpenManualAppointmentModal}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Agendamento Manual
            </button>
          )}
        </div>

        {filteredAppointments.length === 0 ? (
          <div
            id="no-appointments-box"
            className="bg-white border rounded-2xl p-12 text-center text-neutral-500 space-y-3 shadow-sm"
          >
            <Calendar className="w-10 h-10 text-neutral-300 mx-auto" />

            <p className="text-sm font-semibold text-neutral-800">
              Nenhum horário registrado.
            </p>

            <p className="text-xs text-neutral-400">
              Você não possui clientes marcados para os parâmetros desta consulta.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((appointment) => {
              const service = services.find((item) => {
                return item.id === appointment.serviceId;
              });

              const appointmentDate = getProfessionalAppointmentDate(appointment);
              const appointmentTime = getProfessionalAppointmentTime(appointment);
              const formattedDate = formatDateBr(appointmentDate);

              const whatsappUrl = buildProfessionalWhatsAppUrl({
                clientPhone: appointment.clientPhone,
                clientName: appointment.clientName,
                professionalName: professional.name,
                configName,
                formattedDate,
                appointmentTime
              });

              const hasPendingActions =
                appointment.status !== 'completed' &&
                appointment.status !== 'cancelled' &&
                appointment.status !== 'absent';

              return (
                <div
                  id={`appt-row-${appointment.id}`}
                  key={appointment.id}
                  className="bg-white border hover:border-neutral-350 transition-all rounded-2xl p-4 sm:p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center justify-between"
                >
                  <div className="md:col-span-4 flex items-center gap-4">
                    <div className="bg-neutral-900 text-white rounded-xl py-2 px-3 text-center min-w-[70px]">
                      <span className="text-[9px] block text-orange-400 uppercase font-bold tracking-wider leading-none">
                        HORÁRIO
                      </span>

                      <span className="text-sm font-black font-mono block mt-1">
                        {appointmentTime}
                      </span>

                      <span className="text-[9px] block text-neutral-400 mt-0.5">
                        {formattedDate.substring(0, 5)}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-neutral-900 leading-tight">
                        {appointment.clientName}
                      </h4>

                      <p className="text-xs text-neutral-500 font-mono mt-0.5">
                        {appointment.clientPhone}
                      </p>

                      {appointment.notes && (
                        <p className="text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded italic inline-block mt-1 font-medium select-none truncate max-w-[200px]">
                          "{appointment.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider font-mono">
                      SERVIÇO
                    </span>

                    <span className="text-xs font-extrabold text-neutral-800 block mt-0.5 leading-tight">
                      {service?.name || 'Serviço Personalizado'}
                    </span>

                    <span className="text-xs font-medium text-neutral-400 block mt-0.5 font-mono">
                      Valor: {formatCurrency(appointment.price)}
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider font-mono">
                      STATUS
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border mt-1 select-none ${getStatusBadgeClassName(appointment.status)}`}
                    >
                      {getStatusLabel(appointment.status)}
                    </span>
                  </div>

                  <div className="md:col-span-3 flex items-center md:justify-end gap-2 text-xs">
                    {hasPendingActions ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {professional.permissions.cancelAppts && (
                          <button
                            type="button"
                            title="Marcar como Falta"
                            onClick={() => {
                              onModifyAppointment(appointment.id, {
                                status: 'absent' as AppointmentStatus
                              });
                            }}
                            className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-250 rounded-xl transition font-semibold"
                          >
                            Falta
                          </button>
                        )}

                        {appointment.status !== 'attending' ? (
                          <button
                            type="button"
                            onClick={() => {
                              onModifyAppointment(appointment.id, {
                                status: 'attending' as AppointmentStatus
                              });
                            }}
                            className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition"
                          >
                            Atender
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onModifyAppointment(appointment.id, {
                                status: 'completed' as AppointmentStatus
                              });
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold transition"
                          >
                            Finalizar
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-400 font-mono italic">
                        Sem ações pendentes
                      </span>
                    )}

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-neutral-100 dark:hover:bg-neutral-200 text-neutral-600 hover:text-emerald-700 rounded-xl border border-neutral-200 transition shrink-0"
                      title="Enviar WhatsApp"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}