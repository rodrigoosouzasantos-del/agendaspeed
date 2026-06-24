/**
 * Cabeçalho da Vitrine pública de agendamento - AgendaZap.
 *
 * Responsável por exibir, somente na primeira tela da Vitrine:
 * - capa/fachada do estabelecimento;
 * - logo;
 * - nome do estabelecimento;
 * - endereço;
 * - WhatsApp;
 * - Instagram;
 * - botão de voltar.
 */

import React from 'react';
import {
  ArrowLeft,
  Instagram,
  MapPin,
  Phone
} from 'lucide-react';

import { BookingHeaderProps } from '../booking.types';

interface ExtendedBookingHeaderProps extends BookingHeaderProps {
  coverUrl?: string;
}

export default function BookingHeader({
  logoUrl,
  coverUrl,
  companyName,
  companyAddress,
  companyPhone,
  instagram,
  onNavigateBack
}: ExtendedBookingHeaderProps) {
  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="relative bg-neutral-950">
        <div className="h-36 sm:h-48 md:h-56 overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={companyName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-950 via-neutral-800 to-orange-900" />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/35" />
        </div>

        <button
          type="button"
          onClick={onNavigateBack}
          className="absolute top-4 left-4 bg-white/95 hover:bg-white text-neutral-900 text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      <div className="bg-white">
        <div className="max-w-3xl mx-auto px-4 pb-5">
          <div className="flex items-start gap-3 sm:gap-4 pt-4">
            <div className="-mt-12 shrink-0 relative z-10">
              <img
                src={logoUrl}
                alt={`Logo ${companyName}`}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-contain border-4 border-white bg-white shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl sm:text-2xl font-black text-neutral-950 tracking-tight leading-tight break-words">
                {companyName}
              </h1>

              <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-2 text-xs text-neutral-500 font-semibold">
                {companyAddress && (
                  <span className="flex items-start gap-1.5 leading-snug">
                    <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                    <span>
                      {companyAddress}
                    </span>
                  </span>
                )}

                {companyPhone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    {companyPhone}
                  </span>
                )}

                {instagram && (
                  <span className="flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    {instagram}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
