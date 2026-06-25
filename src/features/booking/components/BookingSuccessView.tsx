/**
 * Tela de sucesso do agendamento público - AgendaSpeed.
 *
 * Responsável por:
 * - confirmar visualmente que o horário foi registrado;
 * - orientar o cliente a solicitar o link de acompanhamento pelo WhatsApp;
 * - manter a tela objetiva, sem resumo longo e sem botão de saída.
 */

import React, { useMemo } from 'react';

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageCircle,
  Scissors
} from 'lucide-react';

import { BookingSuccessViewProps } from '../booking.types';

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

function buildTrackingMessage(params: {
  companyName: string;
  selectedServiceName?: string;
  selectedDate: string;
  selectedTime: string;
}): string {
  const {
    companyName,
    selectedServiceName,
    selectedDate,
    selectedTime
  } = params;

  const serviceLine = selectedServiceName
    ? `Serviço: ${selectedServiceName}\n`
    : '';

  return [
    `Olá, ${companyName},`,
    '',
    'Horário marcado com sucesso! 😊',
    '',
    serviceLine
      ? `${serviceLine}Data: ${formatDateBr(selectedDate)}\nHorário: ${selectedTime}`
      : `Data: ${formatDateBr(selectedDate)}\nHorário: ${selectedTime}`,
    '',
    'Por favor, envie meu link de acompanhamento para que eu possa confirmar presença, remarcar ou cancelar, caso necessário.'
  ].join('\n');
}

function buildWhatsAppUrlWithMessage(
  whatsappUrl: string,
  message: string
): string {
  if (!whatsappUrl) {
    return '#';
  }

  try {
    const parsedUrl = new URL(whatsappUrl);
    parsedUrl.searchParams.set('text', message);
    return parsedUrl.toString();
  } catch {
    const separator = whatsappUrl.includes('?') ? '&' : '?';
    return `${whatsappUrl}${separator}text=${encodeURIComponent(message)}`;
  }
}

export default function BookingSuccessView({
  selectedService,
  selectedDate,
  selectedTime,
  companyName,
  whatsappUrl
}: BookingSuccessViewProps) {
  const formattedDate = formatDateBr(selectedDate);

  const trackingMessage = useMemo(() => {
    return buildTrackingMessage({
      companyName,
      selectedServiceName: selectedService?.name,
      selectedDate,
      selectedTime
    });
  }, [
    companyName,
    selectedDate,
    selectedService?.name,
    selectedTime
  ]);

  const trackingWhatsappUrl = useMemo(() => {
    return buildWhatsAppUrlWithMessage(whatsappUrl, trackingMessage);
  }, [
    trackingMessage,
    whatsappUrl
  ]);

  return (
    <section className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-neutral-50 px-4 py-5">
      <div className="w-full max-w-xl rounded-[2rem] border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
          <CheckCircle2 className="h-11 w-11" />
        </div>

        <div className="mt-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600">
            Agendamento registrado
          </span>

          <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.04em] text-neutral-950 sm:text-4xl">
            Horário marcado com sucesso!
          </h2>

          <p className="mx-auto mt-3 max-w-md text-base font-medium leading-relaxed text-neutral-500">
            Clique no botão abaixo para receber no WhatsApp o link de acompanhamento do seu horário.
          </p>
        </div>

        <div className="mt-5 rounded-3xl border border-neutral-200 bg-neutral-50 p-4 text-left">
          <div className="flex items-start gap-3">
            <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />

            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-neutral-950">
                {selectedService?.name || 'Serviço selecionado'}
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-neutral-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-neutral-200">
                  <CalendarDays className="h-3.5 w-3.5 text-orange-600" />
                  {formattedDate}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-neutral-200">
                  <Clock className="h-3.5 w-3.5 text-orange-600" />
                  {selectedTime}
                </span>
              </div>
            </div>
          </div>
        </div>

        <a
          href={trackingWhatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-emerald-600 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-5 w-5" />
          Receber link no WhatsApp
        </a>

        <p className="mx-auto mt-4 max-w-md text-xs font-medium leading-relaxed text-neutral-400">
          Com esse link você poderá acompanhar seu horário e, quando permitido pelo estabelecimento, solicitar remarcação ou cancelamento.
        </p>
      </div>
    </section>
  );
}
