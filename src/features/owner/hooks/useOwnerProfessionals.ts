import { Dispatch, SetStateAction, useEffect, useState, type FormEvent } from "react";

import {
  Professional,
  ProfessionalPermissionsClass,
  RemunerationType,
  Service,
} from "../../../types";
import { supabase } from "../../../lib/supabase";
import { OwnerDashboardProps, OwnerTab } from "../owner.types";
import {
  SupabaseProfessionalResponse,
  buildProfessionalPayload,
  defaultProfessionalPermissions,
  isValidUuid,
  legacyDataUrlToPreparedImage,
  mapSupabaseProfessionalToAppProfessional,
  normalizeProfessionalPermissions,
  uploadTenantPublicImage,
} from "../owner.data";
import {
  buildWeeklyScheduleFromLegacyFields,
  deriveLegacyScheduleFields,
  getProfessionalWeeklySchedule,
} from "../../../lib/professionalSchedule";
import type { ProfessionalWeeklySchedule } from "../../../lib/professionalSchedule";

function buildDefaultProfessionalWeeklySchedule(): ProfessionalWeeklySchedule {
  return buildWeeklyScheduleFromLegacyFields({
    workDays: [1, 2, 3, 4, 5, 6],
    workHoursStart: "09:00",
    workHoursEnd: "19:00",
  });
}

interface ConfirmationRequest {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "warning" | "danger";
  onConfirm: () => void | Promise<void>;
}

interface UseOwnerProfessionalsParams {
  tenantId: string;
  state: OwnerDashboardProps["state"];
  onUpdateState: OwnerDashboardProps["onUpdateState"];
  services: Service[];
  showOwnerFeedback: (message: string, title?: string) => void;
  requestConfirmation: (confirmation: ConfirmationRequest) => void;
  setActiveTab: Dispatch<SetStateAction<OwnerTab>>;
  setQuickOpenProfessionalAgendaId: Dispatch<SetStateAction<string>>;
  setQuickOpenProfessionalAgendaKey: Dispatch<SetStateAction<number>>;
}

