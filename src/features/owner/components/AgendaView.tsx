/**
 * Coordenador da Agenda Geral do Painel do Dono - AgendaBless.
 */

import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  ArrowLeft
} from 'lucide-react';

import {
  Appointment,
  Client,
  EstablishmentConfig,
  Professional,
  Service
} from '../../../types';

import { formatDateBr } from '../owner.utils';
import { supabase } from '../../../lib/supabase';

import AgendaBookingFlow from '../agenda/AgendaBookingFlow';
import ProfessionalAgendaView from '../agenda/ProfessionalAgendaView';

import {
  AgendaBlockedInterval,
  AgendaCreateAppointmentPayload,
  AgendaCreateAppointmentResult,
  AgendaScheduleDay,
  AgendaStartMode,
  AgendaStep,
  AgendaViewProps,
  DEFAULT_LOOKAHEAD_DAYS,
  OutsideScaleConfirmRequest,
  addDays,
  checkProfessionalSlotAvailability,
  collectOwnerTenantSlugCandidates,
  formatPhoneInput,
  formatLocalDateStr,
  generateSlotsForSelection,
  getAppointmentDate,
  getTodayStr,
  mergeBlockedIntervals,
  mergeScheduleDays,
  normalizePhone,
  normalizeText,
  professionalCanDoService
} from '../agenda/agenda.utils';

export type {
  AgendaCreateAppointmentPayload,
  AgendaCreateAppointmentResult
} from '../agenda/agenda.utils';

function normalizeClientName(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trimStart()
    .toUpperCase();
}

