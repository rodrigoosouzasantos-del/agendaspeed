import { useEffect, useState } from "react";

import {
  OwnerSaasInvoice,
  OwnerSaasSubscription,
} from "../owner.types";
import {
  SupabaseOwnerSaasSubscriptionResponse,
  SupabaseOwnerSaasInvoiceResponse,
  mapOwnerSaasSubscription,
  mapOwnerSaasInvoice,
} from "../owner.data";
import { supabase } from "../../../lib/supabase";

export function useOwnerSubscription() {
  const [saasSubscription, setSaasSubscription] =
    useState<OwnerSaasSubscription | null>(null);
  const [saasInvoices, setSaasInvoices] = useState<OwnerSaasInvoice[]>([]);
  const [isLoadingSaasBilling, setIsLoadingSaasBilling] = useState(true);
  const [saasBillingError, setSaasBillingError] = useState("");

  const loadSaasBilling = async () => {
    setIsLoadingSaasBilling(true);
    setSaasBillingError("");

    const subscriptionResult = await supabase.rpc("get_my_saas_subscription");

    if (subscriptionResult.error) {
      console.error(
        "Erro ao carregar a assinatura do AgendaSpeed:",
        subscriptionResult.error.message,
      );
      setSaasSubscription(null);
      setSaasInvoices([]);
      setSaasBillingError(
        subscriptionResult.error.message ||
          "Não foi possível carregar a assinatura.",
      );
      setIsLoadingSaasBilling(false);
      return;
    }

    const subscriptionRow = (
      Array.isArray(subscriptionResult.data)
        ? subscriptionResult.data[0]
        : subscriptionResult.data
    ) as SupabaseOwnerSaasSubscriptionResponse | null;

    const nextSubscription = subscriptionRow
      ? mapOwnerSaasSubscription(subscriptionRow)
      : null;

    setSaasSubscription(nextSubscription);

    let invoicesResult = await supabase.rpc("get_my_saas_invoices");

    if (invoicesResult.error) {
      console.error(
        "Erro ao carregar as mensalidades:",
        invoicesResult.error.message,
      );
      setSaasInvoices([]);
      setSaasBillingError(
        invoicesResult.error.message ||
          "Não foi possível carregar o histórico de mensalidades.",
      );
      setIsLoadingSaasBilling(false);
      return;
    }

    let invoiceRows = (
      Array.isArray(invoicesResult.data) ? invoicesResult.data : []
    ) as SupabaseOwnerSaasInvoiceResponse[];

    const hasOpenInvoice = invoiceRows.some((invoice) =>
      ["pending", "waiting_payment", "manual_review", "overdue"].includes(
        invoice.status,
      ),
    );

    if (
      nextSubscription &&
      (nextSubscription.isDueSoon || nextSubscription.isOverdue) &&
      !hasOpenInvoice
    ) {
      const prepareResult = await supabase.rpc(
        "prepare_my_current_saas_invoice",
      );

      if (prepareResult.error) {
        console.error(
          "Erro ao gerar automaticamente a mensalidade:",
          prepareResult.error.message,
        );
        setSaasBillingError(
          prepareResult.error.message ||
            "Não foi possível preparar a mensalidade atual.",
        );
      } else {
        invoicesResult = await supabase.rpc("get_my_saas_invoices");

        if (!invoicesResult.error) {
          invoiceRows = (
            Array.isArray(invoicesResult.data) ? invoicesResult.data : []
          ) as SupabaseOwnerSaasInvoiceResponse[];
        }
      }
    }

    setSaasInvoices(invoiceRows.map(mapOwnerSaasInvoice));
    setIsLoadingSaasBilling(false);
  };

  useEffect(() => {
    void loadSaasBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    saasSubscription,
    saasInvoices,
    isLoadingSaasBilling,
    saasBillingError,
    loadSaasBilling,
  };
}
