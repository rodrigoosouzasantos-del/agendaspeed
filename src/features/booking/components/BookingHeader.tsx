/**
 * Cabeçalho da Vitrine pública de agendamento - AgendaSpeed.
 *
 * Responsável por exibir, somente na primeira tela da Vitrine:
 * - capa/fachada real cadastrada no estabelecimento;
 * - logo;
 * - nome do estabelecimento;
 * - endereço;
 * - WhatsApp;
 * - Instagram;
 * - identificação visual sem botão de saída para o site institucional.
 */

import React, { useMemo, useState } from 'react';
import {
  Instagram,
  MapPin,
  Phone
} from 'lucide-react';

import { BookingHeaderProps } from '../booking.types';

interface ExtendedBookingHeaderProps extends BookingHeaderProps {
  coverUrl?: string;
}

function normalizeImageUrl(value?: string): string {
  const trimmedValue = String(value || '').trim();

  if (
    !trimmedValue ||
    trimmedValue === 'null' ||
    trimmedValue === 'undefined'
  ) {
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

  return words
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

export default function BookingHeader({
  logoUrl,
  coverUrl,
  companyName,
  companyAddress,
  companyPhone,
  instagram
}: ExtendedBookingHeaderProps) {
  const [coverHasError, setCoverHasError] = useState(false);
  const [logoHasError, setLogoHasError] = useState(false);

  const safeCoverUrl = useMemo(() => normalizeImageUrl(coverUrl), [coverUrl]);
  const safeLogoUrl = useMemo(() => normalizeImageUrl(logoUrl), [logoUrl]);

  const shouldShowCoverImage = Boolean(safeCoverUrl && !coverHasError);
  const shouldShowLogoImage = Boolean(safeLogoUrl && !logoHasError);

  return (
    <header className="bg-neutral-50 border-b border-neutral-200">
      <div className="relative bg-neutral-950">
        <div className="h-40 overflow-hidden sm:h-52 md:h-64">
          {shouldShowCoverImage ? (
            <img
              src={safeCoverUrl}
              alt={`Fachada de ${companyName}`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setCoverHasError(true)}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/10" />
        </div>

      </div>

      <div className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
            <div className="shrink-0">
              {shouldShowLogoImage ? (
                <img
                  src={safeLogoUrl}
                  alt={`Logo ${companyName}`}
                  className="h-16 w-16 rounded-2xl border border-neutral-200 bg-white object-contain p-1 shadow-sm sm:h-20 sm:w-20"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoHasError(true)}
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-950 text-lg font-extrabold text-white shadow-sm sm:h-20 sm:w-20">
                  {getInitials(companyName)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="break-words text-xl font-extrabold leading-tight tracking-[-0.03em] text-neutral-800 sm:text-2xl">
                {companyName}
              </h1>

              <div className="mt-2 grid gap-1.5 text-[11px] font-bold leading-snug text-neutral-500 sm:flex sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1.5 sm:text-xs">
                {companyAddress && (
                  <span className="inline-flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" />
                    <span>{companyAddress}</span>
                  </span>
                )}

                {companyPhone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                    <span>{companyPhone}</span>
                  </span>
                )}

                {instagram && (
                  <span className="inline-flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                    <span>{instagram}</span>
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