export default function AgendaView({
  appointments,
  professionals,
  services,
  config,
  clients = [],
  quickOpenProfessionalAgendaId,
  quickOpenProfessionalAgendaKey,
  onCreateAppointment,
  onUpdateAppointmentStatus,
  onOpenRescheduleAppointment,
}: AgendaViewProps) {
  const [mode, setMode] = useState<AgendaStartMode | null>(null);
  const [currentStep, setCurrentStep] = useState<AgendaStep>("start");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [whatsAppConfirmUrl, setWhatsAppConfirmUrl] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [professionalSearch, setProfessionalSearch] = useState("");
  const viewTopRef = useRef<HTMLDivElement | null>(null);
  const [blockedIntervals, setBlockedIntervals] = useState<AgendaBlockedInterval[]>([]);
  const [outsideScaleConfirmRequest, setOutsideScaleConfirmRequest] =
    useState<OutsideScaleConfirmRequest>(null);
  const [scheduleExceptionConfirmRequest, setScheduleExceptionConfirmRequest] =
    useState<{
      type: 'overtime' | 'lunch_overlap';
      service: Service;
      serviceEndTime: string;
      workHoursStart: string;
      workHoursEnd: string;
      lunchStart: string;
      lunchEnd: string;
    } | null>(null);
  const [allowOvertimeForSelection, setAllowOvertimeForSelection] =
    useState(false);
  const [allowLunchOverlapForSelection, setAllowLunchOverlapForSelection] =
    useState(false);
  const [openDays, setOpenDays] = useState<AgendaScheduleDay[]>([]);
  const [scheduleDayActionLoading, setScheduleDayActionLoading] = useState(false);
  const [showPastProfessionalAgendaSlots, setShowPastProfessionalAgendaSlots] =
    useState(false);

  const todayStr = getTodayStr();


  useEffect(() => {
    let isMounted = true;

    async function loadBlockedIntervals() {
      const intervalsMap = new Map<string, AgendaBlockedInterval>();

      const myBlocksResult = await supabase.rpc("get_my_professional_schedule_blocks", {
        p_professional_id: null,
      });

      if (myBlocksResult.error) {
        console.error(
          "Erro ao carregar bloqueios da agenda pelo painel do dono:",
          myBlocksResult.error.message,
        );
      } else {
        mergeBlockedIntervals(intervalsMap, myBlocksResult.data);
      }

      const tenantSlugCandidates = collectOwnerTenantSlugCandidates(config);

      for (const slugCandidate of tenantSlugCandidates) {
        const publicBlocksResult = await supabase.rpc(
          "get_public_professional_schedule_blocks",
          {
            p_slug: slugCandidate,
          },
        );

        if (publicBlocksResult.error) {
          console.warn(
            `Não foi possível carregar bloqueios públicos para o slug ${slugCandidate}:`,
            publicBlocksResult.error.message,
          );
          continue;
        }

        mergeBlockedIntervals(intervalsMap, publicBlocksResult.data);
      }

      if (intervalsMap.size === 0) {
        const directBlocksResult = await supabase
          .from("professional_schedule_blocks")
          .select("id, professional_id, block_date, start_time, end_time, reason");

        if (directBlocksResult.error) {
          console.warn(
            "Não foi possível carregar bloqueios diretamente da tabela professional_schedule_blocks:",
            directBlocksResult.error.message,
          );
        } else {
          mergeBlockedIntervals(intervalsMap, directBlocksResult.data);
        }
      }

      const scheduleDaysMap = new Map<string, AgendaScheduleDay>();

      const myScheduleDaysResult = await supabase.rpc("get_my_professional_schedule_days", {
        p_professional_id: null,
      });

      if (myScheduleDaysResult.error) {
        console.error(
          "Erro ao carregar dias abertos da agenda pelo painel do dono:",
          myScheduleDaysResult.error.message,
        );
      } else {
        mergeScheduleDays(scheduleDaysMap, myScheduleDaysResult.data);
      }

      for (const slugCandidate of tenantSlugCandidates) {
        const publicScheduleDaysResult = await supabase.rpc(
          "get_public_professional_schedule_days",
          {
            p_slug: slugCandidate,
          },
        );

        if (publicScheduleDaysResult.error) {
          console.warn(
            `Não foi possível carregar dias abertos públicos para o slug ${slugCandidate}:`,
            publicScheduleDaysResult.error.message,
          );
          continue;
        }

        mergeScheduleDays(scheduleDaysMap, publicScheduleDaysResult.data);
      }

      if (!isMounted) return;

      setBlockedIntervals(Array.from(intervalsMap.values()));
      setOpenDays(Array.from(scheduleDaysMap.values()));
    }

    loadBlockedIntervals();

    return () => {
      isMounted = false;
    };
  }, [config]);

  useEffect(() => {
    if (!quickOpenProfessionalAgendaId) {
      return;
    }

    setMode("professionalAgenda");
    setCurrentStep("professionalAgenda");
    setSelectedProfessionalId(quickOpenProfessionalAgendaId);
    setSelectedServiceId("");
    setSelectedTime("");
    setSelectedDate(todayStr);
    setServiceSearch("");
    setProfessionalSearch("");
  }, [quickOpenProfessionalAgendaId, quickOpenProfessionalAgendaKey, todayStr]);

  useEffect(() => {
    if (currentStep !== "start") {
      viewTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [currentStep]);

  useEffect(() => {
    setShowPastProfessionalAgendaSlots(false);
  }, [selectedProfessionalId, selectedDate]);

  const agendaLookaheadDays = useMemo(() => {
    const configuredDays = Number(config.maxFutureDays);

    if (!Number.isFinite(configuredDays) || configuredDays <= 0) {
      return DEFAULT_LOOKAHEAD_DAYS;
    }

    return Math.min(Math.max(Math.floor(configuredDays), 1), 90);
  }, [config.maxFutureDays]);

  const dateOptions = useMemo(() => {
    return Array.from({ length: agendaLookaheadDays }, (_, index) => {
      return addDays(todayStr, index);
    });
  }, [agendaLookaheadDays, todayStr]);

  const activeServices = useMemo(() => {
    const normalizedSearch = normalizeText(serviceSearch);

    return services
      .filter((service) => service.active)
      .filter((service) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          normalizeText(service.name).includes(normalizedSearch) ||
          normalizeText(service.category).includes(normalizedSearch) ||
          normalizeText(service.description || "").includes(normalizedSearch)
        );
      })
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  }, [services, serviceSearch]);

  const activeProfessionals = useMemo(() => {
    const normalizedSearch = normalizeText(professionalSearch);

    return professionals
      .filter((professional) => professional.active)
      .filter((professional) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          normalizeText(professional.name).includes(normalizedSearch) ||
          normalizeText(professional.role).includes(normalizedSearch)
        );
      })
      .sort((first, second) => {
        const firstOrder = Number(first.displayOrder) || 999;
        const secondOrder = Number(second.displayOrder) || 999;

        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        return first.name.localeCompare(second.name, "pt-BR");
      });
  }, [professionals, professionalSearch]);

  const selectedService =
    services.find((service) => {
      return service.id === selectedServiceId;
    }) || null;

  const selectedProfessional =
    professionals.find((professional) => {
      return professional.id === selectedProfessionalId;
    }) || null;

  const servicesForSelectedProfessional = useMemo(() => {
    if (!selectedProfessional) {
      return activeServices;
    }

    return activeServices.filter((service) => {
      return professionalCanDoService({
        professional: selectedProfessional,
        service,
      });
    });
  }, [activeServices, selectedProfessional]);

  const professionalsForSelectedService = useMemo(() => {
    if (!selectedService) {
      return activeProfessionals;
    }

    return activeProfessionals.filter((professional) => {
      return professionalCanDoService({
        professional,
        service: selectedService,
      });
    });
  }, [activeProfessionals, selectedService]);

  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedProfessional || !selectedDate) {
      return [];
    }

    return generateSlotsForSelection({
      professional: selectedProfessional,
      service: selectedService,
      date: selectedDate,
      services,
      appointments,
      blockedIntervals,
      openDays,
    });
  }, [
    appointments,
    blockedIntervals,
    openDays,
    selectedClientId,
    selectedDate,
    selectedProfessional,
    selectedService,
    services,
  ]);

  const canGoClientData = Boolean(
    selectedService && selectedProfessional && selectedDate && selectedTime,
  );

  const canSubmit = Boolean(
    canGoClientData &&
    clientName.trim(),
  );

  const resetFlow = () => {
    setMode(null);
    setCurrentStep("start");
    setSelectedDate("");
    setSelectedServiceId("");
    setSelectedProfessionalId("");
    setSelectedTime("");
    setClientName("");
    setSelectedClientId("");
    setClientPhone("");
    setClientNotes("");
    setWhatsAppConfirmUrl("");
    setServiceSearch("");
    setProfessionalSearch("");
    setScheduleExceptionConfirmRequest(null);
    setAllowOvertimeForSelection(false);
    setAllowLunchOverlapForSelection(false);
  };

  const openProfessionalAgendaManager = (professionalId: string) => {
    resetFlow();
    setMode("professionalAgenda");
    setSelectedProfessionalId(professionalId);
    setSelectedServiceId("");
    setSelectedTime("");
    setSelectedDate(todayStr);
    setCurrentStep("professionalAgenda");
  };

  const startMode = (nextMode: AgendaStartMode) => {
    resetFlow();
    setMode(nextMode);

    if (nextMode === "date") {
      setCurrentStep("selectDate");
      return;
    }

    if (nextMode === "service") {
      setCurrentStep("selectService");
      return;
    }

    if (nextMode === "professionalAgenda") {
      setSelectedDate(todayStr);
      setCurrentStep("selectProfessional");
      return;
    }

    setCurrentStep("selectProfessional");
  };

  const goBack = () => {
    if (currentStep === "start") {
      return;
    }

    if (currentStep === "success") {
      resetFlow();
      return;
    }

    if (currentStep === "selectDate") {
      resetFlow();
      return;
    }

    if (currentStep === "selectService") {
      if (mode === "date") {
        setSelectedServiceId("");
        setCurrentStep("selectProfessional");
        return;
      }

      if (mode === "professional") {
        setSelectedServiceId("");
        setCurrentStep("selectProfessional");
        return;
      }

      resetFlow();
      return;
    }

    if (currentStep === "selectProfessional") {
      if (mode === "date") {
        setSelectedProfessionalId("");
        setCurrentStep("selectDate");
        return;
      }

      if (mode === "service") {
        setSelectedProfessionalId("");
        setCurrentStep("selectService");
        return;
      }

      resetFlow();
      return;
    }

    if (currentStep === "professionalAgenda") {
      setSelectedProfessionalId("");
      setCurrentStep("selectProfessional");
      return;
    }

    if (currentStep === "selectDateTime") {
      setSelectedTime("");

      if (mode === "date") {
        setCurrentStep("selectService");
        return;
      }

      if (mode === "service") {
        setCurrentStep("selectProfessional");
        return;
      }

      setCurrentStep("selectService");
      return;
    }

    if (currentStep === "clientData") {
      setCurrentStep("selectDateTime");
    }
  };

  const handleSelectDateFirst = (date: string) => {
    setSelectedDate(date);
    setSelectedProfessionalId("");
    setSelectedServiceId("");
    setSelectedTime("");
    setCurrentStep("selectProfessional");
  };

  const handleSelectService = (service: Service) => {
    setSelectedServiceId(service.id);

    if (mode === "professionalAgenda" && selectedProfessionalId && selectedDate && selectedTime) {
      const selectedProfessionalForAgenda = professionals.find((professional) => {
        return professional.id === selectedProfessionalId;
      });

      if (!selectedProfessionalForAgenda) {
        alert("Profissional não encontrado. Atualize a agenda e tente novamente.");
        setSelectedServiceId("");
        return;
      }

      const serviceSlotAvailability = checkProfessionalSlotAvailability({
        professional: selectedProfessionalForAgenda,
        service,
        date: selectedDate,
        time: selectedTime,
        services,
        appointments,
        blockedIntervals,
        openDays,
      });

      if (!serviceSlotAvailability.available) {
        const exceptionType = serviceSlotAvailability.exceptionType;

        if (
          exceptionType === 'overtime' ||
          exceptionType === 'lunch_overlap'
        ) {
          const startMinutes =
            Number(selectedTime.slice(0, 2)) * 60 +
            Number(selectedTime.slice(3, 5));
          const serviceEndMinutes =
            startMinutes + Math.max(1, Number(service.duration) || 30);
          const serviceEndHour = Math.floor(serviceEndMinutes / 60);
          const serviceEndMinute = serviceEndMinutes % 60;

          setScheduleExceptionConfirmRequest({
            type: exceptionType,
            service,
            serviceEndTime: `${String(serviceEndHour).padStart(2, "0")}:${String(serviceEndMinute).padStart(2, "0")}`,
            workHoursStart:
              selectedProfessionalForAgenda.workHoursStart.slice(0, 5),
            workHoursEnd:
              selectedProfessionalForAgenda.workHoursEnd.slice(0, 5),
            lunchStart:
              selectedProfessionalForAgenda.lunchStart.slice(0, 5),
            lunchEnd:
              selectedProfessionalForAgenda.lunchEnd.slice(0, 5),
          });
          return;
        }

        setSelectedServiceId("");
        setOutsideScaleConfirmRequest(null);
        return;
      }

      setAllowOvertimeForSelection(false);
      setAllowLunchOverlapForSelection(false);
      setCurrentStep("clientData");
      return;
    }

    setSelectedTime("");

    if (mode === "service") {
      setSelectedProfessionalId("");
      setSelectedDate("");
      setCurrentStep("selectProfessional");
      return;
    }

    if (mode === "date") {
      setCurrentStep("selectDateTime");
      return;
    }

    if (mode === "professionalAgenda") {
      setCurrentStep("selectDateTime");
      return;
    }

    setSelectedDate("");
    setCurrentStep("selectDateTime");
  };

  const handleSelectProfessional = (professional: Professional) => {
    setSelectedProfessionalId(professional.id);
    setSelectedTime("");

    if (mode === "date") {
      setSelectedServiceId("");
      setCurrentStep("selectService");
      return;
    }

    if (mode === "professionalAgenda") {
      setSelectedServiceId("");
      setSelectedTime("");
      setSelectedDate(selectedDate || todayStr);
      setCurrentStep("professionalAgenda");
      return;
    }

    if (mode === "professional") {
      setSelectedServiceId("");
      setSelectedDate("");
      setCurrentStep("selectService");
      return;
    }

    setSelectedDate("");
    setCurrentStep("selectDateTime");
  };

  const handleSelectDateTimeDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  const clientNameMatches = useMemo(() => {
    const normalizedTypedName = normalizeText(clientName);

    if (!normalizedTypedName || selectedClientId) {
      return [];
    }

    return clients
      .filter((client) => {
        const normalizedSavedName = normalizeText(client.name || "");

        return normalizedSavedName.startsWith(normalizedTypedName);
      })
      .sort((first, second) => {
        return first.name.localeCompare(second.name, "pt-BR");
      })
      .slice(0, 8);
  }, [
    clientName,
    clients,
    selectedClientId
  ]);

  const handleClientNameChange = (value: string) => {
    setSelectedClientId("");
    setClientName(normalizeClientName(value));
  };

  const handleSelectClientByName = (client: Client) => {
    setSelectedClientId(client.id);
    setClientName(normalizeClientName(client.name));
    setClientPhone(formatPhoneInput(client.phone || ""));

    if (!clientNotes.trim() && client.notes) {
      setClientNotes(client.notes);
    }
  };

  const findClientByPhone = (phone: string) => {
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone.length < 10) {
      return null;
    }

    return (
      clients.find((client) => {
        const mainPhone = normalizePhone(client.phone || "");
        const normalizedStoredPhone = normalizePhone(
          client.phoneNormalized || "",
        );
        const historyPhones = client.phoneHistory || [];

        return (
          mainPhone === normalizedPhone ||
          normalizedStoredPhone === normalizedPhone ||
          historyPhones.some(
            (historyPhone) => normalizePhone(historyPhone) === normalizedPhone,
          )
        );
      }) || null
    );
  };

  const handleClientPhoneChange = (value: string) => {
    const formattedPhone = formatPhoneInput(value);
    const matchedClient = findClientByPhone(formattedPhone);

    setClientPhone(formattedPhone);

    if (matchedClient) {
      setSelectedClientId(matchedClient.id);
      setClientName(normalizeClientName(matchedClient.name));

      if (!clientNotes.trim() && matchedClient.notes) {
        setClientNotes(matchedClient.notes);
      }
    }
  };

  const buildClientConfirmationWhatsAppUrl = (clientActionLink: string) => {
    if (
      !selectedService ||
      !selectedProfessional ||
      !selectedDate ||
      !selectedTime ||
      !clientPhone
    ) {
      return "";
    }

    const phone = normalizePhone(clientPhone);
    const message = [
      `Olá, ${clientName.trim() || "tudo bem"}! Seu horário foi agendado com sucesso.`,
      "",
      `Serviço: ${selectedService.name}`,
      `Profissional: ${selectedProfessional.name}`,
      `Data: ${formatDateBr(selectedDate)}`,
      `Horário: ${selectedTime}`,
      "",
      "Para confirmar, cancelar ou remarcar, acesse:",
      clientActionLink,
    ].join("\n");

    return `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit || !selectedProfessional || !selectedService) {
      return;
    }

    const slotAvailability = checkProfessionalSlotAvailability({
      professional: selectedProfessional,
      service: selectedService,
      date: selectedDate,
      time: selectedTime,
      services,
      appointments,
      blockedIntervals,
      openDays,
    });

    const scheduleExceptionWasAuthorized =
      slotAvailability.exceptionType === 'overtime'
        ? allowOvertimeForSelection
        : slotAvailability.exceptionType === 'lunch_overlap'
          ? allowLunchOverlapForSelection
          : false;

    if (!slotAvailability.available && !scheduleExceptionWasAuthorized) {
      return;
    }

    const createdAppointmentResult = await onCreateAppointment({
      clientName: normalizeClientName(clientName).trim(),
      clientPhone,
      serviceId: selectedServiceId,
      professionalId: selectedProfessionalId,
      date: selectedDate,
      time: selectedTime,
      notes: clientNotes,
      paymentType: "pendente",
      allowOvertime: allowOvertimeForSelection,
      allowLunchOverlap: allowLunchOverlapForSelection,
    } as AgendaCreateAppointmentPayload);

    if (
      !createdAppointmentResult ||
      typeof createdAppointmentResult !== "object" ||
      !createdAppointmentResult.appointmentId
    ) {
      return;
    }

    const createdAppointment: AgendaCreateAppointmentResult =
      createdAppointmentResult;

    const clientActionLink = createdAppointment.clientActionLink || "";

    if (!clientActionLink) {
      alert(
        "Agendamento criado, mas não foi possível gerar o link do cliente. Atualize a página e tente reenviar a confirmação pelo painel.",
      );
      setWhatsAppConfirmUrl("");
      setCurrentStep("success");
      return;
    }

    const confirmationUrl = buildClientConfirmationWhatsAppUrl(clientActionLink);
    setWhatsAppConfirmUrl(confirmationUrl);

    if (confirmationUrl) {
      window.open(confirmationUrl, "_blank", "noopener,noreferrer");
    }

    setCurrentStep("success");
  };

  const getSlotsForProfessionalAcrossPeriod = (
    professional: Professional,
  ): number => {
    const targetServices = selectedService
      ? [selectedService]
      : activeServices.filter((service) => {
          return professionalCanDoService({ professional, service });
        });

    return dateOptions.reduce((total, dateOption) => {
      return (
        total +
        targetServices.reduce((serviceTotal, service) => {
          return (
            serviceTotal +
            generateSlotsForSelection({
              professional,
              service,
              date: selectedDate || dateOption,
              services,
              appointments,
              blockedIntervals,
              openDays,
            }).length
          );
        }, 0)
      );
    }, 0);
  };

  const getSlotsForProfessionalOnSelectedDate = (
    professional: Professional,
  ): number => {
    if (!selectedDate) {
      return 0;
    }

    const targetServices = selectedService
      ? [selectedService]
      : activeServices.filter((service) => {
          return professionalCanDoService({ professional, service });
        });

    return targetServices.reduce((total, service) => {
      return (
        total +
        generateSlotsForSelection({
          professional,
          service,
          date: selectedDate,
          services,
          appointments,
          blockedIntervals,
          openDays,
        }).length
      );
    }, 0);
  };

  const getSlotsForDate = (date: string): number => {
    const targetProfessionals = selectedProfessional
      ? [selectedProfessional]
      : professionalsForSelectedService;

    if (!selectedService) {
      return targetProfessionals.reduce((professionalTotal, professional) => {
        const professionalServices = activeServices.filter((service) => {
          return professionalCanDoService({ professional, service });
        });

        return (
          professionalTotal +
          professionalServices.reduce((serviceTotal, service) => {
            return (
              serviceTotal +
              generateSlotsForSelection({
                professional,
                service,
                date,
                services,
                appointments,
                blockedIntervals,
                openDays,
              }).length
            );
          }, 0)
        );
      }, 0);
    }

    return targetProfessionals.reduce((total, professional) => {
      return (
        total +
        generateSlotsForSelection({
          professional,
          service: selectedService,
          date,
          services,
          appointments,
          blockedIntervals,
          openDays,
        }).length
      );
    }, 0);
  };

  const sharedContext = {
    activeProfessionals,
    activeServices,
    agendaLookaheadDays,
    appointments,
    availableSlots,
    blockedIntervals,
    canGoClientData,
    canSubmit,
    clientName,
    clientNameMatches,
    clientNotes,
    clientPhone,
    config,
    currentStep,
    dateOptions,
    findClientByPhone,
    getSlotsForDate,
    getSlotsForProfessionalAcrossPeriod,
    getSlotsForProfessionalOnSelectedDate,
    handleClientNameChange,
    handleClientPhoneChange,
    handleSelectClientByName,
    handleSelectDateFirst,
    handleSelectDateTimeDate,
    handleSelectProfessional,
    handleSelectService,
    handleSubmit,
    mode,
    onOpenRescheduleAppointment,
    onUpdateAppointmentStatus,
    openDays,
    openProfessionalAgendaManager,
    outsideScaleConfirmRequest,
    professionalSearch,
    professionalsForSelectedService,
    resetFlow,
    scheduleDayActionLoading,
    selectedDate,
    selectedProfessional,
    selectedProfessionalId,
    selectedService,
    selectedServiceId,
    selectedTime,
    serviceSearch,
    services,
    servicesForSelectedProfessional,
    setClientName,
    setClientNotes,
    setClientPhone,
    setCurrentStep,
    setBlockedIntervals,
    setOpenDays,
    setOutsideScaleConfirmRequest,
    setProfessionalSearch,
    setScheduleDayActionLoading,
    setSelectedDate,
    setSelectedProfessionalId,
    setSelectedServiceId,
    setSelectedTime,
    setServiceSearch,
    setShowPastProfessionalAgendaSlots,
    showPastProfessionalAgendaSlots,
    todayStr,
    whatsAppConfirmUrl
  };

  return (
    <div
      id="view-agenda"
      ref={viewTopRef}
      className="space-y-4 text-left animate-none"
    >
      {currentStep === "start" ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
              Agenda Geral do Salão
            </h2>

            <p className="mt-1 text-xs font-semibold text-neutral-500">
              Gerencie a agenda dos profissionais de forma rápida, visual e objetiva.
            </p>
          </div>

          <AgendaBookingFlow context={sharedContext} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#0f4c5c] bg-[#0f4c5c] px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#123945]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>

          {currentStep === "professionalAgenda" ? (
            <ProfessionalAgendaView context={sharedContext} />
          ) : (
            <AgendaBookingFlow context={sharedContext} />
          )}
        </>
      )}

      {scheduleExceptionConfirmRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-amber-500" />

            <div className="p-5 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-xl font-medium text-amber-700">
                !
              </div>

              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                {scheduleExceptionConfirmRequest.type === 'lunch_overlap'
                  ? 'Serviço ultrapassa o intervalo de almoço'
                  : 'Serviço ultrapassa o expediente'}
              </h2>

              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                {scheduleExceptionConfirmRequest.type === 'lunch_overlap'
                  ? `Este serviço termina às ${scheduleExceptionConfirmRequest.serviceEndTime} e ultrapassa o intervalo de almoço do profissional, definido das ${scheduleExceptionConfirmRequest.lunchStart} às ${scheduleExceptionConfirmRequest.lunchEnd}. Deseja agendar mesmo assim?`
                  : `Este serviço termina às ${scheduleExceptionConfirmRequest.serviceEndTime}, mas o expediente do profissional é das ${scheduleExceptionConfirmRequest.workHoursStart} às ${scheduleExceptionConfirmRequest.workHoursEnd}. Deseja agendar mesmo assim?`}
              </p>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setScheduleExceptionConfirmRequest(null);
                    setAllowOvertimeForSelection(false);
                    setAllowLunchOverlapForSelection(false);
                    setSelectedServiceId("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Não, escolher outro horário
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      scheduleExceptionConfirmRequest.type ===
                      'lunch_overlap'
                    ) {
                      setAllowLunchOverlapForSelection(true);
                      setAllowOvertimeForSelection(false);
                    } else {
                      setAllowOvertimeForSelection(true);
                      setAllowLunchOverlapForSelection(false);
                    }

                    setScheduleExceptionConfirmRequest(null);
                    setCurrentStep("clientData");
                  }}
                  className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Sim, agendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
