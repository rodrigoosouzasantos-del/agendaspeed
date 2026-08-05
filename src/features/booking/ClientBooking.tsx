/**
 * Página pública da Vitrine de agendamento - AgendaZap.
 *
 * Este arquivo coordena o fluxo público usado pelo cliente final.
 *
 * Responsabilidades:
 * - exibir a Vitrine do estabelecimento;
 * - controlar etapas do agendamento;
 * - selecionar serviço;
 * - selecionar profissional;
 * - selecionar data e horário;
 * - coletar dados do cliente;
 * - criar agendamento;
 * - preparar mensagem do WhatsApp para o cliente enviar manualmente;
 * - exibir tela de sucesso.
 */

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';


import { Appointment, Professional, Service } from '../../types';

import { BookingScheduleDay, BookingStep, ClientBookingProps } from './booking.types';

import {
  calculateBookingCommission,
  filterServicesByCategory,
  generateDateOptions,
  generateTimeSlotObjects,
  getActiveServiceCategories,
  getAvailableProfessionalsForService
} from './booking.utils';

import { supabase } from '../../lib/supabase';

import {
  BookingAgendaBlockedInterval, ClientBookingFeedbackState, PublicBookingContextRow,
  PublicBookingCreationRow, buildClientFollowUpLink, buildClientFollowUpWhatsappUrl,
  buildDemoOpenScheduleDays, buildDemoProfessionals, buildDemoServices,
  extractPublicAccessToken, findPublicClientNameByPhone,
  formatClientWhatsapp, getClientPublicAccessTokenByAppointment, getLocalWhatsappDigits,
  getPublicBookingSlug, isPastBookingDateTime, isPublicScheduleDayOpen,
  isTimeBlockedForPublicBooking, isValidClientWhatsapp, mergeConfigWithFallback,
  normalizeClientName, normalizeRemoteBlockedInterval, normalizeRemoteProfessional,
  normalizeRemoteScheduleDay, normalizeRemoteService
} from './publicBooking.data';
import {
  BookingHeader, BookingSuccessView, ClientBookingFeedbackModal, ClientInfoStep,
  DateTimeSelectionStep, ProfessionalSelectionStep, ServiceSelectionStep
} from './components/PublicBookingSteps';


