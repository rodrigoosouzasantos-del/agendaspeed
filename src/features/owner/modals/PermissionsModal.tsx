/**
 * Modal de Permissões do Profissional - AgendaZap.
 *
 * Responsável por configurar permissões de forma simples e prática.
 */

import React from 'react';
import { X } from 'lucide-react';

import { Professional } from '../../../types';

interface PermissionsModalProps {
  professional: Professional | null;
  onClose: () => void;
  onApplySimplePermissions: (
    professionalId: string,
    action: 'manage_agenda' | 'read_only' | 'reports'
  ) => void;
}

function hasAgendaManagementPermission(professional: Professional): boolean {
  return (
    professional.permissions.createAppts ||
    professional.permissions.rescheduleAppts ||
    professional.permissions.cancelAppts ||
    professional.permissions.blockCalendar ||
    professional.permissions.openSpots
  );
}

export default function PermissionsModal({
  professional,
  onClose,
  onApplySimplePermissions
}: PermissionsModalProps) {
  if (!professional) {
    return null;
  }

  const canManageAgenda = hasAgendaManagementPermission(professional);
  const isReadOnly = professional.permissions.viewOwnCalendar && !canManageAgenda;
  const canViewReports = professional.permissions.viewFinancial || professional.permissions.viewCommission;

  return (
    <div
      id="modal-permissions"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border text-left shadow-2xl relative space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-black text-neutral-950">
              Permissões de Acesso
            </h3>

            <span className="text-xs text-neutral-500">
              {professional.name} • {professional.role}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-start justify-between gap-4 p-3 bg-neutral-50 hover:bg-neutral-100 rounded-2xl transition cursor-pointer border">
            <div>
              <span className="font-black text-neutral-850 block">
                Pode alterar horários e agendamentos
              </span>

              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Permite abrir horários, bloquear agenda, criar, remarcar e cancelar agendamentos.
              </span>
            </div>

            <input
              type="checkbox"
              checked={canManageAgenda}
              onChange={() => onApplySimplePermissions(professional.id, 'manage_agenda')}
              className="w-4 h-4 text-orange-600 rounded mt-0.5 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-3 bg-neutral-50 hover:bg-neutral-100 rounded-2xl transition cursor-pointer border">
            <div>
              <span className="font-black text-neutral-850 block">
                Somente leitura da própria agenda
              </span>

              <span className="text-[10px] text-neutral-500 block mt-0.5">
                O profissional apenas visualiza os horários, sem alterar agenda.
              </span>
            </div>

            <input
              type="checkbox"
              checked={isReadOnly}
              onChange={() => onApplySimplePermissions(professional.id, 'read_only')}
              className="w-4 h-4 text-orange-600 rounded mt-0.5 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-3 bg-orange-50/60 hover:bg-orange-50 rounded-2xl transition cursor-pointer border border-orange-100">
            <div>
              <span className="font-black text-orange-950 block">
                Pode acompanhar relatórios e comissão
              </span>

              <span className="text-[10px] text-orange-700 block mt-0.5">
                Libera a aba de relatórios próprios e comissão prevista.
              </span>
            </div>

            <input
              type="checkbox"
              checked={canViewReports}
              onChange={() => onApplySimplePermissions(professional.id, 'reports')}
              className="w-4 h-4 text-orange-600 rounded mt-0.5 shrink-0"
            />
          </label>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-neutral-900 text-white font-bold py-3 rounded-xl hover:bg-neutral-800 transition text-xs cursor-pointer"
          >
            Confirmar Permissões
          </button>
        </div>
      </div>
    </div>
  );
}
