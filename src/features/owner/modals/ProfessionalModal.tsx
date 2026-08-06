/**
 * Modal de Cadastro/Edição de Profissional - AgendaBless.
 *
 * Responsável por:
 * - cadastrar novo profissional;
 * - editar profissional existente;
 * - escolher foto sem imagem pré-configurada;
 * - definir comissão simples;
 * - definir horário de trabalho;
 * - definir dias de atendimento;
 * - definir serviços habilitados.
 */

import React, { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

import {
  Professional,
  RemunerationType,
  Service
} from '../../../types';

import { prepareImageForStorage } from '../../../lib/imageUpload';
import {
  ProfessionalWeeklySchedule,
  WEEK_DAY_SHORT_LABELS
} from '../../../lib/professionalSchedule';

interface ProfessionalModalProps {
  isOpen: boolean;
  editingProfessional: Professional | null;
  services: Service[];

  name: string;
  phone: string;
  email: string;
  role: string;
  avatar: string;
  active: boolean;
  displayOrder: number;
  weeklySchedule: ProfessionalWeeklySchedule;
  lunchStart: string;
  lunchEnd: string;
  noLunchBreak: boolean;
  defaultAppointmentDuration: number;
  servicesIds: string[];
  remunerationType: RemunerationType;
  remunerationValue: number;

  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeRole: (value: string) => void;
  onChangeAvatar: (value: string) => void;
  onChangeActive: (value: boolean) => void;
  onChangeDisplayOrder: (value: number) => void;
  onChangeWeeklySchedule: (value: ProfessionalWeeklySchedule) => void;
  onChangeLunchStart: (value: string) => void;
  onChangeLunchEnd: (value: string) => void;
  onChangeNoLunchBreak: (value: boolean) => void;
  onChangeDefaultAppointmentDuration: (value: number) => void;
  onChangeServicesIds: (value: string[]) => void;
  onChangeRemunerationType: (value: RemunerationType) => void;
  onChangeRemunerationValue: (value: number) => void;

  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (
    event: React.FormEvent,
    media: {
      avatarFile: File | null;
      removeAvatar: boolean;
    }
  ) => void;
}

export default function ProfessionalModal({
  isOpen,
  editingProfessional,
  services,
  name,
  phone,
  email,
  role,
  avatar,
  active,
  displayOrder,
  weeklySchedule,
  lunchStart,
  lunchEnd,
  noLunchBreak,
  defaultAppointmentDuration,
  servicesIds,
  remunerationType,
  remunerationValue,
  onChangeName,
  onChangePhone,
  onChangeEmail,
  onChangeRole,
  onChangeAvatar,
  onChangeActive,
  onChangeDisplayOrder,
  onChangeWeeklySchedule,
  onChangeLunchStart,
  onChangeLunchEnd,
  onChangeNoLunchBreak,
  onChangeDefaultAppointmentDuration,
  onChangeServicesIds,
  onChangeRemunerationType,
  onChangeRemunerationValue,
  isSaving = false,
  onClose,
  onSubmit
}: ProfessionalModalProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarProcessingMessage, setAvatarProcessingMessage] = useState('');
  const [avatarProcessingError, setAvatarProcessingError] = useState('');
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  useEffect(() => {
    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setAvatarProcessingMessage('');
    setAvatarProcessingError('');
    setIsProcessingAvatar(false);
    setRemoveAvatar(false);
  }, [isOpen, editingProfessional?.id]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const currentAvatarPreview = avatarPreviewUrl || avatar;

  const handleSelectAvatar = async (file: File | undefined) => {
    if (!file) return;

    setAvatarProcessingError('');
    setAvatarProcessingMessage('');
    setIsProcessingAvatar(true);

    try {
      const preparedFile = await prepareImageForStorage(file, {
        maxWidth: 600,
        maxHeight: 600,
        maxOutputBytes: 200 * 1024,
        outputFileName: 'avatar.webp'
      });

      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }

      const nextPreviewUrl = URL.createObjectURL(preparedFile);

      setAvatarFile(preparedFile);
      setAvatarPreviewUrl(nextPreviewUrl);
      setRemoveAvatar(false);
      setAvatarProcessingMessage(
        `Foto pronta: ${Math.max(1, Math.round(preparedFile.size / 1024))} KB`
      );
    } catch (error) {
      setAvatarFile(null);
      setAvatarPreviewUrl('');
      setAvatarProcessingMessage('');
      setAvatarProcessingError(
        error instanceof Error
          ? error.message
          : 'Não foi possível preparar a foto.'
      );
    } finally {
      setIsProcessingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setAvatarProcessingMessage('');
    setAvatarProcessingError('');
    setRemoveAvatar(true);
    onChangeAvatar('');
  };
  if (!isOpen) {
    return null;
  }

  const normalizedRemunerationType =
    String(remunerationType) === 'commission_fixed'
      ? 'commission_fixed'
      : String(remunerationType) === 'no_commission'
        ? 'no_commission'
        : 'commission_percent';

  const handleChangeRemunerationType = (value: string) => {
    onChangeRemunerationType(value as RemunerationType);

    if (value === 'no_commission') {
      onChangeRemunerationValue(0);
    }
  };

  const handleToggleDayEnabled = (dayIndex: number) => {
    onChangeWeeklySchedule(
      weeklySchedule.map((day, index) => {
        return index === dayIndex ? { ...day, enabled: !day.enabled } : day;
      })
    );
  };

  const handleChangeDayStart = (dayIndex: number, value: string) => {
    onChangeWeeklySchedule(
      weeklySchedule.map((day, index) => {
        return index === dayIndex ? { ...day, start: value } : day;
      })
    );
  };

  const handleChangeDayEnd = (dayIndex: number, value: string) => {
    onChangeWeeklySchedule(
      weeklySchedule.map((day, index) => {
        return index === dayIndex ? { ...day, end: value } : day;
      })
    );
  };

  const handleToggleService = (serviceId: string) => {
    const isSelected = servicesIds.includes(serviceId);

    if (isSelected) {
      onChangeServicesIds(servicesIds.filter((item) => item !== serviceId));
      return;
    }

    onChangeServicesIds([...servicesIds, serviceId]);
  };

  return (
    <div
      id="modal-add-prof"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border text-left shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-black text-neutral-950">
            {editingProfessional
              ? `Editar Profissional: ${editingProfessional.name.split(' ')[0]}`
              : 'Cadastrar Novo Profissional'}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(event) =>
            onSubmit(event, {
              avatarFile,
              removeAvatar
            })
          }
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                Nome Completo
              </label>

              <input
                id="input-prof-name"
                type="text"
                placeholder="Ex: João da Silva"
                value={name}
                onChange={(event) => onChangeName(event.target.value)}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none focus:border-[#0f4c5c]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                Cargo / Especialidade
              </label>

              <input
                id="input-prof-role"
                type="text"
                placeholder="Ex: Barbeiro, Esteticista, Massagista"
                value={role}
                onChange={(event) => onChangeRole(event.target.value)}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none focus:border-[#0f4c5c]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                WhatsApp
              </label>

              <input
                id="input-prof-phone"
                type="tel"
                placeholder="11900008888"
                value={phone}
                onChange={(event) => onChangePhone(event.target.value)}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none focus:border-[#0f4c5c]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                Ordem na Vitrine
              </label>

              <input
                id="input-prof-order"
                type="number"
                min="1"
                placeholder="Ex: 1"
                value={displayOrder}
                onChange={(event) => onChangeDisplayOrder(Number(event.target.value))}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none focus:border-[#0f4c5c]"
              />
            </div>
          </div>

          <input
            type="hidden"
            value={email}
            onChange={(event) => onChangeEmail(event.target.value)}
          />

          <div className="bg-neutral-50 border rounded-2xl p-3 space-y-3">
            <div className="flex items-center gap-3">
              {currentAvatarPreview ? (
                <img
                  src={currentAvatarPreview}
                  alt="Foto do profissional"
                  className="w-16 h-16 rounded-2xl object-cover border bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl border border-dashed border-neutral-300 bg-white shrink-0 flex items-center justify-center text-[10px] font-black text-neutral-400 uppercase text-center leading-tight">
                  Sem<br />foto
                </div>
              )}

              <div className="space-y-1 flex-1">
                <strong className="block text-neutral-800 font-bold">
                  Foto do profissional
                </strong>

                <p className="text-[10px] text-neutral-500">
                  Escolha uma imagem do computador ou celular. Não existe foto pré-configurada.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <label
                htmlFor="input-prof-avatar-file"
                className="w-full bg-[#0f4c5c] hover:bg-[#123945] text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <ImagePlus className="w-4 h-4" />
                Escolher foto
              </label>

              {currentAvatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-black text-neutral-600 hover:bg-neutral-50"
                >
                  Remover
                </button>
              )}
            </div>

            <input
              id="input-prof-avatar-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                void handleSelectAvatar(event.target.files?.[0]);
                event.target.value = '';
              }}
              className="hidden"
            />

            {avatarProcessingMessage && (
              <p className="text-[10px] font-bold text-emerald-700">
                {avatarProcessingMessage}
              </p>
            )}

            {avatarProcessingError && (
              <p className="text-[10px] font-bold text-red-700">
                {avatarProcessingError}
              </p>
            )}
          </div>

          {editingProfessional && (
            <div className="flex items-center justify-between bg-neutral-50 border rounded-2xl p-3">
              <div>
                <strong className="block text-neutral-800 font-bold">
                  Profissional ativo
                </strong>

                <span className="text-[10px] text-neutral-500">
                  Desative apenas se ele não estiver mais atendendo.
                </span>
              </div>

              <input
                type="checkbox"
                checked={active}
                onChange={(event) => onChangeActive(event.target.checked)}
                className="w-4 h-4 text-[#0f4c5c] rounded"
              />
            </div>
          )}

          <div className="bg-[#0f4c5c]/5 p-4 rounded-2xl space-y-3 border border-[#0f4c5c]/15">
            <h4 className="text-[11px] font-bold text-[#0f4c5c] uppercase tracking-widest">
              Remuneração e Comissão
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700">
                  Tipo
                </label>

                <select
                  id="select-prof-rem-type"
                  value={normalizedRemunerationType}
                  onChange={(event) => handleChangeRemunerationType(event.target.value)}
                  className="w-full bg-white border rounded-lg p-2 outline-none font-sans focus:border-[#0f4c5c]"
                >
                  <option value="commission_percent">Percentual (%)</option>
                  <option value="commission_fixed">Valor fixo (R$)</option>
                  <option value="no_commission">Sem comissão</option>
                </select>
              </div>

              {normalizedRemunerationType === 'no_commission' ? (
                <div className="rounded-lg border border-[#0f4c5c]/15 bg-white px-3 py-2">
                  <span className="block font-bold text-neutral-700">
                    Sem valor de comissão
                  </span>

                  <span className="block mt-1 text-[10px] leading-relaxed text-neutral-500">
                    Os atendimentos e o faturamento continuarão aparecendo nas estatísticas.
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">
                    {normalizedRemunerationType === 'commission_fixed'
                      ? 'Valor fixo por atendimento'
                      : 'Percentual de comissão'}
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={remunerationValue || ''}
                    onChange={(event) => onChangeRemunerationValue(Number(event.target.value))}
                    className="w-full bg-white border rounded-lg p-2 outline-none focus:border-[#0f4c5c]"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl border space-y-3">
            <h4 className="text-[11px] font-bold text-neutral-800 uppercase tracking-widest">
              Horários e Escala semanal
            </h4>

            <div className="space-y-1.5">
              <label className="font-bold block text-neutral-700">
                Entrada e saída por dia da semana:
              </label>

              <div className="overflow-hidden rounded-2xl border bg-white">
                <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-2 border-b bg-neutral-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <span>Dia</span>
                  <span className="text-center">Trabalha</span>
                  <span>Entrada</span>
                  <span>Saída</span>
                </div>

                <div className="divide-y">
                  {weeklySchedule.map((day, index) => {
                    const isWorking = day.enabled;

                    return (
                      <div
                        key={WEEK_DAY_SHORT_LABELS[index]}
                        className={`grid grid-cols-[1fr_auto_1fr_1fr] items-center gap-2 px-3 py-2 ${
                          isWorking ? '' : 'bg-neutral-50/60'
                        }`}
                      >
                        <span className={`font-bold ${isWorking ? 'text-neutral-800' : 'text-neutral-400'}`}>
                          {WEEK_DAY_SHORT_LABELS[index]}
                        </span>

                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleToggleDayEnabled(index)}
                            aria-pressed={isWorking}
                            className={`relative h-5 w-9 shrink-0 rounded-full transition cursor-pointer ${
                              isWorking ? 'bg-[#0f4c5c]' : 'bg-neutral-300'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                                isWorking ? 'left-4' : 'left-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        <input
                          type="time"
                          value={day.start}
                          onChange={(event) => handleChangeDayStart(index, event.target.value)}
                          disabled={!isWorking}
                          className={`border rounded p-1.5 w-full text-center ${
                            isWorking
                              ? 'bg-white focus:border-[#0f4c5c]'
                              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                          }`}
                        />

                        <input
                          type="time"
                          value={day.end}
                          onChange={(event) => handleChangeDayEnd(index, event.target.value)}
                          disabled={!isWorking}
                          className={`border rounded p-1.5 w-full text-center ${
                            isWorking
                              ? 'bg-white focus:border-[#0f4c5c]'
                              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Cada dia pode ter um horário diferente. Desmarque "Trabalha" para os dias em que o profissional não atende.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={`font-semibold block ${noLunchBreak ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Almoço Início
                </label>

                <input
                  type="time"
                  value={lunchStart}
                  onChange={(event) => onChangeLunchStart(event.target.value)}
                  disabled={noLunchBreak}
                  className={`border rounded p-1.5 w-full text-center ${
                    noLunchBreak
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'bg-white focus:border-[#0f4c5c]'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className={`font-semibold block ${noLunchBreak ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Almoço Fim
                </label>

                <input
                  type="time"
                  value={lunchEnd}
                  onChange={(event) => onChangeLunchEnd(event.target.value)}
                  disabled={noLunchBreak}
                  className={`border rounded p-1.5 w-full text-center ${
                    noLunchBreak
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'bg-white focus:border-[#0f4c5c]'
                  }`}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-3 space-y-1">
              <label className="font-bold block text-neutral-800">
                Tempo padrão por cliente
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={defaultAppointmentDuration}
                  onChange={(event) => onChangeDefaultAppointmentDuration(Number(event.target.value))}
                  className="bg-white border rounded-lg p-2 w-28 text-center font-bold outline-none focus:border-[#0f4c5c]"
                />

                <span className="text-xs font-semibold text-neutral-500">
                  minutos
                </span>
              </div>

              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Este tempo monta a grade padrão da agenda. A duração do serviço escolhido continua sendo respeitada para verificar se cabe até o fim do expediente.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border bg-white p-3 cursor-pointer hover:bg-neutral-50 transition">
              <input
                type="checkbox"
                checked={noLunchBreak}
                onChange={(event) => onChangeNoLunchBreak(event.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#0f4c5c] rounded"
              />

              <span className="space-y-0.5">
                <strong className="block text-neutral-800 font-bold">
                  Sem horário de almoço definido
                </strong>

                <span className="block text-[10px] text-neutral-500 leading-relaxed">
                  Marque quando o profissional atende sem intervalo fixo. Neste caso, a agenda não bloqueará horário de almoço.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-neutral-700 block">
              Serviços Habilitados:
            </label>

            <div className="flex flex-wrap gap-1.5">
              {services.map((service) => {
                const checked = servicesIds.includes(service.id);

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleToggleService(service.id)}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] text-left transition font-semibold cursor-pointer ${
                      checked
                        ? 'bg-[#0f4c5c]/5 text-[#0f4c5c] border-[#0f4c5c]/40'
                        : 'bg-white text-neutral-600 hover:border-neutral-350'
                    }`}
                  >
                    {service.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            id="btn-prof-form-submit"
            type="submit"
            disabled={isSaving || isProcessingAvatar}
            className="w-full bg-[#0f4c5c] hover:bg-[#123945] text-white font-bold py-3 rounded-xl transition text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? 'SALVANDO...'
              : editingProfessional
                ? 'Salvar Alterações de Cadastro'
                : 'Cadastrar Profissional'}
          </button>
        </form>
      </div>
    </div>
  );
}