export function useOwnerProfessionals({
  tenantId,
  state,
  onUpdateState,
  services,
  showOwnerFeedback,
  requestConfirmation,
  setActiveTab,
  setQuickOpenProfessionalAgendaId,
  setQuickOpenProfessionalAgendaKey,
}: UseOwnerProfessionalsParams) {
  const [liveProfessionals, setLiveProfessionals] = useState<Professional[]>([]);
  const professionals = liveProfessionals;

  const [showProfModal, setShowProfModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] =
    useState<Professional | null>(null);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);
  const [professionalPendingHardDelete, setProfessionalPendingHardDelete] =
    useState<Professional | null>(null);
  const [isDeletingProfessional, setIsDeletingProfessional] = useState(false);

  const [profName, setProfName] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profRole, setProfRole] = useState("");
  const [profAvatar, setProfAvatar] = useState("");
  const [profActive, setProfActive] = useState(true);
  const [profDisplayOrder, setProfDisplayOrder] = useState(1);
  const [profWeeklySchedule, setProfWeeklySchedule] =
    useState<ProfessionalWeeklySchedule>(buildDefaultProfessionalWeeklySchedule());
  const [profLunchStart, setProfLunchStart] = useState("12:00");
  const [profLunchEnd, setProfLunchEnd] = useState("13:00");
  const [profNoLunchBreak, setProfNoLunchBreak] = useState(false);
  const [profDefaultAppointmentDuration, setProfDefaultAppointmentDuration] =
    useState(30);
  const [profServicesIds, setProfServicesIds] = useState<string[]>([]);
  const [profRemType, setProfRemType] =
    useState<RemunerationType>("no_commission");
  const [profRemValue, setProfRemValue] = useState(0);
  const [profChairRental, setProfChairRental] = useState(0);

  const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);
  const [isSavingProfessional, setIsSavingProfessional] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfessionalsFromSupabase() {
      setIsLoadingProfessionals(true);

      const { data, error } = await supabase.rpc("get_my_professionals");

      if (!isMounted) return;

      if (error) {
        console.error("Erro ao carregar profissionais:", error.message);
        setIsLoadingProfessionals(false);
        return;
      }

      const rows = (
        Array.isArray(data) ? data : []
      ) as SupabaseProfessionalResponse[];
      const nextProfessionals = rows.map(
        mapSupabaseProfessionalToAppProfessional,
      );

      setLiveProfessionals(nextProfessionals);

      onUpdateState({
        ...state,
        professionals: nextProfessionals,
      });

      setIsLoadingProfessionals(false);
    }

    loadProfessionalsFromSupabase();

    return () => {
      isMounted = false;
    };
    // Carrega profissionais reais ao abrir o painel. Serviços e agendas serão ligados em etapas seguintes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetProfessionalForm = () => {
    setProfName("");
    setProfPhone("");
    setProfEmail("");
    setProfRole("");
    setProfAvatar("");
    setProfActive(true);
    setProfDisplayOrder(1);
    setProfWeeklySchedule(buildDefaultProfessionalWeeklySchedule());
    setProfLunchStart("12:00");
    setProfLunchEnd("13:00");
    setProfNoLunchBreak(false);
    setProfDefaultAppointmentDuration(30);
    setProfServicesIds([]);
    setProfRemType("no_commission");
    setProfRemValue(0);
    setProfChairRental(0);
  };


  const handleOpenCreateProfessional = () => {
    setEditingProf(null);
    resetProfessionalForm();
    setShowProfModal(true);
  };

  const handleEditProfTrigger = (professional: Professional) => {
    setEditingProf(professional);
    setProfName(professional.name);
    setProfPhone(professional.phone);
    setProfEmail(professional.email);
    setProfRole(professional.role);
    setProfAvatar(professional.avatar);
    setProfActive(professional.active);
    setProfDisplayOrder(
      Number(
        (professional as unknown as Record<string, unknown>).displayOrder,
      ) || 999,
    );
    setProfWeeklySchedule(getProfessionalWeeklySchedule(professional));
    setProfLunchStart(professional.lunchStart);
    setProfLunchEnd(professional.lunchEnd);
    setProfNoLunchBreak(Boolean(professional.noLunchBreak));
    setProfDefaultAppointmentDuration(
      Number(professional.defaultAppointmentDuration) || 30,
    );
    setProfServicesIds(professional.services);
    setProfRemType(
      professional.remType === "commission_fixed"
        ? "commission_fixed"
        : professional.remType === "no_commission"
          ? "no_commission"
        : "commission_percent",
    );
    setProfRemValue(
      professional.remType === "no_commission"
        ? 0
        : Number(professional.remValue) || 0,
    );
    setProfChairRental(0);
    setShowProfModal(true);
  };

  const handleAddNewProf = async (
    event: FormEvent,
    media: {
      avatarFile: File | null;
      removeAvatar: boolean;
    },
  ) => {
    event.preventDefault();

    if (isSavingProfessional) return;

    if (!profName || !profPhone || !profRole) {
      showOwnerFeedback("Favor inserir nome, WhatsApp e cargo do profissional.");
      return;
    }

    if (!tenantId) {
      showOwnerFeedback("Não foi possível identificar a empresa para salvar a foto.");
      return;
    }

    setIsSavingProfessional(true);

    try {
      const existingAvatar = editingProf?.avatar || profAvatar.trim();
      const initialAvatar = media.removeAvatar ? "" : existingAvatar;
      const legacyScheduleFields = deriveLegacyScheduleFields(profWeeklySchedule);

      const professionalToSave: Professional = {
        id: editingProf?.id || "",
        name: profName,
        phone: profPhone,
        email: profEmail || editingProf?.email || "",
        role: profRole,
        displayOrder: Number(profDisplayOrder) || 999,
        avatar: initialAvatar,
        active: editingProf ? profActive : true,
        weeklySchedule: profWeeklySchedule,
        workDays: legacyScheduleFields.workDays,
        workHoursStart: legacyScheduleFields.workHoursStart,
        workHoursEnd: legacyScheduleFields.workHoursEnd,
        lunchStart: profLunchStart,
        lunchEnd: profLunchEnd,
        noLunchBreak: profNoLunchBreak,
        defaultAppointmentDuration:
          Number(profDefaultAppointmentDuration) || 30,
        services: profServicesIds,
        remType: (profRemType === "commission_fixed"
          ? "commission_fixed"
          : profRemType === "no_commission"
            ? "no_commission"
            : "commission_percent") as RemunerationType,
        remValue:
          profRemType === "no_commission" ? 0 : Number(profRemValue) || 0,
        chairRentalValue: editingProf?.chairRentalValue || 0,
        chairRentalStatus: editingProf?.chairRentalStatus || "inactive",
        permissions: normalizeProfessionalPermissions(
          editingProf?.permissions || defaultProfessionalPermissions,
        ),
      };

      const firstSaveResult = await supabase.rpc("upsert_my_professional", {
        p_professional: buildProfessionalPayload(professionalToSave),
      });

      if (firstSaveResult.error) {
        throw new Error(
          firstSaveResult.error.message ||
            "Não foi possível salvar o profissional.",
        );
      }

      const firstSavedRow = (
        Array.isArray(firstSaveResult.data) ? firstSaveResult.data[0] : null
      ) as SupabaseProfessionalResponse | null;

      if (!firstSavedRow?.id) {
        throw new Error(
          "Profissional salvo, mas não foi possível recarregar o registro.",
        );
      }

      let finalSavedRow = firstSavedRow;
      let avatarFileToUpload = media.avatarFile;

      if (
        !avatarFileToUpload &&
        !media.removeAvatar &&
        existingAvatar.startsWith("data:image/")
      ) {
        avatarFileToUpload = await legacyDataUrlToPreparedImage({
          dataUrl: existingAvatar,
          maxWidth: 600,
          maxHeight: 600,
          maxOutputBytes: 200 * 1024,
          outputFileName: "avatar.webp",
        });
      }

      if (avatarFileToUpload) {
        const avatarUrl = await uploadTenantPublicImage({
          bucket: "professional-avatars",
          path: `${tenantId}/${firstSavedRow.id}.webp`,
          file: avatarFileToUpload,
        });

        const professionalWithAvatar: Professional = {
          ...mapSupabaseProfessionalToAppProfessional(firstSavedRow),
          avatar: avatarUrl,
        };

        const avatarSaveResult = await supabase.rpc("upsert_my_professional", {
          p_professional: buildProfessionalPayload(professionalWithAvatar),
        });

        if (avatarSaveResult.error) {
          throw new Error(
            avatarSaveResult.error.message ||
              "A foto foi enviada, mas não foi possível vinculá-la ao profissional.",
          );
        }

        const avatarSavedRow = (
          Array.isArray(avatarSaveResult.data)
            ? avatarSaveResult.data[0]
            : null
        ) as SupabaseProfessionalResponse | null;

        if (!avatarSavedRow?.id) {
          throw new Error(
            "A foto foi enviada, mas o cadastro atualizado não retornou.",
          );
        }

        finalSavedRow = avatarSavedRow;
      } else if (media.removeAvatar) {
        const { error: removeError } = await supabase.storage
          .from("professional-avatars")
          .remove([`${tenantId}/${firstSavedRow.id}.webp`]);

        if (removeError) {
          console.warn(
            "O cadastro ficou sem foto, mas o arquivo antigo não pôde ser removido:",
            removeError.message,
          );
        }
      }

      const savedProfessional =
        mapSupabaseProfessionalToAppProfessional(finalSavedRow);

      const nextProfessionals = editingProf
        ? professionals.map((professional) => {
            return professional.id === editingProf.id
              ? savedProfessional
              : professional;
          })
        : [savedProfessional, ...professionals];

      setLiveProfessionals(nextProfessionals);

      onUpdateState({
        ...state,
        professionals: nextProfessionals,
      });

      setShowProfModal(false);
      setEditingProf(null);
      resetProfessionalForm();
    } catch (error) {
      console.error("Erro ao salvar profissional:", error);
      showOwnerFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o profissional.",
      );
    } finally {
      setIsSavingProfessional(false);
    }
  };

  const handleDeleteProf = (professionalId: string) => {
    const targetProfessional = professionals.find(
      (professional) => professional.id === professionalId,
    );

    requestConfirmation({
      title: "Inativar profissional?",
      message: targetProfessional
        ? `Deseja inativar ${targetProfessional.name}? O profissional ficará sem acesso à agenda até ser ativado novamente.`
        : "Deseja inativar este profissional?",
      confirmLabel: "Sim, inativar",
      tone: "warning",
      onConfirm: async () => {
        if (!isValidUuid(professionalId)) {
          const updatedProfessionals = professionals.filter((professional) => {
            return professional.id !== professionalId;
          });

          setLiveProfessionals(updatedProfessionals);

          onUpdateState({
            ...state,
            professionals: updatedProfessionals,
          });

          return;
        }

        const { data, error } = await supabase.rpc("deactivate_my_professional", {
          p_professional_id: professionalId,
        });

        if (error) {
          showOwnerFeedback(
            error.message || "Não foi possível inativar o profissional.",
            "Profissional não inativado",
          );
          return;
        }

        const savedRow = (
          Array.isArray(data) ? data[0] : null
        ) as SupabaseProfessionalResponse | null;
        const savedProfessional = savedRow?.id
          ? mapSupabaseProfessionalToAppProfessional(savedRow)
          : null;

        const updatedProfessionals = professionals.map((professional) => {
          if (professional.id !== professionalId) {
            return professional;
          }

          return (
            savedProfessional || {
              ...professional,
              active: false,
            }
          );
        });

        setLiveProfessionals(updatedProfessionals);

        onUpdateState({
          ...state,
          professionals: updatedProfessionals,
        });
      },
    });
  };

  const handleHardDeleteProf = (professionalId: string) => {
    const targetProfessional = professionals.find((professional) => {
      return professional.id === professionalId;
    });

    if (!targetProfessional) {
      showOwnerFeedback("Profissional não encontrado.");
      return;
    }

    setProfessionalPendingHardDelete(targetProfessional);
  };

  const handleCancelHardDeleteProfessional = () => {
    if (isDeletingProfessional) return;

    setProfessionalPendingHardDelete(null);
  };

  const handleConfirmHardDeleteProfessional = async () => {
    const targetProfessional = professionalPendingHardDelete;

    if (!targetProfessional || isDeletingProfessional) {
      return;
    }

    setIsDeletingProfessional(true);

    try {
      if (!isValidUuid(targetProfessional.id)) {
        const updatedProfessionals = professionals.filter((professional) => {
          return professional.id !== targetProfessional.id;
        });

        setLiveProfessionals(updatedProfessionals);

        onUpdateState({
          ...state,
          professionals: updatedProfessionals,
        });

        setProfessionalPendingHardDelete(null);
        return;
      }

      const { error } = await supabase.rpc("delete_my_professional", {
        p_professional_id: targetProfessional.id,
      });

      if (error) {
        showOwnerFeedback(
          error.message ||
            "Não foi possível excluir o profissional. Verifique se existem agendamentos vinculados a ele.",
        );
        return;
      }

      const updatedProfessionals = professionals.filter((professional) => {
        return professional.id !== targetProfessional.id;
      });

      setLiveProfessionals(updatedProfessionals);

      onUpdateState({
        ...state,
        professionals: updatedProfessionals,
      });

      setProfessionalPendingHardDelete(null);
    } finally {
      setIsDeletingProfessional(false);
    }
  };

  const handleOpenProfessionalAgenda = (professional: Professional) => {
    if (!professional.active) {
      showOwnerFeedback("Este profissional está inativo e sem acesso à agenda.");
      return;
    }

    setQuickOpenProfessionalAgendaId(professional.id);
    setQuickOpenProfessionalAgendaKey((currentKey) => currentKey + 1);
    setActiveTab("agenda");
  };

  const handleGenerateProfessionalAccessLink = async (
    professional: Professional,
  ) => {
    if (!professional.id || !isValidUuid(professional.id)) {
      showOwnerFeedback(
        "Este profissional ainda é um registro local/de teste. Salve ou recadastre o profissional no Supabase antes de gerar o link de acesso.",
      );
      return;
    }

    const { data, error } = await supabase.rpc(
      "generate_my_professional_access_token",
      {
        p_professional_id: professional.id,
      },
    );

    if (error) {
      showOwnerFeedback(error.message || "Não foi possível gerar o link do profissional.");
      return;
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      professional_id?: string;
      professional_name?: string;
      token?: string;
      link_local?: string;
      link_futuro?: string;
      success?: boolean;
      message?: string;
    } | null;

    const productionOrigin = "https://AgendaBless.com.br";
    const professionalAccessLink = result?.token
      ? `${productionOrigin}/profissional-acesso/${result.token}`
      : String(result?.link_futuro || result?.link_local || "").replace(
          /^https?:\/\/localhost(?::\d+)?/i,
          productionOrigin,
        );

    if (!result?.success || !professionalAccessLink) {
      showOwnerFeedback(
        result?.message || "Não foi possível gerar o link do profissional.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(professionalAccessLink);
      showOwnerFeedback(
        `Link do profissional copiado para a área de transferência:

${professionalAccessLink}`,
      );
    } catch {
      showOwnerFeedback(`Link do profissional gerado:

${professionalAccessLink}`);
    }
  };


  const handleTogglePermission = async (
    professionalId: string,
    flag: keyof Professional["permissions"],
  ) => {
    const targetProfessional = professionals.find((professional) => {
      return professional.id === professionalId;
    });

    if (!targetProfessional) return;

    const updatedProfessional: Professional = {
      ...targetProfessional,
      permissions: {
        ...targetProfessional.permissions,
        [flag]: !targetProfessional.permissions[flag],
      },
    };

    const { data, error } = await supabase.rpc("upsert_my_professional", {
      p_professional: buildProfessionalPayload(updatedProfessional),
    });

    if (error) {
      showOwnerFeedback(error.message || "Não foi possível salvar a permissão.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseProfessionalResponse | null;
    const savedProfessional = savedRow?.id
      ? mapSupabaseProfessionalToAppProfessional(savedRow)
      : updatedProfessional;

    const updatedProfessionals = professionals.map((professional) => {
      return professional.id === professionalId
        ? savedProfessional
        : professional;
    });

    setLiveProfessionals(updatedProfessionals);

    onUpdateState({
      ...state,
      professionals: updatedProfessionals,
    });

    setShowPermissionModal(savedProfessional);
  };

  const handlePermissionClassChange = async (
    professionalId: string,
    value: ProfessionalPermissionsClass,
  ) => {
    const targetProfessional = professionals.find((professional) => {
      return professional.id === professionalId;
    });

    if (!targetProfessional) return;

    const updatedProfessional: Professional = {
      ...targetProfessional,
      permissions: {
        ...targetProfessional.permissions,
        manageOwnCalendar: value,
      },
    };

    const { data, error } = await supabase.rpc("upsert_my_professional", {
      p_professional: buildProfessionalPayload(updatedProfessional),
    });

    if (error) {
      showOwnerFeedback(error.message || "Não foi possível salvar a permissão.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseProfessionalResponse | null;
    const savedProfessional = savedRow?.id
      ? mapSupabaseProfessionalToAppProfessional(savedRow)
      : updatedProfessional;

    const updatedProfessionals = professionals.map((professional) => {
      return professional.id === professionalId
        ? savedProfessional
        : professional;
    });

    setLiveProfessionals(updatedProfessionals);

    onUpdateState({
      ...state,
      professionals: updatedProfessionals,
    });

    setShowPermissionModal(savedProfessional);
  };

  const handleApplySimplePermissions = async (
    professionalId: string,
    action: "manage_agenda" | "read_only" | "reports",
  ) => {
    const targetProfessional = professionals.find((professional) => {
      return professional.id === professionalId;
    });

    if (!targetProfessional) return;

    const currentCanViewReports =
      targetProfessional.permissions.viewFinancial ||
      targetProfessional.permissions.viewCommission;

    let nextPermissions: Professional["permissions"];

    if (action === "manage_agenda") {
      nextPermissions = {
        ...targetProfessional.permissions,
        viewOwnCalendar: true,
        createAppts: true,
        rescheduleAppts: true,
        cancelAppts: true,
        blockCalendar: true,
        openSpots: true,
        manageOwnCalendar: "yes" as ProfessionalPermissionsClass,
        viewChairRental: false,
      };
    } else if (action === "read_only") {
      nextPermissions = {
        ...targetProfessional.permissions,
        viewOwnCalendar: true,
        createAppts: false,
        rescheduleAppts: false,
        cancelAppts: false,
        blockCalendar: false,
        openSpots: false,
        manageOwnCalendar: "no" as ProfessionalPermissionsClass,
        viewChairRental: false,
      };
    } else {
      nextPermissions = {
        ...targetProfessional.permissions,
        viewFinancial: !currentCanViewReports,
        viewCommission: !currentCanViewReports,
        viewChairRental: false,
      };
    }

    const updatedProfessional: Professional = {
      ...targetProfessional,
      permissions: nextPermissions,
    };

    const { data, error } = await supabase.rpc("upsert_my_professional", {
      p_professional: buildProfessionalPayload(updatedProfessional),
    });

    if (error) {
      showOwnerFeedback(error.message || "Não foi possível salvar as permissões.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseProfessionalResponse | null;
    const savedProfessional = savedRow?.id
      ? mapSupabaseProfessionalToAppProfessional(savedRow)
      : updatedProfessional;

    const updatedProfessionals = professionals.map((professional) => {
      return professional.id === professionalId
        ? savedProfessional
        : professional;
    });

    setLiveProfessionals(updatedProfessionals);

    onUpdateState({
      ...state,
      professionals: updatedProfessionals,
    });

    setShowPermissionModal(savedProfessional);
  };


  return {
    professionals,
    isLoadingProfessionals,
    isSavingProfessional,
    showProfModal,
    setShowProfModal,
    showPermissionModal,
    setShowPermissionModal,
    editingProf,
    setEditingProf,
    professionalPendingHardDelete,
    isDeletingProfessional,
    profName,
    profPhone,
    profEmail,
    profRole,
    profAvatar,
    profActive,
    profDisplayOrder,
    profWeeklySchedule,
    profLunchStart,
    profLunchEnd,
    profNoLunchBreak,
    profDefaultAppointmentDuration,
    profServicesIds,
    profRemType,
    profRemValue,
    setProfName,
    setProfPhone,
    setProfEmail,
    setProfRole,
    setProfAvatar,
    setProfActive,
    setProfDisplayOrder,
    setProfWeeklySchedule,
    setProfLunchStart,
    setProfLunchEnd,
    setProfNoLunchBreak,
    setProfDefaultAppointmentDuration,
    setProfServicesIds,
    setProfRemType,
    setProfRemValue,
    handleOpenCreateProfessional,
    handleEditProfTrigger,
    handleAddNewProf,
    handleDeleteProf,
    handleHardDeleteProf,
    handleCancelHardDeleteProfessional,
    handleConfirmHardDeleteProfessional,
    handleOpenProfessionalAgenda,
    handleGenerateProfessionalAccessLink,
    handleTogglePermission,
    handlePermissionClassChange,
    handleApplySimplePermissions,
  };
}