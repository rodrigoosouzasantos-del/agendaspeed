/**
 * Tela de sucesso do agendamento público - AgendaBless.
 *
 * Responsável por:
 * - confirmar visualmente que o horário foi registrado;
 * - mostrar uma mensagem objetiva;
 * - permitir que o cliente envie uma única mensagem pelo WhatsApp;
 * - entregar o link de acompanhamento dentro da mensagem preparada.
 */

import React from 'react';

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageCircle,
  UserCheck
} from 'lucide-react';

import { BookingSuccessViewProps } from '../booking.types';

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}


function getServiceVisualIcon(serviceName?: string, categoryName?: string): string {
  const value = `${serviceName || ''} ${categoryName || ''}`.toLowerCase();

  if (value.includes('massagem') || value.includes('massage')) {
    return '💆';
  }

  if (value.includes('barba') || value.includes('barbearia')) {
    return '🧔';
  }

  if (value.includes('unha') || value.includes('manicure') || value.includes('pedicure')) {
    return '💅';
  }

  if (value.includes('sobrancelha') || value.includes('cilio') || value.includes('cílio')) {
    return '✨';
  }

  if (value.includes('estética') || value.includes('estetica') || value.includes('limpeza')) {
    return '🌿';
  }

  if (value.includes('cabelo') || value.includes('corte') || value.includes('escova') || value.includes('visagismo')) {
    return '💇';
  }

  return '⚡';
}

export default function BookingSuccessView({
  selectedService,
  selectedProfessional,
  selectedDate,
  selectedTime,
  clientName,
  companyName,
  whatsappUrl
}: BookingSuccessViewProps) {
  const formattedDate = formatDateBr(selectedDate);
  const hasWhatsappUrl = Boolean(whatsappUrl);
  const serviceIcon = getServiceVisualIcon(selectedService?.name, selectedService?.category);

  return (
    <section className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-6 sm:py-8">
      <div className="w-full rounded-[2rem] border border-neutral-200 bg-white p-5 text-center shadow-sm sm:p-7">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-11 w-11" />
        </div>

        <div className="mt-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
            Agendamento registrado
          </span>

          <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.03em] text-neutral-950 sm:text-3xl">
            Horário marcado com sucesso!
          </h2>

          <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-neutral-500">
            {clientName}, toque no botão abaixo para enviar os dados ao {companyName} e receber seu link de acompanhamento.
          </p>
        </div>

        <div className="mt-5 rounded-3xl border border-neutral-200 bg-neutral-50 p-4 text-left">
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
                {serviceIcon}
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  Serviço
                </p>
                <p className="font-extrabold leading-snug text-neutral-950">
                  {selectedService?.name || 'Serviço selecionado'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  Profissional
                </p>
                <p className="font-extrabold leading-snug text-neutral-950">
                  {selectedProfessional?.name || 'Profissional selecionado'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-3 ring-1 ring-neutral-200">
                <div className="flex items-center gap-1.5 text-orange-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                    Data
                  </span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-neutral-950">
                  {formattedDate}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-3 ring-1 ring-neutral-200">
                <div className="flex items-center gap-1.5 text-orange-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                    Horário
                  </span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-neutral-950">
                  {selectedTime}
                </p>
              </div>
            </div>
          </div>
        </div>

        <a
          href={hasWhatsappUrl ? whatsappUrl : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!hasWhatsappUrl}
          className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-3xl px-5 py-4 text-base font-extrabold text-white shadow-sm transition ${
            hasWhatsappUrl
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'pointer-events-none bg-neutral-300'
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          Enviar dados pelo WhatsApp
        </a>

        <p className="mx-auto mt-3 max-w-sm text-xs font-medium leading-relaxed text-neutral-400">
          A mensagem já vai com o link para confirmar, remarcar ou cancelar futuramente.
        </p>
      </div>
    </section>
  );
}
