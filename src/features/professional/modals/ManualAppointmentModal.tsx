import React, { useRef } from 'react';

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Scissors,
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

export default function ManualAppointmentModal({
  myServices,
  professionalAccessToken,
  formState,
  onChangeFormState,
  onClose,
  onSubmit
}: ManualAppointmentModalProps) {
  const lastSearchedPhoneRef = useRef('');

  const selectedService = myServices.find((service) => {
    return service.id === formState.serviceId;
  });

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

    onChangeFormState({
      clientPhone: nextPhone,
      clientName: String(matchedClient.name).toUpperCase()
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-600">
                    Nome do cliente
                  </label>

                  <input
                    type="text"
                    placeholder="Ex.: JOSE DA PADARIA"
                    value={formState.clientName}
                    onChange={(event) => {
                      onChangeFormState({
                        clientName: normalizeClientName(event.target.value)
                      });
                    }}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm uppercase text-neutral-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    autoFocus
                    required
                  />
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
