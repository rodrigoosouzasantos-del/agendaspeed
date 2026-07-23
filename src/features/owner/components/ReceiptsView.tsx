/**
 * Tela de Recebimentos - AgendaZap.
 *
 * Fluxo operacional do caixa:
 * - listar atendimentos do dia para baixa rápida;
 * - destacar valores antigos a receber;
 * - baixar pagamento vinculando cliente, serviço e profissional;
 * - abrir uma segunda tela para fechamento definitivo;
 * - incluir serviços extras vinculados a profissionais;
 * - imprimir filipeta térmica do recebimento ou resumo do dia;
 * - alimentar financeiro e comissões por profissional.
 */

import React, {
  useMemo,
  useRef,
  useState
} from 'react';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Package,
  Plus,
  Printer,
  Search,
  Trash2,
  WalletCards
} from 'lucide-react';

import {
  Appointment,
  CashExpense,
  Client,
  PaymentType,
  Product,
  Professional,
  Receipt,
  Service
} from '../../../types';

import ReceiptsCheckoutView from '../receipts/ReceiptsCheckoutView';
import PendingReceiptsView from '../receipts/PendingReceiptsView';
import ReceiptsHistoryView from '../receipts/ReceiptsHistoryView';

import {
  formatCurrency,
  formatDateBr,
  getAppointmentDate,
  getAppointmentTime,
  getPaymentLabel,
  normalizePhone
} from '../owner.utils';

interface ReceiptDraftItem {
  id: string;
  appointmentId?: string;
  serviceId: string;
  professionalId: string;
  productId?: string;
  itemDescription?: string;
  quantity?: number;
  unitPrice?: number;
  price: number;
  itemType: 'appointment' | 'extra' | 'manual' | 'product';
}

interface ExpensePayload {
  description: string;
  amount: number;
  paymentType: PaymentType;
  notes?: string;
}

interface ReceiptPaymentDraft {
  paymentType: PaymentType;
  amount: number;
}

interface ReceiptPayload {
  clientId?: string;
  clientName: string;
  clientPhone: string;
  appointmentId?: string;
  items: ReceiptDraftItem[];
  payments: ReceiptPaymentDraft[];
  paymentType: PaymentType;
  status: 'paid' | 'pending';
  amountPaid: number;
  amountPending: number;
  discountValue: number;
  notes?: string;
}

interface PendingReceiptPaymentPayload {
  receiptId: string;
  payments: ReceiptPaymentDraft[];
  amountReceived: number;
  amountPaid: number;
  amountPending: number;
  status: 'paid' | 'pending';
  paymentType: PaymentType;
  paidAt: string;
  notes?: string;
}

interface ReceiptsViewProps {
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  products: Product[];
  professionals: Professional[];
  receipts: Receipt[];
  cashExpenses: CashExpense[];
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyInstagram?: string;
  onMarkAppointmentCompleted: (appointmentId: string) => void;
  onConfirmReceipt: (payload: ReceiptPayload) => void | Promise<void>;
  onConfirmExpense: (payload: ExpensePayload) => void | Promise<void>;
  onConfirmPendingReceiptPayment?: (
    payload: PendingReceiptPaymentPayload
  ) => void | Promise<void>;
}

function paymentOptions(): PaymentType[] {
  return ['pix', 'dinheiro', 'debito', 'credito', 'cortesia'];
}

function expensePaymentOptions(): PaymentType[] {
  return ['pix', 'dinheiro', 'debito', 'credito'];
}

function getReceiptPaymentLabel(paymentType: PaymentType): string {
  if (paymentType === 'debito') return 'Débito';
  if (paymentType === 'credito') return 'Crédito';
  return getPaymentLabel(paymentType);
}

function formatPhoneForDisplay(value: string): string {
  const digits = normalizePhone(value);

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return value;
}

function getDefaultAreaCode(companyPhone: string): string {
  const digits = normalizePhone(companyPhone);

  if (digits.length >= 10) {
    return digits.slice(0, 2);
  }

  return '';
}

function normalizeManualPhone(value: string, defaultAreaCode: string): string {
  const digits = normalizePhone(value);

  if (digits.length === 9 && defaultAreaCode.length === 2) {
    return `${defaultAreaCode}${digits}`;
  }

  return digits.slice(0, 11);
}

function formatManualPhoneInput(value: string, defaultAreaCode: string): string {
  const rawDigits = normalizePhone(value).slice(0, 11);

  if (rawDigits.length <= 9 && !value.includes('(')) {
    if (rawDigits.length === 9 && defaultAreaCode.length === 2) {
      return formatPhoneForDisplay(`${defaultAreaCode}${rawDigits}`);
    }

    return rawDigits;
  }

  return formatPhoneForDisplay(rawDigits);
}

function clientPhoneForLookup(client: Client): string {
  return normalizePhone(client.phoneNormalized || client.phone || '');
}

function formatCpfForDisplay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function getAppointmentLabel(appointment: Appointment): string {
  return `${formatDateBr(getAppointmentDate(appointment))} às ${getAppointmentTime(appointment)}`;
}

function isReceivableAppointmentStatus(status: Appointment['status']): boolean {
  return (
    status === 'scheduled' ||
    status === 'confirmed' ||
    status === 'attending' ||
    status === 'completed'
  );
}

function getReceivableStatusLabel(status: Appointment['status']): string {
  if (status === 'confirmed') return 'Confirmado';
  if (status === 'attending') return 'Em atendimento';
  if (status === 'completed') return 'Atendimento concluído';
  return 'Agendado';
}

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getAppointmentSearchText(params: {
  appointment: Appointment;
  services: Service[];
  professionals: Professional[];
}): string {
  const { appointment, services, professionals } = params;
  const service = getServiceById(services, appointment.serviceId);
  const professional = getProfessionalById(professionals, appointment.professionalId);

  return normalizeSearchValue([
    appointment.clientName,
    appointment.clientPhone,
    normalizePhone(appointment.clientPhone),
    getAppointmentServiceName(appointment, services),
    getAppointmentProfessionalName(appointment, professionals),
    getReceivableStatusLabel(appointment.status),
    getAppointmentTime(appointment),
    formatDateBr(getAppointmentDate(appointment))
  ].join(' '));
}


function getServiceById(services: Service[], serviceId: string): Service | undefined {
  return services.find((service) => service.id === serviceId);
}