export default function ClientBooking({
  state,
  onAddAppointment,
  onNavigateBack
}: ClientBookingProps) {
  const publicSlug = useMemo(() => getPublicBookingSlug(), []);

  const [remoteBookingContext, setRemoteBookingContext] =
    useState<PublicBookingContextRow | null>(null);
  const [loadingRemoteContext, setLoadingRemoteContext] = useState(Boolean(publicSlug));
  const [remoteContextError, setRemoteContextError] = useState('');
  const [agendaBlocks, setAgendaBlocks] = useState<BookingAgendaBlockedInterval[]>([]);
  const [agendaOpenDays, setAgendaOpenDays] = useState<BookingScheduleDay[]>([]);

  const config = useMemo(() => {
    return mergeConfigWithFallback(state.config, remoteBookingContext?.config);
  }, [state.config, remoteBookingContext]);

  const isDemoBooking = !publicSlug;

  const demoServices = useMemo(() => {
    return isDemoBooking ? buildDemoServices() : [];
  }, [isDemoBooking]);

  const demoProfessionals = useMemo(() => {
    return isDemoBooking ? buildDemoProfessionals() : [];
  }, [isDemoBooking]);

  // Em uma vitrine real, a resposta do Supabase é a única fonte válida.
  // No caminho /agendar, usamos somente dados fictícios e descartáveis.
  const services = isDemoBooking
    ? demoServices
    : remoteBookingContext
      ? remoteBookingContext.services
      : state.services;

  const professionals = isDemoBooking
    ? demoProfessionals
    : remoteBookingContext
      ? remoteBookingContext.professionals
      : state.professionals;
  const appointments = isDemoBooking
    ? []
    : remoteBookingContext?.appointments || state.appointments;
  const blockedIntervals = isDemoBooking
    ? []
    : remoteBookingContext?.agendaBlocks || agendaBlocks;

  const demoOpenDays = useMemo(() => {
    return isDemoBooking ? buildDemoOpenScheduleDays(professionals) : [];
  }, [isDemoBooking, professionals]);

  const effectiveAgendaOpenDays = isDemoBooking ? demoOpenDays : agendaOpenDays;

  const [currentStep, setCurrentStep] = useState<BookingStep>(1);

  const [activeCategory, setActiveCategory] = useState('Todos');

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNameWasAutoFilled, setClientNameWasAutoFilled] = useState(false);
  const [notes, setNotes] = useState('');

  const [createdWhatsappUrl, setCreatedWhatsappUrl] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [feedbackMessage, setFeedbackMessage] =
    useState<ClientBookingFeedbackState | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicBookingContext() {
      if (!publicSlug) {
        setLoadingRemoteContext(false);
        return;
      }

      setLoadingRemoteContext(true);
      setRemoteContextError('');

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error('Tempo limite excedido ao carregar a vitrine.'));
          }, 15000);
        });

        // Disparamos tudo junto, mas somente o contexto principal bloqueia a
        // primeira exibição da vitrine. Dias e bloqueios são necessários apenas
        // nas etapas seguintes e continuam carregando em segundo plano.
        const contextRequest = supabase.rpc('get_public_booking_context', {
          p_slug: publicSlug
        });
        const scheduleDaysRequest = supabase.rpc('get_public_professional_schedule_days', {
          p_slug: publicSlug
        });
        const scheduleBlocksRequest = supabase.rpc('get_public_professional_schedule_blocks', {
          p_slug: publicSlug
        });

        const contextResult = await Promise.race([
          contextRequest,
          timeoutPromise
        ]);

        if (!isMounted) return;

        const { data, error } = contextResult;

        if (error) {
          setRemoteBookingContext(null);
          setRemoteContextError('Não foi possível carregar a vitrine neste momento.');
          setLoadingRemoteContext(false);
          return;
        }

        const firstRow = Array.isArray(data) ? data[0] : null;

        if (!firstRow) {
          setRemoteBookingContext(null);
          setRemoteContextError('Vitrine não encontrada ou indisponível.');
          setLoadingRemoteContext(false);
          return;
        }

        const contextScheduleDays = Array.isArray(firstRow.schedule_days)
          ? firstRow.schedule_days.map((day: Record<string, unknown>) => normalizeRemoteScheduleDay(day))
          : [];

        setRemoteBookingContext({
          config: firstRow.config || {},
          services: Array.isArray(firstRow.services)
            ? firstRow.services.map(normalizeRemoteService)
            : [],
          professionals: Array.isArray(firstRow.professionals)
            ? firstRow.professionals.map(normalizeRemoteProfessional)
            : [],
          appointments: Array.isArray(firstRow.appointments) ? firstRow.appointments : [],
          agendaBlocks: [],
          scheduleDays: contextScheduleDays
        });

        setAgendaOpenDays(contextScheduleDays);
        setLoadingRemoteContext(false);

        try {
          const [scheduleDaysResult, scheduleBlocksResult] = await Promise.all([
            scheduleDaysRequest,
            scheduleBlocksRequest
          ]);

          if (!isMounted) return;

          if (scheduleDaysResult.error) {
            console.error(
              'Erro ao carregar os dias abertos da vitrine:',
              scheduleDaysResult.error
            );
          }

          if (scheduleBlocksResult.error) {
            console.error(
              'Erro ao carregar os bloqueios da vitrine:',
              scheduleBlocksResult.error
            );
          }

          const remoteScheduleDays = Array.isArray(scheduleDaysResult.data)
            ? scheduleDaysResult.data.map((day: Record<string, unknown>) =>
                normalizeRemoteScheduleDay(day)
              )
            : [];
          const effectiveScheduleDays = remoteScheduleDays.length > 0
            ? remoteScheduleDays
            : contextScheduleDays;
          const contextAgendaBlocks = Array.isArray(scheduleBlocksResult.data)
            ? scheduleBlocksResult.data.map((block: Record<string, unknown>) =>
                normalizeRemoteBlockedInterval(block)
              )
            : [];

          setAgendaBlocks(contextAgendaBlocks);
          setAgendaOpenDays(effectiveScheduleDays);
          setRemoteBookingContext((currentContext) => currentContext
            ? {
                ...currentContext,
                agendaBlocks: contextAgendaBlocks,
                scheduleDays: effectiveScheduleDays
              }
            : currentContext
          );
        } catch (secondaryLoadError) {
          console.error(
            'Erro ao complementar os dados da agenda pública:',
            secondaryLoadError
          );
        }
      } catch (error) {
        if (!isMounted) return;

        console.error('Erro ao carregar a vitrine pública:', error);
        setRemoteBookingContext(null);
        setRemoteContextError(
          'A conexão demorou mais do que o esperado. Verifique sua internet e tente novamente.'
        );
        setLoadingRemoteContext(false);
      }
    }

    loadPublicBookingContext();

    return () => {
      isMounted = false;
    };
  }, [publicSlug]);


  const categories = useMemo(() => {
    return getActiveServiceCategories(services);
  }, [services]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory('Todos');
    }
  }, [categories, activeCategory]);

  const filteredServices = useMemo(() => {
    return filterServicesByCategory({
      services,
      activeCategory
    });
  }, [
    services,
    activeCategory
  ]);

  const availableProfessionals = useMemo(() => {
    return getAvailableProfessionalsForService({
      professionals,
      selectedService
    });
  }, [
    professionals,
    selectedService
  ]);

  const baseDateOptions = useMemo(() => {
    return generateDateOptions({
      config,
      selectedProfessional,
      selectedService,
      appointments,
      services,
      openDays: effectiveAgendaOpenDays,
      numberOfDays: isDemoBooking
        ? 3
        : config.maxFutureDays || 30
    });
  }, [
    config,
    selectedProfessional,
    selectedService,
    appointments,
    effectiveAgendaOpenDays,
    isDemoBooking,
    services
  ]);

  const dateOptions = useMemo(() => {
    if (!selectedProfessional) {
      return baseDateOptions;
    }

    return baseDateOptions.filter((dateOption) => {
      const availableSlotsForDate = generateTimeSlotObjects({
        appointments,
        selectedProfessional,
        selectedService,
        services,
        openDays: effectiveAgendaOpenDays,
        selectedDate: dateOption.dateStr
      });

      return availableSlotsForDate.some((slot) =>
        slot.available &&
        !isTimeBlockedForPublicBooking({
          blockedIntervals,
          selectedProfessional,
          selectedService,
          selectedDate: dateOption.dateStr,
          selectedTime: slot.time
        })
      );
    });
  }, [
    appointments,
    baseDateOptions,
    blockedIntervals,
    effectiveAgendaOpenDays,
    selectedProfessional,
    selectedService,
    services
  ]);

  const timeSlots = useMemo(() => {
    const generatedSlots = generateTimeSlotObjects({
      appointments,
      selectedProfessional,
      selectedService,
      services,
      openDays: effectiveAgendaOpenDays,
      selectedDate
    });

    return generatedSlots.filter((slot) =>
      slot.available &&
      !isTimeBlockedForPublicBooking({
        blockedIntervals,
        selectedProfessional,
        selectedService,
        selectedDate,
        selectedTime: slot.time
      })
    );
  }, [
    appointments,
    selectedProfessional,
    selectedService,
    services,
    blockedIntervals,
    effectiveAgendaOpenDays,
    selectedDate
  ]);

  const coverUrl =
    String(config.coverImage || '') ||
    ('cover' in config
      ? String(config.cover || '')
      : 'coverUrl' in config
        ? String(config.coverUrl || '')
        : '');

  const whatsappUrl = createdWhatsappUrl;

  const showFeedbackMessage = (
    title: string,
    description: string
  ) => {
    setFeedbackMessage({
      title,
      description
    });
  };

  const handleChangeClientName = (value: string) => {
    setClientName(normalizeClientName(value));
    setClientNameWasAutoFilled(false);
  };

  const handleChangeClientPhone = (value: string) => {
    const formattedPhone = formatClientWhatsapp(value);

    setClientPhone(formattedPhone);

    if (!isValidClientWhatsapp(formattedPhone)) {
      if (clientNameWasAutoFilled) {
        setClientName('');
      }

      setClientNameWasAutoFilled(false);
    }
  };

  useEffect(() => {
    if (
      currentStep !== 4 ||
      !publicSlug ||
      !isValidClientWhatsapp(clientPhone)
    ) {
      return;
    }

    let isCancelled = false;

    const lookupTimeoutId = window.setTimeout(async () => {
      const foundClientName = await findPublicClientNameByPhone({
        slug: publicSlug,
        phone: clientPhone
      });

      if (isCancelled) return;

      if (foundClientName) {
        setClientName(foundClientName);
        setClientNameWasAutoFilled(true);
        return;
      }

      if (clientNameWasAutoFilled) {
        setClientName('');
      }

      setClientNameWasAutoFilled(false);
    }, 450);

    return () => {
      isCancelled = true;
      window.clearTimeout(lookupTimeoutId);
    };
  }, [
    currentStep,
    publicSlug,
    clientPhone,
    clientNameWasAutoFilled
  ]);

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setSelectedProfessional(null);
    setSelectedDate('');
    setSelectedTime('');
    setCurrentStep(2);
  };

  const handleSelectProfessional = (professional: Professional) => {
    setSelectedProfessional(professional);
    setSelectedDate('');
    setSelectedTime('');
    setCurrentStep(3);
  };

  const handleChangeDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleChangeTime = (time: string) => {
    if (isPastBookingDateTime(selectedDate, time)) {
      showFeedbackMessage(
        'Horário indisponível',
        'Este horário já passou e não pode mais ser selecionado para agendamento.'
      );
      return;
    }

    setSelectedTime(time);
  };

  const handleGoToClientInfo = () => {
    if (!selectedDate || !selectedTime) {
      showFeedbackMessage(
        'Data e horário obrigatórios',
        'Escolha a data e o horário para continuar.'
      );
      return;
    }

    if (
      selectedProfessional &&
      !isPublicScheduleDayOpen({
        openDays: effectiveAgendaOpenDays,
        selectedProfessional,
        selectedDate
      })
    ) {
      showFeedbackMessage(
        'Agenda fechada',
        'Este dia não está aberto para agendamento. Escolha uma data disponível.'
      );
      setSelectedDate('');
      setSelectedTime('');
      return;
    }

    if (isPastBookingDateTime(selectedDate, selectedTime)) {
      showFeedbackMessage(
        'Horário indisponível',
        'Este horário já passou. Escolha outro horário disponível para continuar.'
      );
      setSelectedTime('');
      return;
    }

    setCurrentStep(4);
  };

  const handleBackToServices = () => {
    setCurrentStep(1);
  };

  const handleBackToProfessionals = () => {
    setCurrentStep(2);
  };

  const handleBackToDateTime = () => {
    setCurrentStep(3);
  };

  const handleResetBooking = () => {
    setCurrentStep(1);
    setActiveCategory('Todos');
    setSelectedService(null);
    setSelectedProfessional(null);
    setSelectedDate('');
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientNameWasAutoFilled(false);
    setNotes('');
    setCreatedWhatsappUrl('');
  };

  const handleSubmitBooking = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (submittingBooking) {
      return;
    }

    if (!selectedService || !selectedProfessional) {
      showFeedbackMessage(
        'Dados incompletos',
        'Selecione um serviço e um profissional antes de concluir.'
      );
      return;
    }

    if (!selectedDate || !selectedTime) {
      showFeedbackMessage(
        'Data e horário obrigatórios',
        'Selecione uma data e um horário antes de concluir.'
      );
      return;
    }

    if (
      !isPublicScheduleDayOpen({
        openDays: effectiveAgendaOpenDays,
        selectedProfessional,
        selectedDate
      })
    ) {
      showFeedbackMessage(
        'Agenda fechada',
        'Este dia não está aberto para agendamento. Volte e escolha outra data disponível.'
      );
      setCurrentStep(3);
      setSelectedDate('');
      setSelectedTime('');
      return;
    }

    if (isPastBookingDateTime(selectedDate, selectedTime)) {
      showFeedbackMessage(
        'Agendamento não permitido',
        'Este horário já passou. Volte e escolha outro horário disponível.'
      );
      setCurrentStep(3);
      setSelectedTime('');
      return;
    }

    const selectedTimeIsBlocked = isTimeBlockedForPublicBooking({
      blockedIntervals,
      selectedProfessional,
      selectedService,
      selectedDate,
      selectedTime
    });

    const selectedTimeIsStillAvailable = !selectedTimeIsBlocked && generateTimeSlotObjects({
      appointments,
      selectedProfessional,
      selectedService,
      services,
      openDays: effectiveAgendaOpenDays,
      selectedDate
    }).some((slot) => slot.time === selectedTime && slot.available);

    if (!selectedTimeIsStillAvailable) {
      showFeedbackMessage(
        'Horário indisponível',
        'Este horário acabou de ser ocupado ou não está mais dentro da agenda do profissional. Escolha outro horário disponível.'
      );
      setCurrentStep(3);
      setSelectedTime('');
      return;
    }

    if (!clientName.trim() || !clientPhone.trim()) {
      showFeedbackMessage(
        'Dados do cliente obrigatórios',
        'Informe seu nome e WhatsApp para concluir o agendamento.'
      );
      return;
    }

    if (!isValidClientWhatsapp(clientPhone)) {
      showFeedbackMessage(
        'WhatsApp inválido',
        'Informe um número com DDD, usando 10 ou 11 dígitos.'
      );
      return;
    }

    const normalizedClientName = normalizeClientName(clientName).trim();
    const normalizedClientPhone = getLocalWhatsappDigits(clientPhone);

    const commissionValue = calculateBookingCommission({
      selectedService,
      selectedProfessional
    });

    const appointmentNotes = [
      notes.trim(),
      clientEmail.trim() ? `E-mail do cliente: ${clientEmail.trim()}` : ''
    ]
      .filter(Boolean)
      .join(' | ');


    setSubmittingBooking(true);

    if (isDemoBooking) {
      // Demonstração fictícia: não grava no Supabase, não atualiza estado local
      // e não polui nenhum cadastro, agenda ou histórico.
      setCreatedWhatsappUrl('');
      setCurrentStep(5);
      setSubmittingBooking(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_public_booking', {
        p_slug: publicSlug || 'domcabelo',
        p_service_id: selectedService.id,
        p_professional_id: selectedProfessional.id,
        p_starts_at_local: `${selectedDate}T${selectedTime}`,
        p_client_name: normalizedClientName,
        p_client_phone: normalizedClientPhone,
        p_client_email: clientEmail.trim() || null,
        p_notes: appointmentNotes || null
      });

      if (error) {
        showFeedbackMessage(
          'Não foi possível criar o agendamento',
          error.message || 'Verifique se o horário ainda está disponível e tente novamente.'
        );
        setSubmittingBooking(false);
        return;
      }

      const firstRow = (Array.isArray(data) ? data[0] : null) as PublicBookingCreationRow | null;

      if (!firstRow?.success || !firstRow.appointment_id) {
        showFeedbackMessage(
          'Não foi possível criar o agendamento',
          firstRow?.message || 'Verifique os dados informados e tente novamente.'
        );
        setSubmittingBooking(false);
        return;
      }

      const newAppointment: Appointment = {
        id: firstRow.appointment_id,
        dateTime: `${selectedDate}T${selectedTime}`,
        clientName: normalizedClientName,
        clientPhone: normalizedClientPhone,
        clientEmail: clientEmail.trim() || undefined,
        serviceId: selectedService.id,
        professionalId: selectedProfessional.id,
        price: selectedService.price,
        status: 'scheduled',
        paymentType: 'pendente',
        notes: appointmentNotes || 'Agendamento realizado pela Vitrine pública.',
        commissionPaid: false,
        commissionValue,
        depositPaid: false
      };

      onAddAppointment(newAppointment);

      setRemoteBookingContext((current) => {
        if (!current) return current;

        return {
          ...current,
          appointments: [
            ...current.appointments,
            newAppointment
          ]
        };
      });

      const tokenReturnedWithBooking = extractPublicAccessToken(firstRow);
      const followUpToken =
        tokenReturnedWithBooking ||
        await getClientPublicAccessTokenByAppointment(firstRow.appointment_id);

      if (!followUpToken) {
        showFeedbackMessage(
          'Agendamento criado, mas link indisponível',
          'Seu horário foi reservado, porém não foi possível gerar o link para confirmar, remarcar ou cancelar. Entre em contato com o estabelecimento.'
        );
        setSubmittingBooking(false);
        return;
      }

      const followUpLink = buildClientFollowUpLink(followUpToken);
      const nextWhatsappUrl = buildClientFollowUpWhatsappUrl({
        companyPhone: config.phone,
        companyName: config.name || 'estabelecimento',
        clientName: normalizedClientName,
        serviceName: selectedService.name,
        professionalName: selectedProfessional.name,
        selectedDate,
        selectedTime,
        followUpLink
      });

      setCreatedWhatsappUrl(nextWhatsappUrl);
      setCurrentStep(5);
      setSubmittingBooking(false);
    } catch (error) {
      showFeedbackMessage(
        'Erro inesperado',
        error instanceof Error ? error.message : 'Não foi possível concluir o agendamento.'
      );
      setSubmittingBooking(false);
    }
  };

  if (loadingRemoteContext) {
    return (
      <div className="min-h-screen animate-pulse bg-[#F4F6F6]">
        <div className="h-48 w-full bg-slate-200 sm:h-56" />
        <div className="mx-auto -mt-10 w-full max-w-5xl px-4 pb-10">
          <div className="h-20 rounded-3xl border border-slate-200 bg-white shadow-sm" />
          <div className="mt-8 h-7 w-44 rounded-lg bg-slate-200" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-32 rounded-3xl border border-slate-200 bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (remoteContextError) {
    return (
      <div className="min-h-screen bg-[#F4F6F6] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-black text-red-600">!</div>
          <h1 className="text-xl font-black text-[#1A3038]">Vitrine indisponível</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{remoteContextError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-2xl bg-[#E0A96D] px-5 py-3 text-sm font-black text-[#1A3038] hover:bg-[#D69B5F]"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F6] text-[#1A3038] font-sans">
      {currentStep === 1 && (
        <BookingHeader
          logoUrl={config.logo}
          coverUrl={coverUrl}
          companyName={config.name}
          companyAddress={config.address}
          companyPhone={config.phone}
          instagram={config.instagram}
          showBackToSiteButton={isDemoBooking}
          onNavigateBack={onNavigateBack}
        />
      )}

      {currentStep === 1 && (
        <ServiceSelectionStep
          services={filteredServices}
          categories={categories}
          activeCategory={activeCategory}
          onChangeCategory={setActiveCategory}
          onSelectService={handleSelectService}
        />
      )}

      {currentStep === 2 && selectedService && (
        <ProfessionalSelectionStep
          selectedService={selectedService}
          selectedProfessional={selectedProfessional}
          availableProfessionals={availableProfessionals}
          onSelectProfessional={handleSelectProfessional}
          onBack={handleBackToServices}
        />
      )}

      {currentStep === 3 && selectedService && selectedProfessional && (
        <DateTimeSelectionStep
          selectedService={selectedService}
          selectedProfessional={selectedProfessional}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          dateOptions={dateOptions}
          timeSlots={timeSlots}
          onChangeDate={handleChangeDate}
          onChangeTime={handleChangeTime}
          onBack={handleBackToProfessionals}
          onNextStep={handleGoToClientInfo}
        />
      )}

      {currentStep === 4 && selectedService && selectedProfessional && (
        <ClientInfoStep
          selectedService={selectedService}
          selectedProfessional={selectedProfessional}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
          notes={notes}
          onChangeClientName={handleChangeClientName}
          onChangeClientPhone={handleChangeClientPhone}
          onChangeClientEmail={setClientEmail}
          onChangeNotes={setNotes}
          onBack={handleBackToDateTime}
          onNextStep={handleSubmitBooking}
        />
      )}

      {currentStep === 5 && (
        <BookingSuccessView
          selectedService={selectedService}
          selectedProfessional={selectedProfessional}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          clientName={clientName}
          clientPhone={clientPhone}
          companyName={config.name}
          companyAddress={config.address}
          whatsappUrl={whatsappUrl}
          onNavigateBack={handleResetBooking}
        />
      )}

      {feedbackMessage && (
        <ClientBookingFeedbackModal
          title={feedbackMessage.title}
          description={feedbackMessage.description}
          onClose={() => setFeedbackMessage(null)}
        />
      )}

      <footer className="py-8 flex justify-center">
        <div className="inline-flex items-center gap-2 text-[#1A3038]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#16343D] shadow-[0_8px_22px_rgba(224,169,109,0.22)]">
            <svg
              aria-hidden="true"
              className="h-7 w-7"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <ellipse
                cx="20"
                cy="7.5"
                rx="9.5"
                ry="3.2"
                stroke="#E0A96D"
                strokeWidth="2.5"
              />
              <path
                d="M11.5 14.5H28.5C30.433 14.5 32 16.067 32 18V31C32 32.933 30.433 34.5 28.5 34.5H11.5C9.567 34.5 8 32.933 8 31V18C8 16.067 9.567 14.5 11.5 14.5Z"
                stroke="white"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M8 21H32M14 12V17M26 12V17"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M14 26H17M23 26H26M14 30H17M23 30H26"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <span className="text-lg font-black tracking-tight">
            Agenda<span className="text-[#E0A96D]">Bless</span>
          </span>
        </div>
      </footer>
    </div>
  );
}