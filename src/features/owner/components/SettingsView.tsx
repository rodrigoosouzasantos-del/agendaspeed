/**
 * Tela de Configurações do Painel do Dono - AgendaSpeed.
 *
 * Responsável por:
 * - editar dados principais do estabelecimento;
 * - manter a tela limpa e objetiva;
 * - separar visualmente endereço, contato, imagens e regras avançadas;
 * - ocultar mensagem padrão e regras técnicas para reduzir suporte.
 */

import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  ImagePlus,
  MapPin,
  MessageCircle,
  Save,
  Settings2
} from 'lucide-react';

interface SettingsViewProps {
  configName: string;
  configAddress: string;
  configPhone: string;
  configInstagram: string;
  configLogo: string;
  configCoverImage: string;
  configDefaultTemplate: string;

  bookingMinLeadTimeMinutes: number;
  bookingMinCancelLeadTimeMinutes: number;
  bookingMinRescheduleLeadTimeMinutes: number;
  bookingAllowClientConfirmation: boolean;
  bookingAllowClientCancellation: boolean;
  bookingAllowClientReschedule: boolean;
  bookingSlotIntervalMinutes: number;
  bookingMaxFutureDays: number;
  bookingWorkHoursStart: string;
  bookingWorkHoursEnd: string;
  bookingLunchStart: string;
  bookingLunchEnd: string;

  onChangeConfigName: (value: string) => void;
  onChangeConfigAddress: (value: string) => void;
  onChangeConfigPhone: (value: string) => void;
  onChangeConfigInstagram: (value: string) => void;
  onChangeConfigLogo: (value: string) => void;
  onChangeConfigCoverImage: (value: string) => void;
  onChangeConfigDefaultTemplate: (value: string) => void;

  onChangeBookingMinLeadTimeMinutes: (value: number) => void;
  onChangeBookingMinCancelLeadTimeMinutes: (value: number) => void;
  onChangeBookingMinRescheduleLeadTimeMinutes: (value: number) => void;
  onChangeBookingAllowClientConfirmation: (value: boolean) => void;
  onChangeBookingAllowClientCancellation: (value: boolean) => void;
  onChangeBookingAllowClientReschedule: (value: boolean) => void;
  onChangeBookingSlotIntervalMinutes: (value: number) => void;
  onChangeBookingMaxFutureDays: (value: number) => void;
  onChangeBookingWorkHoursStart: (value: string) => void;
  onChangeBookingWorkHoursEnd: (value: string) => void;
  onChangeBookingLunchStart: (value: string) => void;
  onChangeBookingLunchEnd: (value: string) => void;

  onSubmit: (event: React.FormEvent) => void;
}

interface AddressParts {
  street: string;
  number: string;
  neighborhood: string;
  zipCode: string;
  city: string;
  complement: string;
}

function compressImageFile(params: {
  file: File | undefined;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  onLoadImage: (value: string) => void;
}) {
  const { file, maxWidth, maxHeight, quality, onLoadImage } = params;

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const canvas = document.createElement('canvas');

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');

      if (!context) {
        onLoadImage(String(reader.result || ''));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      onLoadImage(canvas.toDataURL('image/jpeg', quality));
    };

    image.onerror = () => {
      onLoadImage(String(reader.result || ''));
    };

    image.src = String(reader.result || '');
  };

  reader.readAsDataURL(file);
}

function safeNumber(value: string, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, parsed);
}

