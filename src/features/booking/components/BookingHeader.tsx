/**
 * Cabeçalho da Vitrine pública de agendamento - AgendaSpeed.
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

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Instagram,
  MapPin,
  Phone,
  Sparkles
} from 'lucide-react';

import { BookingHeaderProps } from '../booking.types';

interface ExtendedBookingHeaderProps extends BookingHeaderProps {
  coverUrl?: string;
}

function normalizeImageUrl(value?: string): string {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue || trimmedValue === 'null' || trimmedValue === 'undefined') {
    return '';
  }

  return trimmedValue;
}

function getInitials(value: string): string {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return 'AS';
  }

  return words.map((word) => word[0]?.toUpperCase()).join('');
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
  const [coverHasError, setCoverHasError] = useState(false);
  const [logoHasError, setLogoHasError] = useState(false);

  const safeCoverUrl = useMemo(() => normalizeImageUrl(coverUrl), [coverUrl]);
  const safeLogoUrl = useMemo(() => normalizeImageUrl(logoUrl), [logoUrl]);
  const shouldShowCoverImage = Boolean(safeCoverUrl && !coverHasError);
  const shouldShowLogoImage = Boolean(safeLogoUrl && !logoHasError);

  return (
    <header className="bg-[#f7f5f2]">
      <div className="relative overflow-hidden bg-neutral-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.28),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(255,237,213,0.12),transparent_28%),linear-gradient(135deg,#09090b_0%,#1c1917_52%,#7c2d12_100%)]" />

        <div className="relative mx-auto max-w-5xl px-4 pb-0 pt-4 sm:px-6 sm:pt-5">
          <button
            type="button"
            onClick={onNavigateBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/95 px-3.5 py-2 text-xs font-black text-neutral-950 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <div className="mt-16 sm:mt-20">
            <div className="relative h-36 overflow-hidden rounded-t-[2rem] border border-white/10 bg-neutral-900 shadow-2xl shadow-black/25 sm:h-52 md:h-60">
              {shouldShowCoverImage ? (
                <img
                  src={safeCoverUrl}
                  alt={`Fachada de ${companyName}`}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setCoverHasError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.34),transparent_32%),linear-gradient(135deg,#111827_0%,#171717_45%,#7c2d12_100%)]">
                  <div className="px-8 text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-orange-200 ring-1 ring-white/15 backdrop-blur">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-200/90">
                      Vitrine online
                    </p>
                    <p className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
                      {companyName}
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
          <div className="relative -mt-12 rounded-[2rem] border border-neutral-200 bg-white/95 p-4 shadow-xl shadow-neutral-900/10 backdrop-blur sm:-mt-14 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="shrink-0">
                {shouldShowLogoImage ? (
                  <img
                    src={safeLogoUrl}
                    alt={`Logo ${companyName}`}
                    className="h-20 w-20 rounded-3xl border-4 border-white bg-white object-contain shadow-lg ring-1 ring-neutral-200 sm:h-24 sm:w-24"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoHasError(true)}
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white bg-neutral-950 text-xl font-black text-white shadow-lg ring-1 ring-neutral-200 sm:h-24 sm:w-24">
                    {getInitials(companyName)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700 ring-1 ring-orange-100">
                  Agende online
                </div>

                <h1 className="mt-2 break-words text-2xl font-black leading-tight tracking-[-0.04em] text-neutral-950 sm:text-3xl">
                  {companyName}
                </h1>

                <div className="mt-3 flex flex-col gap-2 text-xs font-bold text-neutral-500 sm:flex-row sm:flex-wrap sm:items-center">
                  {companyAddress && (
                    <span className="inline-flex items-start gap-1.5 leading-snug">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" />
                      <span>{companyAddress}</span>
                    </span>
                  )}

                  {companyPhone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                      {companyPhone}
                    </span>
                  )}

                  {instagram && (
                    <span className="inline-flex items-center gap-1.5">
                      <Instagram className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                      {instagram}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3">
              <p className="text-sm font-extrabold leading-relaxed text-neutral-800">
                Escolha o serviço, selecione o profissional e veja os horários disponíveis em poucos toques.
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