function getProfessionalById(
  professionals: Professional[],
  professionalId: string
): Professional | undefined {
  return professionals.find((professional) => professional.id === professionalId);
}

function getProductById(
  products: Product[],
  productId: string
): Product | undefined {
  return products.find((product) => product.id === productId);
}

function getAppointmentRecordText(
  appointment: Appointment | null | undefined,
  keys: string[]
): string {
  if (!appointment) {
    return '';
  }

  const record = appointment as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return '';
}

function getAppointmentServiceName(
  appointment: Appointment,
  services: Service[]
): string {
  const service = getServiceById(services, appointment.serviceId);

  return (
    service?.name ||
    getAppointmentRecordText(appointment, [
      'serviceName',
      'service_name',
      'serviceTitle',
      'service_title'
    ]) ||
    'Serviço não localizado'
  );
}

function getAppointmentProfessionalName(
  appointment: Appointment,
  professionals: Professional[]
): string {
  const professional = getProfessionalById(professionals, appointment.professionalId);

  return (
    professional?.name ||
    getAppointmentRecordText(appointment, [
      'professionalName',
      'professional_name',
      'professionalTitle',
      'professional_title'
    ]) ||
    'Profissional não localizado'
  );
}

function getAppointmentServiceDescription(
  appointment: Appointment | null,
  services: Service[]
): string {
  if (!appointment) {
    return '';
  }

  const service = getServiceById(services, appointment.serviceId);
  const remoteDescription = getAppointmentRecordText(appointment, [
    'serviceDescription',
    'service_description',
    'description'
  ]);

  return service?.description || remoteDescription || '';
}

function todayKey(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo'
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrencyInput(value: number): string {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return 0;
  }

  return Number(digits) / 100;
}

