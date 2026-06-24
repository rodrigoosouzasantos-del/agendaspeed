/**
 * Menu lateral / menu horizontal mobile do Painel do Dono - AgendaZap.
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

import React from 'react';
import {
  BriefcaseBusiness,
  Calendar,
  DollarSign,
  Settings,
  TrendingUp,
  Users,
  WalletCards
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

  return (
    <nav
      id="admin-sidebar"
      className="lg:w-60 border-r border-neutral-200/80 bg-white p-4 space-y-1.5 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible shrink-0 gap-1 lg:gap-0 select-none"
    >
      {sidebarItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.tab;

        const handleClick = () => {
          if (item.onClick) {
            item.onClick();
            return;
          }

          onChangeTab(item.tab);
        };

        return (
          <button
            key={item.tab}
            onClick={handleClick}
            className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 shrink-0 ${
              isActive
                ? 'bg-orange-600 text-white'
                : 'hover:bg-neutral-100 text-neutral-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
