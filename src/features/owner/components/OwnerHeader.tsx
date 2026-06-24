/**
 * Cabeçalho superior do Painel do Dono - AgendaZap.
 *
 * Responsável por exibir:
 * - logo do estabelecimento;
 * - nome do estabelecimento;
 * - identificação do painel administrativo;
 * - botão para visualizar o link público de agendamento;
 * - botão de sair.
 */

import React from 'react';
import { ExternalLink, LogOut } from 'lucide-react';

interface OwnerHeaderProps {
  logoUrl: string;
  companyName: string;
  onNavigateToClient: () => void;
  onLogOut: () => void;
}

export default function OwnerHeader({
  logoUrl,
  companyName,
  onNavigateToClient,
  onLogOut
}: OwnerHeaderProps) {
  return (
    <header className="sticky top-0 z-45 bg-white border-b border-neutral-200/80 px-6 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-center justify-between">
        
        <div className="flex items-center space-x-2">
          <img 
            src={logoUrl} 
            alt="Logo" 
            className="w-10 h-10 rounded-xl object-contain border bg-neutral-100"
            referrerPolicy="no-referrer"
          />

          <div>
            <span className="text-base font-black tracking-tight leading-none block">
              {companyName}
            </span>

            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-mono mt-0.5">
              PAINEL DO PROPRIETÁRIO ADM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            id="btn-goto-booking"
            onClick={onNavigateToClient} 
            className="bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver Link de Agendamento
          </button>
          
          <button 
            id="btn-owner-logout"
            onClick={onLogOut}
            className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair Administrador
          </button>
        </div>

      </div>
    </header>
  );
}