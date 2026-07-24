/**
 * Tela Financeira do Painel do Dono - AgendaSpeed.
 *
 * Responsável por:
 * - analisar faturamento do período;
 * - analisar comissões da equipe;
 * - emitir relatório de livro caixa apenas com dinheiro;
 * - manter visual padronizado em azul petróleo.
 */

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Coins,
  FileText,
  Filter,
  History,
  Pencil,
  Plus,
  Printer,
  Trash2,
  WalletCards
} from 'lucide-react';

import {
  Appointment,
  CashExpense,
  PaymentType,
  Professional,
  Receipt,
  Service
} from '../../../types';

import {
  calculateProfessionalCommission,
  calculateProfessionalGrossRevenue,
  countProfessionalCompletedAppointments,
  formatCurrency,
  getPaymentLabel,
  getRemunerationLabel
} from '../owner.utils';

type FinanceInternalTab =
  | 'faturamento'
  | 'comissoes'
  | 'movimentacao'
  | 'livroCaixa'
  | 'despesas';

export interface CommissionPaymentPayload {
  professionalId: string;
  professionalName: string;
  periodStart: string;
  periodEnd: string;
  calculatedCommission: number;
  extraValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  paidAt: string;
  notes?: string;
}

export interface CommissionPaymentRecord {
  id: string;
  professionalId: string;
  professionalName: string;
  periodStart: string;
  periodEnd: string;
  calculatedCommission: number;
  extraValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  paidAt: string;
  notes?: string;
  createdAt?: string;
}

export interface ExpenseTemplateRecord {
  id: string;
  description: string;
  expectedAmount: number;
  dueDay?: number;
  dueDate?: string;
  isMonthly: boolean;
  active: boolean;
  notes?: string;
}

export interface ExpensePaymentRecord {
  id: string;
  expenseTemplateId?: string;
  description: string;
  competenceMonth: string;
  dueDate?: string;
  expectedAmount: number;
  interestValue: number;
  fineValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: string;
  notes?: string;
}

export interface ExpenseTemplatePayload {
  id?: string;
  description: string;
  expectedAmount: number;
  dueDay?: number;
  dueDate?: string;
  isMonthly: boolean;
  notes?: string;
}

export interface ExpensePaymentPayload {
  expenseTemplateId: string;
  description: string;
  competenceMonth: string;
  dueDate?: string;
  expectedAmount: number;
  interestValue: number;
  fineValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  paidAt: string;
  notes?: string;
}

export interface ExpensePaymentUpdatePayload {
  paymentId: string;
  expectedAmount: number;
  interestValue: number;
  fineValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  paidAt: string;
  notes?: string;
}

export interface FinanceViewProps {
  professionals: Professional[];
  services: Service[];
  completedAppointments: Appointment[];
  receipts?: Receipt[];
  cashExpenses: CashExpense[];
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  commissionPayments?: CommissionPaymentRecord[];
  expenseTemplates?: ExpenseTemplateRecord[];
  expensePayments?: ExpensePaymentRecord[];
  onPayCommission?: (
    payload: CommissionPaymentPayload
  ) => void | Promise<void>;
  onUpdateCommissionPaidAt?: (
    paymentId: string,
    paidAt: string
  ) => void | Promise<void>;
  onSaveExpenseTemplate?: (
    payload: ExpenseTemplatePayload
  ) => void | Promise<void>;
  onDeleteExpenseTemplate?: (
    expenseTemplateId: string
  ) => void | Promise<void>;
  onPayExpense?: (
    payload: ExpensePaymentPayload
  ) => void | Promise<void>;
  onUpdateExpensePayment?: (
    payload: ExpensePaymentUpdatePayload
  ) => void | Promise<void>;
  onDeleteExpensePayment?: (
    paymentId: string
  ) => void | Promise<void>;
}

interface FinancePeriod {
  startDate: string;
  endDate: string;
}

interface CashBookRow {
  date: string;
  type: 'recebimento' | 'despesa';
  description: string;
  value: number;
}

interface FinancialMovementRow {
  id: string;
  date: string;
  type: 'recebimento' | 'despesa' | 'cortesia';
  description: string;
  paymentType: PaymentType;
  entryValue: number;
  exitValue: number;
}

interface CommissionRow {
  professional: Professional;
  completedCount: number;
  totalProduced: number;
  commissionValue: number;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function formatLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}

function getCurrentMonthPeriod(): FinancePeriod {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    startDate: formatLocalDateStr(startDate),
    endDate: formatLocalDateStr(endDate)
  };
}

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

function getInclusivePeriodDays(period: FinancePeriod): number {
  if (!period.startDate || !period.endDate) {
    return 0;
  }

  const startDate = new Date(`${period.startDate}T00:00:00Z`);
  const endDate = new Date(`${period.endDate}T00:00:00Z`);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate < startDate
  ) {
    return 0;
  }

  return Math.floor(
    (endDate.getTime() - startDate.getTime()) / 86400000
  ) + 1;
}

function formatEmissionDate(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date());
}

function getAppointmentDateStr(dateTime: string): string {
  if (!dateTime || !dateTime.includes('T')) {
    return '';
  }

  return dateTime.split('T')[0];
}

function getSaoPauloDateStr(dateValue?: string): string {
  if (!dateValue) {
    return '';
  }

  const normalizedValue = dateValue.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const normalizedTimestamp = normalizedValue.replace(
    /^(\d{4}-\d{2}-\d{2})\s/,
    '$1T'
  );
  const hasExplicitTimezone =
    /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(normalizedTimestamp);
  const timestampToParse =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalizedTimestamp) &&
    !hasExplicitTimezone
      ? `${normalizedTimestamp}Z`
      : normalizedTimestamp;
  const parsedDate = new Date(timestampToParse);

  if (Number.isNaN(parsedDate.getTime())) {
    return normalizedValue.slice(0, 10);
  }

  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(parsedDate);

  const year = dateParts.find((part) => part.type === 'year')?.value;
  const month = dateParts.find((part) => part.type === 'month')?.value;
  const day = dateParts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return normalizedValue.slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function getCashBookStorageKey(period: FinancePeriod): string {
  const monthKey = period.startDate.slice(0, 7) || 'geral';

  return `agendaspeed-cashbook-initial-balance-${monthKey}`;
}

function parseCurrencyInput(value: string): number {
  const onlyNumbers = value.replace(/\D/g, '');

  if (!onlyNumbers) {
    return 0;
  }

  return Number(onlyNumbers) / 100;
}

function formatCurrencyInput(value: number): string {
  return formatCurrency(Number(value) || 0);
}

