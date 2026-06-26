/**
 * Menu lateral / menu mobile do Painel do Dono - AgendaSpeed.
 *
 * Responsável por navegar entre os módulos administrativos:
 * - Painel;
 * - Agenda Geral;
 * - Profissionais;
 * - Serviços;
 * - Clientes;
 * - Recebimentos;
 * - Financeiro;
 * - Configurações.
 */

import React, { useState } from 'react';
import {
  BriefcaseBusiness,
  Calendar,
  DollarSign,
  Menu,
  Settings,
  TrendingUp,
  Users,
  WalletCards,
  X
} from 'lucide-react';

import { OwnerTab } from '../owner.types';

interface OwnerSidebarProps {
  activeTab: OwnerTab;
  onChangeTab: (tab: OwnerTab) => void;
  onOpenTodayAgenda: () => void;
}

interface SidebarItem {
  tab: OwnerTab;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}

export default function OwnerSidebar({
  activeTab,
  onChangeTab,
  onOpenTodayAgenda
}: OwnerSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sidebarItems: SidebarItem[] = [
    {
      tab: 'painel',
      label: 'Painel',
      icon: TrendingUp
    },
    {
      tab: 'agenda',
      label: 'Agenda Geral',
      icon: Calendar,
      onClick: onOpenTodayAgenda
    },
    {
      tab: 'profissionais',
      label: 'Profissionais',
      icon: Users
    },
    {
      tab: 'servicos',
      label: 'Serviços',
      icon: BriefcaseBusiness
    },
    {
      tab: 'clientes',
      label: 'Clientes',
      icon: Users
    },
    {
      tab: 'recebimentos',
      label: 'Recebimentos',
      icon: WalletCards
    },
    {
      tab: 'financeiro',
      label: 'Financeiro',
      icon: DollarSign
    },
    {
      tab: 'configuracoes',
      label: 'Configurações',
      icon: Settings
    }
  ];

  const handleItemClick = (item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    } else {
      onChangeTab(item.tab);
    }

    setIsMobileMenuOpen(false);
  };

  const renderItems = (isMobile = false) => {
    return sidebarItems.map((item) => {
      const Icon = item.icon;
      const isActive = activeTab === item.tab;

      return (
        <button
          key={item.tab}
          onClick={() => handleItemClick(item)}
          className={`w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-extrabold transition flex items-center gap-2.5 ${
            isActive
              ? 'bg-orange-600 text-white shadow-sm'
              : isMobile
                ? 'bg-white text-neutral-700 hover:bg-neutral-100'
                : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </button>
      );
    });
  };

  return (
    <>
      <div className="sticky top-[65px] z-40 border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-extrabold text-neutral-900 shadow-sm"
        >
          <span className="flex items-center gap-2">
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-orange-600" />
            ) : (
              <Menu className="h-5 w-5 text-orange-600" />
            )}
            Menu do painel
          </span>

          <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
            {sidebarItems.find((item) => item.tab === activeTab)?.label || 'Painel'}
          </span>
        </button>

        {isMobileMenuOpen && (
          <div className="mt-3 grid gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg">
            {renderItems(true)}
          </div>
        )}
      </div>

      <nav
        id="admin-sidebar"
        className="hidden w-60 shrink-0 select-none space-y-1.5 border-r border-neutral-200/80 bg-white p-4 lg:block"
      >
        {renderItems(false)}
      </nav>
    </>
  );
}
