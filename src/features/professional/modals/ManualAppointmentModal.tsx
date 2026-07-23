import React, { useEffect, useRef, useState } from 'react';

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ChevronRight,
  Loader2,
  MessageCircle,
  Scissors,
  Search,
  UserRound,
  X
} from 'lucide-react';

import { ManualAppointmentModalProps } from '../professional.types';

import { formatCurrency } from '../professional.utils';

import { supabase } from '../../../lib/supabase';

function formatDateBr(value: string): string {
  if (!value) return 'Data não informada';

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

function formatPhoneInput(value: string): string {
  const digits = normalizePhone(value);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}


function normalizeClientName(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .toUpperCase();
}

interface ProfessionalClientSearchResult {
  id: string;
  name: string;
  phone: string;
  notes: string;
}

export default function ManualAppointmentModal({
  myServices,
  professionalAccessToken,
  formState,
  onChangeFormState,
  onClose,
  onSubmit
}: ManualAppointmentModalProps) {
  const lastSearchedPhoneRef = useRef('');
  const [clientSearchResults, setClientSearchResults] = useState<
    ProfessionalClientSearchResult[]
  >([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [clientSearchError, setClientSearchError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  const selectedService = myServices.find((service) => {
    return service.id === formState.serviceId;
  });

  useEffect(() => {
    const normalizedName = normalizeClientName(formState.clientName).trim();

    if (
      !professionalAccessToken ||
      selectedClientId ||
      normalizedName.length < 1
    ) {
      setClientSearchResults([]);
      setClientSearchError('');
      setIsSearchingClients(false);
      return;
    }

    let isCurrentSearch = true;

    const timeoutId = window.setTimeout(async () => {
      setIsSearchingClients(true);
      setClientSearchError('');

      const { data, error } = await supabase.rpc(
        'find_professional_access_clients_by_name',
        {
          p_token: professionalAccessToken,
          p_name: normalizedName,
          p_limit: 8
        }
      );

      if (!isCurrentSearch) {
        return;
      }

      setIsSearchingClients(false);

      if (error) {
        console.error('Erro ao buscar clientes pelo nome:', error);
        setClientSearchResults([]);
        setClientSearchError(
          'Não foi possível consultar os clientes. Verifique a função de busca no Supabase.'
        );
        return;
      }

      const rows = Array.isArray(data) ? data : [];

      setClientSearchResults(
        rows
          .map((row: Record<string, unknown>) => ({
            id: String(row.id || row.client_id || ''),
            name: normalizeClientName(String(row.name || row.client_name || '')),
            phone: formatPhoneInput(String(row.phone || row.client_phone || '')),
            notes: String(row.notes || '')
          }))
          .filter((client) => Boolean(client.id && client.name))
      );
    }, 150);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    formState.clientName,
    professionalAccessToken,
    selectedClientId
  ]);

  const handleClientNameChange = (value: string) => {
    setSelectedClientId('');
    setClientSearchError('');

    onChangeFormState({
      clientName: normalizeClientName(value)
    });
  };

  const handleSelectClientByName = (
    client: ProfessionalClientSearchResult
  ) => {
    setSelectedClientId(client.id);
    setClientSearchResults([]);
    setClientSearchError('');

    onChangeFormState({
      clientName: client.name,
      clientPhone: client.phone,
      notes: formState.notes.trim() || client.notes
    });
  };

  const handlePhoneChange = async (value: string) => {
    const nextPhone = formatPhoneInput(value);
    const normalizedPhone = normalizePhone(nextPhone);

    onChangeFormState({
      clientPhone: nextPhone
    });

    if (
      !professionalAccessToken ||
      normalizedPhone.length < 10 ||
      lastSearchedPhoneRef.current === normalizedPhone
    ) {
      return;
    }

    lastSearchedPhoneRef.current = normalizedPhone;

    const { data, error } = await supabase.rpc(
      'find_professional_access_client_by_phone',
      {
        p_token: professionalAccessToken,
        p_phone: normalizedPhone
      }
    );

    if (error) {
      console.error(
        'Erro ao buscar cliente pelo WhatsApp:',
        error.message
      );
      return;
    }

    const matchedClient = Array.isArray(data)
      ? data[0]
      : null;

    if (!matchedClient?.found || !matchedClient?.name) {
      return;
    }

    setSelectedClientId(
      String(matchedClient.id || matchedClient.client_id || normalizedPhone)
    );
    setClientSearchResults([]);
    setClientSearchError('');

    onChangeFormState({
      clientPhone: nextPhone,
      clientName: normalizeClientName(String(matchedClient.name))
    });
  };

  return (
    <div
      id="add-manual-appt-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
    >
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 bg-neutral-50 px-5 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-600" />

              <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
                Novo agendamento
              </h3>
            </div>

            <p className="mt-1 text-xs font-normal text-neutral-500">
              Complete os dados do atendimento seguindo o mesmo padrão da Agenda Geral.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="overflow-y-auto"
        >
          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <div className="flex items-center gap-2 text-orange-700">
                  <CalendarDays className="h-4 w-4" />

                  <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
                    Data escolhida
                  </span>
                </div>

                <p className="mt-2 text-base font-medium text-neutral-950">
                  {formatDateBr(formState.date)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#0f4c5c]/10 bg-[#0f4c5c]/5 p-4">
                <div className="flex items-center gap-2 text-[#0f4c5c]">
                  <Clock3 className="h-4 w-4" />

                  <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
                    Horário escolhido
                  </span>
                </div>

                <p className="mt-2 text-base font-medium text-neutral-950">
                  {formState.time || 'Horário não informado'}
                </p>
              </div>
            </div>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-orange-600" />

                <h4 className="text-sm font-medium text-neutral-950">
                  Serviço
                </h4>
              </div>

              <select
                value={formState.serviceId}
                onChange={(event) => {
                  onChangeFormState({
                    serviceId: event.target.value
                  });
                }}
                className="mt-3 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                required
              >
                <option value="">
                  Selecione um serviço...
                </option>

                {myServices.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name} • {service.duration} min • {formatCurrency(service.price)}
                  </option>
                ))}
              </select>

              {selectedService && (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3">
                  <p className="text-sm font-medium text-neutral-950">
                    {selectedService.name}
                  </p>

                  <p className="mt-1 text-xs font-normal text-neutral-500">
                    {selectedService.duration} minutos • {formatCurrency(selectedService.price)}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-orange-600" />

                <h4 className="text-sm font-medium text-neutral-950">
                  Dados do cliente
                </h4>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="relative space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-600">
                    Nome do cliente
                  </label>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                    <input
                      type="text"
                      placeholder="Digite o nome do cliente"
                      value={formState.clientName}
                      onChange={(event) => {
                        handleClientNameChange(event.target.value);
                      }}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-10 text-sm uppercase text-neutral-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                      autoFocus
                      required
                    />

                    {isSearchingClients && (
                      <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-500" />
                    )}
                  </div>

                  {clientSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
                      <div className="border-b border-neutral-100 bg-neutral-50 px-3 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                          Clientes encontrados
                        </p>
                      </div>

                      <div className="max-h-60 overflow-y-auto p-1.5">
                        {clientSearchResults.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClientByName(client)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-orange-50"
                          >
                            <span className="min-w-0">
                              <strong className="block truncate text-sm font-medium text-neutral-950">
                                {client.name}
                              </strong>

                              <span className="mt-0.5 block text-[11px] text-neutral-500">
                                {client.phone
                                  ? `WhatsApp: ${client.phone}`
                                  : 'Cliente sem WhatsApp cadastrado'}
                              </span>
                            </span>

                            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {clientSearchError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{clientSearchError}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp (opcional)
                  </label>

                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="(11) 99999-8888"
                    value={formatPhoneInput(formState.clientPhone)}
                    onChange={(event) => {
                      void handlePhoneChange(event.target.value);
                    }}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
              <label className="block text-xs font-medium text-neutral-600">
                Observações
              </label>

              <textarea
                placeholder="Inclua alguma observação importante para o atendimento."
                value={formState.notes}
                onChange={(event) => {
                  onChangeFormState({
                    notes: event.target.value
                  });
                }}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </section>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-orange-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar agendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
