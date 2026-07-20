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

import React, { useEffect, useState } from 'react';
import {
  BriefcaseBusiness,
  Calendar,
  DollarSign,
  CreditCard,
  Menu,
  Package,
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
  subscriptionStatus?: string;
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
  onOpenTodayAgenda,
  subscriptionStatus = 'trial'
}: OwnerSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

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
      tab: 'produtos',
      label: 'Produtos',
      icon: Package
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
      tab: 'mensalidade',
      label: 'Mensalidade',
      icon: CreditCard
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

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  };

  const renderItems = (isMobile = false) => {
    return sidebarItems.map((item) => {
      const Icon = item.icon;
      const isActive = activeTab === item.tab;
      const isSubscriptionItem = item.tab === 'mensalidade';
      const subscriptionDotClass =
        subscriptionStatus === 'trial'
          ? 'bg-amber-400'
          : subscriptionStatus === 'active'
            ? 'bg-emerald-500'
            : 'bg-red-500';

      return (
        <button
          key={item.tab}
          onClick={() => handleItemClick(item)}
          className={`w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition flex items-center gap-2.5 ${
            isActive
              ? 'bg-orange-600 text-white shadow-sm'
              : isMobile
                ? 'bg-white text-neutral-700 hover:bg-neutral-100'
                : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1">{item.label}</span>
          {isSubscriptionItem && (
            <span
              title="Situação da mensalidade"
              className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${subscriptionDotClass}`}
            />
          )}
        </button>
      );
    });
  };

  return (
    <>
      <div className="sticky top-[65px] z-40 border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Menu className="h-5 w-5 text-orange-600" />
            Menu do painel
          </span>

          <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-orange-700">
            {sidebarItems.find((item) => item.tab === activeTab)?.label || 'Painel'}
          </span>
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
          />

          <aside className="absolute left-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600">
                  AgendaSpeed
                </p>
                <h2 className="mt-1 text-base font-semibold text-neutral-950">
                  Menu do painel
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-2">
                {renderItems(true)}
              </div>
            </div>
          </aside>
        </div>
      )}

      <nav
        id="admin-sidebar"
        className="hidden w-60 shrink-0 select-none space-y-1.5 border-r border-neutral-200/80 bg-white p-4 lg:block"
      >
        {renderItems(false)}
      </nav>
    </>
  );
}
