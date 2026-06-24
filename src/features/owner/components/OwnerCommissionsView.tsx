/**
 * Tela de Comissões da Equipe do Painel do Dono - AgendaZap.
 *
 * Responsável por:
 * - listar profissionais;
 * - calcular atendimentos finalizados;
 * - exibir faturamento por profissional;
 * - exibir comissão devida;
 *  */

import React from 'react';

import {
  Appointment,
  Professional,
  Service
} from '../../../types';

import {
  calculateProfessionalCommission,
  calculateProfessionalGrossRevenue,
  countProfessionalCompletedAppointments,
  formatCurrency,
  getRemunerationLabel
} from '../owner.utils';

interface OwnerCommissionsViewProps {
  professionals: Professional[];
  services: Service[];
  completedAppointments: Appointment[];
}

export default function OwnerCommissionsView({
  professionals,
  services,
  completedAppointments
}: OwnerCommissionsViewProps) {
  return (
    <div id="view-comissoes" className="space-y-6 text-left animate-none">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
          Comissões da Equipe
        </h2>

        <p className="text-xs text-neutral-500 mt-0.5">
          Consulte faturamento, atendimentos finalizados e comissões devidas por profissional.
        </p>
      </div>

      <div className="bg-white border rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-100 border-b text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-mono">
                  Colaborador
                </th>

                <th className="py-3.5 px-4 font-mono">
                  Remuneração
                </th>

                <th className="py-3.5 px-4 font-mono text-center">
                  Atendimento
                </th>

                <th className="py-3.5 px-4 font-mono text-right">
                  Faturamento
                </th>

                <th className="py-3.5 px-4 font-mono text-right">
                  Comissão Devida
                </th>

              </tr>
            </thead>

            <tbody className="divide-y font-medium text-neutral-800">
              {professionals.map((professional) => {
                const completedCount = countProfessionalCompletedAppointments({
                  professionalId: professional.id,
                  completedAppointments
                });

                const totalProduced = calculateProfessionalGrossRevenue({
                  professionalId: professional.id,
                  completedAppointments
                });

                const commissionValue = calculateProfessionalCommission({
                  professional,
                  services,
                  completedAppointments
                });

                return (
                  <tr
                    id={`row-comm-${professional.id}`}
                    key={professional.id}
                    className="hover:bg-neutral-50/50 transition"
                  >
                    <td className="py-4 px-4 flex items-center gap-2.5">
                      <img
                        src={professional.avatar}
                        alt="foto avatar"
                        className="w-8 h-8 rounded-full border object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />

                      <span className="font-extrabold text-neutral-900">
                        {professional.name}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="uppercase text-[9px] font-bold font-mono tracking-wide px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 block w-max">
                        {getRemunerationLabel(professional)}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center font-bold">
                      {completedCount}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-right text-neutral-950">
                      {formatCurrency(totalProduced)}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-right text-red-650">
                      {formatCurrency(commissionValue)}
                    </td>

                  </tr>
                );
              })}

              {professionals.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-neutral-400"
                  >
                    Nenhum profissional cadastrado para cálculo de comissões.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
