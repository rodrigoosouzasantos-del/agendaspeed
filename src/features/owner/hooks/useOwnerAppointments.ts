import React, { useEffect, useRef, useState } from "react";

import {
  Appointment,
  AppointmentStatus,
  Client,
  PaymentType,
  Professional,
  Service,
} from "../../../types";
import {
  AgendaCreateAppointmentPayload,
  AgendaCreateAppointmentResult,
  SupabaseAppointmentResponse,
  buildOwnerAppointmentPayload,
  extractClientPublicToken,
  getAgendaSpeedPublicOrigin,
  mapSupabaseAppointmentToAppAppointment,
} from "../owner.data";
import {
  calculateCommissionValue,
  filterAppointments,
  updateClientsAfterAppointmentStatusChange,
  upsertClientFromAppointment,
} from "../owner.utils";
import {
  CalendarView,
  OwnerDashboardProps,
  OwnerTab,
} from "../owner.types";
import { supabase } from "../../../lib/supabase";

interface UseOwnerAppointmentsParams {
  state: OwnerDashboardProps["state"];
  onUpdateState: OwnerDashboardProps["onUpdateState"];
  activeTab: OwnerTab;
  services: Service[];
  professionals: Professional[];
  clients: Client[];
  loadClientsFromSupabase: (showLoading?: boolean) => Promise<Client[]>;
  showOwnerFeedback: (message: string, title?: string) => void;
}