function calculateRoundedPercentage(
  value: number,
  total: number
): number {
  const normalizedValue = Number(value) || 0;
  const normalizedTotal = Number(total) || 0;

  if (normalizedTotal <= 0 || normalizedValue <= 0) {
    return 0;
  }

  return Math.round((normalizedValue / normalizedTotal) * 100);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getServiceName(
  services: Service[],
  serviceId: string
): string {
  const service = services.find((item) => item.id === serviceId);

  return service?.name || 'Serviço personalizado';
}

function buildEstablishmentPrintHeader(params: {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  reportTitle: string;
  period: FinancePeriod;
}) {
  const {
    companyName,
    companyAddress,
    companyPhone,
    reportTitle,
    period
  } = params;

  return `
    <div class="header">
      <h1>${escapeHtml(companyName || 'AgendaSpeed')}</h1>
      ${companyAddress ? `<p>Endereço: ${escapeHtml(companyAddress)}</p>` : ''}
      ${companyPhone ? `<p>Telefone: ${escapeHtml(companyPhone)}</p>` : ''}
      <h2>${escapeHtml(reportTitle)}</h2>
      <p>Período: ${formatDateBr(period.startDate)} a ${formatDateBr(period.endDate)}</p>
      <p>Data da emissão: ${formatEmissionDate()}</p>
    </div>
  `;
}

function buildPrintWindow(params: {
  title: string;
  body: string;
  thermal?: boolean;
}) {
  const { title, body, thermal = false } = params;

  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
    return;
  }

  const width = thermal ? '80mm' : '210mm';
  const fontSize = thermal ? '11px' : '12px';
  const pageSize = thermal ? '80mm auto' : 'A4';
  const margin = thermal ? '4mm' : '14mm';

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${pageSize};
            margin: ${margin};
          }

          * {
            box-sizing: border-box;
          }

          body {
            width: ${width};
            margin: 0 auto;
            padding-top: 12mm;
            font-family: Arial, sans-serif;
            color: #111827;
            font-size: ${fontSize};
            background: #fff;
          }

          h1, h2, h3, p {
            margin: 0;
          }

          h1 {
            font-size: 18px;
            text-align: center;
            text-transform: uppercase;
          }

          h2 {
            margin-top: 12px;
            font-size: 15px;
            text-align: center;
            text-transform: uppercase;
          }

          p {
            font-size: 11px;
            color: #475569;
            text-align: center;
            margin-top: 3px;
          }

          .header {
            border-bottom: 2px solid #0f4c5c;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 5px;
            text-align: left;
            vertical-align: top;
          }

          th {
            font-size: 10px;
            text-transform: uppercase;
            background: #0f4c5c;
            color: #fff;
          }

          .right {
            text-align: right;
          }

          .negative {
            color: #b91c1c;
            font-weight: 700;
          }

          .positive {
            color: #0f4c5c;
            font-weight: 700;
          }

          .summary {
            margin-top: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 700;
          }

          .summary-row:last-child {
            border-bottom: none;
            background: #f8fafc;
            color: #0f4c5c;
            font-size: 14px;
          }
        </style>
      </head>

      <body>
        ${body}
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 350);
}