function openThermalPrint(title: string, body: string): boolean {
  const printWindow = window.open('', '_blank', 'width=380,height=620');

  if (!printWindow) {
    return false;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          body {
            width: 76mm;
            padding: 5mm 4mm 4mm 4mm;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            font-size: 12px;
            line-height: 1.22;
            overflow-wrap: break-word;
          }
          .center { text-align: center; }
          .title { font-size: 15px; font-weight: 800; margin-bottom: 2px; }
          .salon-title { font-size: 16px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; }
          .muted { font-size: 10px; color: #333; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
          .row span:last-child { text-align: right; white-space: nowrap; }
          .strong { font-weight: 800; }
          .small { font-size: 10px; }
          .item { margin: 6px 0; }
          .total { font-size: 15px; font-weight: 900; }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);

  return true;
}

export default function ReceiptsView({
  clients,
  appointments,
  services,
  products,
  professionals,
  receipts,
  cashExpenses,
  companyName = '',
  companyAddress = '',
  companyPhone = '',
  companyInstagram = '',
  onMarkAppointmentCompleted,
  onConfirmReceipt,
  onConfirmExpense,
  onConfirmPendingReceiptPayment
}: ReceiptsViewProps) {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [cashSearch, setCashSearch] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [locallyCompletedIds, setLocallyCompletedIds] = useState<string[]>([]);
  const [extraItems, setExtraItems] = useState<ReceiptDraftItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>('pix');
  const [cashAmountPaid, setCashAmountPaid] = useState(0);
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [splitCashAmount, setSplitCashAmount] = useState(0);
  const [splitPixAmount, setSplitPixAmount] = useState(0);
  const [splitDebitAmount, setSplitDebitAmount] = useState(0);
  const [splitCreditAmount, setSplitCreditAmount] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'appointment' | 'manual' | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualClientCpf, setManualClientCpf] = useState('');
  const [manualClientName, setManualClientName] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expensePaymentType, setExpensePaymentType] = useState<PaymentType>('dinheiro');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [printAfterConfirmHtml, setPrintAfterConfirmHtml] = useState<string | null>(null);
  const [printAfterConfirmTitle, setPrintAfterConfirmTitle] = useState('Comprovante de pagamento');
  const [isPendingAuthorizationOpen, setIsPendingAuthorizationOpen] = useState(false);
  const [pendingAuthorizationAmount, setPendingAuthorizationAmount] = useState(0);
  const [validationPopupMessage, setValidationPopupMessage] = useState('');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isPendingReceiptsOpen, setIsPendingReceiptsOpen] = useState(false);
  const [selectedPendingReceipt, setSelectedPendingReceipt] =
    useState<Receipt | null>(null);
  const [pendingPaymentType, setPendingPaymentType] =
    useState<PaymentType>('pix');
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);
  const [pendingPaymentDate, setPendingPaymentDate] = useState(todayKey());
  const [pendingPaymentNotes, setPendingPaymentNotes] = useState('');
  const [isSubmittingPendingPayment, setIsSubmittingPendingPayment] =
    useState(false);

  const receiptSubmissionLockRef = useRef(false);

  const phoneKey = normalizePhone(phoneSearch);
  const normalizedCashSearch = normalizeSearchValue(cashSearch);
  const currentDayKey = todayKey();
  const defaultAreaCode = getDefaultAreaCode(companyPhone);

  const manualMatchedClient = useMemo(() => {
    const normalizedManualPhone = normalizeManualPhone(
      manualClientPhone,
      defaultAreaCode
    );
    const normalizedManualCpf = manualClientCpf.replace(/\D/g, '');

    return clients.find((client) => {
      const clientPhone = normalizePhone(
        client.phoneNormalized || client.phone || ''
      );
      const clientCpf = String(client.cpf || '').replace(/\D/g, '');

      const phoneMatches =
        normalizedManualPhone.length >= 10 &&
        clientPhone === normalizedManualPhone;
      const cpfMatches =
        normalizedManualCpf.length === 11 &&
        clientCpf === normalizedManualCpf;

      return phoneMatches || cpfMatches;
    }) || null;
  }, [
    clients,
    defaultAreaCode,
    manualClientCpf,
    manualClientPhone
  ]);

  const selectedClient = useMemo(() => {
    if (phoneKey.length < 8) {
      return null;
    }

    return clients.find((client) => {
      const clientPhones = [
        client.phone,
        client.phoneNormalized || '',
        ...(client.phoneHistory || [])
      ].map(normalizePhone);

      return clientPhones.some((phone) => phone.includes(phoneKey) || phoneKey.includes(phone));
    }) || null;
  }, [clients, phoneKey]);

  const alreadyReceivedAppointmentIds = useMemo(() => {
    return new Set(
      receipts
        .filter((receipt) => receipt.status !== 'cancelled')
        .map((receipt) => receipt.appointmentId)
        .filter(Boolean)
    );
  }, [receipts]);

  const pendingReceipts = useMemo(() => {
    return receipts
      .filter((receipt) => {
        return (
          receipt.status === 'pending' &&
          Number(receipt.amountPending) > 0
        );
      })
      .sort((firstReceipt, secondReceipt) => {
        return secondReceipt.createdAt.localeCompare(firstReceipt.createdAt);
      });
  }, [receipts]);

  const totalPendingReceipts = useMemo(() => {
    return pendingReceipts.reduce((sum, receipt) => {
      return sum + (Number(receipt.amountPending) || 0);
    }, 0);
  }, [pendingReceipts]);

  const receivableAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const appointmentDate = getAppointmentDate(appointment);

        return (
          Boolean(appointmentDate) &&
          appointmentDate <= currentDayKey &&
          !alreadyReceivedAppointmentIds.has(appointment.id) &&
          isReceivableAppointmentStatus(appointment.status)
        );
      })
      .sort((firstAppointment, secondAppointment) => {
        return firstAppointment.dateTime.localeCompare(secondAppointment.dateTime);
      });
  }, [appointments, alreadyReceivedAppointmentIds, currentDayKey]);

  const filteredReceivableAppointments = useMemo(() => {
    if (!normalizedCashSearch) {
      return receivableAppointments;
    }

    return receivableAppointments.filter((appointment) => {
      const searchText = getAppointmentSearchText({
        appointment,
        services,
        professionals
      });

      return searchText.includes(normalizedCashSearch);
    });
  }, [receivableAppointments, normalizedCashSearch, services, professionals]);

  const receivableAppointmentsList = useMemo(() => {
    return [...filteredReceivableAppointments].sort((firstAppointment, secondAppointment) => {
      const firstIsOverdue = getAppointmentDate(firstAppointment) < currentDayKey;
      const secondIsOverdue = getAppointmentDate(secondAppointment) < currentDayKey;

      if (firstIsOverdue !== secondIsOverdue) {
        return firstIsOverdue ? -1 : 1;
      }

      return firstAppointment.dateTime.localeCompare(secondAppointment.dateTime);
    });
  }, [filteredReceivableAppointments, currentDayKey]);

  const selectedAppointment = useMemo(() => {
    if (!selectedAppointmentId) {
      return null;
    }

    return receivableAppointments.find((appointment) => appointment.id === selectedAppointmentId) || null;
  }, [receivableAppointments, selectedAppointmentId]);

  const selectedAppointmentIsCompleted = Boolean(selectedAppointment);

  const appointmentItem = useMemo<ReceiptDraftItem | null>(() => {
    if (!selectedAppointment) {
      return null;
    }

    return {
      id: `receipt-item-${selectedAppointment.id}`,
      appointmentId: selectedAppointment.id,
      serviceId: selectedAppointment.serviceId,
      professionalId: selectedAppointment.professionalId,
      price: selectedAppointment.price,
      itemType: 'appointment'
    };
  }, [selectedAppointment]);

  const receiptItems = useMemo(() => {
    return [
      ...(appointmentItem ? [appointmentItem] : []),
      ...extraItems
    ];
  }, [appointmentItem, extraItems]);

  const subtotal = useMemo(() => {
    return receiptItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }, [receiptItems]);

  const normalizedDiscount = Math.max(0, Math.min(Number(discountValue) || 0, subtotal));
  const total = Math.max(0, subtotal - normalizedDiscount);
  const normalizedCashAmountPaid = Math.max(0, Number(cashAmountPaid) || 0);
  const cashChange =
    paymentType === 'dinheiro'
      ? Math.max(0, normalizedCashAmountPaid - total)
      : 0;
  const splitTotal =
    Math.max(0, Number(splitCashAmount) || 0) +
    Math.max(0, Number(splitPixAmount) || 0) +
    Math.max(0, Number(splitDebitAmount) || 0) +
    Math.max(0, Number(splitCreditAmount) || 0);
  const splitChange = useSplitPayment ? Math.max(0, splitTotal - total) : 0;
  const splitRemaining = useSplitPayment ? Math.max(0, total - splitTotal) : 0;

  const structuredPayments = useMemo<ReceiptPaymentDraft[]>(() => {
    if (useSplitPayment) {
      return [
        { paymentType: 'dinheiro' as PaymentType, amount: Math.max(0, Number(splitCashAmount) || 0) },
        { paymentType: 'pix' as PaymentType, amount: Math.max(0, Number(splitPixAmount) || 0) },
        { paymentType: 'debito' as PaymentType, amount: Math.max(0, Number(splitDebitAmount) || 0) },
        { paymentType: 'credito' as PaymentType, amount: Math.max(0, Number(splitCreditAmount) || 0) }
      ].filter((payment) => payment.amount > 0);
    }

    if (paymentType === 'pendente' || paymentType === 'cortesia') {
      return [];
    }

    if (paymentType === 'dinheiro' && normalizedCashAmountPaid > 0) {
      return [{
        paymentType: 'dinheiro',
        amount: Math.min(normalizedCashAmountPaid, total)
      }];
    }

    return total > 0
      ? [{
          paymentType,
          amount: total
        }]
      : [];
  }, [
    normalizedCashAmountPaid,
    paymentType,
    splitCashAmount,
    splitCreditAmount,
    splitDebitAmount,
    splitPixAmount,
    total,
    useSplitPayment
  ]);

  const structuredAmountPaid = useSplitPayment
    ? Math.min(total, splitTotal)
    : paymentType === 'pendente' || paymentType === 'cortesia'
      ? 0
      : paymentType === 'dinheiro'
        ? normalizedCashAmountPaid > 0
          ? Math.min(total, normalizedCashAmountPaid)
          : total
        : total;

  const structuredAmountPending = Math.max(
    0,
    Number((total - structuredAmountPaid).toFixed(2))
  );

  const structuredReceiptStatus: 'paid' | 'pending' =
    paymentType === 'cortesia'
      ? 'paid'
      : structuredAmountPending > 0
        ? 'pending'
        : 'paid';

  const todayReceipts = useMemo(() => {
    return receipts
      .filter((receipt) => {
        return (
          receipt.status !== 'cancelled' &&
          Number(receipt.amountPaid) > 0 &&
          receipt.paidAt.slice(0, 10) === currentDayKey
        );
      })
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }, [receipts, currentDayKey]);

  const todayTotalsByPayment = useMemo(() => {
    return paymentOptions().map((option) => {
      const totalByOption = todayReceipts.reduce((sum, receipt) => {
        const receiptPayments = Array.isArray(receipt.payments)
          ? receipt.payments
          : [];

        if (receiptPayments.length > 0) {
          return (
            sum +
            receiptPayments
              .filter((payment) => payment.paymentType === option)
              .reduce((paymentSum, payment) => {
                return paymentSum + (Number(payment.amount) || 0);
              }, 0)
          );
        }

        if (receipt.paymentType !== option || option === 'cortesia') {
          return sum;
        }

        return sum + (Number(receipt.amountPaid) || 0);
      }, 0);

      return {
        paymentType: option,
        total: totalByOption
      };
    });
  }, [todayReceipts]);

  const totalReceivedToday = todayReceipts.reduce((sum, receipt) => {
    if (receipt.paymentType === 'cortesia') {
      return sum;
    }

    return sum + (Number(receipt.amountPaid) || 0);
  }, 0);

  const todayExpenses = useMemo(() => {
    return cashExpenses
      .filter((expense) => expense.status === 'paid' && expense.paidAt.slice(0, 10) === currentDayKey)
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }, [cashExpenses, currentDayKey]);

  const totalExpensesToday = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const dailyBalance = totalReceivedToday - totalExpensesToday;

  const resetCheckoutDraft = () => {
    setExtraItems([]);
    setDiscountValue(0);
    setNotes('');
    setPaymentType('pix');
    setCashAmountPaid(0);
    setUseSplitPayment(false);
    setSplitCashAmount(0);
    setSplitPixAmount(0);
    setSplitDebitAmount(0);
    setSplitCreditAmount(0);
  };

  const handleMarkCompleted = (appointmentId: string) => {
    onMarkAppointmentCompleted(appointmentId);
    setLocallyCompletedIds((currentIds) => Array.from(new Set([...currentIds, appointmentId])));
  };

  const createDefaultManualItem = (): ReceiptDraftItem | null => {
    const hasActiveService = services.some((service) => service.active);
    const hasActiveProfessional = professionals.some(
      (professional) => professional.active
    );

    if (!hasActiveService || !hasActiveProfessional) {
      return null;
    }

    return {
      id: `manual-${Date.now()}`,
      serviceId: '',
      professionalId: '',
      price: 0,
      itemType: 'manual'
    };
  };

  const handleOpenCheckout = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setCheckoutMode('appointment');
    resetCheckoutDraft();
    setIsCheckoutOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenManualReceipt = () => {
    const defaultItem = createDefaultManualItem();

    if (!defaultItem) {
      setValidationPopupMessage('Cadastre pelo menos um serviço e um profissional ativo para lançar pagamento manual.');
      return;
    }

    setSelectedAppointmentId(null);
    setCheckoutMode('manual');
    setManualClientPhone('');
    setManualClientCpf('');
    setManualClientName('');
    resetCheckoutDraft();
    setExtraItems([defaultItem]);
    setIsCheckoutOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenExpense = () => {
    setIsExpenseOpen(true);
    setExpenseDescription('');
    setExpenseAmount(0);
    setExpensePaymentType('dinheiro');
    setExpenseNotes('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const handleOpenPendingReceipts = () => {
    setIsPendingReceiptsOpen(true);
    setSelectedPendingReceipt(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClosePendingReceipts = () => {
    if (isSubmittingPendingPayment) return;

    setIsPendingReceiptsOpen(false);
    setSelectedPendingReceipt(null);
    setPendingPaymentType('pix');
    setPendingPaymentAmount(0);
    setPendingPaymentDate(todayKey());
    setPendingPaymentNotes('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPendingPayment = (receipt: Receipt) => {
    setSelectedPendingReceipt(receipt);
    setPendingPaymentType('pix');
    setPendingPaymentAmount(Number(receipt.amountPending) || 0);
    setPendingPaymentDate(todayKey());
    setPendingPaymentNotes('');
  };

  const handleClosePendingPayment = () => {
    if (isSubmittingPendingPayment) return;

    setSelectedPendingReceipt(null);
    setPendingPaymentType('pix');
    setPendingPaymentAmount(0);
    setPendingPaymentDate(todayKey());
    setPendingPaymentNotes('');
  };

  const selectedPendingAmount = selectedPendingReceipt
    ? Math.max(0, Number(selectedPendingReceipt.amountPending) || 0)
    : 0;

  const normalizedPendingPaymentAmount = Math.max(
    0,
    Number(pendingPaymentAmount) || 0
  );

  const pendingAmountToApply =
    pendingPaymentType === 'dinheiro'
      ? Math.min(normalizedPendingPaymentAmount, selectedPendingAmount)
      : Math.min(normalizedPendingPaymentAmount, selectedPendingAmount);

  const pendingPaymentChange =
    pendingPaymentType === 'dinheiro'
      ? Math.max(0, normalizedPendingPaymentAmount - selectedPendingAmount)
      : 0;

  const pendingAmountRemaining = Math.max(
    0,
    Number((selectedPendingAmount - pendingAmountToApply).toFixed(2))
  );

  const handleConfirmPendingPayment = async () => {
    if (!selectedPendingReceipt || isSubmittingPendingPayment) {
      return;
    }

    const currentPending = selectedPendingAmount;
    const amountReceived = pendingAmountToApply;

    if (amountReceived <= 0) {
      setValidationPopupMessage('Informe o valor recebido.');
      return;
    }

    if (!pendingPaymentDate) {
      setValidationPopupMessage('Informe a data do recebimento.');
      return;
    }

    if (!onConfirmPendingReceiptPayment) {
      setValidationPopupMessage(
        'A baixa do saldo pendente ainda precisa ser conectada ao painel do dono.'
      );
      return;
    }

    const nextAmountPaid = Number(
      (
        (Number(selectedPendingReceipt.amountPaid) || 0) +
        amountReceived
      ).toFixed(2)
    );
    const nextAmountPending = Number(
      Math.max(0, currentPending - amountReceived).toFixed(2)
    );

    setIsSubmittingPendingPayment(true);

    try {
      await onConfirmPendingReceiptPayment({
        receiptId: selectedPendingReceipt.id,
        payments: [{
          paymentType: pendingPaymentType,
          amount: amountReceived
        }],
        amountReceived,
        amountPaid: nextAmountPaid,
        amountPending: nextAmountPending,
        status: nextAmountPending > 0 ? 'pending' : 'paid',
        paymentType: pendingPaymentType,
        paidAt: pendingPaymentDate,
        notes: [
          pendingPaymentNotes.trim(),
          pendingPaymentType === 'dinheiro' && pendingPaymentChange > 0
            ? `Recebido ${formatCurrency(normalizedPendingPaymentAmount)} em dinheiro; troco ${formatCurrency(pendingPaymentChange)}`
            : ''
        ].filter(Boolean).join(' | ') || undefined
      });

      handleClosePendingPayment();

      if (nextAmountPending <= 0) {
        setValidationPopupMessage('Saldo pendente recebido com sucesso!');
      } else {
        setValidationPopupMessage(
          `Pagamento registrado. Restante: ${formatCurrency(nextAmountPending)}.`
        );
      }
    } finally {
      setIsSubmittingPendingPayment(false);
    }
  };

  const handleBackToSearch = () => {
    setIsCheckoutOpen(false);
    setIsExpenseOpen(false);
    setCheckoutMode(null);
    setSelectedAppointmentId(null);
    setManualClientPhone('');
    setManualClientCpf('');
    setManualClientName('');
    resetCheckoutDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddExtraItem = () => {
    if (!services.some((service) => service.active) || !professionals.some((professional) => professional.active)) {
      setValidationPopupMessage('Cadastre pelo menos um serviço e um profissional ativo para adicionar extras.');
      return;
    }

    setExtraItems((currentItems) => [
      ...currentItems,
      {
        id: `extra-${Date.now()}`,
        serviceId: '',
        professionalId: '',
        price: 0,
        itemType: checkoutMode === 'manual' ? 'manual' : 'extra'
      }
    ]);
  };

  const handleAddProductItem = () => {
    if (!products.some((product) => product.active)) {
      setValidationPopupMessage('Cadastre pelo menos um produto ativo para adicioná-lo ao recebimento.');
      return;
    }

    setExtraItems((currentItems) => [
      ...currentItems,
      {
        id: `product-${Date.now()}`,
        serviceId: '',
        professionalId: '',
        productId: '',
        itemDescription: '',
        quantity: 1,
        unitPrice: 0,
        price: 0,
        itemType: 'product'
      }
    ]);
  };

  const handleChangeProduct = (itemId: string, productId: string) => {
    const selectedProduct = getProductById(products, productId);

    if (!selectedProduct) {
      return;
    }

    setExtraItems((currentItems) => currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Number(selectedProduct.salePrice) || 0;

      return {
        ...item,
        productId,
        itemDescription: selectedProduct.description,
        quantity,
        unitPrice,
        price: quantity * unitPrice
      };
    }));
  };

  const handleChangeProductQuantity = (itemId: string, quantity: number) => {
    setExtraItems((currentItems) => currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      const normalizedQuantity = Math.max(1, Number(quantity) || 1);
      const unitPrice = Number(item.unitPrice) || 0;

      return {
        ...item,
        quantity: normalizedQuantity,
        price: normalizedQuantity * unitPrice
      };
    }));
  };

  const handleChangeExtraService = (itemId: string, serviceId: string) => {
    const selectedService = getServiceById(services, serviceId);

    setExtraItems((currentItems) => currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        serviceId,
        price: selectedService?.price ?? item.price
      };
    }));
  };

  const handleChangeExtraProfessional = (itemId: string, professionalId: string) => {
    setExtraItems((currentItems) => currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        professionalId
      };
    }));
  };

  const handleChangeExtraPrice = (itemId: string, price: number) => {
    setExtraItems((currentItems) => currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        price: Number(price) || 0
      };
    }));
  };

  const handleRemoveExtra = (itemId: string) => {
    setExtraItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  };

  const buildBusinessPrintHeader = () => {
    const instagramLine = companyInstagram?.trim()
      ? `<div class="muted">${escapeHtml(companyInstagram.trim())}</div>`
      : '';
    const addressLine = companyAddress?.trim()
      ? `<div class="muted">${escapeHtml(companyAddress.trim())}</div>`
      : '';
    const phoneLine = companyPhone?.trim()
      ? `<div class="muted">Telefone: ${escapeHtml(companyPhone.trim())}</div>`
      : '';

    return `
      <div class="center">
        <div class="salon-title">${escapeHtml(companyName?.trim() || 'SALÃO')}</div>
        ${addressLine}
        ${phoneLine}
        ${instagramLine}
      </div>
      <div class="line"></div>
    `;
  };

  const buildDraftReceiptPrintHtml = () => {
    const clientName =
      selectedAppointment?.clientName ||
      manualMatchedClient?.name ||
      selectedClient?.name ||
      manualClientName ||
      'Cliente';
    const clientPhone =
      selectedAppointment?.clientPhone ||
      manualMatchedClient?.phone ||
      selectedClient?.phone ||
      manualClientPhone ||
      '';
    const appointmentDate = selectedAppointment ? getAppointmentLabel(selectedAppointment) : '';
    const paymentDetails = [
      structuredPayments.length > 1 ? 'Pagamento dividido:' : '',
      ...structuredPayments.map((payment) => {
        return `${getReceiptPaymentLabel(payment.paymentType)} ${formatCurrency(payment.amount)}`;
      }),
      structuredAmountPending > 0
        ? `Pendente ${formatCurrency(structuredAmountPending)}`
        : '',
      useSplitPayment && splitChange > 0
        ? `Troco ${formatCurrency(splitChange)}`
        : '',
      !useSplitPayment && paymentType === 'dinheiro' && cashChange > 0
        ? `Troco ${formatCurrency(cashChange)}`
        : ''
    ].filter(Boolean).join(' ');
    const printNotes = [
      notes.trim(),
      paymentDetails
    ].filter(Boolean).join(' | ');
    const itemsHtml = receiptItems.map((item) => {
      if (item.itemType === 'product') {
        const product = item.productId
          ? getProductById(products, item.productId)
          : undefined;
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const description =
          item.itemDescription ||
          product?.description ||
          'Produto não localizado';

        return `
          <div class="item">
            <div class="strong">${escapeHtml(description)}</div>
            <div class="small">Produto${product?.code ? ` • Cód. ${escapeHtml(product.code)}` : ''}</div>
            <div class="row"><span>${quantity} un.</span><span>${formatCurrency(item.price)}</span></div>
          </div>
        `;
      }

      const service = getServiceById(services, item.serviceId);
      const professional = getProfessionalById(professionals, item.professionalId);
      const linkedAppointment =
        item.itemType === 'appointment' && selectedAppointment
          ? selectedAppointment
          : null;
      const serviceName = linkedAppointment
        ? getAppointmentServiceName(linkedAppointment, services)
        : service?.name || 'Serviço não localizado';
      const professionalName = linkedAppointment
        ? getAppointmentProfessionalName(linkedAppointment, professionals)
        : professional?.name || 'Profissional não localizado';
      const serviceDescription = linkedAppointment
        ? getAppointmentServiceDescription(linkedAppointment, services)
        : service?.description || '';

      return `
        <div class="item">
          <div class="strong">${escapeHtml(serviceName)}</div>
          <div class="small">Prof.: ${escapeHtml(professionalName)}</div>
          ${serviceDescription ? `<div class="small">Desc.: ${escapeHtml(serviceDescription)}</div>` : ''}
          <div class="row"><span>${item.itemType === 'appointment' ? 'Agendado' : item.itemType === 'manual' ? 'Manual' : 'Extra'}</span><span>${formatCurrency(item.price)}</span></div>
        </div>
      `;
    }).join('');

    return `
      ${buildBusinessPrintHeader()}
      <div class="center">
        <div class="title">COMPROVANTE DE PAGAMENTO</div>
        <div class="muted">AgendaZap</div>
      </div>
      <div class="line"></div>
      <div><span class="strong">Cliente:</span> ${escapeHtml(clientName)}</div>
      <div><span class="strong">WhatsApp:</span> ${escapeHtml(formatPhoneForDisplay(clientPhone))}</div>
      ${appointmentDate ? `<div><span class="strong">Atendimento:</span> ${escapeHtml(appointmentDate)}</div>` : ''}
      <div class="line"></div>
      ${itemsHtml}
      <div class="line"></div>
      <div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="row"><span>Desconto</span><span>${formatCurrency(normalizedDiscount)}</span></div>
      <div class="row total"><span>Total</span><span>${formatCurrency(total)}</span></div>
      <div class="row"><span>Pagamento</span><span>${escapeHtml(getReceiptPaymentLabel(paymentType))}</span></div>
      ${printNotes ? `<div class="line"></div><div class="small">Obs.: ${escapeHtml(printNotes)}</div>` : ''}
      <div class="line"></div>
      <div class="center small">Obrigado pela preferência!</div>
    `;
  };

  const handlePrintDraftReceipt = () => {
    if (receiptItems.length === 0) {
      setValidationPopupMessage('Inclua pelo menos um serviço ou produto para imprimir.');
      return;
    }

    const printOpened = openThermalPrint(
      'Comprovante de pagamento',
      buildDraftReceiptPrintHtml()
    );

    if (!printOpened) {
      setValidationPopupMessage(
        'O navegador bloqueou a impressão. Libere pop-ups para imprimir a filipeta.'
      );
    }
  };

  const handlePrintReceipt = (receipt: Receipt) => {
    const itemsHtml = receipt.items.map((item) => {
      if (item.itemType === 'product') {
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const description =
          item.itemDescription ||
          item.serviceName ||
          'Produto';

        return `
          <div class="item">
            <div class="strong">${escapeHtml(description)}</div>
            <div class="small">Produto</div>
            <div class="row"><span>${quantity} un.</span><span>${formatCurrency(item.price)}</span></div>
          </div>
        `;
      }

      return `
        <div class="item">
          <div class="strong">${escapeHtml(item.serviceName)}</div>
          <div class="small">Prof.: ${escapeHtml(item.professionalName)}</div>
          <div class="row"><span>${item.itemType === 'appointment' ? 'Agendado' : item.itemType === 'manual' ? 'Manual' : 'Extra'}</span><span>${formatCurrency(item.price)}</span></div>
        </div>
      `;
    }).join('');

    const body = `
      ${buildBusinessPrintHeader()}
      <div class="center">
        <div class="title">PAGAMENTO</div>
        <div class="muted">${new Date(receipt.paidAt).toLocaleString('pt-BR')}</div>
      </div>
      <div class="line"></div>
      <div><span class="strong">Cliente:</span> ${escapeHtml(receipt.clientName)}</div>
      <div><span class="strong">WhatsApp:</span> ${escapeHtml(formatPhoneForDisplay(receipt.clientPhone))}</div>
      <div class="line"></div>
      ${itemsHtml}
      <div class="line"></div>
      <div class="row"><span>Subtotal</span><span>${formatCurrency(receipt.subtotal)}</span></div>
      <div class="row"><span>Desconto</span><span>${formatCurrency(receipt.discountValue)}</span></div>
      <div class="row total"><span>Total</span><span>${formatCurrency(Number(receipt.amountPaid) || 0)}</span></div>
      <div class="row"><span>Pagamento</span><span>${escapeHtml(
        receipt.payments && receipt.payments.length > 1
          ? 'Dividido'
          : getReceiptPaymentLabel(receipt.paymentType)
      )}</span></div>
      ${receipt.notes ? `<div class="line"></div><div class="small">Obs.: ${escapeHtml(receipt.notes)}</div>` : ''}
      <div class="line"></div>
      <div class="center small">Obrigado pela preferência!</div>
    `;

    const printOpened = openThermalPrint('Comprovante de pagamento', body);

    if (!printOpened) {
      setValidationPopupMessage(
        'O navegador bloqueou a impressão. Libere pop-ups para imprimir a filipeta.'
      );
    }
  };

  const handlePrintDailySummary = () => {
    if (todayReceipts.length === 0 && todayExpenses.length === 0) {
      setValidationPopupMessage('Ainda não há movimentações no dia para imprimir.');
      return;
    }

    const paymentRows = todayTotalsByPayment
      .filter((item) => item.total > 0)
      .map((item) => `
        <div class="row"><span>${escapeHtml(getReceiptPaymentLabel(item.paymentType))}</span><span>${formatCurrency(item.total)}</span></div>
      `).join('');

    const receiptRows = todayReceipts.map((receipt) => `
      <div class="item">
        <div class="strong">${escapeHtml(receipt.clientName)}</div>
        <div class="row"><span>${escapeHtml(getReceiptPaymentLabel(receipt.paymentType))}</span><span>${formatCurrency(receipt.totalAmount)}</span></div>
      </div>
    `).join('');

    const expenseRows = todayExpenses.map((expense) => `
      <div class="item">
        <div class="strong">${escapeHtml(expense.description)}</div>
        <div class="row"><span>${escapeHtml(getReceiptPaymentLabel(expense.paymentType))}</span><span>- ${formatCurrency(expense.amount)}</span></div>
      </div>
    `).join('');

    const body = `
      ${buildBusinessPrintHeader()}
      <div class="center">
        <div class="title">RESUMO DO DIA</div>
        <div class="muted">${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
      <div class="line"></div>
      <div class="strong">Por forma de pagamento</div>
      ${paymentRows}
      <div class="line"></div>
      <div class="row"><span>Recebimentos</span><span>${formatCurrency(totalReceivedToday)}</span></div>
      <div class="row"><span>Despesas</span><span>- ${formatCurrency(totalExpensesToday)}</span></div>
      <div class="row total"><span>Saldo</span><span>${formatCurrency(dailyBalance)}</span></div>
      <div class="line"></div>
      <div class="strong">Recebimentos</div>
      ${receiptRows || '<div class="small">Nenhum recebimento.</div>'}
      <div class="line"></div>
      <div class="strong">Despesas</div>
      ${expenseRows || '<div class="small">Nenhuma despesa.</div>'}
      <div class="line"></div>
      <div class="center small">Fim do resumo</div>
    `;

    const printOpened = openThermalPrint(
      'Resumo de recebimentos do dia',
      body
    );

    if (!printOpened) {
      setValidationPopupMessage(
        'O navegador bloqueou a impressão. Libere pop-ups para imprimir o resumo.'
      );
    }
  };

  const finalizeReceipt = async (): Promise<boolean> => {
    if (receiptSubmissionLockRef.current || isSubmittingReceipt) {
      return false;
    }

    receiptSubmissionLockRef.current = true;

    const isManualReceipt = checkoutMode === 'manual';
    const clientName = isManualReceipt
      ? manualMatchedClient?.name || manualClientName.trim() || 'Cliente balcão'
      : selectedAppointment?.clientName || selectedClient?.name || 'Cliente';
    const clientPhone = isManualReceipt
      ? manualMatchedClient?.phone ||
        normalizeManualPhone(manualClientPhone, defaultAreaCode)
      : selectedAppointment?.clientPhone || selectedClient?.phone || phoneSearch;

    const paymentDetails = [
      structuredPayments.length > 1 ? 'Pagamento dividido:' : '',
      ...structuredPayments.map((payment) => {
        return `${getReceiptPaymentLabel(payment.paymentType)} ${formatCurrency(payment.amount)}`;
      }),
      structuredAmountPending > 0
        ? `Pendente ${formatCurrency(structuredAmountPending)}`
        : '',
      useSplitPayment && splitChange > 0
        ? `Troco ${formatCurrency(splitChange)}`
        : '',
      !useSplitPayment && paymentType === 'dinheiro' && cashChange > 0
        ? `Troco ${formatCurrency(cashChange)}`
        : ''
    ].filter(Boolean).join(' ');

    const receiptNotes = [
      notes.trim(),
      paymentDetails
    ].filter(Boolean).join(' | ');

    const receiptPrintHtml = buildDraftReceiptPrintHtml();

    setIsSubmittingReceipt(true);

    try {
      await onConfirmReceipt({
      clientId: isManualReceipt
        ? manualMatchedClient?.id
        : selectedClient?.id,
      clientName,
      clientPhone,
      appointmentId: selectedAppointment?.id,
      items: receiptItems,
      payments: structuredPayments,
      paymentType:
        structuredPayments.length === 1
          ? structuredPayments[0].paymentType
          : structuredPayments.length > 1
            ? structuredPayments[0].paymentType
            : 'pendente',
      status: structuredReceiptStatus,
      amountPaid: structuredAmountPaid,
      amountPending: structuredAmountPending,
      discountValue: normalizedDiscount,
        notes: receiptNotes
      });

      setPrintAfterConfirmTitle('Comprovante de pagamento');
      setPrintAfterConfirmHtml(receiptPrintHtml);
      setPhoneSearch('');
      setSelectedAppointmentId(null);
      setCheckoutMode(null);
      setIsCheckoutOpen(false);
      setManualClientPhone('');
      setManualClientCpf('');
      setManualClientName('');
      resetCheckoutDraft();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      return true;
    } catch (error) {
      setValidationPopupMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar o pagamento. Tente novamente.'
      );

      return false;
    } finally {
      receiptSubmissionLockRef.current = false;
      setIsSubmittingReceipt(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (receiptSubmissionLockRef.current || isSubmittingReceipt) {
      return;
    }

    const isManualReceipt = checkoutMode === 'manual';

    if (!isManualReceipt && !selectedAppointment) {
      setValidationPopupMessage('Selecione um atendimento para baixar o pagamento.');
      return;
    }

    if (receiptItems.length === 0) {
      setValidationPopupMessage('Inclua pelo menos um serviço ou produto no recebimento.');
      return;
    }

    const hasIncompleteItem = receiptItems.some((item) => {
      return item.itemType === 'product'
        ? !item.productId
        : !item.serviceId || !item.professionalId;
    });

    if (hasIncompleteItem) {
      setValidationPopupMessage(
        'Selecione o serviço, o profissional ou o produto antes de concluir.'
      );
      return;
    }

    const clientPhone = isManualReceipt
      ? manualMatchedClient?.phone ||
        normalizeManualPhone(manualClientPhone, defaultAreaCode)
      : selectedAppointment?.clientPhone || selectedClient?.phone || phoneSearch;

    if (!normalizePhone(clientPhone)) {
      setValidationPopupMessage('Informe o WhatsApp do cliente para concluir o recebimento.');
      return;
    }

    const currentAmountPaid = useSplitPayment
      ? Math.min(total, splitTotal)
      : paymentType === 'pendente' || paymentType === 'cortesia'
        ? 0
        : paymentType === 'dinheiro'
          ? normalizedCashAmountPaid > 0
            ? Math.min(total, normalizedCashAmountPaid)
            : total
          : total;

    const currentPendingAmount = Number(
      Math.max(0, total - currentAmountPaid).toFixed(2)
    );

    if (currentAmountPaid > 0 && currentPendingAmount > 0) {
      setPendingAuthorizationAmount(currentPendingAmount);
      setIsPendingAuthorizationOpen(true);
      return;
    }

    await finalizeReceipt();
  };

  const handleAuthorizePendingReceipt = async () => {
    if (receiptSubmissionLockRef.current || isSubmittingReceipt) {
      return;
    }

    const wasConfirmed = await finalizeReceipt();

    if (!wasConfirmed) {
      return;
    }

    setIsPendingAuthorizationOpen(false);
    setPendingAuthorizationAmount(0);
  };

  const handlePrintConfirmedReceipt = () => {
    if (printAfterConfirmHtml) {
      const printOpened = openThermalPrint(
        printAfterConfirmTitle,
        printAfterConfirmHtml
      );

      if (!printOpened) {
        setValidationPopupMessage(
          'O navegador bloqueou a impressão. Libere pop-ups para imprimir o comprovante.'
        );
        return;
      }
    }

    setPrintAfterConfirmHtml(null);
  };

  const handleSkipConfirmedReceiptPrint = () => {
    setPrintAfterConfirmHtml(null);
  };

  const handleConfirmExpense = async () => {
    if (isSubmittingExpense) return;
    if (!expenseDescription.trim()) {
      setValidationPopupMessage('Informe a descrição da despesa.');
      return;
    }

    if ((Number(expenseAmount) || 0) <= 0) {
      setValidationPopupMessage('Informe o valor da despesa.');
      return;
    }

    setIsSubmittingExpense(true);

    try {
      await onConfirmExpense({
        description: expenseDescription.trim(),
        amount: Number(expenseAmount) || 0,
        paymentType: expensePaymentType,
        notes: expenseNotes
      });

      setValidationPopupMessage('Despesa lançada com sucesso.');
      handleBackToSearch();
    } finally {
      setIsSubmittingExpense(false);
    }
  };


  const sharedContext = {
    canShowCheckout: checkoutMode === 'manual' || Boolean(selectedAppointment),
    cashAmountPaid,
    cashChange,
    cashSearch,
    checkoutMode,
    clients,
    currentDayKey,
    dailyBalance,
    defaultAreaCode,
    discountValue,
    expenseAmount,
    expenseDescription,
    expenseNotes,
    expensePaymentOptions,
    expensePaymentType,
    extraItems,
    formatCurrency,
    formatCurrencyInput,
    formatDateBr,
    formatManualPhoneInput,
    formatCpfForDisplay,
    formatPhoneForDisplay,
    getAppointmentDate,
    getAppointmentServiceDescription,
    getAppointmentProfessionalName,
    getAppointmentServiceName,
    getAppointmentTime,
    getProductById,
    getProfessionalById,
    getReceivableStatusLabel,
    getReceiptPaymentLabel,
    getServiceById,
    clientPhoneForLookup,
    handleAddExtraItem,
    handleAddProductItem,
    handleAuthorizePendingReceipt,
    handleBackToSearch,
    handleChangeExtraPrice,
    handleChangeExtraProfessional,
    handleChangeExtraService,
    handleChangeProduct,
    handleChangeProductQuantity,
    handleClosePendingPayment,
    handleClosePendingReceipts,
    handleConfirmExpense,
    handleConfirmPendingPayment,
    handleConfirmReceipt,
    handleOpenCheckout,
    handleOpenManualReceipt,
    handleOpenPendingPayment,
    handleOpenPendingReceipts,
    handlePrintDailySummary,
    handlePrintDraftReceipt,
    handlePrintReceipt,
    handlePrintConfirmedReceipt,
    handleRemoveExtra,
    handleSkipConfirmedReceiptPrint,
    isCheckoutOpen,
    isExpenseOpen,
    isHistoryOpen,
    isPendingAuthorizationOpen,
    isPendingReceiptsOpen,
    isSubmittingExpense,
    isSubmittingPendingPayment,
    isSubmittingReceipt,
    manualClientCpf,
    manualClientName,
    manualClientPhone,
    manualMatchedClient,
    normalizeManualPhone,
    normalizePhone,
    notes,
    normalizedDiscount,
    parseCurrencyInput,
    paymentOptions,
    paymentType,
    pendingAmountRemaining,
    pendingAmountToApply,
    pendingAuthorizationAmount,
    pendingPaymentAmount,
    pendingPaymentChange,
    pendingPaymentDate,
    pendingPaymentNotes,
    pendingPaymentType,
    pendingReceipts,
    printAfterConfirmHtml,
    products,
    professionals,
    receiptItems,
    receivableAppointmentsList,
    selectedAppointment,
    selectedPendingAmount,
    selectedPendingReceipt,
    services,
    setCashAmountPaid,
    setCashSearch,
    setDiscountValue,
    setExpenseAmount,
    setExpenseDescription,
    setExpenseNotes,
    setExpensePaymentType,
    setIsHistoryOpen,
    setIsPendingAuthorizationOpen: (isOpen: boolean) => {
      if (isSubmittingReceipt && !isOpen) {
        return;
      }

      setIsPendingAuthorizationOpen(isOpen);
    },
    setManualClientCpf,
    setManualClientName,
    setManualClientPhone,
    setNotes,
    setPaymentType,
    setPendingAuthorizationAmount,
    setPendingPaymentAmount,
    setPendingPaymentDate,
    setPendingPaymentNotes,
    setPendingPaymentType,
    setSplitCashAmount,
    setSplitCreditAmount,
    setSplitDebitAmount,
    setSplitPixAmount,
    setUseSplitPayment,
    setValidationPopupMessage,
    splitCashAmount,
    splitChange,
    splitCreditAmount,
    splitDebitAmount,
    splitPixAmount,
    splitRemaining,
    structuredAmountPending,
    subtotal,
    todayExpenses,
    todayReceipts,
    todayTotalsByPayment,
    total,
    totalExpensesToday,
    totalPendingReceipts,
    totalReceivedToday,
    useSplitPayment,
    validationPopupMessage
  };

  if (isPendingReceiptsOpen) {
    return <PendingReceiptsView context={sharedContext} />;
  }

  if (isCheckoutOpen) {
    return <ReceiptsCheckoutView context={sharedContext} />;
  }

  return (
    <ReceiptsHistoryView
      context={{
        ...sharedContext,
        renderMode: isExpenseOpen ? 'expense' : 'home'
      }}
    />
  );
}

export type {
  ReceiptDraftItem,
  ReceiptPaymentDraft,
  ReceiptPayload,
  PendingReceiptPaymentPayload
};