export function useOwnerAppointments({
  state,
  onUpdateState,
  activeTab,
  services,
  professionals,
  clients,
  loadClientsFromSupabase,
  showOwnerFeedback,
}: UseOwnerAppointmentsParams) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [appointmentsLoadError, setAppointmentsLoadError] = useState("");

  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [calendarView, setCalendarView] = useState<CalendarView>("today");

  const [showApptModal, setShowApptModal] = useState(false);
  const [newApptClientName, setNewApptClientName] = useState("");
  const [newApptClientPhone, setNewApptClientPhone] = useState("");
  const [newApptServiceId, setNewApptServiceId] = useState("");
  const [newApptProfId, setNewApptProfId] = useState("");
  const [newApptDate, setNewApptDate] = useState("");
  const [newApptTime, setNewApptTime] = useState("");
  const [newApptNotes, setNewApptNotes] = useState("");
  const [newApptPayment, setNewApptPayment] = useState<PaymentType>("pix");

  const activeTabRef = useRef<OwnerTab>(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    let refreshTimeoutId: number | null = null;
    let safetyPollingIntervalId: number | null = null;
    let requestInFlight = false;
    let requestQueued = false;

    async function loadAppointmentsFromSupabase(showLoading = true) {
      if (requestInFlight) {
        requestQueued = true;
        return;
      }

      requestInFlight = true;

      if (showLoading) {
        setIsLoadingAppointments(true);
      }

      setAppointmentsLoadError("");

      const { data, error } = await supabase.rpc("get_my_appointments");

      if (isMounted) {
        if (error) {
          console.error("Erro ao carregar agendamentos:", error.message);
          setAppointmentsLoadError(
            error.message ||
              "Não foi possível carregar a agenda real do Supabase.",
          );
          setIsLoadingAppointments(false);
        } else {
          const rows = (
            Array.isArray(data) ? data : []
          ) as SupabaseAppointmentResponse[];
          const nextAppointments = rows.map(
            mapSupabaseAppointmentToAppAppointment,
          );

          setAppointments(nextAppointments);
          setIsLoadingAppointments(false);
        }
      }

      requestInFlight = false;

      if (isMounted && requestQueued) {
        requestQueued = false;
        void loadAppointmentsFromSupabase(false);
      }
    }

    function scheduleAppointmentsRefresh() {
      if (!isMounted) return;

      if (refreshTimeoutId !== null) {
        window.clearTimeout(refreshTimeoutId);
      }

      refreshTimeoutId = window.setTimeout(() => {
        refreshTimeoutId = null;
        void loadAppointmentsFromSupabase(false);
      }, 400);
    }

    void loadAppointmentsFromSupabase(true);

    safetyPollingIntervalId = window.setInterval(() => {
      const isOperationalTab =
        activeTabRef.current === "painel" || activeTabRef.current === "agenda";

      if (document.visibilityState === "visible" && isOperationalTab) {
        void loadAppointmentsFromSupabase(false);
      }
    }, 40000);

    const appointmentsChannel = supabase
      .channel("owner-appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        scheduleAppointmentsRefresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "Não foi possível ativar a atualização em tempo real da agenda.",
          );
        }
      });

    return () => {
      isMounted = false;

      if (refreshTimeoutId !== null) {
        window.clearTimeout(refreshTimeoutId);
      }

      if (safetyPollingIntervalId !== null) {
        window.clearInterval(safetyPollingIntervalId);
      }

      void supabase.removeChannel(appointmentsChannel);
    };
  }, []);

  const resetAppointmentForm = () => {
    setNewApptClientName("");
    setNewApptClientPhone("");
    setNewApptServiceId("");
    setNewApptProfId("");
    setNewApptDate("");
    setNewApptTime("");
    setNewApptNotes("");
    setNewApptPayment("pix");
  };

  const handleModifyStatus = async (
    appointmentId: string,
    destinationStatus: AppointmentStatus,
  ) => {
    const previousAppointments = appointments;

    const optimisticAppointments = appointments.map((appointment) =>
      appointment.id === appointmentId
        ? { ...appointment, status: destinationStatus }
        : appointment,
    );

    const updatedClients = updateClientsAfterAppointmentStatusChange({
      clients,
      appointments,
      appointmentId,
      destinationStatus,
    });

    setAppointments(optimisticAppointments);

    onUpdateState({
      ...state,
      appointments: optimisticAppointments,
      clients: updatedClients,
    });

    const { data, error } = await supabase.rpc("update_my_appointment_status", {
      p_appointment_id: appointmentId,
      p_status: destinationStatus,
    });

    if (error) {
      showOwnerFeedback(
        error.message || "Não foi possível atualizar o status do agendamento.",
      );
      setAppointments(previousAppointments);

      onUpdateState({
        ...state,
        appointments: previousAppointments,
        clients,
      });
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseAppointmentResponse | null;

    if (!savedRow) return;

    const savedAppointment = mapSupabaseAppointmentToAppAppointment(savedRow);
    const syncedAppointments = optimisticAppointments.map((appointment) =>
      appointment.id === savedAppointment.id
        ? savedAppointment
        : appointment,
    );

    setAppointments(syncedAppointments);

    onUpdateState({
      ...state,
      appointments: syncedAppointments,
      clients: updatedClients,
    });

    void loadClientsFromSupabase(false);
  };

  const handleAddManualAppt = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !newApptClientName ||
      !newApptClientPhone ||
      !newApptServiceId ||
      !newApptProfId ||
      !newApptDate ||
      !newApptTime
    ) {
      showOwnerFeedback(
        "Por favor, defina todos os campos obrigatórios do atendimento.",
      );
      return;
    }

    const selectedService = services.find(
      (service) => service.id === newApptServiceId,
    );
    const selectedProfessional = professionals.find(
      (professional) => professional.id === newApptProfId,
    );

    if (!selectedService || !selectedProfessional) {
      showOwnerFeedback("Serviço ou profissional não encontrado.");
      return;
    }

    const commissionValue = calculateCommissionValue({
      service: selectedService,
      professional: selectedProfessional,
    });

    const appointmentToSave: Omit<Appointment, "id"> = {
      dateTime: `${newApptDate}T${newApptTime}`,
      clientName: newApptClientName,
      clientPhone: newApptClientPhone,
      serviceId: newApptServiceId,
      professionalId: newApptProfId,
      price: selectedService.price,
      status: "scheduled",
      paymentType: newApptPayment,
      notes: newApptNotes || "Agendado manualmente pelo Administrador.",
      commissionPaid: false,
      commissionValue,
      depositPaid: false,
    };

    const { data, error } = await supabase.rpc("create_my_owner_appointment", {
      p_appointment: buildOwnerAppointmentPayload(appointmentToSave),
    });

    if (error) {
      showOwnerFeedback(
        error.message || "Não foi possível criar o agendamento.",
      );
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseAppointmentResponse | null;

    if (!savedRow) {
      showOwnerFeedback("Não foi possível confirmar o agendamento criado.");
      return;
    }

    const newAppointment = mapSupabaseAppointmentToAppAppointment(savedRow);

    const updatedClients = upsertClientFromAppointment({
      clients,
      clientName: newApptClientName,
      clientPhone: newApptClientPhone,
      preferredProfessionalId: newApptProfId,
    });

    const nextAppointments = [newAppointment, ...appointments];

    setAppointments(nextAppointments);

    onUpdateState({
      ...state,
      appointments: nextAppointments,
      clients: updatedClients,
    });

    void loadClientsFromSupabase(false);

    setShowApptModal(false);
    resetAppointmentForm();
  };

  const handleCreateAppointmentFromAgenda = async (
    payload: AgendaCreateAppointmentPayload,
  ): Promise<AgendaCreateAppointmentResult | void> => {
    const selectedService = services.find(
      (service) => service.id === payload.serviceId,
    );
    const selectedProfessional = professionals.find(
      (professional) => professional.id === payload.professionalId,
    );

    if (!selectedService || !selectedProfessional) {
      showOwnerFeedback("Serviço ou profissional não encontrado.");
      return;
    }

    const commissionValue = calculateCommissionValue({
      service: selectedService,
      professional: selectedProfessional,
    });

    const appointmentToSave: Omit<Appointment, "id"> = {
      dateTime: `${payload.date}T${payload.time}`,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      serviceId: payload.serviceId,
      professionalId: payload.professionalId,
      price: selectedService.price,
      status: "scheduled",
      paymentType: payload.paymentType,
      notes: payload.notes || "Agendado pela Agenda Geral.",
      commissionPaid: false,
      commissionValue,
      depositPaid: false,
    };

    const allowOvertime =
      (payload as AgendaCreateAppointmentPayload & {
        allowOvertime?: boolean;
      }).allowOvertime === true;

    const ownerAppointmentPayload = {
      ...buildOwnerAppointmentPayload(appointmentToSave),
      allow_overtime: allowOvertime,
    };

    const { data, error } = await supabase.rpc("create_my_owner_appointment", {
      p_appointment: ownerAppointmentPayload,
    });

    if (error) {
      showOwnerFeedback(
        error.message || "Não foi possível criar o agendamento.",
      );
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseAppointmentResponse | null;

    if (!savedRow) {
      showOwnerFeedback("Não foi possível confirmar o agendamento criado.");
      return;
    }

    const newAppointment = mapSupabaseAppointmentToAppAppointment(savedRow);

    const updatedClients = upsertClientFromAppointment({
      clients,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      preferredProfessionalId: payload.professionalId,
    });

    const nextAppointments = [newAppointment, ...appointments];

    setAppointments(nextAppointments);

    onUpdateState({
      ...state,
      appointments: nextAppointments,
      clients: updatedClients,
    });

    void loadClientsFromSupabase(false);

    const tokenResult = await supabase.rpc(
      "get_my_client_public_access_token_by_appointment",
      {
        p_appointment_id: newAppointment.id,
      },
    );

    if (tokenResult.error) {
      console.error(
        "Erro ao buscar token público do cliente:",
        tokenResult.error.message,
      );
    }

    const clientPublicToken = tokenResult.error
      ? ""
      : extractClientPublicToken(tokenResult.data);

    return {
      appointmentId: newAppointment.id,
      clientActionLink: clientPublicToken
        ? `${getAgendaSpeedPublicOrigin()}/meus-agendamentos/${clientPublicToken}`
        : "",
    };
  };

  const baseDateStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const filteredAppointments = filterAppointments({
    appointments,
    baseDateStr,
    professionalFilter,
    statusFilter,
    calendarView,
  });

  return {
    appointments,
    setAppointments,
    baseDateStr,
    filteredAppointments,
    professionalFilter,
    setProfessionalFilter,
    statusFilter,
    setStatusFilter,
    calendarView,
    setCalendarView,
    isLoadingAppointments,
    appointmentsLoadError,
    showApptModal,
    setShowApptModal,
    newApptClientName,
    setNewApptClientName,
    newApptClientPhone,
    setNewApptClientPhone,
    newApptServiceId,
    setNewApptServiceId,
    newApptProfId,
    setNewApptProfId,
    newApptDate,
    setNewApptDate,
    newApptTime,
    setNewApptTime,
    newApptNotes,
    setNewApptNotes,
    newApptPayment,
    setNewApptPayment,
    handleModifyStatus,
    handleAddManualAppt,
    handleCreateAppointmentFromAgenda,
  };
}
