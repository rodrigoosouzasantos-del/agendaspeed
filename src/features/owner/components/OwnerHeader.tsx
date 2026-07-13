/**
 * Cabeçalho superior do Painel do Dono - AgendaSpeed.
 *
 * Exibe:
 * - logo e nome do estabelecimento;
 * - link público da agenda;
 * - cópia rápida do link;
 * - compartilhamento;
 * - saída do painel.
 */

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  LogOut,
  Share2,
} from 'lucide-react';

interface OwnerHeaderProps {
  logoUrl: string;
  companyName: string;
  publicBookingUrl: string;
  onNavigateToClient: () => void;
  onLogOut: () => void;
}

export default function OwnerHeader({
  logoUrl,
  companyName,
  publicBookingUrl,
  onNavigateToClient,
  onLogOut,
}: OwnerHeaderProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!publicBookingUrl) return;

    try {
      await navigator.clipboard.writeText(publicBookingUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2200);
    } catch {
      window.prompt('Copie o link da sua agenda:', publicBookingUrl);
    }
  };

  const handleShare = () => {
    if (!publicBookingUrl) return;

    const shareText = [
      `📅 Agendamento online — ${companyName || 'AgendaSpeed'}`,
      '',
      'Agende seu horário em poucos minutos:',
      '',
      publicBookingUrl,
    ].join('\n');

    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <header className="sticky top-0 z-45 border-b border-neutral-200/80 bg-white px-6 py-3 shadow-xs">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 md:flex-row">
        <div className="flex items-center space-x-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo ${companyName}`}
              className="h-10 w-10 rounded-xl border bg-neutral-100 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-neutral-100 text-xs font-black text-neutral-500">
              AS
            </div>
          )}

          <div>
            <span className="block text-base font-black leading-none tracking-tight">
              {companyName}
            </span>

            <span className="mt-0.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              PAINEL DO PROPRIETÁRIO ADM
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            id="btn-goto-booking"
            type="button"
            onClick={onNavigateToClient}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Link agenda
          </button>

          <button
            id="btn-copy-booking-link"
            type="button"
            onClick={handleCopyLink}
            disabled={!publicBookingUrl}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {linkCopied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {linkCopied ? 'Link copiado' : 'Copiar link'}
          </button>

          <button
            id="btn-share-booking-link"
            type="button"
            onClick={handleShare}
            disabled={!publicBookingUrl}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            Compartilhar
          </button>

          <button
            id="btn-owner-logout"
            type="button"
            onClick={onLogOut}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair Administrador
          </button>
        </div>
      </div>
    </header>
  );
}
