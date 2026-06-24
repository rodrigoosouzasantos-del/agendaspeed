import React, {
  FormEvent,
  useEffect,
  useState
} from 'react';

import {
  AlertCircle,
  Clock,
  HelpCircle,
  Lock,
  Plus,
  X
} from 'lucide-react';

import {
  ProfessionalAgendaBlockIntervalForm,
  ProfessionalAgendaExtraTimeForm
} from './professionalAgenda.types';

interface ProfessionalAgendaBlockIntervalModalProps {
  onClose: () => void;
  onSubmit: (formState: ProfessionalAgendaBlockIntervalForm) => void;
}

interface ProfessionalAgendaBlockTimeModalProps {
  startTime: string;
  endTime: string;
  onClose: () => void;
  onSubmit: (formState: ProfessionalAgendaBlockIntervalForm) => void;
}

interface ProfessionalAgendaExtraTimeModalProps {
  onClose: () => void;
  onSubmit: (formState: ProfessionalAgendaExtraTimeForm) => void;
}

interface ProfessionalAgendaFeedbackModalProps {
  title: string;
  description: string;
  buttonLabel?: string;
  onClose: () => void;
}

interface ProfessionalAgendaConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);

  return hour * 60 + minute;
}

function ValidationMessage({
  message
}: {
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800 flex items-start gap-2">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function ModalShell({
  title,
  description,
  icon,
  children,
  onClose
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    onClose
  ]);

  return (
    <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 border-b bg-neutral-50">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center">
              {icon}
            </div>

            <div>
              <h2 className="text-lg font-black text-neutral-950">
                {title}
              </h2>

              <p className="text-xs text-neutral-500 mt-1">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-neutral-200 transition text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}


