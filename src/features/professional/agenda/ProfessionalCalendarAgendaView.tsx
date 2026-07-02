import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  MessageCircle,
  Plus,
  RotateCcw,
  Unlock,
  UserX,
  X
} from 'lucide-react';

import {
  AppointmentStatus
} from '../../../types';

import {
  ProfessionalAgendaBlockedInterval,
  ProfessionalAgendaBlockIntervalForm,
  ProfessionalAgendaCalendarDay,
  ProfessionalAgendaDayOverride,
  ProfessionalAgendaExtraTime,
  ProfessionalAgendaExtraTimeForm,
  ProfessionalAgendaSlotRowProps,
  ProfessionalAgendaTimeSlot,
  ProfessionalCalendarAgendaViewProps
} from './professionalAgenda.types';

import {
  addMinutesToTime,
  buildConfirmWhatsAppUrl,
  buildProfessionalAgendaCalendarDays,
  calculateAgendaSummary,
  formatDateBr,
  generateProfessionalAgendaSlots,
  getSlotStatusClassName,
  timeToMinutes
} from './professionalAgenda.utils';

import {
  ProfessionalAgendaBlockIntervalModal,
  ProfessionalAgendaBlockTimeModal,
  ProfessionalAgendaExtraTimeModal
} from './ProfessionalAgendaModals';

import { supabase } from '../../../lib/supabase';

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
}

function getSelectedDateAsDate(dateStr: string): Date {
  if (!dateStr || !dateStr.includes('-')) {
    return new Date();
  }

  return new Date(`${dateStr}T00:00:00`);
}


function normalizeScheduleBlock(rawBlock: Record<string, unknown>): ProfessionalAgendaBlockedInterval {
  return {
    id: String(rawBlock.id || ''),
    professionalId: String(rawBlock.professionalId || rawBlock.professional_id || ''),
    date: String(rawBlock.date || rawBlock.block_date || '').slice(0, 10),
    startTime: String(rawBlock.startTime || rawBlock.start_time || '').slice(0, 5),
    endTime: String(rawBlock.endTime || rawBlock.end_time || '').slice(0, 5),
    reason: String(rawBlock.reason || rawBlock.notes || 'Bloqueado')
  };
}

function getCalendarDayClassName(day: ProfessionalAgendaCalendarDay, selectedDate: string): string {
  const isSelected = day.dateStr === selectedDate;

  const baseClassName = [
    'min-h-[92px] rounded-2xl border p-2 text-left transition',
    'flex flex-col justify-between'
  ];

  if (!day.isCurrentMonth) {
    baseClassName.push('opacity-40 bg-neutral-50 border-neutral-100');
  } else if (isSelected) {
    baseClassName.push('bg-orange-50 border-orange-500 shadow-sm');
  } else if (day.status === 'open') {
    baseClassName.push('bg-green-50 border-green-200 hover:border-green-300');
  } else if (day.status === 'partial') {
    baseClassName.push('bg-orange-50 border-orange-200 hover:border-orange-300');
  } else if (day.status === 'full') {
    baseClassName.push('bg-red-50 border-red-300 hover:border-red-400');
  } else {
    baseClassName.push('bg-white border-neutral-200 hover:bg-neutral-50');
  }

  return baseClassName.join(' ');
}

function getCalendarDayStatusLabel(status: ProfessionalAgendaCalendarDay['status']): string {
  if (status === 'open') {
    return 'Aberta';
  }

  if (status === 'partial') {
    return 'Parcial';
  }

  if (status === 'full') {
    return 'Esgotado';
  }

  return 'Fechada';
}

function getCalendarDayStatusClassName(status: ProfessionalAgendaCalendarDay['status']): string {
  if (status === 'open') {
    return 'text-green-700 bg-green-100 border-green-200';
  }

  if (status === 'partial') {
    return 'text-orange-700 bg-orange-100 border-orange-200';
  }

  if (status === 'full') {
    return 'text-red-700 bg-red-100 border-red-200';
  }

  return 'text-neutral-500 bg-white border-neutral-200';
}


