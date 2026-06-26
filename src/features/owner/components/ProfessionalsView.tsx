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

import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Edit2,
  Link2,
  Lock,
  Plus,
  Power,
  Search,
} from "lucide-react";

import { Professional } from "../../../types";

import { getRemunerationLabel } from "../owner.utils";

interface ProfessionalsViewProps {
  professionals: Professional[];
  onOpenCreateProfessional: () => void;
  onEditProfessional: (professional: Professional) => void;
  onDeleteProfessional: (professionalId: string) => void;
  onOpenPermissions: (professional: Professional) => void;
  onGenerateProfessionalLink: (professional: Professional) => void;
  onOpenProfessionalAgenda: (professional: Professional) => void;
}

function getProfessionalDisplayOrder(professional: Professional): number {
  const record = professional as unknown as Record<string, unknown>;
  const displayOrder = Number(record.displayOrder);

  return Number.isFinite(displayOrder) && displayOrder > 0 ? displayOrder : 999;
}

export default function ProfessionalsView({
  professionals,
  onOpenCreateProfessional,
  onEditProfessional,
  onDeleteProfessional,
  onOpenPermissions,
  onGenerateProfessionalLink,
  onOpenProfessionalAgenda,
}: ProfessionalsViewProps) {
  const [professionalSearch, setProfessionalSearch] = useState("");

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

        return firstProfessional.name.localeCompare(
          secondProfessional.name,
          "pt-BR",
        );
      });
  }, [professionals, professionalSearch]);

  return (
    <div id="view-profissionais" className="space-y-5 text-left animate-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
            Gestão da Equipe
          </h2>

          <p className="text-xs text-neutral-500 mt-0.5">
            Cadastre colaboradores, defina comissão, ordem na Vitrine e
            permissões de acesso.
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredProfessionals.map((professional) => {
          const displayOrder = getProfessionalDisplayOrder(professional);

          return (
            <div
              id={`prof-card-${professional.id}`}
              key={professional.id}
              className={`bg-white border border-neutral-200 rounded-3xl p-4 shadow-xs relative transition hover:shadow-md ${
                !professional.active ? "opacity-60 bg-neutral-50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <img
                  src={professional.avatar}
                  alt={professional.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-neutral-200 shrink-0 bg-neutral-100"
                  referrerPolicy="no-referrer"
                />

                <div className="min-w-0 flex-1 font-mono text-neutral-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-neutral-800 leading-tight truncate tracking-tight">
                        {professional.name}
                      </h3>

                      <span className="text-[11px] text-neutral-500 block mt-1 truncate uppercase tracking-[0.08em]">
                        {professional.role || "Cargo não informado"}
                      </span>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                        professional.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-neutral-100 text-neutral-500 border-neutral-200"
                      }`}
                    >
                      {professional.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
                    <span>
                      Ordem:{" "}
                      {displayOrder === 999 ? "Alfabética" : displayOrder}
                    </span>
                    <span className="text-neutral-300">•</span>
                    <span>{getRemunerationLabel(professional)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                <button
                  id={`btn-perm-trigger-${professional.id}`}
                  onClick={() => onOpenPermissions(professional)}
                  className="text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-semibold"
                >
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  Permissões
                </button>

                <button
                  id={`btn-link-prof-${professional.id}`}
                  onClick={() => onGenerateProfessionalLink(professional)}
                  disabled={!professional.active}
                  className="text-[11px] bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    professional.active
                      ? "Gerar e copiar link de acesso do profissional"
                      : "Profissional inativo não recebe link de acesso"
                  }
                >
                  <Link2 className="w-3.5 h-3.5 text-orange-600" />
                  Enviar Link
                </button>

                <button
                  id={`btn-agenda-prof-${professional.id}`}
                  onClick={() => onOpenProfessionalAgenda(professional)}
                  disabled={!professional.active}
                  className="text-[11px] bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    professional.active
                      ? "Abrir agenda deste profissional"
                      : "Profissional inativo está sem acesso à agenda"
                  }
                >
                  <CalendarDays className="w-3.5 h-3.5 text-neutral-600" />
                  Agenda
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    id={`btn-edit-prof-${professional.id}`}
                    onClick={() => onEditProfessional(professional)}
                    className="p-2 text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition cursor-pointer"
                    title="Editar profissional"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {professional.active && (
                    <button
                      onClick={() => onDeleteProfessional(professional.id)}
                      className="px-3 py-2 text-[11px] text-red-700 border border-red-200 rounded-xl hover:bg-red-50 transition cursor-pointer flex items-center gap-1.5 font-semibold"
                      title="Desativar colaborador e bloquear o link de acesso à agenda"
                    >
                      <Power className="w-3.5 h-3.5" />
                      Desativar
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
            Ajuste a busca ou clique em “Adicionar Colaborador” para cadastrar
            um novo profissional.
          </p>
        </div>
      )}
    </div>
  );
}
