import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Lock
} from 'lucide-react';

import {
  Appointment,
  Professional
} from '../../../types';

import { supabase } from '../../../lib/supabase';

import { formatDateBr } from '../owner.utils';

import {
  AgendaBlockedInterval,
  AgendaScheduleDay,
  addDays,
  getAppointmentDate,
  getAppointmentTime,
  getCurrentTimeInMinutes,
  getWeekDayShortLabel,
  isDateOutsideProfessionalRegularSchedule,
  isScheduleDayOpen,
  isValidUuid,
  minutesToTime,
  normalizeAgendaScheduleDay,
  slotOverlapsBlockedInterval,
  timeToMinutes
} from './agenda.utils';

interface ProfessionalAgendaViewProps {
  context: any;
}

export default function ProfessionalAgendaView({
  context
}: ProfessionalAgendaViewProps) {
  const [scheduleBlockActionLoading, setScheduleBlockActionLoading] = useState(false);
  const [scheduleBlockRequest, setScheduleBlockRequest] = useState<{
    action: "block" | "unblock";
    start: number;
    end: number;
    blockId?: string;
  } | null>(null);

  const {
    agendaLookaheadDays,
    appointments,
    blockedIntervals,
    onOpenRescheduleAppointment,
    onUpdateAppointmentStatus,
    openDays,
    outsideScaleConfirmRequest,
    scheduleDayActionLoading,
    selectedDate,
    selectedProfessional,
    selectedProfessionalId,
    services,
    setClientName,
    setClientNotes,
    setClientPhone,
    setCurrentStep,
    setBlockedIntervals,
    setOpenDays,
    setOutsideScaleConfirmRequest,
    setScheduleDayActionLoading,
    setSelectedDate,
    setSelectedProfessionalId,
    setSelectedServiceId,
    setSelectedTime,
    setShowPastProfessionalAgendaSlots,
    showPastProfessionalAgendaSlots,
    todayStr
  } = context;

  const visibleOwnerAgendaDays = useMemo(() => {
    const configuredDays = Number(agendaLookaheadDays);
    const safeDays = Number.isFinite(configuredDays) && configuredDays > 0
      ? Math.min(Math.floor(configuredDays), 90)
      : 10;

    return Array.from({ length: safeDays }, (_, index) => {
      return addDays(todayStr, index);
    });
  }, [
    agendaLookaheadDays,
    todayStr
  ]);

  useEffect(() => {
    if (
      !selectedDate ||
      selectedDate < todayStr ||
      !visibleOwnerAgendaDays.includes(selectedDate)
    ) {
      setSelectedDate(todayStr);
    }
  }, [
    selectedDate,
    setSelectedDate,
    todayStr,
    visibleOwnerAgendaDays
  ]);

const renderProfessionalAgenda = () => {
    if (!selectedProfessional) {
      return (
        <div className="rounded-2xl border border-dashed bg-neutral-50 p-8 text-center">
          <p className="text-sm font-extrabold text-neutral-800">
            Profissional não selecionado.
          </p>
        </div>
      );
    }

    const selectedDateSafe = selectedDate || todayStr;
    const selectedScheduleDayOpen = isScheduleDayOpen({
      openDays,
      professional: selectedProfessional,
      date: selectedDateSafe,
    });
    const selectedDateOutsideRegularSchedule = isDateOutsideProfessionalRegularSchedule({
      professional: selectedProfessional,
      date: selectedDateSafe,
    });

    const updateLocalScheduleDay = (scheduleDay: AgendaScheduleDay) => {
      setOpenDays((currentDays: AgendaScheduleDay[]) => {
        const nextMap = new Map<string, AgendaScheduleDay>();

        currentDays.forEach((currentDay: any) => {
          const key = currentDay.id || `${currentDay.professionalId}-${currentDay.date}`;
          nextMap.set(key, currentDay);
        });

        const nextKey = scheduleDay.id || `${scheduleDay.professionalId}-${scheduleDay.date}`;
        nextMap.set(nextKey, scheduleDay);

        return Array.from(nextMap.values());
      });
    };

    const submitScheduleDayUpdate = async (status: "open" | "closed") => {
      if (scheduleDayActionLoading) {
        return;
      }

      const isOpeningOutsideRegularSchedule =
        status === "open" && selectedDateOutsideRegularSchedule;

      setScheduleDayActionLoading(true);

      if (!isValidUuid(selectedProfessional.id)) {
        updateLocalScheduleDay({
          id: `local-${selectedProfessional.id}-${selectedDateSafe}`,
          professionalId: selectedProfessional.id,
          date: selectedDateSafe,
          status,
          isOutOfRegularSchedule: isOpeningOutsideRegularSchedule,
        });

        setScheduleDayActionLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("upsert_my_professional_schedule_day", {
        p_professional_id: selectedProfessional.id,
        p_date: selectedDateSafe,
        p_status: status,
        p_is_out_of_regular_schedule: isOpeningOutsideRegularSchedule,
      });

      setScheduleDayActionLoading(false);

      if (error) {
        alert(error.message || "Não foi possível atualizar a abertura da agenda.");
        return;
      }

      const firstRow = Array.isArray(data) ? data[0] : data;

      updateLocalScheduleDay(
        normalizeAgendaScheduleDay({
          ...(firstRow || {}),
          professional_id: selectedProfessional.id,
          date: selectedDateSafe,
          status,
          is_out_of_regular_schedule: isOpeningOutsideRegularSchedule,
        } as Record<string, unknown>),
      );
    };

    const handleUpdateScheduleDay = async (status: "open" | "closed") => {
      const isOpeningOutsideRegularSchedule =
        status === "open" && selectedDateOutsideRegularSchedule;

      if (isOpeningOutsideRegularSchedule) {
        setOutsideScaleConfirmRequest("singleOpen");
        return;
      }

      await submitScheduleDayUpdate(status);
    };

    const handleConfirmOutsideScale = async () => {
      setOutsideScaleConfirmRequest(null);
      await submitScheduleDayUpdate("open");
    };

    const professionalRecord = selectedProfessional as Professional & {
      noLunchBreak?: boolean;
      defaultAppointmentDuration?: number;
    };
    const slotStepMinutes = Math.max(
      15,
      Number(professionalRecord.defaultAppointmentDuration) || 30,
    );
    const workStart = timeToMinutes(selectedProfessional.workHoursStart);
    const workEnd = timeToMinutes(selectedProfessional.workHoursEnd);
    const lunchStart = timeToMinutes(selectedProfessional.lunchStart);
    const lunchEnd = timeToMinutes(selectedProfessional.lunchEnd);
    const hasLunchBreak = !professionalRecord.noLunchBreak;

    const professionalAppointments = appointments
      .filter((appointment: any) => {
        return (
          appointment.professionalId === selectedProfessionalId &&
          getAppointmentDate(appointment) === selectedDateSafe
        );
      })
      .sort((first: Appointment, second: Appointment) =>
        getAppointmentTime(first).localeCompare(getAppointmentTime(second)),
      );

    const nonBlockingAppointmentStatuses = ["cancelled", "absent", "rescheduled"];

    const blockingAppointments = professionalAppointments.filter(
      (appointment: any) => !nonBlockingAppointmentStatuses.includes(appointment.status),
    );

    const historicalAppointments = professionalAppointments.filter((appointment: any) => {
      return nonBlockingAppointmentStatuses.includes(appointment.status);
    });

    const getHistoricalAppointmentsForStartMinute = (startMinute: number) => {
      return historicalAppointments.filter((appointment: any) => {
        return timeToMinutes(getAppointmentTime(appointment)) === startMinute;
      });
    };

    const getAppointmentService = (appointment: Appointment) => {
      return services.find((item: any) => item.id === appointment.serviceId);
    };

    const getAppointmentEndMinute = (appointment: Appointment) => {
      const appointmentService = getAppointmentService(appointment);
      return getAppointmentStartMinute(appointment) + (appointmentService?.duration || slotStepMinutes);
    };

    const getAppointmentStartMinute = (appointment: Appointment) => {
      return timeToMinutes(getAppointmentTime(appointment));
    };

    const getAppointmentCardClassName = (status: Appointment["status"]) => {
      if (status === "confirmed") {
        return "border-emerald-200 bg-emerald-50/80 shadow-emerald-950/5";
      }

      if (status === "cancelled") {
        return "border-neutral-300 bg-neutral-100/90 shadow-neutral-950/5 opacity-90";
      }

      if (status === "absent") {
        return "border-red-200 bg-red-50/85 shadow-red-950/5";
      }

      if (status === "completed") {
        return "border-sky-200 bg-sky-50/80 shadow-sky-950/5";
      }

      return "border-amber-200 bg-amber-50/85 shadow-amber-950/5";
    };

    const getAppointmentFooterLabel = (status: Appointment["status"]) => {
      if (status === "confirmed") return "CLIENTE CONFIRMOU PRESENÇA";
      if (status === "cancelled") return "ATENDIMENTO CANCELADO";
      if (status === "absent") return "CLIENTE FALTOU";
      if (status === "rescheduled") return "ATENDIMENTO REMARCADO";
      if (status === "completed") return "ATENDIMENTO FINALIZADO";
      return "AGUARDANDO CONFIRMAÇÃO";
    };

    const getAppointmentFooterClassName = (status: Appointment["status"]) => {
      if (status === "confirmed") return "text-emerald-800";
      if (status === "cancelled") return "text-neutral-600";
      if (status === "absent") return "text-red-800";
      if (status === "rescheduled") return "text-orange-800";
      if (status === "completed") return "text-sky-800";
      return "text-amber-800";
    };

    const handleStatusAction = (
      appointmentId: string,
      status: Appointment["status"],
    ) => {
      if (onUpdateAppointmentStatus) {
        onUpdateAppointmentStatus(appointmentId, status);
      }
    };

    const isTodayPastSlot = (slotStart: number) => {
      return selectedDateSafe === todayStr && slotStart <= getCurrentTimeInMinutes();
    };

    const daySlots = [] as Array<{
      key: string;
      start: number;
      end: number;
      type: "appointment" | "occupied" | "lunch" | "free" | "past" | "blocked";
      appointment?: Appointment;
      blockedInterval?: AgendaBlockedInterval;
      occupyingAppointment?: Appointment;
      historicalAppointments?: Appointment[];
    }>;

    for (let minute = workStart; minute < workEnd; minute += slotStepMinutes) {
      const slotEnd = Math.min(minute + slotStepMinutes, workEnd);
      const appointmentStartingHere = blockingAppointments.find(
        (appointment: any) => getAppointmentStartMinute(appointment) === minute,
      );
      const slotHistoricalAppointments = getHistoricalAppointmentsForStartMinute(minute);
      const blockingAppointmentStartingHere = blockingAppointments.find(
        (appointment: any) => getAppointmentStartMinute(appointment) === minute,
      );
      const occupyingAppointment = blockingAppointments.find((appointment: any) => {
        const appointmentStart = getAppointmentStartMinute(appointment);
        const appointmentEnd = getAppointmentEndMinute(appointment);

        return appointmentStart < slotEnd && appointmentEnd > minute;
      });
      const overlapsLunch = hasLunchBreak && minute < lunchEnd && slotEnd > lunchStart;
      const blockedInterval = slotOverlapsBlockedInterval({
        blockedIntervals,
        professionalId: selectedProfessional.id,
        date: selectedDateSafe,
        slotStart: minute,
        slotEnd
      });

      if (appointmentStartingHere) {
        daySlots.push({
          key: `appointment-${appointmentStartingHere.id}`,
          start: minute,
          end: getAppointmentEndMinute(appointmentStartingHere),
          type: "appointment",
          appointment: appointmentStartingHere,
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      if (occupyingAppointment && !blockingAppointmentStartingHere) {
        daySlots.push({
          key: `occupied-${occupyingAppointment.id}-${minute}`,
          start: minute,
          end: slotEnd,
          type: "occupied",
          occupyingAppointment,
        });
        continue;
      }

      if (!selectedScheduleDayOpen) {
        daySlots.push({
          key: `closed-${selectedProfessional.id}-${selectedDateSafe}-${minute}`,
          start: minute,
          end: slotEnd,
          type: "blocked",
          blockedInterval: {
            id: `closed-${selectedProfessional.id}-${selectedDateSafe}`,
            professionalId: selectedProfessional.id,
            date: selectedDateSafe,
            startTime: minutesToTime(minute),
            endTime: minutesToTime(slotEnd),
            reason: "Agenda fechada. Abra este dia para permitir agendamentos.",
          },
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      if (blockedInterval) {
        daySlots.push({
          key: `blocked-${blockedInterval.id}-${minute}`,
          start: minute,
          end: slotEnd,
          type: "blocked",
          blockedInterval,
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      if (overlapsLunch) {
        daySlots.push({
          key: `lunch-${minute}`,
          start: minute,
          end: slotEnd,
          type: "lunch",
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      if (isTodayPastSlot(minute)) {
        daySlots.push({
          key: `past-${minute}`,
          start: minute,
          end: slotEnd,
          type: "past",
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      daySlots.push({
        key: `free-${minute}`,
        start: minute,
        end: slotEnd,
        type: "free",
        historicalAppointments: slotHistoricalAppointments,
      });
    }

    const confirmedCount = professionalAppointments.filter(
      (appointment: any) => appointment.status === "confirmed",
    ).length;
    const pendingCount = professionalAppointments.filter(
      (appointment: any) => appointment.status === "scheduled",
    ).length;
    const absentCount = professionalAppointments.filter(
      (appointment: any) => appointment.status === "absent",
    ).length;
    const freeCount = daySlots.filter((slot: any) => slot.type === "free").length;
    const blockedCount = daySlots.filter(
      (slot: any) => slot.type === "lunch" || slot.type === "past" || slot.type === "blocked",
    ).length;

    const currentDayMinute = getCurrentTimeInMinutes();
    const shouldSeparatePastSlot = (slot: (typeof daySlots)[number]) => {
      if (selectedDateSafe !== todayStr) {
        return false;
      }

      return slot.end <= currentDayMinute;
    };
    const pastDaySlots = daySlots.filter(shouldSeparatePastSlot);
    const currentAndFutureDaySlots = daySlots.filter((slot: any) => {
      return !shouldSeparatePastSlot(slot);
    });
    const slotsToRender = showPastProfessionalAgendaSlots
      ? daySlots
      : currentAndFutureDaySlots;

    const handleCreateAppointmentFromFreeSlot = (startMinute: number) => {
      setSelectedProfessionalId(selectedProfessional.id);
      setSelectedDate(selectedDateSafe);
      setSelectedTime(minutesToTime(startMinute));
      setSelectedServiceId("");
      setClientName("");
      setClientPhone("");
      setClientNotes("");
      setCurrentStep("selectService");
    };

    const submitScheduleBlockAction = async () => {
      if (!scheduleBlockRequest || scheduleBlockActionLoading) {
        return;
      }

      const request = scheduleBlockRequest;

      if (!isValidUuid(selectedProfessional.id)) {
        alert("Não foi possível identificar o profissional para alterar o bloqueio.");
        return;
      }

      setScheduleBlockActionLoading(true);

      if (request.action === "unblock") {
        if (!request.blockId) {
          setScheduleBlockActionLoading(false);
          setScheduleBlockRequest(null);
          return;
        }

        const { error } = await supabase.rpc("delete_my_professional_schedule_block", {
          p_block_id: request.blockId,
        });

        setScheduleBlockActionLoading(false);

        if (error) {
          alert(error.message || "Não foi possível desbloquear este horário.");
          return;
        }

        setBlockedIntervals((currentIntervals: AgendaBlockedInterval[]) => {
          return currentIntervals.filter((interval) => {
            return interval.id !== request.blockId;
          });
        });
        setScheduleBlockRequest(null);
        return;
      }

      const startTime = minutesToTime(request.start);
      const endTime = minutesToTime(request.end);
      const reason = "Bloqueio manual";

      const { data, error } = await supabase.rpc(
        "upsert_my_professional_schedule_block",
        {
          p_professional_id: selectedProfessional.id,
          p_date: selectedDateSafe,
          p_start_time: startTime,
          p_end_time: endTime,
          p_reason: reason,
        },
      );

      setScheduleBlockActionLoading(false);

      if (error) {
        alert(error.message || "Não foi possível bloquear este horário.");
        return;
      }

      const firstRow = Array.isArray(data) ? data[0] : data;

      if (!firstRow?.id) {
        alert("O bloqueio foi processado, mas o banco não retornou o registro criado.");
        return;
      }

      const savedInterval: AgendaBlockedInterval = {
        id: String(firstRow.id),
        professionalId: String(
          firstRow.professional_id || selectedProfessional.id,
        ),
        date: String(firstRow.date || selectedDateSafe),
        startTime: String(firstRow.start_time || startTime).slice(0, 5),
        endTime: String(firstRow.end_time || endTime).slice(0, 5),
        reason: String(firstRow.reason || reason),
      };

      setBlockedIntervals((currentIntervals: AgendaBlockedInterval[]) => {
        const nextIntervals = currentIntervals.filter((interval) => {
          return interval.id !== savedInterval.id;
        });

        return [...nextIntervals, savedInterval];
      });
      setScheduleBlockRequest(null);
    };

    const renderHistoricalAppointments = (historyItems: Appointment[] = []) => {
      if (historyItems.length === 0) {
        return null;
      }

      return (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 px-3 py-2 opacity-75">
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">
            Histórico do horário
          </p>

          <div className="mt-1 space-y-1">
            {historyItems.map((historyAppointment: any) => {
              const historyService = getAppointmentService(historyAppointment);
              const statusLabel = getAppointmentFooterLabel(historyAppointment.status);

              return (
                <p
                  key={historyAppointment.id}
                  className="text-xs font-semibold text-neutral-500 line-through decoration-neutral-300"
                >
                  {historyAppointment.clientName} — {statusLabel.toLowerCase()}
                  {historyService?.name ? ` · ${historyService.name}` : ""}
                </p>
              );
            })}
          </div>
        </div>
      );
    };

    const renderAppointmentSlot = (
      appointment: Appointment,
      historyItems: Appointment[] = [],
    ) => {
      const service = getAppointmentService(appointment);
      const disabledActions = !onUpdateAppointmentStatus;

      return (
        <div
          key={appointment.id}
          className={`rounded-2xl border p-4 shadow-sm transition ${getAppointmentCardClassName(appointment.status)}`}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[96px_1fr_auto] xl:items-center">
            <div className="flex items-center gap-3 xl:block">
              <span className="block rounded-2xl bg-white/80 px-4 py-3 text-center font-mono text-2xl font-extrabold leading-none tracking-[-0.04em] text-neutral-950 shadow-sm ring-1 ring-black/5">
                {getAppointmentTime(appointment)}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">
                Cliente: <span className="text-neutral-950">{appointment.clientName}</span>
              </p>

              <h4 className="mt-2 break-words text-lg font-extrabold leading-tight tracking-[-0.03em] text-neutral-950">
                {service?.name || "Serviço não localizado"}
              </h4>

              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                Profissional: {selectedProfessional.name}
              </p>

              {appointment.clientPhone && (
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  WhatsApp: {appointment.clientPhone}
                </p>
              )}

              {appointment.notes && (
                <p className="mt-2 rounded-xl bg-white/65 px-3 py-2 text-xs font-medium leading-relaxed text-neutral-600 ring-1 ring-black/5">
                  {appointment.notes}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[460px]">
              <button
                type="button"
                disabled={disabledActions || appointment.status === "confirmed"}
                onClick={() => handleStatusAction(appointment.id, "confirmed")}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                  disabledActions || appointment.status === "confirmed"
                    ? "cursor-not-allowed bg-emerald-100 text-emerald-700"
                    : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                }`}
              >
                Confirmar
              </button>

              <button
                type="button"
                disabled={!onOpenRescheduleAppointment}
                onClick={() => onOpenRescheduleAppointment?.(appointment)}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                  onOpenRescheduleAppointment
                    ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700"
                    : "cursor-not-allowed bg-orange-100 text-orange-400"
                }`}
              >
                Reagendar
              </button>

              <button
                type="button"
                disabled={disabledActions || appointment.status === "cancelled"}
                onClick={() => handleStatusAction(appointment.id, "cancelled")}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                  disabledActions || appointment.status === "cancelled"
                    ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
                    : "bg-neutral-800 text-white shadow-sm hover:bg-neutral-900"
                }`}
              >
                Cancelou
              </button>

              <button
                type="button"
                disabled={disabledActions || appointment.status === "absent"}
                onClick={() => handleStatusAction(appointment.id, "absent")}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                  disabledActions || appointment.status === "absent"
                    ? "cursor-not-allowed bg-red-100 text-red-700"
                    : "bg-red-700 text-white shadow-sm hover:bg-red-800"
                }`}
              >
                Faltou
              </button>
            </div>
          </div>

          {renderHistoricalAppointments(historyItems)}

          <div
            className={`mt-3 border-t border-black/5 pt-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] ${getAppointmentFooterClassName(appointment.status)}`}
          >
            {getAppointmentFooterLabel(appointment.status)}
          </div>
        </div>
      );
    };

    return (
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b bg-gradient-to-r from-white via-white to-slate-50 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                  {selectedProfessional.avatar ? (
                    <img
                      src={selectedProfessional.avatar}
                      alt={selectedProfessional.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-black text-slate-600">
                      {selectedProfessional.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0f4c5c]">
                    Agenda profissional
                  </p>

                  <h3 className="mt-1 truncate text-xl font-extrabold tracking-tight text-neutral-950">
                    {selectedProfessional.name}
                  </h3>

                  <p className="mt-1 text-xs font-semibold text-neutral-500">
                    {selectedProfessional.role || "Especialidade não informada"}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                      selectedScheduleDayOpen
                        ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                        : "border-red-200 bg-red-100 text-red-800"
                    }`}>
                      {selectedScheduleDayOpen ? "Agenda aberta" : "Agenda fechada"}
                    </span>

                    {selectedScheduleDayOpen && selectedDateOutsideRegularSchedule && (
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                        Fora da escala
                      </span>
                    )}

                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                      {selectedProfessional.workHoursStart} às {selectedProfessional.workHoursEnd}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  disabled={scheduleDayActionLoading || selectedScheduleDayOpen}
                  onClick={() => handleUpdateScheduleDay("open")}
                  className={`min-w-[130px] rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                    selectedScheduleDayOpen
                      ? "cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
                  }`}
                >
                  {scheduleDayActionLoading ? "Processando..." : "Abrir dia"}
                </button>

                <button
                  type="button"
                  disabled={scheduleDayActionLoading || !selectedScheduleDayOpen}
                  onClick={() => handleUpdateScheduleDay("closed")}
                  className={`min-w-[130px] rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                    !selectedScheduleDayOpen
                      ? "cursor-not-allowed border border-neutral-200 bg-neutral-100 text-neutral-400"
                      : "bg-neutral-900 text-white shadow-sm hover:bg-black"
                  }`}
                >
                  {scheduleDayActionLoading ? "Processando..." : "Fechar dia"}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {visibleOwnerAgendaDays.map((dateOption: string) => {
                  const isSelected = selectedDateSafe === dateOption;

                  return (
                    <button
                      key={dateOption}
                      type="button"
                      onClick={() => setSelectedDate(dateOption)}
                      className={`min-w-[82px] rounded-xl border px-3 py-2 text-center transition ${
                        isSelected
                          ? "border-orange-600 bg-orange-600 text-white shadow-sm"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-[#0f4c5c]/40 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider">
                        {dateOption === todayStr ? "Hoje" : getWeekDayShortLabel(dateOption)}
                      </span>

                      <strong className="mt-0.5 block text-xs font-extrabold">
                        {formatDateBr(dateOption).slice(0, 5)}
                      </strong>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 p-3">
          {pastDaySlots.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPastProfessionalAgendaSlots((current: any) => !current)}
              className="w-full rounded-xl border border-[#0f4c5c]/20 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-[#0f4c5c] transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5"
            >
              {showPastProfessionalAgendaSlots
                ? "Ocultar horários anteriores"
                : `+ Ver horários anteriores (${pastDaySlots.length})`}
            </button>
          )}

          {showPastProfessionalAgendaSlots && pastDaySlots.length > 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Horários anteriores do dia
              </p>
            </div>
          )}

          {slotsToRender.map((slot: any) => {
            if (slot.type === "appointment" && slot.appointment) {
              return renderAppointmentSlot(slot.appointment, slot.historicalAppointments || []);
            }

            if (slot.type === "occupied" && slot.occupyingAppointment) {
              const service = getAppointmentService(slot.occupyingAppointment);
              return (
                <div key={slot.key} className="grid grid-cols-[90px_1fr] gap-4 rounded-2xl border border-neutral-200 bg-neutral-100 p-3 opacity-80">
                  <div className="font-mono">
                    <strong className="block text-lg text-neutral-500">{minutesToTime(slot.start)}</strong>
                    <span className="text-[11px] text-neutral-400">até {minutesToTime(slot.end)}</span>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-neutral-600">Ocupado pelo atendimento anterior</strong>
                    <p className="mt-1 text-xs font-medium text-neutral-500">
                      {service?.name || "Atendimento"} ocupa este bloco de horário.
                    </p>
                  </div>
                </div>
              );
            }


            if (slot.type === "blocked") {
              const blockId = String(slot.blockedInterval?.id || "");
              const canUnblock = Boolean(blockId) && !blockId.startsWith("closed-");

              return (
                <div key={slot.key} className="grid grid-cols-[90px_1fr] gap-4 rounded-2xl border border-neutral-300 bg-neutral-100 p-3 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                  <div className="font-mono">
                    <strong className="block text-lg text-neutral-700">{minutesToTime(slot.start)}</strong>
                    <span className="text-[11px] text-neutral-500">até {minutesToTime(slot.end)}</span>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-neutral-800">Bloqueado</strong>
                    <p className="mt-1 text-xs font-medium text-neutral-600">
                      {slot.blockedInterval?.reason || "Horário bloqueado na agenda do profissional."}
                    </p>
                    {renderHistoricalAppointments(slot.historicalAppointments || [])}
                  </div>
                  {canUnblock && (
                    <button
                      type="button"
                      disabled={scheduleBlockActionLoading}
                      onClick={() => {
                        setScheduleBlockRequest({
                          action: "unblock",
                          start: slot.start,
                          end: slot.end,
                          blockId,
                        });
                      }}
                      className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-extrabold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Desbloquear
                    </button>
                  )}
                </div>
              );
            }

            if (slot.type === "lunch") {
              return (
                <div key={slot.key} className="grid grid-cols-[90px_1fr] gap-4 rounded-2xl border border-orange-100 bg-[#0f4c5c]/5/70 p-3">
                  <div className="font-mono">
                    <strong className="block text-lg text-[#0f4c5c]">{minutesToTime(slot.start)}</strong>
                    <span className="text-[11px] text-orange-500">até {minutesToTime(slot.end)}</span>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-orange-800">Intervalo de almoço</strong>
                    <p className="mt-1 text-xs font-medium text-[#0f4c5c]">Horário bloqueado pelo intervalo cadastrado.</p>
                  </div>
                </div>
              );
            }

            if (slot.type === "past") {
              return (
                <div key={slot.key} className="grid grid-cols-[90px_1fr] gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 opacity-60">
                  <div className="font-mono">
                    <strong className="block text-lg text-neutral-500">{minutesToTime(slot.start)}</strong>
                    <span className="text-[11px] text-neutral-400">até {minutesToTime(slot.end)}</span>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-neutral-600">Horário passado</strong>
                    <p className="mt-1 text-xs font-medium text-neutral-500">Este horário não pode mais receber agendamento.</p>
                    {renderHistoricalAppointments(slot.historicalAppointments || [])}
                  </div>
                </div>
              );
            }

            return (
              <div key={slot.key} className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200 bg-white p-3 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                <div className="font-mono">
                  <strong className="block text-lg text-neutral-950">{minutesToTime(slot.start)}</strong>
                  <span className="text-[11px] text-neutral-400">até {minutesToTime(slot.end)}</span>
                </div>

                <div>
                  <strong className="text-sm font-extrabold text-neutral-800">Livre</strong>
                  <p className="mt-1 text-xs font-medium text-neutral-500">Horário disponível para agendamento.</p>
                  {renderHistoricalAppointments(slot.historicalAppointments || [])}
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleCreateAppointmentFromFreeSlot(slot.start)}
                    className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-orange-700"
                  >
                    + Agendar
                  </button>

                  <button
                    type="button"
                    disabled={scheduleBlockActionLoading}
                    onClick={() => {
                      setScheduleBlockRequest({
                        action: "block",
                        start: slot.start,
                        end: slot.end,
                      });
                    }}
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-extrabold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Bloquear
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {scheduleBlockRequest && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-[#0f4c5c]/15 bg-white p-5 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f4c5c]/5 text-[#0f4c5c]">
                <Lock className="h-7 w-7" />
              </div>

              <h4 className="mt-4 text-lg font-extrabold text-neutral-950">
                {scheduleBlockRequest.action === "block"
                  ? "Bloquear este horário?"
                  : "Desbloquear este horário?"}
              </h4>

              <p className="mt-2 text-sm font-medium text-neutral-600">
                {formatDateBr(selectedDateSafe)} ·{" "}
                {minutesToTime(scheduleBlockRequest.start)} às{" "}
                {minutesToTime(scheduleBlockRequest.end)}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={scheduleBlockActionLoading}
                  onClick={submitScheduleBlockAction}
                  className="rounded-2xl bg-[#0f4c5c] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#123945] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {scheduleBlockActionLoading ? "Processando..." : "Sim"}
                </button>

                <button
                  type="button"
                  disabled={scheduleBlockActionLoading}
                  onClick={() => setScheduleBlockRequest(null)}
                  className="rounded-2xl bg-neutral-200 px-4 py-3 text-sm font-extrabold text-neutral-700 transition hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}

        {outsideScaleConfirmRequest && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-[#0f4c5c]/15 bg-white p-5 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f4c5c]/5 text-[#0f4c5c]">
                <AlertTriangle className="h-8 w-8" />
              </div>

              <h4 className="mt-4 text-lg font-extrabold text-neutral-950">
                Abrir agenda fora da escala?
              </h4>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmOutsideScale}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Sim
                </button>

                <button
                  type="button"
                  onClick={() => setOutsideScaleConfirmRequest(null)}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-red-700"
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  return renderProfessionalAgenda();
}
