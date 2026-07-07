/**
 * Tela de Profissionais do Painel do Dono - AgendaSpeed.
 *
 * Responsável por:
 * - listar profissionais cadastrados;
 * - permitir busca por profissional;
 * - exibir foto, nome e especialidade de forma compacta;
 * - abrir cadastro do profissional ao clicar no card;
 * - manter ações rápidas sem poluir a tela.
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

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
    const normalizedSearch = normalizeSearch(professionalSearch);

    return [...professionals]
      .filter((professional) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          professional.name,
          professional.role,
          professional.phone,
        ].some((value) => normalizeSearch(value || "").includes(normalizedSearch));
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
    <div id="view-profissionais" className="space-y-3 text-left animate-none">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AGENDASPEED
            </p>

            <h2 className="text-lg font-black tracking-tight text-neutral-950">
              Profissionais
            </h2>
          </div>

          <div className="flex w-full flex-col gap-2 lg:max-w-3xl lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

              <input
                type="search"
                value={professionalSearch}
                onChange={(event) => setProfessionalSearch(event.target.value)}
                placeholder="Buscar por nome, especialidade ou telefone"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />
            </div>

            <button
              id="btn-add-prof-trigger"
              type="button"
              onClick={onOpenCreateProfessional}
              className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#123945] flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Adicionar Profissional
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filteredProfessionals.map((professional) => {
          return (
            <article
              id={`prof-card-${professional.id}`}
              key={professional.id}
              className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-[#0f4c5c]/35 hover:shadow-md ${
                !professional.active ? "opacity-60" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onEditProfessional(professional)}
                className="block w-full text-left"
                title="Abrir cadastro do profissional"
              >
                <div className="h-1.5 bg-[#0f4c5c]" />

                <div className="p-3">
                  <div className="flex items-start gap-3">
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                      {professional.avatar ? (
                        <img
                          src={professional.avatar}
                          alt={professional.name}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-lg font-black text-slate-700">
                          {professional.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0f4c5c]">
                            Profissional
                          </p>

                          <h3 className="mt-1 truncate text-base font-black leading-tight text-neutral-950">
                            {professional.name}
                          </h3>

                          <p className="mt-1 line-clamp-2 min-h-[32px] text-xs font-semibold leading-snug text-slate-500">
                            {professional.role || "Especialidade não informada"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${
                            professional.active
                              ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                              : "border-slate-200 bg-slate-100 text-slate-500"
                          }`}
                        >
                          {professional.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-500">
                      Clique no card para abrir o cadastro completo.
                    </p>
                  </div>
                </div>
              </button>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
                <div className="flex items-center gap-1">
                  <button
                    id={`btn-agenda-prof-${professional.id}`}
                    type="button"
                    onClick={() => onOpenProfessionalAgenda(professional)}
                    disabled={!professional.active}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 hover:text-[#0f4c5c] disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      professional.active
                        ? "Abrir agenda deste profissional"
                        : "Profissional inativo está sem acesso à agenda"
                    }
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>

                  <button
                    id={`btn-perm-trigger-${professional.id}`}
                    type="button"
                    onClick={() => onOpenPermissions(professional)}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 hover:text-[#0f4c5c]"
                    title="Permissões"
                  >
                    <Lock className="h-4 w-4" />
                  </button>

                  <button
                    id={`btn-link-prof-${professional.id}`}
                    type="button"
                    onClick={() => onGenerateProfessionalLink(professional)}
                    disabled={!professional.active}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 hover:text-[#0f4c5c] disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      professional.active
                        ? "Gerar e copiar link de acesso do profissional"
                        : "Profissional inativo não recebe link de acesso"
                    }
                  >
                    <Link2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    id={`btn-edit-prof-${professional.id}`}
                    type="button"
                    onClick={() => onEditProfessional(professional)}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 hover:text-[#0f4c5c]"
                    title="Editar profissional"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {professional.active && (
                    <button
                      type="button"
                      onClick={() => onDeleteProfessional(professional.id)}
                      className="rounded-xl border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                      title="Desativar profissional e bloquear o link de acesso à agenda"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredProfessionals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-black text-neutral-800">
            Nenhum profissional encontrado.
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Ajuste a busca ou clique em “Adicionar Profissional” para cadastrar um novo profissional.
          </p>
        </div>
      )}
    </div>
  );
}
