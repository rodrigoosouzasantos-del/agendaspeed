/**
 * Tela de Profissionais do Painel do Dono - AgendaZap.
 *
 * Responsável por:
 * - listar profissionais cadastrados;
 * - permitir busca por profissional;
 * - exibir dados básicos de forma compacta;
 * - exibir regra simples de remuneração;
 * - abrir modal de edição;
 * - abrir modal de permissões;
 * - desativar colaborador.
 */

import React, {
  useMemo,
  useState
} from 'react';
import {
  Edit2,
  Link2,
  Lock,
  Plus,
  Search,
  Trash2
} from 'lucide-react';

import { Professional } from '../../../types';

import {
  getRemunerationLabel,
  getWorkDaysFormatted
} from '../owner.utils';

interface ProfessionalsViewProps {
  professionals: Professional[];
  onOpenCreateProfessional: () => void;
  onEditProfessional: (professional: Professional) => void;
  onDeleteProfessional: (professionalId: string) => void;
  onOpenPermissions: (professional: Professional) => void;
  onGenerateProfessionalLink: (professional: Professional) => void;
}

function professionalHasNoLunchBreak(professional: Professional): boolean {
  const record = professional as unknown as Record<string, unknown>;

  return (
    record.noLunchBreak === true ||
    record.hasNoLunchBreak === true ||
    record.withoutLunchBreak === true ||
    record.no_lunch_break === true ||
    record.has_no_lunch_break === true ||
    record.without_lunch_break === true ||
    professional.lunchStart === professional.lunchEnd
  );
}

function getProfessionalDisplayOrder(professional: Professional): number {
  const record = professional as unknown as Record<string, unknown>;
  const displayOrder = Number(record.displayOrder);

  return Number.isFinite(displayOrder) && displayOrder > 0
    ? displayOrder
    : 999;
}

export default function ProfessionalsView({
  professionals,
  onOpenCreateProfessional,
  onEditProfessional,
  onDeleteProfessional,
  onOpenPermissions,
  onGenerateProfessionalLink
}: ProfessionalsViewProps) {
  const [professionalSearch, setProfessionalSearch] = useState('');

  const filteredProfessionals = useMemo(() => {
    const normalizedSearch = professionalSearch.trim().toLowerCase();

    return [...professionals]
      .filter((professional) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          professional.name.toLowerCase().includes(normalizedSearch) ||
          professional.role.toLowerCase().includes(normalizedSearch) ||
          professional.phone.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((firstProfessional, secondProfessional) => {
        const firstOrder = getProfessionalDisplayOrder(firstProfessional);
        const secondOrder = getProfessionalDisplayOrder(secondProfessional);

        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        return firstProfessional.name.localeCompare(secondProfessional.name, 'pt-BR');
      });
  }, [
    professionals,
    professionalSearch
  ]);

  return (
    <div id="view-profissionais" className="space-y-5 text-left animate-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
            Gestão da Equipe
          </h2>

          <p className="text-xs text-neutral-500 mt-0.5">
            Cadastre colaboradores, defina comissão, ordem na Vitrine e permissões de acesso.
          </p>
        </div>

        <button
          id="btn-add-prof-trigger"
          onClick={onOpenCreateProfessional}
          className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Colaborador
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />

        <input
          type="search"
          value={professionalSearch}
          onChange={(event) => setProfessionalSearch(event.target.value)}
          placeholder="Procurar profissional..."
          className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-neutral-800 outline-none focus:border-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredProfessionals.map((professional) => {
          const workDaysFormatted = getWorkDaysFormatted(professional.workDays);
          const displayOrder = getProfessionalDisplayOrder(professional);

          return (
            <div
              id={`prof-card-${professional.id}`}
              key={professional.id}
              className={`bg-white border rounded-3xl p-4 shadow-xs space-y-3 relative ${
                !professional.active ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={professional.avatar}
                    alt={professional.name}
                    className="w-12 h-12 rounded-2xl object-cover border shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-neutral-900 leading-tight truncate">
                      {professional.name}
                    </h3>

                    <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">
                      {professional.role}
                    </span>

                    <span className="text-[10px] text-neutral-400 font-mono block mt-1">
                      Ordem: {displayOrder === 999 ? 'Alfabética' : displayOrder}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase font-bold text-neutral-400 font-mono block">
                    Remuneração
                  </span>

                  <span className="text-xs font-black text-orange-600 block">
                    {getRemunerationLabel(professional)}
                  </span>
                </div>
              </div>

              <div className="bg-neutral-50 p-3 rounded-2xl text-xs text-neutral-600">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <strong className="text-neutral-850 font-bold block">
                      Dias
                    </strong>

                    <span className="text-neutral-500 line-clamp-1">
                      {workDaysFormatted || 'Não definido'}
                    </span>
                  </div>

                  <div>
                    <strong className="text-neutral-850 font-bold block">
                      Horário
                    </strong>

                    <span>
                      {professional.workHoursStart} - {professional.workHoursEnd}
                    </span>
                  </div>

                  <div>
                    <strong className="text-neutral-850 font-bold block">
                      Almoço
                    </strong>

                    <span>
                      {professionalHasNoLunchBreak(professional)
                        ? 'Sem intervalo definido'
                        : `${professional.lunchStart} - ${professional.lunchEnd}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3 border-neutral-100">
                <div className="flex items-center gap-2">
                  <button
                    id={`btn-perm-trigger-${professional.id}`}
                    onClick={() => onOpenPermissions(professional)}
                    className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-bold"
                  >
                    <Lock className="w-3.5 h-3.5 text-zinc-500" />
                    Permissões
                  </button>

                  <button
                    id={`btn-link-prof-${professional.id}`}
                    onClick={() => onGenerateProfessionalLink(professional)}
                    className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-bold"
                    title="Gerar e copiar link de acesso do profissional"
                  >
                    <Link2 className="w-3.5 h-3.5 text-orange-600" />
                    Enviar Link
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`btn-edit-prof-${professional.id}`}
                    onClick={() => onEditProfessional(professional)}
                    className="p-2 text-neutral-500 hover:text-neutral-900 border rounded-xl hover:bg-neutral-50 transition cursor-pointer"
                    title="Editar profissional"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {professional.active && (
                    <button
                      onClick={() => onDeleteProfessional(professional.id)}
                      className="p-2 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition cursor-pointer"
                      title="Desativar colaborador"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProfessionals.length === 0 && (
        <div className="bg-white border rounded-2xl p-12 text-center text-neutral-500 space-y-3">
          <p className="text-sm font-semibold text-neutral-800">
            Nenhum profissional encontrado.
          </p>

          <p className="text-xs text-neutral-400">
            Ajuste a busca ou clique em “Adicionar Colaborador” para cadastrar um novo profissional.
          </p>
        </div>
      )}
    </div>
  );
}