export function ProfessionalAgendaFeedbackModal({
  title,
  description,
  buttonLabel = 'Entendi',
  onClose
}: ProfessionalAgendaFeedbackModalProps) {
  return (
    <ModalShell
      title={title}
      description={description}
      icon={<AlertCircle className="w-5 h-5" />}
      onClose={onClose}
    >
      <div className="p-5 space-y-4">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-orange-800 leading-relaxed">
          {description}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-2xl text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 transition"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ProfessionalAgendaConfirmModal({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: ProfessionalAgendaConfirmModalProps) {
  return (
    <ModalShell
      title={title}
      description={description}
      icon={<HelpCircle className="w-5 h-5" />}
      onClose={onCancel}
    >
      <div className="p-5 space-y-4">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-orange-800 leading-relaxed">
          {description}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 rounded-2xl text-sm font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-3 rounded-2xl text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ProfessionalAgendaBlockIntervalModal({
  onClose,
  onSubmit
}: ProfessionalAgendaBlockIntervalModalProps) {
  const [formState, setFormState] = useState<ProfessionalAgendaBlockIntervalForm>({
    startTime: '',
    endTime: '',
    reason: ''
  });
  const [validationMessage, setValidationMessage] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!isValidTime(formState.startTime)) {
      setValidationMessage('Informe o horário inicial no formato HH:MM.');
      return;
    }

    if (!isValidTime(formState.endTime)) {
      setValidationMessage('Informe o horário final no formato HH:MM.');
      return;
    }

    if (timeToMinutes(formState.endTime) <= timeToMinutes(formState.startTime)) {
      setValidationMessage('O horário final deve ser maior que o horário inicial.');
      return;
    }

    if (!formState.reason.trim()) {
      setValidationMessage('Informe o motivo do bloqueio.');
      return;
    }

    setValidationMessage('');

    onSubmit({
      startTime: formState.startTime,
      endTime: formState.endTime,
      reason: formState.reason.trim()
    });
  };

  return (
    <ModalShell
      title="Bloquear intervalo"
      description="Informe o período que ficará indisponível na agenda."
      icon={<Lock className="w-5 h-5" />}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="p-5 space-y-4"
      >
        {validationMessage && (
          <ValidationMessage message={validationMessage} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-black text-neutral-600 uppercase font-mono">
              Início
            </span>

            <input
              type="time"
              value={formState.startTime}
              onChange={(event) => {
                setFormState((currentState) => ({
                  ...currentState,
                  startTime: event.target.value
                }));
              }}
              className="w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-black text-neutral-600 uppercase font-mono">
              Fim
            </span>

            <input
              type="time"
              value={formState.endTime}
              onChange={(event) => {
                setFormState((currentState) => ({
                  ...currentState,
                  endTime: event.target.value
                }));
              }}
              className="w-full border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-xs font-black text-neutral-600 uppercase font-mono">
            Motivo
          </span>

          <textarea
            value={formState.reason}
            onChange={(event) => {
              setFormState((currentState) => ({
                ...currentState,
                reason: event.target.value
              }));
            }}
            placeholder="Ex: compromisso, curso, ausência, horário particular..."
            className="w-full border rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-500 min-h-[96px] resize-none"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-2xl text-sm font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="px-4 py-3 rounded-2xl text-sm font-bold bg-neutral-950 text-white hover:bg-neutral-800 transition"
          >
            Bloquear intervalo
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ProfessionalAgendaBlockTimeModal({
  startTime,
  endTime,
  onClose,
  onSubmit
}: ProfessionalAgendaBlockTimeModalProps) {
  const [reason, setReason] = useState('');
  const [validationMessage, setValidationMessage] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!reason.trim()) {
      setValidationMessage('Informe o motivo do bloqueio.');
      return;
    }

    setValidationMessage('');

    onSubmit({
      startTime,
      endTime,
      reason: reason.trim()
    });
  };

  return (
    <ModalShell
      title="Bloquear horário"
      description="Informe o motivo para deixar este horário indisponível."
      icon={<Lock className="w-5 h-5" />}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="p-5 space-y-4"
      >
        {validationMessage && (
          <ValidationMessage message={validationMessage} />
        )}

        <div className="bg-neutral-50 border rounded-2xl p-4">
          <span className="text-xs font-black text-neutral-500 uppercase font-mono">
            Horário selecionado
          </span>

          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-orange-600" />

            <strong className="text-lg text-neutral-950 font-black font-mono">
              {startTime} até {endTime}
            </strong>
          </div>
        </div>

        <label className="space-y-1 block">
          <span className="text-xs font-black text-neutral-600 uppercase font-mono">
            Motivo
          </span>

          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex: compromisso, encaixe particular, ausência, curso..."
            className="w-full border rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-500 min-h-[96px] resize-none"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-2xl text-sm font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="px-4 py-3 rounded-2xl text-sm font-bold bg-neutral-950 text-white hover:bg-neutral-800 transition"
          >
            Bloquear horário
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ProfessionalAgendaExtraTimeModal({
  onClose,
  onSubmit
}: ProfessionalAgendaExtraTimeModalProps) {
  const [formState, setFormState] = useState<ProfessionalAgendaExtraTimeForm>({
    time: ''
  });
  const [validationMessage, setValidationMessage] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!isValidTime(formState.time)) {
      setValidationMessage('Informe um horário válido no formato HH:MM.');
      return;
    }

    setValidationMessage('');

    onSubmit({
      time: formState.time
    });
  };

  return (
    <ModalShell
      title="Adicionar horário"
      description="Abra um horário extra fora da agenda padrão do dia."
      icon={<Plus className="w-5 h-5" />}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="p-5 space-y-4"
      >
        {validationMessage && (
          <ValidationMessage message={validationMessage} />
        )}

        <label className="space-y-1 block">
          <span className="text-xs font-black text-neutral-600 uppercase font-mono">
            Horário extra
          </span>

          <div className="relative">
            <Clock className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />

            <input
              type="time"
              value={formState.time}
              onChange={(event) => {
                setFormState({
                  time: event.target.value
                });
              }}
              className="w-full border rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
            />
          </div>
        </label>

        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 text-xs text-orange-800">
          Use essa opção para abrir um horário fora do padrão normal de atendimento.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-2xl text-sm font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="px-4 py-3 rounded-2xl text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 transition"
          >
            Adicionar horário
          </button>
        </div>
      </form>
    </ModalShell>
  );
}