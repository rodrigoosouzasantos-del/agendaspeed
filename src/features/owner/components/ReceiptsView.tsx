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
  useState
} from 'react';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MinusCircle,
  Package,
  Plus,
  Printer,
  Search,
  Trash2
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
  onConfirmReceipt: (payload: ReceiptPayload) => void;
  onConfirmExpense: (payload: ExpensePayload) => void;
}

function paymentOptions(): PaymentType[] {
  return ['pix', 'dinheiro', 'debito', 'credito', 'cortesia'];
}

function expensePaymentOptions(): PaymentType[] {
  return ['pix', 'dinheiro', 'debito', 'credito'];
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
  return new Date().toISOString().slice(0, 10);
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

function openThermalPrint(title: string, body: string): void {
  const printWindow = window.open('', '_blank', 'width=380,height=620');

  if (!printWindow) {
    alert('O navegador bloqueou a impressão. Libere pop-ups para imprimir a filipeta.');
    return;
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
  onConfirmExpense
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
  const [printAfterConfirmTitle, setPrintAfterConfirmTitle] = useState('Comprovante de recebimento');

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
        .filter((receipt) => receipt.status === 'paid')
        .map((receipt) => receipt.appointmentId)
        .filter(Boolean)
    );
  }, [receipts]);

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

    if (paymentType === 'pendente') {
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

  const structuredAmountPaid = Math.min(
    total,
    structuredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  );
  const structuredAmountPending = Math.max(0, total - structuredAmountPaid);
  const structuredReceiptStatus: 'paid' | 'pending' =
    structuredAmountPending > 0 ? 'pending' : 'paid';

  const todayReceipts = useMemo(() => {
    return receipts
      .filter((receipt) => receipt.status === 'paid' && receipt.paidAt.slice(0, 10) === currentDayKey)
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }, [receipts, currentDayKey]);

  const todayTotalsByPayment = useMemo(() => {
    return paymentOptions().map((option) => {
      const totalByOption = todayReceipts
        .filter((receipt) => receipt.paymentType === option)
        .reduce((sum, receipt) => sum + receipt.totalAmount, 0);

      return {
        paymentType: option,
        total: totalByOption
      };
    });
  }, [todayReceipts]);

  const totalReceivedToday = todayReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);

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
    const firstActiveService = services.find((service) => service.active) || services[0];
    const firstProfessional = professionals.find((professional) => professional.active) || professionals[0];

    if (!firstActiveService || !firstProfessional) {
      return null;
    }

    return {
      id: `manual-${Date.now()}`,
      serviceId: firstActiveService.id,
      professionalId: firstProfessional.id,
      price: firstActiveService.price,
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
      alert('Cadastre pelo menos um serviço e um profissional ativo para lançar pagamento manual.');
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
    const firstActiveService = services.find((service) => service.active) || services[0];
    const firstProfessional = professionals.find((professional) => professional.active) || professionals[0];

    if (!firstActiveService || !firstProfessional) {
      alert('Cadastre pelo menos um serviço e um profissional ativo para adicionar extras.');
      return;
    }

    setExtraItems((currentItems) => [
      ...currentItems,
      {
        id: `extra-${Date.now()}`,
        serviceId: firstActiveService.id,
        professionalId: firstProfessional.id,
        price: firstActiveService.price,
        itemType: checkoutMode === 'manual' ? 'manual' : 'extra'
      }
    ]);
  };

  const handleAddProductItem = () => {
    const firstActiveProduct = products.find((product) => product.active);

    if (!firstActiveProduct) {
      alert('Cadastre pelo menos um produto ativo para adicioná-lo ao recebimento.');
      return;
    }

    setExtraItems((currentItems) => [
      ...currentItems,
      {
        id: `product-${Date.now()}`,
        serviceId: '',
        professionalId: '',
        productId: firstActiveProduct.id,
        itemDescription: firstActiveProduct.description,
        quantity: 1,
        unitPrice: firstActiveProduct.salePrice,
        price: firstActiveProduct.salePrice,
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
        return `${getPaymentLabel(payment.paymentType)} ${formatCurrency(payment.amount)}`;
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
        <div class="title">COMPROVANTE DE RECEBIMENTO</div>
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
      <div class="row"><span>Pagamento</span><span>${escapeHtml(getPaymentLabel(paymentType))}</span></div>
      ${printNotes ? `<div class="line"></div><div class="small">Obs.: ${escapeHtml(printNotes)}</div>` : ''}
      <div class="line"></div>
      <div class="center small">Obrigado pela preferência!</div>
    `;
  };

  const handlePrintDraftReceipt = () => {
    if (receiptItems.length === 0) {
      alert('Inclua pelo menos um serviço ou produto para imprimir.');
      return;
    }

    openThermalPrint('Comprovante de recebimento', buildDraftReceiptPrintHtml());
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
        <div class="title">RECEBIMENTO</div>
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
      <div class="row total"><span>Total</span><span>${formatCurrency(receipt.totalAmount)}</span></div>
      <div class="row"><span>Pagamento</span><span>${escapeHtml(getPaymentLabel(receipt.paymentType))}</span></div>
      ${receipt.notes ? `<div class="line"></div><div class="small">Obs.: ${escapeHtml(receipt.notes)}</div>` : ''}
      <div class="line"></div>
      <div class="center small">Obrigado pela preferência!</div>
    `;

    openThermalPrint('Comprovante de recebimento', body);
  };

  const handlePrintDailySummary = () => {
    if (todayReceipts.length === 0 && todayExpenses.length === 0) {
      alert('Ainda não há movimentações no dia para imprimir.');
      return;
    }

    const paymentRows = todayTotalsByPayment
      .filter((item) => item.total > 0)
      .map((item) => `
        <div class="row"><span>${escapeHtml(getPaymentLabel(item.paymentType))}</span><span>${formatCurrency(item.total)}</span></div>
      `).join('');

    const receiptRows = todayReceipts.map((receipt) => `
      <div class="item">
        <div class="strong">${escapeHtml(receipt.clientName)}</div>
        <div class="row"><span>${escapeHtml(getPaymentLabel(receipt.paymentType))}</span><span>${formatCurrency(receipt.totalAmount)}</span></div>
      </div>
    `).join('');

    const expenseRows = todayExpenses.map((expense) => `
      <div class="item">
        <div class="strong">${escapeHtml(expense.description)}</div>
        <div class="row"><span>${escapeHtml(getPaymentLabel(expense.paymentType))}</span><span>- ${formatCurrency(expense.amount)}</span></div>
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

    openThermalPrint('Resumo de recebimentos do dia', body);
  };

  const handleConfirmReceipt = () => {
    const isManualReceipt = checkoutMode === 'manual';

    if (!isManualReceipt && !selectedAppointment) {
      alert('Selecione um atendimento para baixar o pagamento.');
      return;
    }

    if (receiptItems.length === 0) {
      alert('Inclua pelo menos um serviço ou produto no recebimento.');
      return;
    }

    const clientName = isManualReceipt
      ? manualMatchedClient?.name || manualClientName.trim() || 'Cliente balcão'
      : selectedAppointment?.clientName || selectedClient?.name || 'Cliente';
    const clientPhone = isManualReceipt
      ? manualMatchedClient?.phone ||
        normalizeManualPhone(manualClientPhone, defaultAreaCode)
      : selectedAppointment?.clientPhone || selectedClient?.phone || phoneSearch;

    if (!normalizePhone(clientPhone)) {
      alert('Informe o WhatsApp do cliente para concluir o recebimento.');
      return;
    }


    const paymentDetails = [
      structuredPayments.length > 1 ? 'Pagamento dividido:' : '',
      ...structuredPayments.map((payment) => {
        return `${getPaymentLabel(payment.paymentType)} ${formatCurrency(payment.amount)}`;
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

    onConfirmReceipt({
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

    setPrintAfterConfirmTitle('Comprovante de recebimento');
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
  };

  const handlePrintConfirmedReceipt = () => {
    if (printAfterConfirmHtml) {
      openThermalPrint(printAfterConfirmTitle, printAfterConfirmHtml);
    }

    setPrintAfterConfirmHtml(null);
  };

  const handleSkipConfirmedReceiptPrint = () => {
    setPrintAfterConfirmHtml(null);
  };

  const handleConfirmExpense = () => {
    if (!expenseDescription.trim()) {
      alert('Informe a descrição da despesa.');
      return;
    }

    if ((Number(expenseAmount) || 0) <= 0) {
      alert('Informe o valor da despesa.');
      return;
    }

    onConfirmExpense({
      description: expenseDescription.trim(),
      amount: Number(expenseAmount) || 0,
      paymentType: expensePaymentType,
      notes: expenseNotes
    });

    alert('Despesa lançada com sucesso.');
    handleBackToSearch();
  };

  const renderDraftItem = (item: ReceiptDraftItem) => {
    if (item.itemType === 'product') {
      const product = item.productId
        ? getProductById(products, item.productId)
        : undefined;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Number(item.unitPrice) || 0;

      return (
        <div
          key={item.id}
          className="rounded-2xl border border-orange-200 bg-orange-50/40 p-3"
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_100px_120px_120px_auto] lg:items-end">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">
                Produto
              </p>

              <select
                value={item.productId || ''}
                onChange={(event) => handleChangeProduct(item.id, event.target.value)}
                className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
              >
                {products
                  .filter((productOption) => productOption.active)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.code} • {option.description}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Quantidade
              </p>
              <input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(event) =>
                  handleChangeProductQuantity(item.id, Number(event.target.value))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-black outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Unitário
              </p>
              <p className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800">
                {formatCurrency(unitPrice)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Total
              </p>
              <p className="mt-1 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-black text-orange-700">
                {formatCurrency(item.price)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleRemoveExtra(item.id)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50"
              title={`Remover ${product?.description || 'produto'}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    }

    const service = getServiceById(services, item.serviceId);
    const professional = getProfessionalById(professionals, item.professionalId);
    const isEditableItem = item.itemType !== 'appointment';
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

    return (
      <div
        key={item.id}
        className="rounded-2xl border border-slate-200 bg-white p-3"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_120px_auto] gap-3 lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {item.itemType === 'appointment' ? 'Serviço prestado' : item.itemType === 'manual' ? 'Serviço manual' : 'Serviço extra'}
            </p>

            {isEditableItem ? (
              <select
                value={item.serviceId}
                onChange={(event) => handleChangeExtraService(item.id, event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#0f4c5c]"
              >
                {services.filter((serviceOption) => serviceOption.active).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <p className="mt-1 text-base font-black text-slate-950">
                  {serviceName}
                </p>
                {serviceDescription && (
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    {serviceDescription}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Profissional
            </p>

            {isEditableItem ? (
              <select
                value={item.professionalId}
                onChange={(event) => handleChangeExtraProfessional(item.id, event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#0f4c5c]"
              >
                {professionals.filter((professionalOption) => professionalOption.active).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm font-black text-slate-950">
                {professionalName}
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Valor
            </p>

            {isEditableItem ? (
              <input
                type="text"
                inputMode="numeric"
                value={formatCurrencyInput(item.price)}
                onChange={(event) => handleChangeExtraPrice(item.id, parseCurrencyInput(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-black outline-none focus:border-[#0f4c5c]"
              />
            ) : (
              <p className="mt-1 text-sm font-black text-slate-950">
                {formatCurrency(item.price)}
              </p>
            )}
          </div>

          {isEditableItem && (
            <button
              type="button"
              onClick={() => handleRemoveExtra(item.id)}
              className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
              title="Remover serviço extra"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderReceivableAppointmentCard = (appointment: Appointment) => {
    const serviceName = getAppointmentServiceName(appointment, services);
    const professionalName = getAppointmentProfessionalName(appointment, professionals);
    const serviceDescription = getAppointmentServiceDescription(appointment, services);
    const appointmentDate = getAppointmentDate(appointment);
    const isOverdue = appointmentDate < currentDayKey;

    return (
      <div
        key={appointment.id}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-sm transition hover:border-slate-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              {getAppointmentTime(appointment)} • {getReceivableStatusLabel(appointment.status)}
            </p>
            <h3 className="mt-1 text-base font-black text-slate-950 truncate">
              {appointment.clientName || 'Cliente'}
            </h3>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {formatPhoneForDisplay(appointment.clientPhone)}
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700">
            {formatCurrency(appointment.price)}
          </span>
        </div>

        <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-sm font-black text-slate-900 truncate">
            {serviceName}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 truncate">
            Profissional: {professionalName}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 truncate">
            {formatDateBr(appointmentDate)} às {getAppointmentTime(appointment)}
          </p>
          {serviceDescription && (
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
              {serviceDescription}
            </p>
          )}
        </div>

        {isOverdue && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[11px] font-bold text-amber-700">
              Valor antigo sem baixa. Priorize este recebimento.
            </p>
          </div>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => handleOpenCheckout(appointment.id)}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Baixar pagamento
          </button>
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsHistoryOpen((current) => !current)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-neutral-50 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            {isHistoryOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-neutral-950">
              Histórico de recebimentos do dia
            </h2>
            <p className="text-xs font-semibold text-neutral-500">
              Fica fechado para não poluir a tela. Clique para abrir o resumo do caixa.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs font-black text-neutral-700 shrink-0">
          {todayReceipts.length} recebimento(s)
        </span>
      </button>

      {isHistoryOpen && (
        <div className="border-t border-neutral-200">
          <div className="p-4 flex justify-end">
            <button
              type="button"
              onClick={handlePrintDailySummary}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir resumo do dia
            </button>
          </div>

          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 border-b border-neutral-100">
            <div className="rounded-2xl bg-neutral-950 text-white p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
                Recebido
              </p>
              <p className="text-lg font-black mt-1">
                {formatCurrency(totalReceivedToday)}
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 border border-red-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-400">
                Despesas
              </p>
              <p className="text-sm font-black text-red-700 mt-1">
                {formatCurrency(totalExpensesToday)}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">
                Saldo
              </p>
              <p className="text-sm font-black text-emerald-700 mt-1">
                {formatCurrency(dailyBalance)}
              </p>
            </div>

            {todayTotalsByPayment.map((item) => (
              <div key={item.paymentType} className="rounded-2xl bg-neutral-50 border border-neutral-200 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  {getPaymentLabel(item.paymentType)}
                </p>
                <p className="text-sm font-black text-neutral-950 mt-1">
                  {formatCurrency(item.total)}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 space-y-2">
            {todayReceipts.length === 0 && todayExpenses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                <p className="text-sm font-black text-neutral-700">
                  Nenhuma movimentação confirmada hoje.
                </p>
              </div>
            )}

            {todayReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="rounded-2xl border border-neutral-200 bg-white p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-neutral-950">
                    {receipt.clientName}
                  </p>
                  <p className="text-xs font-bold text-neutral-500">
                    {new Date(receipt.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' '}• {getPaymentLabel(receipt.paymentType)} • {receipt.items.length} item(ns)
                  </p>
                </div>

                <div className="flex flex-row gap-2 items-center justify-end">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-black text-emerald-700 text-center">
                    {formatCurrency(receipt.totalAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(receipt)}
                    className="h-9 w-9 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition flex items-center justify-center"
                    title="Imprimir"
                    aria-label="Imprimir recebimento"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {todayExpenses.map((expense) => (
              <div
                key={expense.id}
                className="rounded-2xl border border-red-100 bg-red-50 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-red-800">
                    {expense.description}
                  </p>
                  <p className="text-xs font-bold text-red-500">
                    {new Date(expense.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' '}• Despesa • {getPaymentLabel(expense.paymentType)}
                  </p>
                </div>

                <span className="rounded-full bg-white border border-red-200 px-3 py-1 text-xs font-black text-red-700 text-center">
                  - {formatCurrency(expense.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const canShowCheckout = checkoutMode === 'manual' || Boolean(selectedAppointment);

  if (isExpenseOpen) {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <button
            type="button"
            onClick={handleBackToSearch}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="text-left lg:text-right">
            <h1 className="text-2xl font-black tracking-tight text-neutral-950">
              Lançar despesa extra
            </h1>
            <p className="text-sm text-neutral-500 font-medium">
              Use para saída de caixa: compra rápida, vale, material ou despesa do dia.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden max-w-3xl">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-lg font-black text-neutral-950">
              Dados da despesa
            </h2>
            <p className="text-xs font-semibold text-neutral-500">
              Despesa reduz o saldo do caixa do dia, mas não entra como recebimento.
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                Descrição
              </label>
              <input
                value={expenseDescription}
                onChange={(event) => setExpenseDescription(event.target.value)}
                placeholder="Ex.: compra de toalhas, vale, material"
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                  Valor
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyInput(expenseAmount)}
                  onChange={(event) => setExpenseAmount(parseCurrencyInput(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-black outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 mb-2">
                  Forma de pagamento
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {expensePaymentOptions().map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setExpensePaymentType(option)}
                      className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                        expensePaymentType === option
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-orange-200'
                      }`}
                    >
                      {getPaymentLabel(option)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                Observações
              </label>
              <textarea
                value={expenseNotes}
                onChange={(event) => setExpenseNotes(event.target.value)}
                rows={3}
                placeholder="Observação opcional."
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-red-700">Saída do caixa</span>
              <span className="text-xl font-black text-red-700">- {formatCurrency(Number(expenseAmount) || 0)}</span>
            </div>

            <button
              type="button"
              onClick={handleConfirmExpense}
              className="w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar despesa
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (isCheckoutOpen) {
    const checkoutExtraItems =
      checkoutMode === 'appointment' ? extraItems : receiptItems;

    return (
      <section className="space-y-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1 bg-[#0f4c5c]" />
          <div className="relative flex min-h-[62px] items-center justify-center px-4 py-2.5">
            <button
              type="button"
              onClick={handleBackToSearch}
              className="absolute left-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#0f4c5c] px-3 py-2 text-xs font-black text-white transition hover:bg-[#123945]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
                AGENDASPEED • CAIXA
              </p>
              <h1 className="text-lg font-black tracking-tight text-neutral-950">
                Fechamento do pagamento
              </h1>
            </div>
          </div>
        </div>

        {checkoutMode === 'appointment' && !selectedAppointment && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
            <p className="text-sm font-black text-neutral-700">
              Nenhum atendimento selecionado.
            </p>
          </div>
        )}

        {canShowCheckout && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 bg-[#0f4c5c] px-4 py-2.5 text-white">
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight">
                  Resumo do recebimento
                </h2>
                <p className="text-[10px] font-semibold text-white/75">
                  Confira os itens, informe o pagamento e conclua a baixa.
                </p>
              </div>

              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                {formatCurrency(total)}
              </span>
            </div>

            <div className="space-y-3 p-3">
              {checkoutMode === 'appointment' && selectedAppointment && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.2fr_1.4fr_1fr_120px]">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Cliente
                    </p>
                    <p className="truncate text-sm font-black text-slate-950">
                      {selectedAppointment.clientName || 'Cliente'}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-slate-500">
                      {formatPhoneForDisplay(selectedAppointment.clientPhone || '')}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Serviço
                    </p>
                    <p className="truncate text-sm font-black text-slate-950">
                      {getAppointmentServiceName(selectedAppointment, services)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Profissional
                    </p>
                    <p className="truncate text-sm font-black text-slate-950">
                      {getAppointmentProfessionalName(selectedAppointment, professionals)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Atendimento
                    </p>
                    <p className="text-xs font-black text-slate-950">
                      {formatDateBr(getAppointmentDate(selectedAppointment))}
                    </p>
                    <p className="text-xs font-black text-[#0f4c5c]">
                      {getAppointmentTime(selectedAppointment)} • {formatCurrency(selectedAppointment.price)}
                    </p>
                  </div>
                </div>
              )}

              {checkoutMode === 'manual' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1.3fr]">
                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                        WhatsApp
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={manualClientPhone}
                        onChange={(event) => {
                          const nextPhone = formatManualPhoneInput(
                            event.target.value,
                            defaultAreaCode
                          );
                          const normalizedNextPhone = normalizeManualPhone(
                            nextPhone,
                            defaultAreaCode
                          );
                          const matchedClient = clients.find((client) => {
                            return normalizePhone(
                              client.phoneNormalized || client.phone || ''
                            ) === normalizedNextPhone;
                          });

                          setManualClientPhone(nextPhone);

                          if (matchedClient) {
                            setManualClientName(matchedClient.name);
                            setManualClientCpf(
                              formatCpfForDisplay(matchedClient.cpf || '')
                            );
                          }
                        }}
                        onBlur={() => {
                          const normalizedPhone = normalizeManualPhone(
                            manualClientPhone,
                            defaultAreaCode
                          );

                          if (normalizedPhone.length >= 10) {
                            setManualClientPhone(
                              formatPhoneForDisplay(normalizedPhone)
                            );
                          }
                        }}
                        placeholder={
                          defaultAreaCode
                            ? `(DDD opcional: ${defaultAreaCode})`
                            : '(99) 99999-9999'
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>

                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                        CPF (opcional)
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={manualClientCpf}
                        onChange={(event) => {
                          const nextCpf = formatCpfForDisplay(event.target.value);
                          const normalizedNextCpf = nextCpf.replace(/\D/g, '');
                          const matchedClient = clients.find((client) => {
                            return String(client.cpf || '').replace(/\D/g, '') === normalizedNextCpf;
                          });

                          setManualClientCpf(nextCpf);

                          if (matchedClient && normalizedNextCpf.length === 11) {
                            setManualClientName(matchedClient.name);
                            setManualClientPhone(
                              formatPhoneForDisplay(
                                clientPhoneForLookup(matchedClient)
                              )
                            );
                          }
                        }}
                        placeholder="000.000.000-00"
                        className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>

                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Nome do cliente
                      </span>
                      <input
                        value={manualClientName}
                        onChange={(event) => setManualClientName(event.target.value)}
                        placeholder="Nome do cliente"
                        className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>
                  </div>

                  {manualMatchedClient && (
                    <p className="mt-2 text-[11px] font-bold text-emerald-700">
                      Cliente localizado: {manualMatchedClient.name}
                    </p>
                  )}
                </div>
              )}

              {checkoutExtraItems.length > 0 && (
                <div className="space-y-2">
                  {checkoutExtraItems.map(renderDraftItem)}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAddExtraItem}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#0f4c5c]/20 bg-[#0f4c5c]/5 px-4 text-sm font-black text-[#0f4c5c] transition hover:bg-[#0f4c5c]/10"
                >
                  <Plus className="h-4 w-4" />
                  {checkoutMode === 'manual' ? 'Adicionar outro serviço' : 'Adicionar serviço extra'}
                </button>

                <button
                  type="button"
                  onClick={handleAddProductItem}
                  disabled={!products.some((product) => product.active)}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-black text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <Package className="h-4 w-4" />
                  Adicionar produto
                </button>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.45fr_0.8fr_0.85fr]">
                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Forma de pagamento
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {paymentOptions().map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => {
                            setPaymentType(option);
                            setUseSplitPayment(false);
                          }}
                          className={`h-9 rounded-xl border px-2 text-[11px] font-black transition ${
                            !useSplitPayment && paymentType === option
                              ? 'border-[#0f4c5c] bg-[#0f4c5c] text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-[#0f4c5c]/40'
                          }`}
                        >
                          {getPaymentLabel(option)}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setUseSplitPayment((current) => !current)}
                      className={`mt-2 h-9 w-full rounded-xl border px-3 text-[11px] font-black transition ${
                        useSplitPayment
                          ? 'border-[#0f4c5c] bg-[#0f4c5c]/10 text-[#0f4c5c]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-[#0f4c5c]/40'
                      }`}
                    >
                      Pagamento dividido
                    </button>

                    {!useSplitPayment && paymentType === 'dinheiro' && (
                      <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <label>
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                            Valor recebido
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatCurrencyInput(cashAmountPaid)}
                            onChange={(event) => setCashAmountPaid(parseCurrencyInput(event.target.value))}
                            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                          />
                        </label>
                        <div className="min-w-[100px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                          <p className="text-[9px] font-black uppercase text-slate-400">Troco</p>
                          <p className="text-sm font-black text-[#0f4c5c]">{formatCurrency(cashChange)}</p>
                        </div>
                      </div>
                    )}

                    {useSplitPayment && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            ['Dinheiro', splitCashAmount, setSplitCashAmount],
                            ['Pix', splitPixAmount, setSplitPixAmount],
                            ['Débito', splitDebitAmount, setSplitDebitAmount],
                            ['Crédito', splitCreditAmount, setSplitCreditAmount]
                          ].map(([label, value, setter]) => (
                            <label key={String(label)}>
                              <span className="text-[9px] font-black uppercase text-slate-500">
                                {String(label)}
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatCurrencyInput(Number(value))}
                                onChange={(event) =>
                                  (setter as React.Dispatch<React.SetStateAction<number>>)(
                                    parseCurrencyInput(event.target.value)
                                  )
                                }
                                className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold outline-none focus:border-[#0f4c5c]"
                              />
                            </label>
                          ))}
                        </div>
                        <div className="mt-2 flex justify-end gap-4 text-[11px] font-black text-slate-600">
                          <span>Restante: {formatCurrency(splitRemaining)}</span>
                          <span className="text-[#0f4c5c]">Troco: {formatCurrency(splitChange)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-rows-[auto_1fr] gap-2">
                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Desconto
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInput(discountValue)}
                        onChange={(event) => setDiscountValue(parseCurrencyInput(event.target.value))}
                        className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>

                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Observações
                      </span>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Observação opcional"
                        rows={2}
                        className="mt-1 min-h-[58px] w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Desconto</span>
                        <span>- {formatCurrency(normalizedDiscount)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-sm font-black text-slate-950">Total</span>
                        <span className="text-xl font-black text-[#0f4c5c]">{formatCurrency(total)}</span>
                      </div>
                      {structuredAmountPending > 0 && (
                        <div className="flex items-center justify-between text-xs font-black text-amber-700">
                          <span>Pendente</span>
                          <span>{formatCurrency(structuredAmountPending)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handlePrintDraftReceipt}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#0f4c5c]/20 bg-white px-3 text-xs font-black text-[#0f4c5c] transition hover:bg-[#0f4c5c]/5"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmReceipt}
                        disabled={receiptItems.length === 0}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0f4c5c] px-3 text-xs font-black text-white transition hover:bg-[#123945] disabled:bg-neutral-200 disabled:text-neutral-400"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {structuredAmountPending > 0 ? 'Salvar pendente' : 'Baixar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AGENDASPEED
            </p>
            <h1 className="text-lg font-black tracking-tight text-neutral-950">
              Recebimentos
            </h1>
          </div>

          <div className="flex w-full flex-col gap-2 lg:max-w-2xl lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={cashSearch}
                onChange={(event) => setCashSearch(event.target.value)}
                placeholder="Buscar por cliente, telefone, serviço ou profissional"
                className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm font-semibold text-neutral-700 outline-none focus:border-[#0f4c5c] focus:bg-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenManualReceipt}
                className="rounded-xl bg-[#0f4c5c] px-3 py-2 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Manual
              </button>

              <button
                type="button"
                onClick={handleOpenExpense}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                Despesa
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[360px]">
        <div className="bg-[#0f4c5c] px-4 py-3 text-white flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">
              Atendimentos para receber
            </h2>
            <p className="mt-0.5 text-[11px] font-semibold text-white/80">
              Selecione o atendimento e faça a baixa diretamente.
            </p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
            {receivableAppointmentsList.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
          {receivableAppointmentsList.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center xl:col-span-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-black text-neutral-800">
                Nenhum atendimento aguardando baixa.
              </p>
              <p className="text-xs font-semibold text-neutral-500 mt-1">
                Os atendimentos concluídos ou pendentes de pagamento aparecerão aqui.
              </p>
            </div>
          )}

          {receivableAppointmentsList.map((appointment) =>
            renderReceivableAppointmentCard(appointment)
          )}
        </div>
      </div>

      {renderHistory()}

      {printAfterConfirmHtml && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-neutral-950 text-center">
              Recebimento confirmado
            </h3>
            <p className="text-sm font-semibold text-neutral-500 text-center mt-2">
              Deseja imprimir o comprovante agora?
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={handlePrintConfirmedReceipt}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Sim
              </button>
              <button
                type="button"
                onClick={handleSkipConfirmedReceiptPrint}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 transition"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export type {
  ReceiptDraftItem,
  ReceiptPaymentDraft,
  ReceiptPayload
};
