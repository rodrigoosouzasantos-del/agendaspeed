import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { Appointment, AppointmentStatus, CashExpense, Client, PaymentType, Product, Professional, Receipt, Service } from "../../../types";
import { OwnerDashboardProps } from "../owner.types";
import { calculateOwnerFinancialSummary, updateClientsAfterAppointmentStatusChange } from "../owner.utils";
import { supabase } from "../../../lib/supabase";
import { PendingReceiptPaymentPayload, ReceiptPayload } from "../components/ReceiptsView";
import {
  SUPABASE_RECEIPTS_SELECT, SUPABASE_RECEIPT_ITEMS_SELECT, SUPABASE_RECEIPT_PAYMENTS_SELECT, SUPABASE_CASH_EXPENSES_SELECT,
  SupabaseReceiptResponse, SupabaseReceiptItemResponse, SupabaseReceiptPaymentResponse, SupabaseCashExpenseResponse,
  toNullableUuid, mapSupabaseReceiptToAppReceipt, mapSupabaseCashExpenseToAppCashExpense,
  buildReceiptInsertPayload, buildReceiptItemInsertPayload, buildReceiptFinancialAppointments, calculateReceiptTotals, buildReceiptItems,
} from "../owner.data";

type ShowOwnerFeedback = (message: string, title?: string) => void;
interface UseOwnerFinancialParams {
  tenantId: string; state: OwnerDashboardProps["state"]; onUpdateState: OwnerDashboardProps["onUpdateState"];
  appointments: Appointment[]; clients: Client[]; services: Service[]; products: Product[]; professionals: Professional[];
  setLiveAppointments: Dispatch<SetStateAction<Appointment[]>>;
  loadClientsFromSupabase: (showLoading?: boolean) => Promise<Client[]>; showOwnerFeedback: ShowOwnerFeedback;
}