function getProfessionalAppointmentCardClassName(status: AppointmentStatus): string {
  if (status === 'confirmed') {
    return 'border-emerald-200 bg-emerald-50/85 shadow-emerald-950/5';
  }

  if (status === 'cancelled') {
    return 'border-neutral-300 bg-neutral-100/90 shadow-neutral-950/5 opacity-90';
  }

  if (status === 'absent') {
    return 'border-red-200 bg-red-50/85 shadow-red-950/5';
  }

  if (status === 'completed') {
    return 'border-sky-200 bg-sky-50/80 shadow-sky-950/5';
  }

  return 'border-amber-200 bg-amber-50/85 shadow-amber-950/5';
}

function getProfessionalAppointmentFooterLabel(status: AppointmentStatus): string {
  if (status === 'confirmed') return 'CLIENTE CONFIRMOU PRESENÇA';
  if (status === 'cancelled') return 'ATENDIMENTO CANCELADO';
  if (status === 'absent') return 'CLIENTE FALTOU';
  if (status === 'completed') return 'ATENDIMENTO FINALIZADO';
  return 'AGUARDANDO CONFIRMAÇÃO';
}

function getProfessionalAppointmentFooterClassName(status: AppointmentStatus): string {
  if (status === 'confirmed') return 'text-emerald-800';
  if (status === 'cancelled') return 'text-neutral-600';
  if (status === 'absent') return 'text-red-800';
  if (status === 'completed') return 'text-sky-800';
  return 'text-amber-800';
}

function getProfessionalAppointmentStatusLabel(status: AppointmentStatus): string {
  if (status === 'confirmed') return 'Confirmado';
  if (status === 'cancelled') return 'Cancelado';
  if (status === 'absent') return 'Faltou';
  if (status === 'completed') return 'Finalizado';
  return 'Aguardando confirmação';
}

function getProfessionalAppointmentStatusBadgeClassName(status: AppointmentStatus): string {
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'cancelled') return 'bg-neutral-200 text-neutral-700 border-neutral-300';
  if (status === 'absent') return 'bg-red-100 text-red-800 border-red-200';
  if (status === 'completed') return 'bg-sky-100 text-sky-800 border-sky-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}

