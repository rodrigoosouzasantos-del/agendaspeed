import { useEffect, useState } from "react";

import { Client } from "../../../types";
import { OwnerDashboardProps } from "../owner.types";
import { filterClients } from "../owner.utils";
import {
  onlyDigits,
  normalizeClientPhone,
  SUPABASE_CLIENTS_SELECT,
  SupabaseClientResponse,
  mapSupabaseClientToAppClient,
} from "../owner.data";
import { supabase } from "../../../lib/supabase";

interface UseOwnerClientsParams {
  state: OwnerDashboardProps["state"];
  onUpdateState: OwnerDashboardProps["onUpdateState"];
  tenantId: string;
  showOwnerFeedback: (message: string, title?: string) => void;
}


function normalizeClientName(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function useOwnerClients({
  state,
  onUpdateState,
  tenantId,
  showOwnerFeedback,
}: UseOwnerClientsParams) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientsLoadError, setClientsLoadError] = useState("");

  const loadClientsFromSupabase = async (
    showLoading = true,
  ): Promise<Client[]> => {
    if (!tenantId) {
      setClientsLoadError("");
      return [];
    }

    if (showLoading) {
      setIsLoadingClients(true);
    }

    setClientsLoadError("");

    const { data, error } = await supabase
      .from("clients")
      .select(SUPABASE_CLIENTS_SELECT)
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar clientes:", error.message);
      setClientsLoadError(error.message || "Erro ao carregar clientes.");
      setIsLoadingClients(false);
      return [];
    }

    const rows = (Array.isArray(data) ? data : []) as SupabaseClientResponse[];
    const nextClients = rows.map(mapSupabaseClientToAppClient);

    setClients(nextClients);
    setIsLoadingClients(false);

    return nextClients;
  };

  useEffect(() => {
    let isMounted = true;

    async function loadInitialClients() {
      const loadedClients = await loadClientsFromSupabase(true);

      if (!isMounted) return;

      onUpdateState({
        ...state,
        clients: loadedClients,
      });
    }

    void loadInitialClients();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddManualClient = (clientData: {
    name: string;
    phone: string;
    cpf?: string;
    birthDate?: string;
  }) => {
    const normalizedName = normalizeClientName(clientData.name);
    const newPhoneNormalized = normalizeClientPhone(clientData.phone);

    if (!normalizedName) {
      showOwnerFeedback("Informe o nome do cliente.");
      return;
    }

    const alreadyExists = Boolean(newPhoneNormalized) && clients.some((client) => {
      const clientPhoneNormalized =
        client.phoneNormalized || normalizeClientPhone(client.phone);

      return clientPhoneNormalized === newPhoneNormalized;
    });

    if (alreadyExists) {
      showOwnerFeedback("Já existe um cliente cadastrado com este WhatsApp.");
      return;
    }

    const normalizedCpf = onlyDigits(clientData.cpf || "");

    if (
      normalizedCpf &&
      clients.some((client) => onlyDigits(client.cpf || "") === normalizedCpf)
    ) {
      showOwnerFeedback("Já existe um cliente cadastrado com este CPF.");
      return;
    }

    if (!tenantId) {
      showOwnerFeedback(
        "Não foi possível identificar a empresa para cadastrar o cliente.",
      );
      return;
    }

    const notes = "Cliente cadastrado manualmente pelo estabelecimento.";

    void (async () => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          tenant_id: tenantId,
          name: normalizedName,
          phone: newPhoneNormalized || null,
          cpf: normalizedCpf || null,
          birth_date: clientData.birthDate || null,
          notes,
        })
        .select(SUPABASE_CLIENTS_SELECT)
        .limit(1);

      if (error) {
        showOwnerFeedback(
          error.message || "Não foi possível cadastrar o cliente.",
        );
        return;
      }

      const savedRow = (
        Array.isArray(data) ? data[0] : null
      ) as SupabaseClientResponse | null;

      if (!savedRow) {
        showOwnerFeedback(
          "Cliente salvo, mas não foi possível recarregar o registro.",
        );
        void loadClientsFromSupabase(false);
        return;
      }

      const savedClient = mapSupabaseClientToAppClient(savedRow);
      const nextClients = [savedClient, ...clients];

      setClients(nextClients);

      onUpdateState({
        ...state,
        clients: nextClients,
      });
    })();
  };

  const handleUpdateClient = (
    clientId: string,
    updates: {
      name: string;
      phone: string;
      cpf?: string;
      birthDate?: string;
    },
  ): boolean => {
    const normalizedName = normalizeClientName(updates.name);
    const newPhoneNormalized = normalizeClientPhone(updates.phone);

    if (!normalizedName) {
      showOwnerFeedback("Informe o nome do cliente.");
      return false;
    }

    const alreadyExists = Boolean(newPhoneNormalized) && clients.some((client) => {
      const clientPhoneNormalized =
        client.phoneNormalized || normalizeClientPhone(client.phone);

      return (
        Boolean(newPhoneNormalized) &&
        client.id !== clientId &&
        clientPhoneNormalized === newPhoneNormalized
      );
    });

    if (alreadyExists) {
      showOwnerFeedback("Já existe outro cliente cadastrado com este WhatsApp.");
      return false;
    }

    const normalizedCpf = onlyDigits(updates.cpf || "");

    const cpfAlreadyExists = clients.some((client) => {
      return (
        client.id !== clientId &&
        Boolean(normalizedCpf) &&
        onlyDigits(client.cpf || "") === normalizedCpf
      );
    });

    if (cpfAlreadyExists) {
      showOwnerFeedback("Já existe outro cliente cadastrado com este CPF.");
      return false;
    }

    const previousClients = clients;

    const optimisticClients: Client[] = clients.map((client) => {
      if (client.id !== clientId) return client;

      const previousPhoneNormalized =
        client.phoneNormalized || normalizeClientPhone(client.phone);

      const phoneHistory =
        previousPhoneNormalized !== newPhoneNormalized
          ? Array.from(
              new Set(
                [
                  ...(client.phoneHistory || []),
                  previousPhoneNormalized,
                ].filter(Boolean),
              ),
            )
          : client.phoneHistory || [];

      return {
        ...client,
        name: normalizedName,
        phone: newPhoneNormalized,
        phoneNormalized: newPhoneNormalized,
        phoneHistory,
        cpf: normalizedCpf || undefined,
        birthDate: updates.birthDate,
      };
    });

    setClients(optimisticClients);

    onUpdateState({
      ...state,
      clients: optimisticClients,
    });

    void (async () => {
      const { data, error } = await supabase
        .from("clients")
        .update({
          name: normalizedName,
          phone: newPhoneNormalized || null,
          cpf: normalizedCpf || null,
          birth_date: updates.birthDate || null,
        })
        .eq("id", clientId)
        .select(SUPABASE_CLIENTS_SELECT)
        .limit(1);

      if (error) {
        showOwnerFeedback(
          error.message || "Não foi possível atualizar o cliente.",
        );
        setClients(previousClients);

        onUpdateState({
          ...state,
          clients: previousClients,
        });
        return;
      }

      const savedRow = (
        Array.isArray(data) ? data[0] : null
      ) as SupabaseClientResponse | null;

      if (!savedRow) {
        void loadClientsFromSupabase(false);
        return;
      }

      const savedClient = mapSupabaseClientToAppClient(savedRow);
      const syncedClients = optimisticClients.map((client) =>
        client.id === savedClient.id ? savedClient : client,
      );

      setClients(syncedClients);

      onUpdateState({
        ...state,
        clients: syncedClients,
      });
    })();

    return true;
  };

  const handleDeleteClient = async (clientId: string) => {
    const targetClient = clients.find((client) => client.id === clientId);

    if (!targetClient) {
      showOwnerFeedback("Cliente não encontrado.");
      return;
    }

    const previousClients = clients;
    const nextClients = clients.filter((client) => client.id !== clientId);

    setClients(nextClients);

    onUpdateState({
      ...state,
      clients: nextClients,
    });

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) {
      showOwnerFeedback(error.message || "Não foi possível excluir o cliente.");
      setClients(previousClients);

      onUpdateState({
        ...state,
        clients: previousClients,
      });
    }
  };

  const filteredClients = filterClients({
    clients,
    search: clientSearch,
  });

  return {
    clients,
    setClients,
    clientSearch,
    setClientSearch,
    filteredClients,
    isLoadingClients,
    clientsLoadError,
    loadClientsFromSupabase,
    handleAddManualClient,
    handleUpdateClient,
    handleDeleteClient,
  };
}