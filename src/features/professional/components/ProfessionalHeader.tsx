import React from 'react';

import { LogOut } from 'lucide-react';

import {
  ProfessionalHeaderProps,
  ProfessionalTab
} from '../professional.types';

export default function ProfessionalHeader({
  configName,
  professional,
  activeTab,
  onChangeTab,
  onLogOut
}: ProfessionalHeaderProps) {
  const canViewReports =
    professional.permissions.viewFinancial === true ||
    professional.permissions.viewCommission === true ||
    professional.permissions.viewChairRental === true;

  const getTabClassName = (tab: ProfessionalTab) => {
    return [
      'px-4 py-2 rounded-xl text-xs font-medium transition',
      activeTab === tab
        ? 'bg-orange-600 text-white'
        : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-400'
    ].join(' ');
  };

  return (
    <div className="bg-neutral-950 text-white px-6 py-4 border-b border-neutral-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={professional.avatar}
            alt={professional.name}
            className="w-14 h-14 rounded-2xl border-2 border-orange-500 object-cover shadow-inner"
            referrerPolicy="no-referrer"
          />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">
                {professional.name}
              </h1>

              <span className="bg-sky-500/10 text-sky-400 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-sky-400/20 font-medium">
                Colaborador
              </span>
            </div>

            <p className="text-xs text-neutral-400 mt-0.5">
              {professional.role} • {configName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => onChangeTab('agenda')}
            className={getTabClassName('agenda')}
          >
            Minha Agenda
          </button>

          {canViewReports && (
            <button
              type="button"
              onClick={() => onChangeTab('relatorios')}
              className={getTabClassName('relatorios')}
            >
              Meus Relatórios
            </button>
          )}

          <button
            id="btn-prof-logout"
            type="button"
            onClick={onLogOut}
            className="bg-red-500/15 hover:bg-red-500/35 text-red-400 border border-red-500/30 text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}