export function useFinanceViewModel({
  professionals,
  services,
  completedAppointments,
  receipts = [],
  cashExpenses,
  companyName,
  companyAddress,
  companyPhone,
  commissionPayments = [],
  expenseTemplates = [],
  expensePayments = [],
  onPayCommission,
  onUpdateCommissionPaidAt,
  onSaveExpenseTemplate,
  onDeleteExpenseTemplate,
  onPayExpense,
  onUpdateExpensePayment,
  onDeleteExpensePayment
}: FinanceViewProps) {
  const initialPeriod = useMemo(() => {
    return getCurrentMonthPeriod();
  }, []);

  const [activeFinanceTab, setActiveFinanceTab] =
    useState<FinanceInternalTab | null>(null);

  const [period, setPeriod] =
    useState<FinancePeriod>(initialPeriod);

  const [draftPeriod, setDraftPeriod] =
    useState<FinancePeriod>(initialPeriod);

  const [initialCashBalance, setInitialCashBalance] = useState<number>(() => {
    const storedValue = localStorage.getItem(getCashBookStorageKey(initialPeriod));

    return storedValue ? Number(storedValue) || 0 : 0;
  });

  const [selectedCommissionRow, setSelectedCommissionRow] =
    useState<CommissionRow | null>(null);
  const [commissionPaidAt, setCommissionPaidAt] = useState(
    formatLocalDateStr(new Date())
  );
  const [commissionPaymentType, setCommissionPaymentType] =
    useState<PaymentType>('dinheiro');
  const [commissionExtraValue, setCommissionExtraValue] = useState(0);
  const [commissionDiscountValue, setCommissionDiscountValue] = useState(0);
  const [commissionNotes, setCommissionNotes] = useState('');
  const [isSavingCommissionPayment, setIsSavingCommissionPayment] =
    useState(false);
  const [commissionFeedback, setCommissionFeedback] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [pendingCommissionPrintHtml, setPendingCommissionPrintHtml] =
    useState('');

  const [showCommissionHistory, setShowCommissionHistory] = useState(false);
  const [editingPaidCommission, setEditingPaidCommission] =
    useState<CommissionPaymentRecord | null>(null);
  const [editedCommissionPaidAt, setEditedCommissionPaidAt] = useState('');
  const [isUpdatingCommissionPaidAt, setIsUpdatingCommissionPaidAt] =
    useState(false);

  const [editingExpenseTemplate, setEditingExpenseTemplate] =
    useState<ExpenseTemplateRecord | null>(null);
  const [showExpenseTemplateModal, setShowExpenseTemplateModal] =
    useState(false);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseExpectedAmount, setExpenseExpectedAmount] = useState(0);
  const [expenseDueDay, setExpenseDueDay] = useState('');
  const [expenseDueDate, setExpenseDueDate] = useState('');
  const [expenseIsMonthly, setExpenseIsMonthly] = useState(true);
  const [expenseTemplateNotes, setExpenseTemplateNotes] = useState('');
  const [isSavingExpenseTemplate, setIsSavingExpenseTemplate] =
    useState(false);
  const [expenseTemplateToDelete, setExpenseTemplateToDelete] =
    useState<ExpenseTemplateRecord | null>(null);
  const [isDeletingExpenseTemplate, setIsDeletingExpenseTemplate] =
    useState(false);
  const [expenseToPay, setExpenseToPay] =
    useState<ExpenseTemplateRecord | null>(null);
  const [expensePaidAt, setExpensePaidAt] = useState(
    formatLocalDateStr(new Date())
  );
  const [expensePaymentType, setExpensePaymentType] =
    useState<PaymentType>('dinheiro');
  const [expenseInterestValue, setExpenseInterestValue] = useState(0);
  const [expenseFineValue, setExpenseFineValue] = useState(0);
  const [expenseDiscountValue, setExpenseDiscountValue] = useState(0);
  const [expensePaymentNotes, setExpensePaymentNotes] = useState('');
  const [isPayingExpense, setIsPayingExpense] = useState(false);
  const [editingExpensePayment, setEditingExpensePayment] =
    useState<ExpensePaymentRecord | null>(null);
  const [isUpdatingExpensePayment, setIsUpdatingExpensePayment] =
    useState(false);
  const [expensePaymentToDelete, setExpensePaymentToDelete] =
    useState<ExpensePaymentRecord | null>(null);
  const [isDeletingExpensePayment, setIsDeletingExpensePayment] =
    useState(false);
  const [expenseFeedback, setExpenseFeedback] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const draftPeriodDays = getInclusivePeriodDays(draftPeriod);
  const periodDays = getInclusivePeriodDays(period);

  const isInvalidDraftPeriod =
    Boolean(draftPeriod.startDate && draftPeriod.endDate) &&
    draftPeriod.startDate > draftPeriod.endDate;

  const isDraftPeriodTooLong =
    Boolean(draftPeriod.startDate && draftPeriod.endDate) &&
    draftPeriodDays > 31;

  const isInvalidPeriod =
    Boolean(period.startDate && period.endDate) &&
    period.startDate > period.endDate;

  const isPeriodTooLong =
    Boolean(period.startDate && period.endDate) &&
    periodDays > 31;

  const filteredAppointments = useMemo(() => {
    if (isInvalidPeriod || isPeriodTooLong) {
      return [];
    }

    return completedAppointments.filter((appointment) => {
      const appointmentDate = getAppointmentDateStr(appointment.dateTime);

      if (!appointmentDate) {
        return false;
      }

      return (
        appointmentDate >= period.startDate &&
        appointmentDate <= period.endDate
      );
    });
  }, [
    completedAppointments,
    isInvalidPeriod,
    isPeriodTooLong,
    period
  ]);

  const filteredCashExpenses = useMemo(() => {
    if (isInvalidPeriod || isPeriodTooLong) {
      return [];
    }

    return cashExpenses.filter((expense) => {
      const expenseDate = getAppointmentDateStr(expense.paidAt) || expense.paidAt.slice(0, 10);

      return (
        expense.status === 'paid' &&
        expenseDate >= period.startDate &&
        expenseDate <= period.endDate
      );
    });
  }, [
    cashExpenses,
    isInvalidPeriod,
    isPeriodTooLong,
    period
  ]);

  const totalRevenue = useMemo(() => {
    return filteredAppointments.reduce((sum, appointment) => {
      return sum + appointment.price;
    }, 0);
  }, [filteredAppointments]);

  const totalCommissions = useMemo(() => {
    return filteredAppointments.reduce((sum, appointment) => {
      return sum + appointment.commissionValue;
    }, 0);
  }, [filteredAppointments]);

  const serviceRevenueRows = useMemo(() => {
    const map = new Map<string, {
      serviceId: string;
      serviceName: string;
      quantity: number;
      unitValue: number;
      total: number;
    }>();

    filteredAppointments.forEach((appointment) => {
      const current = map.get(appointment.serviceId);
      const service = services.find((item) => item.id === appointment.serviceId);

      if (current) {
        current.quantity += 1;
        current.total += appointment.price;
        current.unitValue = current.total / current.quantity;
        return;
      }

      map.set(appointment.serviceId, {
        serviceId: appointment.serviceId,
        serviceName: service?.name || 'Serviço personalizado',
        quantity: 1,
        unitValue: service?.price || appointment.price,
        total: appointment.price
      });
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        percentage: calculateRoundedPercentage(row.total, totalRevenue)
      }))
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return a.serviceName.localeCompare(b.serviceName);
      });
  }, [
    filteredAppointments,
    services,
    totalRevenue
  ]);

  const paymentRevenueRows = useMemo(() => {
    const paymentTypes = [
      'pix',
      'dinheiro',
      'credito',
      'debito',
      'cortesia'
    ];

    return paymentTypes.map((paymentType) => {
      const total = filteredAppointments
        .filter((appointment) => appointment.paymentType === paymentType)
        .reduce((sum, appointment) => sum + appointment.price, 0);

      return {
        paymentType,
        total,
        percentage: calculateRoundedPercentage(total, totalRevenue)
      };
    });
  }, [filteredAppointments, totalRevenue]);

  const professionalRevenueRows = useMemo(() => {
    return professionals
      .map((professional) => {
        const total = filteredAppointments
          .filter((appointment) => appointment.professionalId === professional.id)
          .reduce((sum, appointment) => sum + appointment.price, 0);

        return {
          professional,
          total,
          percentage: calculateRoundedPercentage(total, totalRevenue)
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return a.professional.name.localeCompare(b.professional.name);
      });
  }, [
    filteredAppointments,
    professionals
  ]);

  const filteredReceipts = useMemo(() => {
    if (isInvalidPeriod || isPeriodTooLong) {
      return [];
    }

    return receipts.filter((receipt) => {
      const receiptDate = getSaoPauloDateStr(receipt.paidAt);

      return (
        receipt.status !== 'cancelled' &&
        receiptDate >= period.startDate &&
        receiptDate <= period.endDate
      );
    });
  }, [
    isInvalidPeriod,
    isPeriodTooLong,
    period,
    receipts
  ]);

  const productRevenueRows = useMemo(() => {
    const productMap = new Map<string, {
      productId: string;
      code: string;
      description: string;
      quantity: number;
      total: number;
      unitValue: number;
    }>();

    filteredReceipts.forEach((receipt) => {
      receipt.items
        .filter((item) => item.itemType === 'product')
        .forEach((item) => {
          const productId = item.productId || item.itemDescription || item.id;
          const quantity = Math.max(1, Number(item.quantity) || 1);
          const total = Number(item.price) || 0;
          const current = productMap.get(productId);

          if (current) {
            current.quantity += quantity;
            current.total += total;
            current.unitValue =
              current.quantity > 0 ? current.total / current.quantity : 0;
            return;
          }

          productMap.set(productId, {
            productId,
            code: '',
            description:
              item.itemDescription ||
              item.serviceName ||
              'Produto',
            quantity,
            total,
            unitValue:
              Number(item.unitPrice) ||
              (quantity > 0 ? total / quantity : 0)
          });
        });
    });

    const totalProductsRevenue = Array.from(productMap.values()).reduce(
      (sum, row) => sum + row.total,
      0
    );

    return Array.from(productMap.values())
      .map((row) => ({
        ...row,
        percentage: calculateRoundedPercentage(
          row.total,
          totalProductsRevenue
        )
      }))
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return a.description.localeCompare(b.description);
      });
  }, [filteredReceipts]);

  const totalProductsRevenue = useMemo(() => {
    return productRevenueRows.reduce((sum, row) => sum + row.total, 0);
  }, [productRevenueRows]);

  const totalGrossRevenue = totalRevenue + totalProductsRevenue;

  const commissionRows = useMemo<CommissionRow[]>(() => {
    return professionals
      .map((professional) => {
        const completedCount = countProfessionalCompletedAppointments({
          professionalId: professional.id,
          completedAppointments: filteredAppointments
        });

        const totalProduced = calculateProfessionalGrossRevenue({
          professionalId: professional.id,
          completedAppointments: filteredAppointments
        });

        const commissionValue = calculateProfessionalCommission({
          professional,
          services,
          completedAppointments: filteredAppointments
        });

        return {
          professional,
          completedCount,
          totalProduced,
          commissionValue
        };
      })
      .sort((a, b) => {
        return a.professional.name.localeCompare(b.professional.name);
      });
  }, [
    filteredAppointments,
    professionals,
    services
  ]);

  const filteredCommissionPayments = useMemo(() => {
    return commissionPayments
      .filter((payment) => {
        return (
          payment.periodStart >= period.startDate &&
          payment.periodEnd <= period.endDate
        );
      })
      .sort((firstPayment, secondPayment) => {
        return secondPayment.paidAt.localeCompare(firstPayment.paidAt);
      });
  }, [commissionPayments, period]);

  const commissionPaymentByProfessionalId = useMemo(() => {
    const paymentMap = new Map<string, CommissionPaymentRecord>();

    commissionPayments.forEach((payment) => {
      const overlapsSelectedPeriod =
        payment.periodStart <= period.endDate &&
        payment.periodEnd >= period.startDate;

      if (overlapsSelectedPeriod && !paymentMap.has(payment.professionalId)) {
        paymentMap.set(payment.professionalId, payment);
      }
    });

    return paymentMap;
  }, [commissionPayments, period]);

  const commissionAmountToPay = selectedCommissionRow
    ? Math.max(
        0,
        selectedCommissionRow.commissionValue +
          commissionExtraValue -
          commissionDiscountValue
      )
    : 0;

  const resetCommissionPaymentForm = () => {
    setSelectedCommissionRow(null);
    setCommissionPaidAt(formatLocalDateStr(new Date()));
    setCommissionPaymentType('dinheiro');
    setCommissionExtraValue(0);
    setCommissionDiscountValue(0);
    setCommissionNotes('');
  };

  const handleOpenCommissionPayment = (row: CommissionRow) => {
    setSelectedCommissionRow(row);
    setCommissionPaidAt(formatLocalDateStr(new Date()));
    setCommissionPaymentType('dinheiro');
    setCommissionExtraValue(0);
    setCommissionDiscountValue(0);
    setCommissionNotes('');
  };

  const handleOpenPaidCommission = (
    payment: CommissionPaymentRecord
  ) => {
    setEditingPaidCommission(payment);
    setEditedCommissionPaidAt(payment.paidAt);
  };

  const handleConfirmCommissionPaidAtUpdate = async () => {
    if (
      !editingPaidCommission ||
      !editedCommissionPaidAt ||
      isUpdatingCommissionPaidAt
    ) {
      return;
    }

    if (!onUpdateCommissionPaidAt) {
      setCommissionFeedback({
        title: 'Integração pendente',
        message:
          'A alteração da data ainda precisa ser conectada ao Supabase pelo painel do dono.'
      });
      return;
    }

    setIsUpdatingCommissionPaidAt(true);

    try {
      await onUpdateCommissionPaidAt(
        editingPaidCommission.id,
        editedCommissionPaidAt
      );

      setEditingPaidCommission(null);
      setEditedCommissionPaidAt('');
      setCommissionFeedback({
        title: 'Data atualizada',
        message: 'A data do pagamento da comissão foi atualizada com sucesso.'
      });
    } catch (error) {
      setCommissionFeedback({
        title: 'Data não atualizada',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar a data do pagamento.'
      });
    } finally {
      setIsUpdatingCommissionPaidAt(false);
    }
  };

  const buildCommissionPaymentPrintHtml = (
    row: CommissionRow,
    payload: CommissionPaymentPayload
  ) => {
    return `
      ${buildEstablishmentPrintHeader({
        companyName,
        companyAddress,
        companyPhone,
        reportTitle: 'Comprovante de Pagamento de Comissão',
        period: {
          startDate: payload.periodStart,
          endDate: payload.periodEnd
        }
      })}

      <table>
        <tbody>
          <tr>
            <th>Profissional</th>
            <td>${escapeHtml(row.professional.name)}</td>
          </tr>
          <tr>
            <th>Data do pagamento</th>
            <td>${formatDateBr(payload.paidAt)}</td>
          </tr>
          <tr>
            <th>Forma de pagamento</th>
            <td>${escapeHtml(getPaymentLabel(payload.paymentType))}</td>
          </tr>
          <tr>
            <th>Atendimentos</th>
            <td>${row.completedCount}</td>
          </tr>
          <tr>
            <th>Produção</th>
            <td>${formatCurrency(row.totalProduced)}</td>
          </tr>
          <tr>
            <th>Comissão calculada</th>
            <td>${formatCurrency(payload.calculatedCommission)}</td>
          </tr>
          <tr>
            <th>Extra</th>
            <td>${formatCurrency(payload.extraValue)}</td>
          </tr>
          <tr>
            <th>Desconto</th>
            <td>${formatCurrency(payload.discountValue)}</td>
          </tr>
          <tr>
            <th>Total pago</th>
            <td><strong>${formatCurrency(payload.amountPaid)}</strong></td>
          </tr>
          ${
            payload.notes
              ? `<tr><th>Observações</th><td>${escapeHtml(payload.notes)}</td></tr>`
              : ''
          }
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row">
          <span>Recebi o valor acima informado.</span>
        </div>
        <div class="summary-row">
          <span>Assinatura: ______________________________</span>
        </div>
      </div>
    `;
  };

  const handleConfirmCommissionPayment = async () => {
    if (!selectedCommissionRow || isSavingCommissionPayment) {
      return;
    }

    if (!commissionPaidAt) {
      setCommissionFeedback({
        title: 'Data obrigatória',
        message: 'Informe a data do pagamento da comissão.'
      });
      return;
    }

    if (commissionAmountToPay <= 0) {
      setCommissionFeedback({
        title: 'Valor inválido',
        message: 'O valor final da comissão precisa ser maior que zero.'
      });
      return;
    }

    if (!onPayCommission) {
      setCommissionFeedback({
        title: 'Integração pendente',
        message:
          'O formulário está pronto, mas ainda precisa ser conectado ao Supabase pelo painel do dono.'
      });
      return;
    }

    const payload: CommissionPaymentPayload = {
      professionalId: selectedCommissionRow.professional.id,
      professionalName: selectedCommissionRow.professional.name,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      calculatedCommission: selectedCommissionRow.commissionValue,
      extraValue: commissionExtraValue,
      discountValue: commissionDiscountValue,
      amountPaid: commissionAmountToPay,
      paymentType: commissionPaymentType,
      paidAt: commissionPaidAt,
      notes: commissionNotes.trim() || undefined
    };

    setIsSavingCommissionPayment(true);

    try {
      await onPayCommission(payload);

      setPendingCommissionPrintHtml(
        buildCommissionPaymentPrintHtml(selectedCommissionRow, payload)
      );
      resetCommissionPaymentForm();
      setCommissionFeedback({
        title: 'Comissão paga',
        message:
          'O pagamento foi registrado com sucesso. Você já pode imprimir o comprovante.'
      });
    } catch (error) {
      setCommissionFeedback({
        title: 'Pagamento não concluído',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível registrar o pagamento da comissão.'
      });
    } finally {
      setIsSavingCommissionPayment(false);
    }
  };

  const handlePrintSavedCommissionPayment = () => {
    if (!pendingCommissionPrintHtml) {
      return;
    }

    buildPrintWindow({
      title: 'Comprovante de Comissão',
      thermal: true,
      body: pendingCommissionPrintHtml
    });

    setPendingCommissionPrintHtml('');
    setCommissionFeedback(null);
  };

  const competenceMonth = `${period.startDate.slice(0, 7)}-01`;

  const expensePaymentByTemplateId = useMemo(() => {
    const paymentMap = new Map<string, ExpensePaymentRecord>();

    expensePayments.forEach((payment) => {
      if (
        payment.expenseTemplateId &&
        payment.competenceMonth === competenceMonth &&
        payment.status !== 'cancelled'
      ) {
        paymentMap.set(payment.expenseTemplateId, payment);
      }
    });

    return paymentMap;
  }, [competenceMonth, expensePayments]);

  const expenseRows = useMemo(() => {
    return expenseTemplates
      .filter((template) => template.active)
      .map((template) => {
        const payment = expensePaymentByTemplateId.get(template.id);
        const dueDate = template.isMonthly
          ? (
              template.dueDay
                ? `${competenceMonth.slice(0, 8)}${String(template.dueDay).padStart(2, '0')}`
                : ''
            )
          : (template.dueDate || '');

        return {
          template,
          payment,
          dueDate
        };
      })
      .sort((firstRow, secondRow) => {
        const firstDueDay = firstRow.template.dueDay || 32;
        const secondDueDay = secondRow.template.dueDay || 32;

        if (firstDueDay !== secondDueDay) {
          return firstDueDay - secondDueDay;
        }

        return firstRow.template.description.localeCompare(
          secondRow.template.description,
          'pt-BR'
        );
      });
  }, [
    competenceMonth,
    expensePaymentByTemplateId,
    expenseTemplates
  ]);

  const expensePaymentTotal = expenseToPay
    ? Math.max(
        0,
        expenseToPay.expectedAmount +
          expenseInterestValue +
          expenseFineValue -
          expenseDiscountValue
      )
    : 0;

  const resetExpenseTemplateForm = () => {
    setEditingExpenseTemplate(null);
    setShowExpenseTemplateModal(false);
    setExpenseDescription('');
    setExpenseExpectedAmount(0);
    setExpenseDueDay('');
    setExpenseDueDate('');
    setExpenseIsMonthly(true);
    setExpenseTemplateNotes('');
  };

  const handleOpenNewExpenseTemplate = () => {
    resetExpenseTemplateForm();
    setShowExpenseTemplateModal(true);
  };

  const handleOpenEditExpenseTemplate = (
    template: ExpenseTemplateRecord
  ) => {
    setEditingExpenseTemplate(template);
    setExpenseDescription(template.description);
    setExpenseExpectedAmount(template.expectedAmount);
    setExpenseDueDay(
      template.dueDay ? String(template.dueDay) : ''
    );
    setExpenseDueDate(template.dueDate || '');
    setExpenseIsMonthly(template.isMonthly);
    setExpenseTemplateNotes(template.notes || '');
    setShowExpenseTemplateModal(true);
  };

  const handleSaveExpenseTemplate = async () => {
    if (isSavingExpenseTemplate) {
      return;
    }

    const normalizedDescription = expenseDescription.trim();

    if (!normalizedDescription) {
      setExpenseFeedback({
        title: 'Descrição obrigatória',
        message: 'Informe o nome da despesa.'
      });
      return;
    }

    if (expenseExpectedAmount < 0) {
      setExpenseFeedback({
        title: 'Valor inválido',
        message: 'O valor previsto da despesa não pode ser negativo.'
      });
      return;
    }

    const normalizedDueDay =
      expenseIsMonthly && expenseDueDay
        ? Number(expenseDueDay)
        : undefined;

    const normalizedDueDate =
      !expenseIsMonthly && expenseDueDate
        ? expenseDueDate
        : undefined;

    if (
      expenseIsMonthly &&
      normalizedDueDay !== undefined &&
      (normalizedDueDay < 1 || normalizedDueDay > 31)
    ) {
      setExpenseFeedback({
        title: 'Vencimento inválido',
        message: 'O dia do vencimento deve estar entre 1 e 31.'
      });
      return;
    }

    if (!expenseIsMonthly && !normalizedDueDate) {
      setExpenseFeedback({
        title: 'Data obrigatória',
        message: 'Informe a data completa da despesa eventual.'
      });
      return;
    }

    if (!onSaveExpenseTemplate) {
      setExpenseFeedback({
        title: 'Integração pendente',
        message:
          'O formulário está pronto, mas ainda precisa ser conectado ao Supabase pelo painel do dono.'
      });
      return;
    }

    setIsSavingExpenseTemplate(true);

    try {
      await onSaveExpenseTemplate({
        id: editingExpenseTemplate?.id,
        description: normalizedDescription,
        expectedAmount: expenseExpectedAmount,
        dueDay: normalizedDueDay,
        dueDate: normalizedDueDate,
        isMonthly: expenseIsMonthly,
        notes: expenseTemplateNotes.trim() || undefined
      });

      resetExpenseTemplateForm();
      setExpenseFeedback({
        title: editingExpenseTemplate
          ? 'Despesa alterada'
          : 'Despesa incluída',
        message: 'O cadastro da despesa foi salvo com sucesso.'
      });
    } catch (error) {
      setExpenseFeedback({
        title: 'Despesa não salva',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a despesa.'
      });
    } finally {
      setIsSavingExpenseTemplate(false);
    }
  };

  const handleConfirmDeleteExpenseTemplate = async () => {
    if (
      !expenseTemplateToDelete ||
      isDeletingExpenseTemplate
    ) {
      return;
    }

    if (!onDeleteExpenseTemplate) {
      setExpenseFeedback({
        title: 'Integração pendente',
        message:
          'A exclusão ainda precisa ser conectada ao Supabase pelo painel do dono.'
      });
      return;
    }

    setIsDeletingExpenseTemplate(true);

    try {
      await onDeleteExpenseTemplate(expenseTemplateToDelete.id);
      setExpenseTemplateToDelete(null);
      setExpenseFeedback({
        title: 'Despesa excluída',
        message: 'O cadastro foi removido com sucesso.'
      });
    } catch (error) {
      setExpenseFeedback({
        title: 'Despesa não excluída',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir a despesa.'
      });
    } finally {
      setIsDeletingExpenseTemplate(false);
    }
  };

  const resetExpensePaymentForm = () => {
    setExpenseToPay(null);
    setExpensePaidAt(formatLocalDateStr(new Date()));
    setExpensePaymentType('dinheiro');
    setExpenseInterestValue(0);
    setExpenseFineValue(0);
    setExpenseDiscountValue(0);
    setExpensePaymentNotes('');
  };

  const handleOpenExpensePayment = (
    template: ExpenseTemplateRecord
  ) => {
    setExpenseToPay(template);
    setExpensePaidAt(formatLocalDateStr(new Date()));
    setExpensePaymentType('dinheiro');
    setExpenseInterestValue(0);
    setExpenseFineValue(0);
    setExpenseDiscountValue(0);
    setExpensePaymentNotes('');
  };

  const handleConfirmExpensePayment = async () => {
    if (!expenseToPay || isPayingExpense) {
      return;
    }

    if (!expensePaidAt) {
      setExpenseFeedback({
        title: 'Data obrigatória',
        message: 'Informe a data do pagamento.'
      });
      return;
    }

    if (expensePaymentTotal <= 0) {
      setExpenseFeedback({
        title: 'Valor inválido',
        message: 'O valor final da despesa precisa ser maior que zero.'
      });
      return;
    }

    if (!onPayExpense) {
      setExpenseFeedback({
        title: 'Integração pendente',
        message:
          'O pagamento está pronto, mas ainda precisa ser conectado ao Supabase pelo painel do dono.'
      });
      return;
    }

    const dueDate = expenseToPay.isMonthly
      ? (
          expenseToPay.dueDay
            ? `${competenceMonth.slice(0, 8)}${String(
                Math.min(expenseToPay.dueDay, 28)
              ).padStart(2, '0')}`
            : undefined
        )
      : expenseToPay.dueDate;

    setIsPayingExpense(true);

    try {
      await onPayExpense({
        expenseTemplateId: expenseToPay.id,
        description: expenseToPay.description,
        competenceMonth,
        dueDate,
        expectedAmount: expenseToPay.expectedAmount,
        interestValue: expenseInterestValue,
        fineValue: expenseFineValue,
        discountValue: expenseDiscountValue,
        amountPaid: expensePaymentTotal,
        paymentType: expensePaymentType,
        paidAt: expensePaidAt,
        notes: expensePaymentNotes.trim() || undefined
      });

      resetExpensePaymentForm();
      setExpenseFeedback({
        title: 'Despesa paga',
        message: 'Pagamento efetuado com sucesso!'
      });
    } catch (error) {
      setExpenseFeedback({
        title: 'Pagamento não concluído',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível registrar o pagamento da despesa.'
      });
    } finally {
      setIsPayingExpense(false);
    }
  };

  const handleOpenEditExpensePayment = (
    payment: ExpensePaymentRecord
  ) => {
    setEditingExpensePayment(payment);
    setExpensePaidAt(payment.paidAt || formatLocalDateStr(new Date()));
    setExpensePaymentType(payment.paymentType);
    setExpenseInterestValue(payment.interestValue);
    setExpenseFineValue(payment.fineValue);
    setExpenseDiscountValue(payment.discountValue);
    setExpensePaymentNotes(payment.notes || '');
  };

  const handleConfirmExpensePaymentUpdate = async () => {
    if (!editingExpensePayment || isUpdatingExpensePayment) {
      return;
    }

    if (!expensePaidAt) {
      setExpenseFeedback({
        title: 'Data obrigatória',
        message: 'Informe a data do pagamento.'
      });
      return;
    }

    const updatedAmountPaid = Math.max(
      0,
      editingExpensePayment.expectedAmount +
        expenseInterestValue +
        expenseFineValue -
        expenseDiscountValue
    );

    if (updatedAmountPaid <= 0) {
      setExpenseFeedback({
        title: 'Valor inválido',
        message: 'O valor final da despesa precisa ser maior que zero.'
      });
      return;
    }

    if (!onUpdateExpensePayment) {
      setExpenseFeedback({
        title: 'Integração pendente',
        message:
          'A alteração ainda precisa ser conectada ao Supabase pelo painel do dono.'
      });
      return;
    }

    setIsUpdatingExpensePayment(true);

    try {
      await onUpdateExpensePayment({
        paymentId: editingExpensePayment.id,
        expectedAmount: editingExpensePayment.expectedAmount,
        interestValue: expenseInterestValue,
        fineValue: expenseFineValue,
        discountValue: expenseDiscountValue,
        amountPaid: updatedAmountPaid,
        paymentType: expensePaymentType,
        paidAt: expensePaidAt,
        notes: expensePaymentNotes.trim() || undefined
      });

      setEditingExpensePayment(null);
      resetExpensePaymentForm();
      setExpenseFeedback({
        title: 'Pagamento alterado',
        message: 'Pagamento atualizado com sucesso!'
      });
    } catch (error) {
      setExpenseFeedback({
        title: 'Pagamento não alterado',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o pagamento.'
      });
    } finally {
      setIsUpdatingExpensePayment(false);
    }
  };

  const handleConfirmDeleteExpensePayment = async () => {
    if (!expensePaymentToDelete || isDeletingExpensePayment) {
      return;
    }

    if (!onDeleteExpensePayment) {
      setExpenseFeedback({
        title: 'Integração pendente',
        message:
          'A exclusão do lançamento ainda precisa ser conectada ao Supabase pelo painel do dono.'
      });
      return;
    }

    setIsDeletingExpensePayment(true);

    try {
      await onDeleteExpensePayment(expensePaymentToDelete.id);
      setExpensePaymentToDelete(null);
      setExpenseFeedback({
        title: 'Lançamento excluído',
        message: 'O lançamento foi excluído com sucesso!'
      });
    } catch (error) {
      setExpenseFeedback({
        title: 'Lançamento não excluído',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir o lançamento.'
      });
    } finally {
      setIsDeletingExpensePayment(false);
    }
  };

  const financialMovementRows = useMemo<FinancialMovementRow[]>(() => {
    const receiptRows: FinancialMovementRow[] = filteredReceipts.flatMap<
      FinancialMovementRow
    >((receipt) => {
      const receiptDate = getSaoPauloDateStr(receipt.paidAt);
      const description =
        receipt.items
          .map((item) => item.itemDescription || item.serviceName)
          .filter(Boolean)
          .join(' + ') ||
        receipt.clientName ||
        'Recebimento';

      if (receipt.paymentType === 'cortesia') {
        return [{
          id: `${receipt.id}-cortesia`,
          date: receiptDate,
          type: 'cortesia',
          description,
          paymentType: 'cortesia',
          entryValue: 0,
          exitValue: 0
        } satisfies FinancialMovementRow];
      }

      if (Array.isArray(receipt.payments) && receipt.payments.length > 0) {
        return receipt.payments
          .filter((payment) => {
            return (
              payment.paymentType !== 'pendente' &&
              payment.paymentType !== 'cortesia' &&
              Number(payment.amount) > 0
            );
          })
          .map<FinancialMovementRow>((payment) => {
            const paymentDate =
              getSaoPauloDateStr(payment.createdAt) ||
              receiptDate;

            return {
              id: `${receipt.id}-${payment.id}`,
              date: paymentDate,
              type: 'recebimento',
              description,
              paymentType: payment.paymentType,
              entryValue: Number(payment.amount) || 0,
              exitValue: 0
            };
          });
      }

      if (receipt.status !== 'paid') {
        return [];
      }

      return [{
        id: `${receipt.id}-${receipt.paymentType}`,
        date: receiptDate,
        type: 'recebimento',
        description,
        paymentType: receipt.paymentType,
        entryValue: Number(receipt.amountPaid ?? receipt.totalAmount) || 0,
        exitValue: 0
      } satisfies FinancialMovementRow];
    });

    const expenseRows: FinancialMovementRow[] =
      filteredCashExpenses.map<FinancialMovementRow>((expense) => ({
        id: expense.id,
        date:
          getAppointmentDateStr(expense.paidAt) ||
          expense.paidAt.slice(0, 10),
        type: 'despesa',
        description: expense.description || 'Despesa manual',
        paymentType: expense.paymentType,
        entryValue: 0,
        exitValue: Math.abs(Number(expense.amount) || 0)
      }));

    return [
      ...receiptRows,
      ...expenseRows
    ].sort((firstRow, secondRow) => {
      if (firstRow.date !== secondRow.date) {
        return firstRow.date.localeCompare(secondRow.date);
      }

      return firstRow.description.localeCompare(
        secondRow.description,
        'pt-BR'
      );
    });
  }, [
    filteredCashExpenses,
    filteredReceipts
  ]);

  const financialMovementIncomeTotal = useMemo(() => {
    return financialMovementRows.reduce(
      (sum, row) => sum + row.entryValue,
      0
    );
  }, [financialMovementRows]);

  const financialMovementExpenseTotal = useMemo(() => {
    return financialMovementRows.reduce(
      (sum, row) => sum + row.exitValue,
      0
    );
  }, [financialMovementRows]);

  const financialMovementBalance =
    financialMovementIncomeTotal - financialMovementExpenseTotal;

  const financialMovementPaymentTotals = useMemo(() => {
    const paymentTypes: PaymentType[] = [
      'dinheiro',
      'pix',
      'debito',
      'credito',
      'cortesia'
    ];

    return paymentTypes.map((paymentType) => ({
      paymentType,
      total: financialMovementRows
        .filter((row) => row.paymentType === paymentType)
        .reduce((sum, row) => sum + row.entryValue, 0)
    }));
  }, [financialMovementRows]);

  const cashBookRows = useMemo<CashBookRow[]>(() => {
    return financialMovementRows
      .filter((row) => row.paymentType === 'dinheiro')
      .map<CashBookRow>((row) => ({
        date: row.date,
        type: row.type === 'despesa' ? 'despesa' : 'recebimento',
        description: row.description,
        value:
          row.type === 'despesa'
            ? -Math.abs(Number(row.exitValue) || 0)
            : Number(row.entryValue) || 0
      }))
      .filter((row) => Math.abs(Number(row.value) || 0) > 0)
      .sort((firstRow, secondRow) => {
        if (firstRow.date !== secondRow.date) {
          return firstRow.date.localeCompare(secondRow.date);
        }

        return firstRow.description.localeCompare(
          secondRow.description,
          'pt-BR'
        );
      });
  }, [financialMovementRows]);

  const cashBookIncomeTotal = useMemo(() => {
    return cashBookRows
      .filter((row) => row.type === 'recebimento')
      .reduce((sum, row) => sum + row.value, 0);
  }, [cashBookRows]);

  const cashBookExpenseTotal = useMemo(() => {
    return cashBookRows
      .filter((row) => row.type === 'despesa')
      .reduce((sum, row) => sum + Math.abs(row.value), 0);
  }, [cashBookRows]);

  const cashBookFinalBalance =
    initialCashBalance + cashBookIncomeTotal - cashBookExpenseTotal;

  const handleChangeStartDate = (startDate: string) => {
    setDraftPeriod((currentPeriod) => ({
      ...currentPeriod,
      startDate
    }));
  };

  const handleChangeEndDate = (endDate: string) => {
    setDraftPeriod((currentPeriod) => ({
      ...currentPeriod,
      endDate
    }));
  };

  const handleApplyPeriodFilter = () => {
    if (isInvalidDraftPeriod || isDraftPeriodTooLong) {
      return;
    }

    setPeriod(draftPeriod);

    const nextStoredValue =
      localStorage.getItem(getCashBookStorageKey(draftPeriod));

    setInitialCashBalance(nextStoredValue ? Number(nextStoredValue) || 0 : 0);
  };

  const handleChangeInitialCashBalance = (value: string) => {
    const parsedValue = parseCurrencyInput(value);

    setInitialCashBalance(parsedValue);
    localStorage.setItem(getCashBookStorageKey(period), String(parsedValue));
  };

  const handlePrintCommissionsA4 = () => {
    const rowsHtml = commissionRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.professional.name)}</td>
          <td>${escapeHtml(getRemunerationLabel(row.professional))}</td>
          <td class="right">${row.completedCount}</td>
          <td class="right">${formatCurrency(row.totalProduced)}</td>
          <td class="right">${formatCurrency(row.commissionValue)}</td>
        </tr>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Relatório de Comissões',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Comissões',
          period
        })}

        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Remuneração</th>
              <th class="right">Atendimento</th>
              <th class="right">Faturamento</th>
              <th class="right">Comissão</th>
            </tr>
          </thead>

          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `
    });
  };

  const handlePrintCommissionsThermal = () => {
    const rowsHtml = commissionRows.map((row) => {
      return `
        <div style="border-bottom:1px dashed #999;padding:7px 0;">
          <strong>${escapeHtml(row.professional.name)}</strong><br />
          Atend.: ${row.completedCount}<br />
          Prod.: ${formatCurrency(row.totalProduced)}<br />
          Comissão: ${formatCurrency(row.commissionValue)}
        </div>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Filipeta de Comissões',
      thermal: true,
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Comissões',
          period
        })}

        ${rowsHtml}
      `
    });
  };

  const handlePrintProfessionalCommission = (
    row: {
      professional: Professional;
      completedCount: number;
      totalProduced: number;
      commissionValue: number;
    }
  ) => {
    buildPrintWindow({
      title: `Fechamento - ${row.professional.name}`,
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Fechamento de Comissão',
          period
        })}

        <table>
          <tbody>
            <tr>
              <th>Profissional</th>
              <td>${escapeHtml(row.professional.name)}</td>
            </tr>
            <tr>
              <th>Remuneração</th>
              <td>${escapeHtml(getRemunerationLabel(row.professional))}</td>
            </tr>
            <tr>
              <th>Atendimento</th>
              <td>${row.completedCount}</td>
            </tr>
            <tr>
              <th>Faturamento</th>
              <td>${formatCurrency(row.totalProduced)}</td>
            </tr>
            <tr>
              <th>Comissão devida</th>
              <td>${formatCurrency(row.commissionValue)}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Recebi o valor de comissão acima informado.</span>
          </div>
          <div class="summary-row">
            <span>Assinatura: ______________________________</span>
          </div>
          <div class="summary-row">
            <span>Data: ____/____/________</span>
          </div>
        </div>
      `
    });
  };

  const handlePrintCommissionHistory = () => {
    const rowsHtml = filteredCommissionPayments.map((payment) => {
      return `
        <tr>
          <td>${formatDateBr(payment.paidAt)}</td>
          <td>${escapeHtml(payment.professionalName)}</td>
          <td>${formatDateBr(payment.periodStart)} a ${formatDateBr(payment.periodEnd)}</td>
          <td class="right">${formatCurrency(payment.calculatedCommission)}</td>
          <td class="right">${formatCurrency(payment.extraValue)}</td>
          <td class="right">${formatCurrency(payment.discountValue)}</td>
          <td class="right">${formatCurrency(payment.amountPaid)}</td>
          <td>${escapeHtml(getPaymentLabel(payment.paymentType))}</td>
        </tr>
      `;
    }).join('');

    const totalCalculated = filteredCommissionPayments.reduce(
      (sum, payment) => sum + payment.calculatedCommission,
      0
    );
    const totalExtra = filteredCommissionPayments.reduce(
      (sum, payment) => sum + payment.extraValue,
      0
    );
    const totalDiscount = filteredCommissionPayments.reduce(
      (sum, payment) => sum + payment.discountValue,
      0
    );
    const totalPaid = filteredCommissionPayments.reduce(
      (sum, payment) => sum + payment.amountPaid,
      0
    );

    buildPrintWindow({
      title: 'Histórico de Comissões',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Histórico de Comissões Pagas',
          period
        })}

        <table>
          <thead>
            <tr>
              <th>Pagamento</th>
              <th>Profissional</th>
              <th>Período</th>
              <th class="right">Comissão</th>
              <th class="right">Extra</th>
              <th class="right">Desconto</th>
              <th class="right">Total pago</th>
              <th>Forma</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align:center;color:#64748b;">Nenhuma comissão paga no período.</td></tr>'}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Comissões calculadas</span>
            <span>${formatCurrency(totalCalculated)}</span>
          </div>
          <div class="summary-row">
            <span>Extras</span>
            <span>${formatCurrency(totalExtra)}</span>
          </div>
          <div class="summary-row">
            <span>Descontos</span>
            <span>${formatCurrency(totalDiscount)}</span>
          </div>
          <div class="summary-row">
            <span>Total pago</span>
            <span>${formatCurrency(totalPaid)}</span>
          </div>
        </div>
      `
    });
  };

  const handlePrintCommissionPaymentIndividual = (
    payment: CommissionPaymentRecord
  ) => {
    buildPrintWindow({
      title: `Comissão - ${payment.professionalName}`,
      thermal: true,
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Comprovante Individual de Comissão',
          period: {
            startDate: payment.periodStart,
            endDate: payment.periodEnd
          }
        })}

        <table>
          <tbody>
            <tr>
              <th>Profissional</th>
              <td>${escapeHtml(payment.professionalName)}</td>
            </tr>
            <tr>
              <th>Data do pagamento</th>
              <td>${formatDateBr(payment.paidAt)}</td>
            </tr>
            <tr>
              <th>Forma</th>
              <td>${escapeHtml(getPaymentLabel(payment.paymentType))}</td>
            </tr>
            <tr>
              <th>Comissão</th>
              <td>${formatCurrency(payment.calculatedCommission)}</td>
            </tr>
            <tr>
              <th>Extra</th>
              <td>${formatCurrency(payment.extraValue)}</td>
            </tr>
            <tr>
              <th>Desconto</th>
              <td>${formatCurrency(payment.discountValue)}</td>
            </tr>
            <tr>
              <th>Total pago</th>
              <td><strong>${formatCurrency(payment.amountPaid)}</strong></td>
            </tr>
          </tbody>
        </table>
      `
    });
  };

  const handlePrintRevenueReport = () => {
    const serviceRowsHtml = serviceRevenueRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.serviceName)}</td>
          <td class="right">${row.quantity}</td>
          <td class="right">${formatCurrency(row.unitValue)}</td>
          <td class="right">${formatCurrency(row.total)}</td>
          <td class="right">${row.percentage}%</td>
        </tr>
      `;
    }).join('');

    const paymentRowsHtml = paymentRevenueRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(getPaymentLabel(row.paymentType))}</td>
          <td class="right">${formatCurrency(row.total)}</td>
          <td class="right">${row.percentage}%</td>
        </tr>
      `;
    }).join('');

    const professionalRowsHtml = professionalRevenueRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.professional.name)}</td>
          <td class="right">${formatCurrency(row.total)}</td>
          <td class="right">${row.percentage}%</td>
        </tr>
      `;
    }).join('');

    const productRowsHtml = productRevenueRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.description)}</td>
          <td class="right">${row.quantity}</td>
          <td class="right">${formatCurrency(row.unitValue)}</td>
          <td class="right">${formatCurrency(row.total)}</td>
          <td class="right">${row.percentage}%</td>
        </tr>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Relatório de Faturamento',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Relatório de Faturamento',
          period
        })}

        <h2>Faturamento por tipo de serviço</h2>
        <table>
          <thead>
            <tr>
              <th>Serviço</th>
              <th class="right">Atendimento</th>
              <th class="right">Valor individual</th>
              <th class="right">Total</th>
              <th class="right">%</th>
            </tr>
          </thead>
          <tbody>
            ${serviceRowsHtml || '<tr><td colspan="5" style="text-align:center;color:#64748b;">Nenhum atendimento finalizado no período.</td></tr>'}
            <tr>
              <td colspan="3" class="right"><strong>Total de serviços</strong></td>
              <td class="right"><strong>${formatCurrency(totalRevenue)}</strong></td>
              <td class="right"><strong>${totalRevenue > 0 ? '100%' : '0%'}</strong></td>
            </tr>
          </tbody>
        </table>

        <br />

        <h2>Recebimento por forma de pagamento</h2>
        <table>
          <thead>
            <tr>
              <th>Forma</th>
              <th class="right">Valor</th>
              <th class="right">%</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRowsHtml}
            <tr>
              <td class="right"><strong>Total por formas de pagamento</strong></td>
              <td class="right"><strong>${formatCurrency(totalRevenue)}</strong></td>
              <td class="right"><strong>${totalRevenue > 0 ? '100%' : '0%'}</strong></td>
            </tr>
          </tbody>
        </table>

        <br />

        <h2>Produzido por colaborador</h2>
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th class="right">Valor</th>
              <th class="right">%</th>
            </tr>
          </thead>
          <tbody>
            ${professionalRowsHtml}
            <tr>
              <td class="right"><strong>Total produzido por colaboradores</strong></td>
              <td class="right"><strong>${formatCurrency(totalRevenue)}</strong></td>
              <td class="right"><strong>${totalRevenue > 0 ? '100%' : '0%'}</strong></td>
            </tr>
          </tbody>
        </table>

        <br />

        <h2>Vendas por produto</h2>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th class="right">Quantidade</th>
              <th class="right">Valor médio</th>
              <th class="right">Total</th>
              <th class="right">%</th>
            </tr>
          </thead>
          <tbody>
            ${productRowsHtml || '<tr><td colspan="5" style="text-align:center;color:#64748b;">Nenhum produto vendido no período.</td></tr>'}
            <tr>
              <td colspan="3" class="right"><strong>Total vendido em produtos</strong></td>
              <td class="right"><strong>${formatCurrency(totalProductsRevenue)}</strong></td>
              <td class="right"><strong>${totalProductsRevenue > 0 ? '100%' : '0%'}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Faturamento com serviços</span>
            <span>${formatCurrency(totalRevenue)}</span>
          </div>
          <div class="summary-row">
            <span>Vendas de produtos</span>
            <span>${formatCurrency(totalProductsRevenue)}</span>
          </div>
          <div class="summary-row">
            <span>Faturamento bruto total</span>
            <span>${formatCurrency(totalGrossRevenue)}</span>
          </div>
          <div class="summary-row">
            <span>Comissões</span>
            <span>${formatCurrency(totalCommissions)}</span>
          </div>
          <div class="summary-row">
            <span>Líquido estimado</span>
            <span>${formatCurrency(totalGrossRevenue - totalCommissions)}</span>
          </div>
        </div>
      `
    });
  };

  const handlePrintFinancialMovement = () => {
    const rowsHtml = financialMovementRows.map((row) => {
      return `
        <tr>
          <td>${formatDateBr(row.date)}</td>
          <td>${
            row.type === 'despesa'
              ? 'Saída'
              : row.type === 'cortesia'
                ? 'Cortesia'
                : 'Entrada'
          }</td>
          <td>${escapeHtml(row.description)}</td>
          <td>${escapeHtml(getPaymentLabel(row.paymentType))}</td>
          <td class="right positive">${
            row.entryValue > 0 ? formatCurrency(row.entryValue) : '-'
          }</td>
          <td class="right negative">${
            row.exitValue > 0 ? formatCurrency(row.exitValue) : '-'
          }</td>
        </tr>
      `;
    }).join('');

    const paymentTotalsHtml = financialMovementPaymentTotals.map((row) => {
      return `
        <div class="summary-row">
          <span>${escapeHtml(getPaymentLabel(row.paymentType))}</span>
          <span>${formatCurrency(row.total)}</span>
        </div>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Movimentação Financeira',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Movimentação Financeira',
          period
        })}

        <div class="summary">
          <div class="summary-row">
            <span>Total de entradas</span>
            <span>${formatCurrency(financialMovementIncomeTotal)}</span>
          </div>
          <div class="summary-row">
            <span>Total de saídas</span>
            <span>${formatCurrency(financialMovementExpenseTotal)}</span>
          </div>
          <div class="summary-row">
            <span>Saldo do período</span>
            <span>${formatCurrency(financialMovementBalance)}</span>
          </div>
        </div>

        <br />

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Forma</th>
              <th class="right">Entrada</th>
              <th class="right">Saída</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align:center;color:#64748b;">Nenhuma movimentação no período.</td></tr>'}
          </tbody>
        </table>

        <h2>Entradas por forma de pagamento</h2>
        <div class="summary">
          ${paymentTotalsHtml}
        </div>
      `
    });
  };

  const handlePrintCashBook = () => {
    const rowsHtml = cashBookRows.map((row) => {
      const formattedValue =
        row.type === 'despesa'
          ? `-${formatCurrency(Math.abs(row.value)).replace('R$', '').trim()}`
          : formatCurrency(row.value);

      return `
        <tr>
          <td>${formatDateBr(row.date)}</td>
          <td>${row.type === 'despesa' ? 'Despesa' : 'Recebimento'}</td>
          <td>${escapeHtml(row.description)}</td>
          <td class="right ${row.type === 'despesa' ? 'negative' : 'positive'}">${formattedValue}</td>
        </tr>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Livro Caixa',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Livro Caixa - Dinheiro',
          period
        })}

        <div class="summary">
          <div class="summary-row">
            <span>Saldo inicial</span>
            <span>${formatCurrency(initialCashBalance)}</span>
          </div>
          <div class="summary-row">
            <span>Entradas em dinheiro</span>
            <span>${formatCurrency(cashBookIncomeTotal)}</span>
          </div>
          <div class="summary-row">
            <span>Saídas em dinheiro</span>
            <span class="negative">-${formatCurrency(cashBookExpenseTotal).replace('R$', '').trim()}</span>
          </div>
          <div class="summary-row">
            <span>Saldo final</span>
            <span>${formatCurrency(cashBookFinalBalance)}</span>
          </div>
        </div>

        <br />

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição do Serviço</th>
              <th class="right">Valor</th>
            </tr>
          </thead>

          <tbody>
            ${rowsHtml || '<tr><td colspan="4" style="text-align:center;color:#64748b;">Nenhuma movimentação em dinheiro no período.</td></tr>'}
          </tbody>
        </table>
      `
    });
  };

  return {
    activeFinanceTab,
    cashBookExpenseTotal,
    cashBookFinalBalance,
    cashBookIncomeTotal,
    cashBookRows,
    draftPeriod,
    financialMovementBalance,
    financialMovementExpenseTotal,
    financialMovementIncomeTotal,
    financialMovementPaymentTotals,
    financialMovementRows,
    formatCurrency,
    formatCurrencyInput,
    formatDateBr,
    getPaymentLabel,
    handleApplyPeriodFilter,
    handleChangeEndDate,
    handleChangeInitialCashBalance,
    handleChangeStartDate,
    handleOpenNewExpenseTemplate,
    handlePrintCashBook,
    handlePrintFinancialMovement,
    handlePrintRevenueReport,
    initialCashBalance,
    isDraftPeriodTooLong,
    isInvalidDraftPeriod,
    paymentRevenueRows,
    productRevenueRows,
    professionalRevenueRows,
    serviceRevenueRows,
    setActiveFinanceTab,
    totalCommissions,
    totalGrossRevenue,
    totalProductsRevenue,
    totalRevenue,
    competenceMonth,
    editingExpensePayment,
    editingExpenseTemplate,
    expenseDescription,
    expenseDiscountValue,
    expenseDueDate,
    expenseDueDay,
    expenseExpectedAmount,
    expenseFeedback,
    expenseFineValue,
    expenseInterestValue,
    expenseIsMonthly,
    expensePaidAt,
    expensePaymentNotes,
    expensePaymentToDelete,
    expensePaymentTotal,
    expensePaymentType,
    expenseRows,
    expenseTemplateNotes,
    expenseTemplateToDelete,
    expenseToPay,
    handleConfirmDeleteExpensePayment,
    handleConfirmDeleteExpenseTemplate,
    handleConfirmExpensePayment,
    handleConfirmExpensePaymentUpdate,
    handleOpenEditExpensePayment,
    handleOpenEditExpenseTemplate,
    handleOpenExpensePayment,
    handleSaveExpenseTemplate,
    isDeletingExpensePayment,
    isDeletingExpenseTemplate,
    isPayingExpense,
    isSavingExpenseTemplate,
    isUpdatingExpensePayment,
    parseCurrencyInput,
    resetExpensePaymentForm,
    resetExpenseTemplateForm,
    setEditingExpensePayment,
    setExpenseDescription,
    setExpenseDiscountValue,
    setExpenseDueDate,
    setExpenseDueDay,
    setExpenseExpectedAmount,
    setExpenseFeedback,
    setExpenseFineValue,
    setExpenseInterestValue,
    setExpenseIsMonthly,
    setExpensePaidAt,
    setExpensePaymentNotes,
    setExpensePaymentToDelete,
    setExpensePaymentType,
    setExpenseTemplateNotes,
    setExpenseTemplateToDelete,
    showExpenseTemplateModal,
    commissionAmountToPay,
    commissionDiscountValue,
    commissionExtraValue,
    commissionFeedback,
    commissionNotes,
    commissionPaidAt,
    commissionPaymentByProfessionalId,
    commissionPaymentType,
    commissionRows,
    editedCommissionPaidAt,
    editingPaidCommission,
    filteredCommissionPayments,
    getRemunerationLabel,
    handleConfirmCommissionPaidAtUpdate,
    handleConfirmCommissionPayment,
    handleOpenCommissionPayment,
    handleOpenPaidCommission,
    handlePrintCommissionHistory,
    handlePrintCommissionPaymentIndividual,
    handlePrintCommissionsA4,
    handlePrintProfessionalCommission,
    handlePrintSavedCommissionPayment,
    isSavingCommissionPayment,
    isUpdatingCommissionPaidAt,
    pendingCommissionPrintHtml,
    period,
    professionals,
    resetCommissionPaymentForm,
    selectedCommissionRow,
    setCommissionDiscountValue,
    setCommissionExtraValue,
    setCommissionFeedback,
    setCommissionNotes,
    setCommissionPaidAt,
    setCommissionPaymentType,
    setEditedCommissionPaidAt,
    setEditingPaidCommission,
    setPendingCommissionPrintHtml,
    setShowCommissionHistory,
    showCommissionHistory
  };
}