export function useOwnerFinancial(params: UseOwnerFinancialParams) {
  const { tenantId, state, onUpdateState, appointments, clients, services, products, professionals, setLiveAppointments, loadClientsFromSupabase, showOwnerFeedback } = params;
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [cashExpenses, setCashExpenses] = useState<CashExpense[]>([]);
  const [isLoadingFinancialRecords, setIsLoadingFinancialRecords] = useState(true);
  const [financialRecordsLoadError, setFinancialRecordsLoadError] = useState("");

  const loadFinancialRecordsFromSupabase = async (
    showLoading = true,
  ): Promise<{
    receipts: Receipt[];
    cashExpenses: CashExpense[];
  }> => {
    if (!tenantId) {
      return {
        receipts: [],
        cashExpenses: [],
      };
    }

    if (showLoading) {
      setIsLoadingFinancialRecords(true);
    }

    setFinancialRecordsLoadError("");

    const receiptsResult = await supabase
      .from("receipts")
      .select(SUPABASE_RECEIPTS_SELECT)
      .eq("tenant_id", tenantId)
      .order("paid_at", { ascending: false });

    if (receiptsResult.error) {
      console.error(
        "Erro ao carregar recebimentos:",
        receiptsResult.error.message,
      );
      setFinancialRecordsLoadError(
        receiptsResult.error.message || "Erro ao carregar recebimentos.",
      );
      setIsLoadingFinancialRecords(false);
      return {
        receipts: [],
        cashExpenses,
      };
    }

    const receiptRows = (Array.isArray(receiptsResult.data)
      ? receiptsResult.data
      : []) as SupabaseReceiptResponse[];
    const receiptIds = receiptRows.map((receipt) => receipt.id).filter(Boolean);

    let receiptItemRows: SupabaseReceiptItemResponse[] = [];
    let receiptPaymentRows: SupabaseReceiptPaymentResponse[] = [];

    if (receiptIds.length > 0) {
      const receiptItemsResult = await supabase
        .from("receipt_items")
        .select(SUPABASE_RECEIPT_ITEMS_SELECT)
        .eq("tenant_id", tenantId)
        .in("receipt_id", receiptIds);

      if (receiptItemsResult.error) {
        console.error(
          "Erro ao carregar itens dos recebimentos:",
          receiptItemsResult.error.message,
        );
        setFinancialRecordsLoadError(
          receiptItemsResult.error.message ||
            "Erro ao carregar itens dos recebimentos.",
        );
        setIsLoadingFinancialRecords(false);
        return {
          receipts,
          cashExpenses,
        };
      }

      receiptItemRows = (Array.isArray(receiptItemsResult.data)
        ? receiptItemsResult.data
        : []) as SupabaseReceiptItemResponse[];

      const receiptPaymentsResult = await supabase
        .from("receipt_payments")
        .select(SUPABASE_RECEIPT_PAYMENTS_SELECT)
        .eq("tenant_id", tenantId)
        .in("receipt_id", receiptIds);

      if (receiptPaymentsResult.error) {
        console.error(
          "Erro ao carregar pagamentos dos recebimentos:",
          receiptPaymentsResult.error.message,
        );
        setFinancialRecordsLoadError(
          receiptPaymentsResult.error.message ||
            "Erro ao carregar pagamentos dos recebimentos.",
        );
        setIsLoadingFinancialRecords(false);
        return {
          receipts,
          cashExpenses,
        };
      }

      receiptPaymentRows = (Array.isArray(receiptPaymentsResult.data)
        ? receiptPaymentsResult.data
        : []) as SupabaseReceiptPaymentResponse[];
    }

    const expensesResult = await supabase
      .from("cash_expenses")
      .select(SUPABASE_CASH_EXPENSES_SELECT)
      .eq("tenant_id", tenantId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (expensesResult.error) {
      console.error("Erro ao carregar despesas:", expensesResult.error.message);
      setFinancialRecordsLoadError(
        expensesResult.error.message || "Erro ao carregar despesas.",
      );
      setIsLoadingFinancialRecords(false);
      return {
        receipts,
        cashExpenses,
      };
    }

    const receiptItemsByReceiptId = receiptItemRows.reduce<
      Record<string, SupabaseReceiptItemResponse[]>
    >((accumulator, receiptItem) => {
      if (!accumulator[receiptItem.receipt_id]) {
        accumulator[receiptItem.receipt_id] = [];
      }

      accumulator[receiptItem.receipt_id].push(receiptItem);
      return accumulator;
    }, {});

    const receiptPaymentsByReceiptId = receiptPaymentRows.reduce<
      Record<string, SupabaseReceiptPaymentResponse[]>
    >((accumulator, receiptPayment) => {
      if (!accumulator[receiptPayment.receipt_id]) {
        accumulator[receiptPayment.receipt_id] = [];
      }

      accumulator[receiptPayment.receipt_id].push(receiptPayment);
      return accumulator;
    }, {});

    const nextReceipts = receiptRows.map((receipt) => {
      return mapSupabaseReceiptToAppReceipt({
        receipt,
        items: receiptItemsByReceiptId[receipt.id] || [],
        payments: receiptPaymentsByReceiptId[receipt.id] || [],
      });
    });

    const expenseRows = (Array.isArray(expensesResult.data)
      ? expensesResult.data
      : []) as SupabaseCashExpenseResponse[];
    const nextCashExpenses = expenseRows.map(mapSupabaseCashExpenseToAppCashExpense);

    setReceipts(nextReceipts);
    setCashExpenses(nextCashExpenses);
    setIsLoadingFinancialRecords(false);

    return {
      receipts: nextReceipts,
      cashExpenses: nextCashExpenses,
    };
  };


  useEffect(() => {
    let isMounted = true;

    async function loadInitialFinancialRecords() {
      if (!tenantId) return;

      const loadedRecords = await loadFinancialRecordsFromSupabase(true);

      if (!isMounted) return;

      onUpdateState({
        ...state,
        receipts: loadedRecords.receipts,
        cashExpenses: loadedRecords.cashExpenses,
      } as unknown as typeof state);
    }

    loadInitialFinancialRecords();

    return () => {
      isMounted = false;
    };
    // Carrega caixa real quando o tenant é identificado. Supabase é a fonte oficial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);



  const baseDateStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const baseFinancialSummary = calculateOwnerFinancialSummary({
    appointments,
    professionals,
    baseDateStr,
  });

  const receiptFinancialAppointments =
    buildReceiptFinancialAppointments(receipts);
  const receiptTotals = calculateReceiptTotals(receipts, baseDateStr);
  const hasPaidReceipts = receipts.some((receipt) => receipt.status === "paid");

  const financialSummary = hasPaidReceipts
    ? {
        ...baseFinancialSummary,
        completedAppointments: receiptFinancialAppointments,
        completedToday: receiptFinancialAppointments.filter((appointment) => {
          return appointment.dateTime.slice(0, 10) === baseDateStr;
        }),
        totalReceivedToday: receiptTotals.totalReceivedToday,
        totalReceivedMonth: receiptTotals.totalReceivedMonth,
        totalCommissionsMonth: receiptTotals.totalCommissionsMonth,
      }
    : baseFinancialSummary;

  const handleMarkAppointmentCompletedForReceipt = (appointmentId: string) => {
    const updatedAppointments = appointments.map((appointment) => {
      if (appointment.id !== appointmentId) {
        return appointment;
      }

      return {
        ...appointment,
        status: "completed" as AppointmentStatus,
      };
    });

    const updatedClients = updateClientsAfterAppointmentStatusChange({
      clients,
      appointments,
      appointmentId,
      destinationStatus: "completed",
    });

    setLiveAppointments(updatedAppointments);

    onUpdateState({
      ...state,
      appointments: updatedAppointments,
      clients: updatedClients,
      receipts,
      cashExpenses,
    } as unknown as typeof state);
  };

  const handleConfirmReceipt = async (payload: ReceiptPayload): Promise<void> => {
    const failReceiptSave = (message: string): never => {
      showOwnerFeedback(message, "Recebimento não concluído");
      throw new Error(message);
    };

    if (!tenantId) {
      failReceiptSave(
        "Não foi possível identificar a empresa para salvar o recebimento.",
      );
    }

    const draftReceiptItems = buildReceiptItems({
      draftItems: payload.items,
      receiptId: "pending-receipt",
      services,
      products,
      professionals,
    });

    const subtotal = draftReceiptItems.reduce(
      (sum, item) => sum + item.price,
      0,
    );
    const discountValue = Math.max(
      0,
      Math.min(Number(payload.discountValue) || 0, subtotal),
    );
    const totalAmount = Math.max(0, subtotal - discountValue);

    const { data: receiptData, error: receiptError } = await supabase
      .from("receipts")
      .insert(
        buildReceiptInsertPayload({
          tenantId,
          payload,
          subtotal,
          discountValue,
          totalAmount,
        }),
      )
      .select(SUPABASE_RECEIPTS_SELECT)
      .limit(1);

    if (receiptError) {
      failReceiptSave(
        receiptError.message || "Não foi possível salvar o recebimento.",
      );
    }

    const savedReceiptRow = (
      Array.isArray(receiptData) ? receiptData[0] : null
    ) as SupabaseReceiptResponse | null;

    if (!savedReceiptRow?.id) {
      void loadFinancialRecordsFromSupabase(false);

      failReceiptSave(
        "Recebimento salvo, mas não foi possível confirmar o registro.",
      );
    }

    const savedReceiptId = savedReceiptRow!.id;

    const receiptItems = buildReceiptItems({
      draftItems: payload.items,
      receiptId: savedReceiptId,
      services,
      products,
      professionals,
    });

    const receiptItemsPayload = receiptItems.map((receiptItem) => {
      return buildReceiptItemInsertPayload({
        tenantId,
        receiptItem,
      });
    });

    if (receiptItemsPayload.length > 0) {
      const { error: receiptItemsError } = await supabase
        .from("receipt_items")
        .insert(receiptItemsPayload);

      if (receiptItemsError) {
        await supabase.from("receipts").delete().eq("id", savedReceiptId);
        void loadFinancialRecordsFromSupabase(false);

        failReceiptSave(
          receiptItemsError.message ||
            "Não foi possível salvar os itens do recebimento.",
        );
      }
    }

    const receiptPaymentsPayload = payload.payments
      .filter((payment) => Number(payment.amount) > 0)
      .map((payment) => ({
        tenant_id: tenantId,
        receipt_id: savedReceiptId,
        payment_type: payment.paymentType,
        amount: Number(payment.amount) || 0,
      }));

    if (receiptPaymentsPayload.length > 0) {
      const { error: receiptPaymentError } = await supabase
        .from("receipt_payments")
        .insert(receiptPaymentsPayload);

      if (receiptPaymentError) {
        await supabase.from("receipts").delete().eq("id", savedReceiptId);
        void loadFinancialRecordsFromSupabase(false);

        failReceiptSave(
          receiptPaymentError.message ||
            "Não foi possível salvar as formas de pagamento do recebimento.",
        );
      }
    }

    if (toNullableUuid(payload.appointmentId)) {
      const { error: appointmentStatusError } = await supabase.rpc(
        "update_my_appointment_status",
        {
          p_appointment_id: payload.appointmentId,
          p_status: "completed",
        },
      );

      if (appointmentStatusError) {
        console.error(
          "Recebimento salvo, mas o status do atendimento não foi atualizado:",
          appointmentStatusError.message,
        );
      }
    }

    const loadedRecords = await loadFinancialRecordsFromSupabase(false);
    const updatedAppointments = appointments.map((appointment) => {
      if (appointment.id !== payload.appointmentId) {
        return appointment;
      }

      return {
        ...appointment,
        status: "completed" as AppointmentStatus,
        paymentType:
          payload.status === "pending"
            ? "pendente"
            : payload.paymentType,
        price:
          receiptItems.find((item) => item.appointmentId === appointment.id)
            ?.price || appointment.price,
      };
    });

    setLiveAppointments(updatedAppointments);
    void loadClientsFromSupabase(false);

    onUpdateState({
      ...state,
      appointments: updatedAppointments,
      receipts: loadedRecords.receipts,
      cashExpenses: loadedRecords.cashExpenses,
    } as unknown as typeof state);
  };

  const handleConfirmPendingReceiptPayment = async (
    payload: PendingReceiptPaymentPayload,
  ): Promise<void> => {
    const failPendingPayment = (message: string): never => {
      showOwnerFeedback(message, "Baixa pendente não concluída");
      throw new Error(message);
    };

    if (!tenantId) {
      failPendingPayment(
        "Não foi possível identificar a empresa para baixar o saldo pendente.",
      );
    }

    const targetReceipt = receipts.find(
      (receipt) => receipt.id === payload.receiptId,
    );

    if (!targetReceipt) {
      failPendingPayment("Recebimento pendente não encontrado.");
    }

    const pendingReceipt = targetReceipt as Receipt;

    const currentPending = Math.max(
      0,
      Number(pendingReceipt.amountPending) || 0,
    );
    const amountReceived = Math.max(
      0,
      Math.min(Number(payload.amountReceived) || 0, currentPending),
    );

    if (amountReceived <= 0) {
      failPendingPayment("Informe um valor recebido maior que zero.");
    }

    const nextAmountPaid = Number(
      (
        (Number(pendingReceipt.amountPaid) || 0) +
        amountReceived
      ).toFixed(2),
    );
    const nextAmountPending = Number(
      Math.max(0, currentPending - amountReceived).toFixed(2),
    );
    const nextStatus: Receipt["status"] =
      nextAmountPending > 0 ? "pending" : "paid";

    const normalizedPaymentType = payload.paymentType || "pix";
    const normalizedPaidAt =
      payload.paidAt || new Date().toISOString().slice(0, 10);

    const { error: receiptUpdateError } = await supabase
      .from("receipts")
      .update({
        amount_paid: nextAmountPaid,
        amount_pending: nextAmountPending,
        status: nextStatus,
        payment_type: normalizedPaymentType,
        paid_at: normalizedPaidAt,
        notes: payload.notes
          ? [pendingReceipt.notes, payload.notes]
              .filter(Boolean)
              .join(" | ")
          : pendingReceipt.notes || null,
      })
      .eq("tenant_id", tenantId)
      .eq("id", payload.receiptId);

    if (receiptUpdateError) {
      failPendingPayment(
        receiptUpdateError.message ||
          "Não foi possível atualizar o recebimento pendente.",
      );
    }

    const { error: paymentInsertError } = await supabase
      .from("receipt_payments")
      .insert({
        tenant_id: tenantId,
        receipt_id: payload.receiptId,
        payment_type: normalizedPaymentType,
        amount: amountReceived,
      });

    if (paymentInsertError) {
      await supabase
        .from("receipts")
        .update({
          amount_paid: pendingReceipt.amountPaid,
          amount_pending: pendingReceipt.amountPending,
          status: pendingReceipt.status,
          payment_type: pendingReceipt.paymentType,
          paid_at: pendingReceipt.paidAt,
          notes: pendingReceipt.notes || null,
        })
        .eq("tenant_id", tenantId)
        .eq("id", payload.receiptId);

      failPendingPayment(
        paymentInsertError.message ||
          "Não foi possível registrar a forma de pagamento do saldo pendente.",
      );
    }

    const loadedRecords = await loadFinancialRecordsFromSupabase(false);

    onUpdateState({
      ...state,
      appointments,
      clients,
      receipts: loadedRecords.receipts,
      cashExpenses: loadedRecords.cashExpenses,
    } as unknown as typeof state);
  };

  const handleConfirmCashExpense = async (payload: {
    description: string;
    amount: number;
    paymentType: PaymentType;
    notes?: string;
  }): Promise<void> => {
    const failExpenseSave = (message: string): never => {
      showOwnerFeedback(message, "Despesa não concluída");
      throw new Error(message);
    };

    if (!tenantId) {
      failExpenseSave(
        "Não foi possível identificar a empresa para salvar a despesa.",
      );
    }

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });

    const { data, error } = await supabase
      .from("cash_expenses")
      .insert({
        tenant_id: tenantId,
        description: payload.description,
        amount: Number(payload.amount) || 0,
        payment_type: payload.paymentType,
        expense_date: today,
        notes: payload.notes || null,
      })
      .select(SUPABASE_CASH_EXPENSES_SELECT)
      .limit(1);

    if (error) {
      failExpenseSave(error.message || "Não foi possível salvar a despesa.");
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseCashExpenseResponse | null;

    if (!savedRow) {
      void loadFinancialRecordsFromSupabase(false);

      failExpenseSave(
        "Despesa salva, mas não foi possível recarregar o registro.",
      );
    }

    const loadedRecords = await loadFinancialRecordsFromSupabase(false);

    onUpdateState({
      ...state,
      appointments,
      clients,
      receipts: loadedRecords.receipts,
      cashExpenses: loadedRecords.cashExpenses,
    } as unknown as typeof state);
  };


  return { baseDateStr, financialSummary, receipts, cashExpenses, isLoadingFinancialRecords, financialRecordsLoadError,
    loadFinancialRecordsFromSupabase, handleMarkAppointmentCompletedForReceipt, handleConfirmReceipt,
    handleConfirmPendingReceiptPayment, handleConfirmCashExpense };
}