function ProfessionalAgendaSlotRow({
  slot,
  professional,
  selectedDate,
  onBlockTime,
  onReleaseTime,
  onAddManualAppointmentAtTime,
  onModifyAppointment
}: ProfessionalAgendaSlotRowProps) {
  const appointment = slot.appointment;
  const service = slot.service;

  const renderHistoricalAppointments = () => {
    const historyItems = slot.historicalAppointments || [];

    if (historyItems.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 opacity-75">
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">
          Histórico do horário
        </p>

        <div className="mt-1 space-y-1">
          {historyItems.map((historyAppointment) => (
            <p
              key={historyAppointment.id}
              className="text-xs font-semibold text-neutral-500 line-through decoration-neutral-300"
            >
              {historyAppointment.clientName} — {getProfessionalAppointmentFooterLabel(historyAppointment.status as AppointmentStatus).toLowerCase()}
            </p>
          ))}
        </div>
      </div>
    );
  };

  if (slot.status === 'free') {
    return (
      <div className={`border rounded-2xl p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center ${getSlotStatusClassName(slot.status)}`}>
        <div className="md:col-span-2">
          <span className="text-sm font-black font-mono">
            {slot.time}
          </span>

          <span className="text-[10px] text-neutral-400 font-mono block">
            até {slot.endTime}
          </span>
        </div>

        <div className="md:col-span-6">
          <span className="text-sm font-black text-neutral-900">
            Livre
          </span>

          <p className="text-xs text-neutral-500 mt-0.5">
            Horário disponível para agendamento.
          </p>
          {renderHistoricalAppointments()}
        </div>

        <div className="md:col-span-4 flex items-center md:justify-end gap-2">
          <button
            type="button"
            onClick={() => onAddManualAppointmentAtTime(slot.time)}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Agendar
          </button>

          <button
            type="button"
            onClick={() => onBlockTime(slot.time)}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 border hover:bg-neutral-200 transition flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            Bloquear
          </button>
        </div>
      </div>
    );
  }

  if (slot.status === 'lunch') {
    return (
      <div className={`border rounded-2xl p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center ${getSlotStatusClassName(slot.status)}`}>
        <div className="md:col-span-2">
          <span className="text-sm font-black font-mono">
            {slot.time}
          </span>

          <span className="text-[10px] font-mono block opacity-70">
            até {slot.endTime}
          </span>
        </div>

        <div className="md:col-span-10">
          <span className="text-sm font-black">
            Almoço
          </span>

          <p className="text-xs opacity-80 mt-0.5">
            Horário reservado para intervalo.
          </p>
        </div>
      </div>
    );
  }

  if (slot.status === 'occupied') {
    return (
      <div className={`border rounded-2xl p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center ${getSlotStatusClassName(slot.status)}`}>
        <div className="md:col-span-2">
          <span className="text-sm font-black font-mono">
            {slot.time}
          </span>

          <span className="text-[10px] font-mono block opacity-70">
            até {slot.endTime}
          </span>
        </div>

        <div className="md:col-span-10">
          <span className="text-sm font-bold">
            Ocupado pelo atendimento anterior
          </span>

          <p className="text-xs opacity-80 mt-0.5">
            {service?.name || 'Serviço em andamento'} ocupa este bloco de horário.
          </p>
        </div>
      </div>
    );
  }

  if (slot.status === 'blocked' || slot.status === 'closed') {
    return (
      <div className={`border rounded-2xl p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center ${getSlotStatusClassName(slot.status)}`}>
        <div className="md:col-span-2">
          <span className="text-sm font-black font-mono">
            {slot.time}
          </span>

          <span className="text-[10px] font-mono block opacity-70">
            até {slot.endTime}
          </span>
        </div>

        <div className="md:col-span-6">
          <span className="text-sm font-black">
            {slot.status === 'blocked' ? 'Bloqueado' : 'Fechado'}
          </span>

          <p className="text-xs opacity-80 mt-0.5">
            {slot.blockReason || 'Horário indisponível.'}
          </p>
          {renderHistoricalAppointments()}
        </div>

        <div className="md:col-span-4 flex items-center md:justify-end">
          <button
            type="button"
            onClick={() => onReleaseTime(slot.time)}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-white text-neutral-700 border hover:bg-neutral-50 transition flex items-center gap-1.5"
          >
            <Unlock className="w-3.5 h-3.5" />
            Liberar
          </button>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  const whatsappUrl = buildConfirmWhatsAppUrl({
    clientPhone: appointment.clientPhone,
    clientName: appointment.clientName,
    professionalName: professional.name,
    serviceName: service?.name || 'serviço agendado',
    dateStr: selectedDate,
    time: slot.time
  });

  const handleAppointmentStatusAction = (status: AppointmentStatus) => {
    if (appointment.status === status) {
      return;
    }

    onModifyAppointment(appointment.id, {
      status
    });
  };

  return (
    <div className={`rounded-2xl border p-3 shadow-sm transition ${getProfessionalAppointmentCardClassName(appointment.status as AppointmentStatus)}`}>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[88px_1fr_auto] xl:items-center">
        <div className="flex items-center gap-3 xl:block">
          <span className="block rounded-2xl bg-white/85 px-4 py-3 text-center font-mono text-2xl font-extrabold leading-none tracking-[-0.04em] text-neutral-950 shadow-sm ring-1 ring-black/5">
            {slot.time}
          </span>

          <span className="font-mono text-[10px] font-bold text-neutral-500 xl:mt-1 xl:block xl:text-center">
            até {slot.endTime}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-500">
              Cliente: <span className="text-neutral-950">{appointment.clientName}</span>
            </span>

            <span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] ${getProfessionalAppointmentStatusBadgeClassName(appointment.status as AppointmentStatus)}`}>
              {getProfessionalAppointmentStatusLabel(appointment.status as AppointmentStatus)}
            </span>
          </div>

          <h4 className="mt-2 break-words text-base font-extrabold leading-tight tracking-[-0.02em] text-neutral-950 sm:text-lg">
            {service?.name || 'Serviço personalizado'}
          </h4>

          <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
            Profissional: {professional.name}
          </p>

          {appointment.clientPhone && (
            <p className="mt-1 font-mono text-xs font-semibold text-neutral-500">
              WhatsApp: {appointment.clientPhone}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[430px]">
          <button
            type="button"
            disabled={appointment.status === 'confirmed'}
            onClick={() => handleAppointmentStatusAction('confirmed')}
            className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
              appointment.status === 'confirmed'
                ? 'cursor-not-allowed bg-emerald-100 text-emerald-700'
                : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmar
            </span>
          </button>

          <button
            type="button"
            disabled
            title="A remarcação completa do profissional será ligada ao fluxo de reagendamento em uma próxima etapa."
            className="cursor-not-allowed rounded-xl bg-orange-100 px-3 py-2.5 text-xs font-extrabold text-orange-400"
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Reagendar
            </span>
          </button>

          <button
            type="button"
            disabled={appointment.status === 'cancelled'}
            onClick={() => handleAppointmentStatusAction('cancelled')}
            className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
              appointment.status === 'cancelled'
                ? 'cursor-not-allowed bg-neutral-200 text-neutral-500'
                : 'bg-neutral-800 text-white shadow-sm hover:bg-neutral-900'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Ban className="h-3.5 w-3.5" />
              Cancelou
            </span>
          </button>

          <button
            type="button"
            disabled={appointment.status === 'absent'}
            onClick={() => handleAppointmentStatusAction('absent')}
            className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
              appointment.status === 'absent'
                ? 'cursor-not-allowed bg-red-100 text-red-700'
                : 'bg-red-700 text-white shadow-sm hover:bg-red-800'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <UserX className="h-3.5 w-3.5" />
              Faltou
            </span>
          </button>
        </div>
      </div>

      {renderHistoricalAppointments()}

      <div className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className={`font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] ${getProfessionalAppointmentFooterClassName(appointment.status as AppointmentStatus)}`}>
          {getProfessionalAppointmentFooterLabel(appointment.status as AppointmentStatus)}
        </span>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-50"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}

export default function ProfessionalCalendarAgendaView({
  professional,
  services,
  appointments,
  selectedDate,
  onChangeSelectedDate,
  onOpenManualAppointmentAtDateTime,
  onModifyAppointment,
  professionalAccessToken
}: ProfessionalCalendarAgendaViewProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    return getSelectedDateAsDate(selectedDate);
  });

  const [dayOverrides, setDayOverrides] = useState<ProfessionalAgendaDayOverride[]>([]);
  const [blockedIntervals, setBlockedIntervals] = useState<ProfessionalAgendaBlockedInterval[]>([]);
  const [extraTimes, setExtraTimes] = useState<ProfessionalAgendaExtraTime[]>([]);

  const [showDayAgendaModal, setShowDayAgendaModal] = useState(false);
  const [showBlockIntervalModal, setShowBlockIntervalModal] = useState(false);
  const [showExtraTimeModal, setShowExtraTimeModal] = useState(false);
  const [blockTimeSlot, setBlockTimeSlot] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);


  useEffect(() => {
    let isMounted = true;

    async function loadBlockedIntervals() {
      const { data, error } = professionalAccessToken
        ? await supabase.rpc('get_professional_access_schedule_blocks', {
            p_token: professionalAccessToken
          })
        : await supabase.rpc('get_my_professional_schedule_blocks', {
            p_professional_id: professional.id
          });

      if (!isMounted) return;

      if (error) {
        console.error('Erro ao carregar bloqueios da agenda:', error.message);
        return;
      }

      const rows = Array.isArray(data) ? data : [];

      setBlockedIntervals(
        rows.map((row: Record<string, unknown>) => normalizeScheduleBlock(row))
      );
    }

    loadBlockedIntervals();

    return () => {
      isMounted = false;
    };
  }, [
    professional.id,
    professionalAccessToken
  ]);

  const calendarDays = useMemo(() => {
    return buildProfessionalAgendaCalendarDays({
      currentMonthDate,
      selectedDate,
      professional,
      services,
      appointments,
      dayOverrides,
      blockedIntervals,
      extraTimes
    });
  }, [
    currentMonthDate,
    selectedDate,
    professional,
    services,
    appointments,
    dayOverrides,
    blockedIntervals,
    extraTimes
  ]);

  const timeSlots = useMemo(() => {
    return generateProfessionalAgendaSlots({
      professional,
      services,
      appointments,
      selectedDate,
      dayOverrides,
      blockedIntervals,
      extraTimes
    });
  }, [
    professional,
    services,
    appointments,
    selectedDate,
    dayOverrides,
    blockedIntervals,
    extraTimes
  ]);

  const summary = useMemo(() => {
    return calculateAgendaSummary(timeSlots);
  }, [
    timeSlots
  ]);

  const handlePreviousMonth = () => {
    setCurrentMonthDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(currentDate.getMonth() - 1);
      return nextDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(currentDate.getMonth() + 1);
      return nextDate;
    });
  };

  const handleSelectCalendarDay = (dateStr: string) => {
    onChangeSelectedDate(dateStr);
    setShowDayAgendaModal(true);
  };

  const handleOpenDay = () => {
    setDayOverrides((currentOverrides) => {
      const filteredOverrides = currentOverrides.filter((dayOverride) => {
        return !(
          dayOverride.professionalId === professional.id &&
          dayOverride.date === selectedDate
        );
      });

      return [
        ...filteredOverrides,
        {
          id: `${professional.id}-${selectedDate}-open`,
          professionalId: professional.id,
          date: selectedDate,
          status: 'open'
        }
      ];
    });
  };

  const handleCloseDay = () => {
    const bookedSlots = timeSlots.filter((slot) => {
      return slot.status === 'booked';
    });

    if (bookedSlots.length > 0) {
      const shouldClose = window.confirm(
        `Este dia possui ${bookedSlots.length} atendimento(s) agendado(s). Deseja fechar apenas os horários livres e manter os agendamentos?`
      );

      if (!shouldClose) {
        return;
      }
    }

    setDayOverrides((currentOverrides) => {
      const filteredOverrides = currentOverrides.filter((dayOverride) => {
        return !(
          dayOverride.professionalId === professional.id &&
          dayOverride.date === selectedDate
        );
      });

      return [
        ...filteredOverrides,
        {
          id: `${professional.id}-${selectedDate}-closed`,
          professionalId: professional.id,
          date: selectedDate,
          status: 'closed'
        }
      ];
    });

    setExtraTimes((currentExtraTimes) => {
      return currentExtraTimes.filter((extraTime) => {
        return !(
          extraTime.professionalId === professional.id &&
          extraTime.date === selectedDate
        );
      });
    });
  };

  const handleBlockTime = (time: string) => {
    const selectedSlot = timeSlots.find((slot) => {
      return slot.time === time;
    });

    setBlockTimeSlot({
      startTime: time,
      endTime: selectedSlot?.endTime || addMinutesToTime(time, 30)
    });
  };

  const saveBlockedInterval = async (formState: ProfessionalAgendaBlockIntervalForm) => {
    const { data, error } = professionalAccessToken
      ? await supabase.rpc('upsert_professional_access_schedule_block', {
          p_token: professionalAccessToken,
          p_date: selectedDate,
          p_start_time: formState.startTime,
          p_end_time: formState.endTime,
          p_reason: formState.reason || 'Bloqueado'
        })
      : await supabase.rpc('upsert_my_professional_schedule_block', {
          p_professional_id: professional.id,
          p_date: selectedDate,
          p_start_time: formState.startTime,
          p_end_time: formState.endTime,
          p_reason: formState.reason || 'Bloqueado'
        });

    if (error) {
      alert(error.message || 'Não foi possível salvar o bloqueio da agenda.');
      return null;
    }

    const savedRow = (Array.isArray(data) ? data[0] : data) as
      | Record<string, unknown>
      | null;

    return savedRow ? normalizeScheduleBlock(savedRow) : {
      id: `${professional.id}-${selectedDate}-${formState.startTime}-blocked`,
      professionalId: professional.id,
      date: selectedDate,
      startTime: formState.startTime,
      endTime: formState.endTime,
      reason: formState.reason || 'Bloqueado'
    };
  };

  const handleSubmitBlockTime = async (formState: ProfessionalAgendaBlockIntervalForm) => {
    const intervalExists = blockedIntervals.some((blockedInterval) => {
      return (
        blockedInterval.professionalId === professional.id &&
        blockedInterval.date === selectedDate &&
        timeToMinutes(formState.startTime) >= timeToMinutes(blockedInterval.startTime) &&
        timeToMinutes(formState.startTime) < timeToMinutes(blockedInterval.endTime)
      );
    });

    if (intervalExists) {
      setBlockTimeSlot(null);
      return;
    }

    const savedInterval = await saveBlockedInterval(formState);

    if (!savedInterval) {
      return;
    }

    setBlockedIntervals((currentIntervals) => [
      ...currentIntervals.filter((blockedInterval) => blockedInterval.id !== savedInterval.id),
      savedInterval
    ]);

    setBlockTimeSlot(null);
  };

  const handleReleaseTime = async (time: string) => {
    const intervalToRelease = blockedIntervals.find((blockedInterval) => {
      const isSameProfessionalAndDate =
        blockedInterval.professionalId === professional.id &&
        blockedInterval.date === selectedDate;

      const isTimeInsideInterval =
        timeToMinutes(time) >= timeToMinutes(blockedInterval.startTime) &&
        timeToMinutes(time) < timeToMinutes(blockedInterval.endTime);

      return isSameProfessionalAndDate && isTimeInsideInterval;
    });

    if (!intervalToRelease) {
      return;
    }

    const { error } = professionalAccessToken
      ? await supabase.rpc('delete_professional_access_schedule_block', {
          p_token: professionalAccessToken,
          p_block_id: intervalToRelease.id
        })
      : await supabase.rpc('delete_my_professional_schedule_block', {
          p_block_id: intervalToRelease.id
        });

    if (error) {
      alert(error.message || 'Não foi possível liberar o horário bloqueado.');
      return;
    }

    setBlockedIntervals((currentIntervals) => {
      return currentIntervals.filter((blockedInterval) => {
        return blockedInterval.id !== intervalToRelease.id;
      });
    });
  };

  const handleBlockInterval = () => {
    setShowBlockIntervalModal(true);
  };

  const handleSubmitBlockInterval = async (formState: ProfessionalAgendaBlockIntervalForm) => {
    if (timeToMinutes(formState.endTime) <= timeToMinutes(formState.startTime)) {
      alert('O horário final deve ser maior que o horário inicial.');
      return;
    }

    const savedInterval = await saveBlockedInterval(formState);

    if (!savedInterval) {
      return;
    }

    setBlockedIntervals((currentIntervals) => [
      ...currentIntervals.filter((blockedInterval) => blockedInterval.id !== savedInterval.id),
      savedInterval
    ]);

    setShowBlockIntervalModal(false);
  };

  const handleAddExtraTime = () => {
    setShowExtraTimeModal(true);
  };

  const handleSubmitExtraTime = (formState: ProfessionalAgendaExtraTimeForm) => {
    const extraTimeExists = extraTimes.some((extraTime) => {
      return (
        extraTime.professionalId === professional.id &&
        extraTime.date === selectedDate &&
        extraTime.time === formState.time
      );
    });

    if (extraTimeExists) {
      alert('Este horário extra já foi adicionado.');
      return;
    }

    setExtraTimes((currentExtraTimes) => [
      ...currentExtraTimes,
      {
        id: `${professional.id}-${selectedDate}-${formState.time}-extra`,
        professionalId: professional.id,
        date: selectedDate,
        time: formState.time
      }
    ]);

    setShowExtraTimeModal(false);
  };

  const handleAddManualAppointmentAtTime = (time: string) => {
    if (!onOpenManualAppointmentAtDateTime) {
      return;
    }

    onOpenManualAppointmentAtDateTime(selectedDate, time);
  };

  const renderDayAgendaContent = () => {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-orange-600" />

              <h3 className="text-lg font-black text-neutral-950">
                Agenda de {formatDateBr(selectedDate)}
              </h3>
            </div>

            <p className="text-xs text-neutral-500 mt-1">
              {professional.name} • horários em ordem vertical.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleOpenDay}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition"
            >
              Abrir agenda do dia
            </button>

            <button
              type="button"
              onClick={handleCloseDay}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition"
            >
              Fechar agenda do dia
            </button>

            <button
              type="button"
              onClick={handleBlockInterval}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 border hover:bg-neutral-200 transition"
            >
              Bloquear intervalo
            </button>

            <button
              type="button"
              onClick={handleAddExtraTime}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition"
            >
              Adicionar horário
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
            <span className="text-[10px] font-black text-green-700 uppercase font-mono">
              Confirmados
            </span>

            <strong className="block text-xl text-green-800">
              {summary.confirmed}
            </strong>
          </div>

          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3">
            <span className="text-[10px] font-black text-yellow-700 uppercase font-mono">
              Não confirmados
            </span>

            <strong className="block text-xl text-yellow-800">
              {summary.notConfirmed}
            </strong>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3">
            <span className="text-[10px] font-black text-orange-700 uppercase font-mono">
              Em atendimento
            </span>

            <strong className="block text-xl text-orange-800">
              {summary.attending}
            </strong>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
            <span className="text-[10px] font-black text-red-700 uppercase font-mono">
              Faltas
            </span>

            <strong className="block text-xl text-red-800">
              {summary.absent}
            </strong>
          </div>

          <div className="bg-white border rounded-2xl p-3">
            <span className="text-[10px] font-black text-neutral-500 uppercase font-mono">
              Livres
            </span>

            <strong className="block text-xl text-neutral-900">
              {summary.free}
            </strong>
          </div>

          <div className="bg-neutral-100 border border-neutral-200 rounded-2xl p-3">
            <span className="text-[10px] font-black text-neutral-500 uppercase font-mono">
              Bloqueados
            </span>

            <strong className="block text-xl text-neutral-900">
              {summary.blocked}
            </strong>
          </div>
        </div>

        <div className="space-y-2">
          {timeSlots.length === 0 ? (
            <div className="border border-dashed rounded-2xl p-10 text-center">
              <Clock className="w-8 h-8 text-neutral-300 mx-auto" />

              <p className="text-sm font-bold text-neutral-700 mt-3">
                Nenhum horário gerado para este dia.
              </p>

              <p className="text-xs text-neutral-400 mt-1">
                Clique em "Abrir agenda do dia" para gerar os horários disponíveis.
              </p>
            </div>
          ) : (
            timeSlots.map((slot: ProfessionalAgendaTimeSlot) => (
              <ProfessionalAgendaSlotRow
                key={slot.id}
                slot={slot}
                professional={professional}
                selectedDate={selectedDate}
                onBlockTime={handleBlockTime}
                onReleaseTime={handleReleaseTime}
                onAddManualAppointmentAtTime={handleAddManualAppointmentAtTime}
                onModifyAppointment={onModifyAppointment}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-neutral-950 tracking-tight">
                Minha Agenda
              </h2>

              <p className="text-xs text-neutral-500 mt-1">
                No celular, toque em um dia da lista. No computador, clique no calendário para abrir, fechar, bloquear horários ou agendar cliente.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousMonth}
                className="p-2 rounded-xl border bg-white hover:bg-neutral-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-black text-neutral-900 min-w-[150px] text-center capitalize">
                {getMonthLabel(currentMonthDate)}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl border bg-white hover:bg-neutral-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="md:hidden space-y-2">
            {calendarDays
              .filter((day) => day.isCurrentMonth)
              .map((day) => (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => handleSelectCalendarDay(day.dateStr)}
                  className={`w-full rounded-2xl border p-4 text-left transition flex items-center gap-3 ${
                    day.dateStr === selectedDate
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center shrink-0 ${
                    day.isToday
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                  }`}>
                    <span className="text-[10px] font-black uppercase leading-none">
                      {day.weekDayLabel}
                    </span>

                    <span className="text-xl font-black leading-none mt-1">
                      {day.dayNumber}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black ${getCalendarDayStatusClassName(day.status)}`}>
                        {getCalendarDayStatusLabel(day.status)}
                      </span>

                      {day.isToday && (
                        <span className="text-[10px] font-black text-orange-600 uppercase">
                          Hoje
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-black text-neutral-900 mt-1">
                      {formatDateBr(day.dateStr)}
                    </p>

                    <p className="text-xs text-neutral-500 mt-0.5">
                      {day.totalAppointments} agendamento(s) • {day.freeSlots} horário(s) livres
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-orange-600 shrink-0" />
                </button>
              ))}
          </div>

          <div className="hidden md:grid grid-cols-7 gap-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayLabel) => (
              <div
                key={dayLabel}
                className="text-center text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono py-1"
              >
                {dayLabel}
              </div>
            ))}

            {calendarDays.map((day) => (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => handleSelectCalendarDay(day.dateStr)}
                className={getCalendarDayClassName(day, selectedDate)}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-black ${day.isToday ? 'text-orange-600' : 'text-neutral-900'}`}>
                    {day.dayNumber}
                  </span>

                  {day.isToday && (
                    <span className="text-[9px] font-black text-orange-600 uppercase">
                      Hoje
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black ${getCalendarDayStatusClassName(day.status)}`}>
                    {getCalendarDayStatusLabel(day.status)}
                  </span>

                  <span className="text-[9px] text-neutral-400 block">
                    {day.totalAppointments} ag. • {day.freeSlots} livres
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="hidden md:flex flex-wrap gap-2 text-[10px] font-bold text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
              Aberta
            </span>

            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
              Parcial
            </span>

            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-200" />
              Esgotado
            </span>

            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-white border border-neutral-200" />
              Fechada
            </span>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <CalendarDays className="w-5 h-5 text-orange-600 mt-0.5" />

            <div>
              <h3 className="text-sm font-black text-orange-950">
                Como usar a agenda
              </h3>

              <p className="text-xs text-orange-800 mt-1 leading-relaxed">
                Toque no dia desejado. Uma janela será aberta com todos os horários, ações de abrir/fechar agenda, bloqueios e agendamento manual.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDayAgendaModal && (
        <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl shadow-2xl border flex flex-col">
            <div className="p-5 border-b bg-neutral-50 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-neutral-950">
                  Gerenciar agenda do dia
                </h2>

                <p className="text-xs text-neutral-500 mt-1">
                  Faça os ajustes do dia selecionado de forma simples e prática.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDayAgendaModal(false)}
                className="p-2 rounded-xl hover:bg-neutral-200 transition text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto">
              {renderDayAgendaContent()}
            </div>
          </div>
        </div>
      )}

      {showBlockIntervalModal && (
        <ProfessionalAgendaBlockIntervalModal
          onClose={() => setShowBlockIntervalModal(false)}
          onSubmit={handleSubmitBlockInterval}
        />
      )}

      {blockTimeSlot && (
        <ProfessionalAgendaBlockTimeModal
          startTime={blockTimeSlot.startTime}
          endTime={blockTimeSlot.endTime}
          onClose={() => setBlockTimeSlot(null)}
          onSubmit={handleSubmitBlockTime}
        />
      )}

      {showExtraTimeModal && (
        <ProfessionalAgendaExtraTimeModal
          onClose={() => setShowExtraTimeModal(false)}
          onSubmit={handleSubmitExtraTime}
        />
      )}
    </>
  );
}