function normalizeZipCode(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatConfigPhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizeAddressText(value: string): string {
  return value.replace(/\s{2,}/g, ' ');
}

function parseAddress(address: string): AddressParts {
  const trimmedAddress = address.trim();

  if (!trimmedAddress) {
    return { street: '', number: '', neighborhood: '', zipCode: '', city: '', complement: '' };
  }

  const explicitParts = trimmedAddress.split('|').map((part) => part.trim());

  if (explicitParts.length >= 6) {
    return {
      street: explicitParts[0] || '',
      number: explicitParts[1] || '',
      neighborhood: explicitParts[2] || '',
      zipCode: explicitParts[3] || '',
      city: explicitParts[4] || '',
      complement: explicitParts.slice(5).join(' | ') || ''
    };
  }

  const zipCodeMatch = trimmedAddress.match(/\b\d{5}-?\d{3}\b/);
  const zipCode = zipCodeMatch ? normalizeZipCode(zipCodeMatch[0]) : '';
  const addressWithoutZip = zipCode
    ? trimmedAddress.replace(zipCodeMatch?.[0] || '', '').replace(/CEP/gi, '')
    : trimmedAddress;
  const addressSegments = addressWithoutZip
    .split(/\s-\s|,\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return {
    street: addressSegments[0] || trimmedAddress,
    number: addressSegments[1] || '',
    neighborhood: addressSegments[2] || '',
    zipCode,
    city: addressSegments[3] || '',
    complement: addressSegments.slice(4).join(' - ')
  };
}

function composeAddress(parts: AddressParts): string {
  return [
    parts.street,
    parts.number,
    parts.neighborhood,
    normalizeZipCode(parts.zipCode),
    parts.city,
    parts.complement
  ].join(' | ');
}

function inputClassName() {
  return 'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-[#0f4c5c] focus:bg-white';
}

function Field({
  label,
  children,
  className = ''
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function SettingsView({
  configName,
  configAddress,
  configPhone,
  configInstagram,
  configLogo,
  configCoverImage,
  configDefaultTemplate,

  bookingMinLeadTimeMinutes,
  bookingMinCancelLeadTimeMinutes,
  bookingMinRescheduleLeadTimeMinutes,
  bookingAllowClientConfirmation,
  bookingAllowClientCancellation,
  bookingAllowClientReschedule,
  bookingSlotIntervalMinutes,
  bookingMaxFutureDays,
  bookingWorkHoursStart,
  bookingWorkHoursEnd,
  bookingLunchStart,
  bookingLunchEnd,

  onChangeConfigName,
  onChangeConfigAddress,
  onChangeConfigPhone,
  onChangeConfigInstagram,
  onChangeConfigLogo,
  onChangeConfigCoverImage,
  onChangeConfigDefaultTemplate,

  onChangeBookingMinLeadTimeMinutes,
  onChangeBookingMinCancelLeadTimeMinutes,
  onChangeBookingMinRescheduleLeadTimeMinutes,
  onChangeBookingAllowClientConfirmation,
  onChangeBookingAllowClientCancellation,
  onChangeBookingAllowClientReschedule,
  onChangeBookingSlotIntervalMinutes,
  onChangeBookingMaxFutureDays,
  onChangeBookingWorkHoursStart,
  onChangeBookingWorkHoursEnd,
  onChangeBookingLunchStart,
  onChangeBookingLunchEnd,

  onSubmit
}: SettingsViewProps) {
  const [showAdvancedRules, setShowAdvancedRules] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [responsibleName, setResponsibleName] = useState(() => {
    return localStorage.getItem('agendaspeed-company-responsible-name') || '';
  });

  const lastInternalAddressRef = useRef(configAddress);
  const [addressParts, setAddressParts] = useState<AddressParts>(() => {
    return parseAddress(configAddress);
  });

  useEffect(() => {
    if (configAddress === lastInternalAddressRef.current) {
      return;
    }

    setAddressParts(parseAddress(configAddress));
  }, [configAddress]);

  const updateAddressPart = (key: keyof AddressParts, value: string) => {
    const nextAddressParts = {
      ...addressParts,
      [key]: key === 'zipCode' ? normalizeZipCode(value) : normalizeAddressText(value)
    };

    const nextComposedAddress = composeAddress(nextAddressParts);

    setAddressParts(nextAddressParts);
    lastInternalAddressRef.current = nextComposedAddress;
    onChangeConfigAddress(nextComposedAddress);
  };

  const handleChangeResponsibleName = (value: string) => {
    setResponsibleName(value);
    localStorage.setItem('agendaspeed-company-responsible-name', value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    if (!configDefaultTemplate.trim()) {
      onChangeConfigDefaultTemplate(
        'Olá, {cliente}! Confirmamos seu agendamento para o dia {data} às {hora} com {profissional}. Serviço: {servico}. No endereço: {endereco}.'
      );
    }

    onSubmit(event);
  };

  return (
    <form
      id="view-configuracoes"
      onSubmit={handleSubmit}
      className="space-y-3 text-left animate-none"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AGENDASPEED
            </p>

            <h2 className="text-lg font-black tracking-tight text-neutral-950">
              Configurações
            </h2>
          </div>

          <button
            id="btn-save-config-top"
            type="submit"
            className="w-full rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#123945] sm:w-max flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar alterações
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#0f4c5c] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <h3 className="text-sm font-black uppercase tracking-tight">
                Dados principais
              </h3>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Nome do estabelecimento">
                <input
                  id="input-config-name"
                  type="text"
                  value={configName}
                  onChange={(event) => onChangeConfigName(event.target.value)}
                  className={inputClassName()}
                  required
                />
              </Field>

              <Field label="Responsável pelo local">
                <input
                  id="input-config-responsible-name"
                  type="text"
                  value={responsibleName}
                  onChange={(event) => handleChangeResponsibleName(event.target.value)}
                  placeholder="Ex.: Senhor Cabelo"
                  className={inputClassName()}
                />
              </Field>

              <Field label="WhatsApp contato">
                <input
                  id="input-config-phone"
                  type="text"
                  value={formatConfigPhone(configPhone)}
                  onChange={(event) => onChangeConfigPhone(formatConfigPhone(event.target.value))}
                  placeholder="(14) 99999-9999"
                  className={inputClassName()}
                />
              </Field>

              <Field label="Instagram">
                <input
                  id="input-config-insta"
                  type="text"
                  value={configInstagram}
                  onChange={(event) => onChangeConfigInstagram(event.target.value)}
                  placeholder="@perfil"
                  className={inputClassName()}
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#0f4c5c]" />
                <h4 className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">
                  Endereço separado
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-8">
                <Field label="Endereço" className="md:col-span-4">
                  <input
                    type="text"
                    value={addressParts.street}
                    onChange={(event) => updateAddressPart('street', event.target.value)}
                    placeholder="Rua / Avenida"
                    className={inputClassName()}
                  />
                </Field>

                <Field label="Número" className="md:col-span-1">
                  <input
                    type="text"
                    value={addressParts.number}
                    onChange={(event) => updateAddressPart('number', event.target.value)}
                    className={inputClassName()}
                  />
                </Field>

                <Field label="Bairro" className="md:col-span-3">
                  <input
                    type="text"
                    value={addressParts.neighborhood}
                    onChange={(event) => updateAddressPart('neighborhood', event.target.value)}
                    className={inputClassName()}
                  />
                </Field>

                <Field label="CEP" className="md:col-span-2">
                  <input
                    type="text"
                    value={addressParts.zipCode}
                    onChange={(event) => updateAddressPart('zipCode', event.target.value)}
                    placeholder="00000-000"
                    className={inputClassName()}
                  />
                </Field>

                <Field label="Cidade / UF" className="md:col-span-3">
                  <input
                    type="text"
                    value={addressParts.city}
                    onChange={(event) => updateAddressPart('city', event.target.value)}
                    placeholder="Marília/SP"
                    className={inputClassName()}
                  />
                </Field>

                <Field label="Complemento" className="md:col-span-3">
                  <input
                    type="text"
                    value={addressParts.complement}
                    onChange={(event) => updateAddressPart('complement', event.target.value)}
                    placeholder="Próximo a..."
                    className={inputClassName()}
                  />
                </Field>
              </div>

              <p className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-400">
                Os campos são salvos no endereço principal usando separadores internos. Isso mantém compatibilidade com o banco atual.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <Field label="Logo do estabelecimento">
                  <div className="mt-2 h-24 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                    {configLogo ? (
                      <img
                        src={configLogo}
                        alt="Logo do salão"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] font-black uppercase text-slate-300">
                        Sem logo
                      </span>
                    )}
                  </div>
                </Field>

                <label
                  htmlFor="input-config-logo"
                  className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0f4c5c] px-3 py-2.5 text-xs font-black text-white transition hover:bg-[#123945]"
                >
                  <ImagePlus className="h-4 w-4" />
                  Escolher logo
                </label>

                <input
                  id="input-config-logo"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    compressImageFile({
                      file: event.target.files?.[0],
                      maxWidth: 400,
                      maxHeight: 400,
                      quality: 0.82,
                      onLoadImage: onChangeConfigLogo
                    });
                  }}
                  className="hidden"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <Field label="Fachada da vitrine">
                  <div className="mt-2 h-24 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                    {configCoverImage ? (
                      <img
                        src={configCoverImage}
                        alt="Fachada da Vitrine"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-black uppercase text-slate-300">
                        Sem fachada
                      </span>
                    )}
                  </div>
                </Field>

                <label
                  htmlFor="input-config-cover"
                  className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0f4c5c] px-3 py-2.5 text-xs font-black text-white transition hover:bg-[#123945]"
                >
                  <ImagePlus className="h-4 w-4" />
                  Escolher fachada
                </label>

                <input
                  id="input-config-cover"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    compressImageFile({
                      file: event.target.files?.[0],
                      maxWidth: 1200,
                      maxHeight: 420,
                      quality: 0.78,
                      onLoadImage: onChangeConfigCoverImage
                    });
                  }}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[#0f4c5c] px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <h3 className="text-sm font-black uppercase tracking-tight">
                  Mensagens automáticas
                </h3>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-700">
                  Mensagem padrão protegida
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
                  A mensagem de lembrete já sai pronta no WhatsApp. O dono pode ajustar o texto diretamente antes de enviar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTemplatePreview((current) => !current)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-slate-50"
              >
                {showTemplatePreview ? 'Ocultar mensagem técnica' : 'Ver mensagem técnica'}
              </button>

              {showTemplatePreview && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <textarea
                    id="textarea-config-template"
                    value={configDefaultTemplate}
                    onChange={(event) => onChangeConfigDefaultTemplate(event.target.value)}
                    rows={5}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#0f4c5c]"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowAdvancedRules((current) => !current)}
              className="flex w-full items-center justify-between bg-[#0f4c5c] px-4 py-3 text-left text-white"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="text-sm font-black uppercase tracking-tight">
                  Regras de agendamento
                </span>
              </span>

              {showAdvancedRules ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            <div className="p-4">
              <p className="text-xs font-semibold leading-relaxed text-slate-500">
                Área avançada. Abra somente quando precisar alterar regras da vitrine, confirmação, cancelamento ou remarcação.
              </p>

              {!showAdvancedRules && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase text-slate-400">
                      Dias futuros
                    </p>
                    <p className="text-sm font-black text-[#0f4c5c]">
                      {bookingMaxFutureDays}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase text-slate-400">
                      Intervalo
                    </p>
                    <p className="text-sm font-black text-[#0f4c5c]">
                      {bookingSlotIntervalMinutes} min
                    </p>
                  </div>
                </div>
              )}

              {showAdvancedRules && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Dias futuros na vitrine">
                      <input
                        id="input-booking-max-future-days"
                        type="number"
                        min={1}
                        max={90}
                        value={bookingMaxFutureDays}
                        onChange={(event) => onChangeBookingMaxFutureDays(safeNumber(event.target.value, 14))}
                        className={inputClassName()}
                      />
                    </Field>

                    <Field label="Intervalo padrão">
                      <select
                        id="select-booking-slot-interval"
                        value={bookingSlotIntervalMinutes}
                        onChange={(event) => onChangeBookingSlotIntervalMinutes(Number(event.target.value))}
                        className={inputClassName()}
                      >
                        <option value={15}>15 minutos</option>
                        <option value={20}>20 minutos</option>
                        <option value={30}>30 minutos</option>
                        <option value={40}>40 minutos</option>
                        <option value={45}>45 minutos</option>
                        <option value={60}>60 minutos</option>
                      </select>
                    </Field>

                    <Field label="Horário de abertura">
                      <input
                        id="input-booking-work-start"
                        type="time"
                        value={bookingWorkHoursStart}
                        onChange={(event) => onChangeBookingWorkHoursStart(event.target.value)}
                        className={inputClassName()}
                      />
                    </Field>

                    <Field label="Horário de fechamento">
                      <input
                        id="input-booking-work-end"
                        type="time"
                        value={bookingWorkHoursEnd}
                        onChange={(event) => onChangeBookingWorkHoursEnd(event.target.value)}
                        className={inputClassName()}
                      />
                    </Field>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#0f4c5c]" />
                      <h4 className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                        Regras técnicas
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Field label="Antecedência para agendar">
                        <input
                          id="input-booking-min-lead"
                          type="number"
                          min={0}
                          value={bookingMinLeadTimeMinutes}
                          onChange={(event) => onChangeBookingMinLeadTimeMinutes(safeNumber(event.target.value))}
                          className={inputClassName()}
                        />
                      </Field>

                      <Field label="Antecedência para cancelar">
                        <input
                          id="input-booking-min-cancel"
                          type="number"
                          min={0}
                          value={bookingMinCancelLeadTimeMinutes}
                          onChange={(event) => onChangeBookingMinCancelLeadTimeMinutes(safeNumber(event.target.value))}
                          className={inputClassName()}
                        />
                      </Field>

                      <Field label="Antecedência para remarcar">
                        <input
                          id="input-booking-min-reschedule"
                          type="number"
                          min={0}
                          value={bookingMinRescheduleLeadTimeMinutes}
                          onChange={(event) => onChangeBookingMinRescheduleLeadTimeMinutes(safeNumber(event.target.value))}
                          className={inputClassName()}
                        />
                      </Field>
                    </div>

                    <p className="mt-2 text-[10px] font-semibold text-slate-400">
                      Valores em minutos. Ex.: 240 = 4 horas antes do horário.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                      Almoço padrão do estabelecimento
                    </h4>

                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
                      Use somente como regra geral. Quando o profissional tiver horário próprio ou estiver marcado como sem almoço fixo, a agenda do profissional prevalece.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label="Início do almoço">
                        <input
                          id="input-booking-lunch-start"
                          type="time"
                          value={bookingLunchStart}
                          onChange={(event) => onChangeBookingLunchStart(event.target.value)}
                          className={inputClassName()}
                        />
                      </Field>

                      <Field label="Fim do almoço">
                        <input
                          id="input-booking-lunch-end"
                          type="time"
                          value={bookingLunchEnd}
                          onChange={(event) => onChangeBookingLunchEnd(event.target.value)}
                          className={inputClassName()}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#0f4c5c]/15 bg-[#0f4c5c]/5 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f4c5c]">
                      Confirmação, cancelamento e remarcação
                    </p>

                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
                      Recursos automáticos do AgendaSpeed. O cliente recebe o link seguro para confirmar, cancelar ou remarcar conforme as regras do sistema.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          id="btn-save-config"
          type="submit"
          className="rounded-xl bg-[#0f4c5c] px-6 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#123945] flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Salvar alterações globais
        </button>
      </div>
    </form>
  );
}
