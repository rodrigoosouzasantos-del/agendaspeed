import { useEffect, useState, type FormEvent } from "react";

import { Service } from "../../../types";
import { supabase } from "../../../lib/supabase";
import { OwnerDashboardProps } from "../owner.types";
import { ServiceActionResult } from "../components/ServicesView";
import {
  SupabaseServiceCategoryResponse,
  SupabaseServiceResponse,
  buildInitialServiceCategoryOrders,
  buildServicePayload,
  getInitialServiceCategories,
  getServiceDisplayOrder,
  mapSupabaseServiceToAppService,
  normalizeServiceCategoryName,
  sortServicesForDisplay,
} from "../owner.data";

interface UseOwnerServicesParams {
  state: OwnerDashboardProps["state"];
  onUpdateState: OwnerDashboardProps["onUpdateState"];
  showOwnerFeedback: (message: string, title?: string) => void;
}

export function useOwnerServices({
  state,
  onUpdateState,
  showOwnerFeedback,
}: UseOwnerServicesParams) {
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const services = liveServices;

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [serviceCategories, setServiceCategories] = useState<string[]>(() => {
    return getInitialServiceCategories(services);
  });
  const [serviceCategoryOrders, setServiceCategoryOrders] = useState<
    Record<string, number>
  >(() => {
    const initialCategories = getInitialServiceCategories(services);

    return buildInitialServiceCategoryOrders(initialCategories, services);
  });
  const [serviceCategoryStatuses, setServiceCategoryStatuses] = useState<
    Record<string, boolean>
  >(() => {
    return getInitialServiceCategories(services).reduce<Record<string, boolean>>(
      (accumulator, category) => {
        accumulator[normalizeServiceCategoryName(category)] = true;
        return accumulator;
      },
      {},
    );
  });

  const [servName, setServName] = useState("");
  const [servCategory, setServCategory] = useState(() => {
    return getInitialServiceCategories(services)[0] || "CABELO";
  });
  const [servDuration, setServDuration] = useState(30);
  const [servDisplayOrder, setServDisplayOrder] = useState(1);
  const [servPrice, setServPrice] = useState(50);
  const [servDescription, setServDescription] = useState("");
  const [servActive, setServActive] = useState(true);
  const [servRequireDeposit, setServRequireDeposit] = useState(false);
  const [servDepositValue, setServDepositValue] = useState<number>(10);

  const [isLoadingServices, setIsLoadingServices] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadServicesFromSupabase() {
      setIsLoadingServices(true);

      const [servicesResult, categoriesResult] = await Promise.all([
        supabase.rpc("get_my_services"),
        supabase.rpc("get_my_service_categories"),
      ]);

      if (!isMounted) return;

      if (servicesResult.error) {
        console.error(
          "Erro ao carregar serviços:",
          servicesResult.error.message,
        );
        setIsLoadingServices(false);
        return;
      }

      if (categoriesResult.error) {
        console.error(
          "Erro ao carregar categorias:",
          categoriesResult.error.message,
        );
      }

      const serviceRows = (
        Array.isArray(servicesResult.data) ? servicesResult.data : []
      ) as SupabaseServiceResponse[];
      const nextServices = serviceRows.map(mapSupabaseServiceToAppService);

      const categoryRows = (
        Array.isArray(categoriesResult.data) ? categoriesResult.data : []
      ) as SupabaseServiceCategoryResponse[];

      const nextCategories =
        categoryRows.length > 0
          ? categoryRows.map((category) =>
              normalizeServiceCategoryName(category.name),
            )
          : getInitialServiceCategories(nextServices);

      const nextCategoryOrders =
        categoryRows.length > 0
          ? categoryRows.reduce<Record<string, number>>(
              (accumulator, category, index) => {
                const normalizedCategory = normalizeServiceCategoryName(
                  category.name,
                );
                accumulator[normalizedCategory] =
                  Number(category.sort_order) || index + 1;
                return accumulator;
              },
              {},
            )
          : buildInitialServiceCategoryOrders(nextCategories, nextServices);

      const nextCategoryStatuses =
        categoryRows.length > 0
          ? categoryRows.reduce<Record<string, boolean>>(
              (accumulator, category) => {
                const normalizedCategory = normalizeServiceCategoryName(
                  category.name,
                );
                accumulator[normalizedCategory] = category.active !== false;
                return accumulator;
              },
              {},
            )
          : nextCategories.reduce<Record<string, boolean>>(
              (accumulator, category) => {
                accumulator[normalizeServiceCategoryName(category)] = true;
                return accumulator;
              },
              {},
            );

      setLiveServices(nextServices);
      setServiceCategories(nextCategories);
      setServiceCategoryOrders(nextCategoryOrders);
      setServiceCategoryStatuses(nextCategoryStatuses);

      if (
        !nextCategories.includes(normalizeServiceCategoryName(servCategory))
      ) {
        setServCategory(nextCategories[0] || "CABELO");
      }

      onUpdateState({
        ...state,
        services: nextServices,
      });

      setIsLoadingServices(false);
    }

    loadServicesFromSupabase();

    return () => {
      isMounted = false;
    };
    // Carrega serviços e categorias reais ao abrir o painel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetServiceForm = () => {
    setServName("");
    setServCategory(serviceCategories[0] || "CABELO");
    setServDuration(30);
    setServDisplayOrder(1);
    setServPrice(50);
    setServDescription("");
    setServActive(true);
    setServRequireDeposit(false);
    setServDepositValue(10);
  };


  const handleOpenCreateService = () => {
    setEditingService(null);
    resetServiceForm();
    setShowServiceModal(true);
  };

  const handleEditServiceTrigger = (service: Service) => {
    setEditingService(service);
    setServName(service.name);
    setServCategory(normalizeServiceCategoryName(service.category));
    setServDuration(service.duration);
    setServDisplayOrder(getServiceDisplayOrder(service));
    setServPrice(service.price);
    setServDescription(service.description);
    setServActive(service.active);
    setServRequireDeposit(service.requireDeposit);
    setServDepositValue(service.depositValue || 10);
    setShowServiceModal(true);
  };

  const handleAddNewService = async (event: FormEvent) => {
    event.preventDefault();

    if (!servName || !servCategory || !servPrice || !servDuration) {
      showOwnerFeedback("Favor preencher os dados do serviço.");
      return;
    }

    const normalizedCategory = normalizeServiceCategoryName(servCategory);
    const nextCategoryOrder =
      serviceCategoryOrders[normalizedCategory] ?? serviceCategories.length + 1;

    const serviceToSave = {
      id: editingService?.id || `serv-${Date.now()}`,
      name: servName,
      category: normalizedCategory,
      categoryOrder: nextCategoryOrder,
      displayOrder: Number(servDisplayOrder) || 999,
      duration: Number(servDuration) || 30,
      price: Number(servPrice) || 0,
      description: servDescription,
      professionals: editingService?.professionals || [],
      specificCommission: null,
      requireDeposit: servRequireDeposit,
      depositValue: servRequireDeposit ? Number(servDepositValue) || 0 : null,
      active: editingService ? servActive : true,
    } as Service;

    const { data, error } = await supabase.rpc("upsert_my_service", {
      p_service: buildServicePayload(serviceToSave),
    });

    if (error) {
      showOwnerFeedback(error.message || "Não foi possível salvar o serviço.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseServiceResponse | null;

    if (!savedRow?.id) {
      showOwnerFeedback("Serviço salvo, mas não foi possível recarregar o registro.");
      return;
    }

    const savedService = mapSupabaseServiceToAppService(savedRow);

    if (!serviceCategories.includes(normalizedCategory)) {
      setServiceCategories((currentCategories) => [
        ...currentCategories,
        normalizedCategory,
      ]);

      setServiceCategoryOrders((currentOrders) => ({
        ...currentOrders,
        [normalizedCategory]: nextCategoryOrder,
      }));
    }

    const nextServices = editingService
      ? services.map((service) => {
          return service.id === editingService.id ? savedService : service;
        })
      : [savedService, ...services];

    setLiveServices(nextServices);

    onUpdateState({
      ...state,
      services: nextServices,
    });

    setShowServiceModal(false);
    setEditingService(null);
    resetServiceForm();
  };


  const handleAddServiceCategory = async (
    categoryName: string,
  ): Promise<ServiceActionResult> => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);

    if (!normalizedCategory) {
      return {
        success: false,
        title: "Nome obrigatório",
        message: "Informe o nome da categoria para continuar.",
      };
    }

    if (serviceCategories.includes(normalizedCategory)) {
      return {
        success: false,
        title: "Categoria já cadastrada",
        message: "Use outro nome ou edite a categoria existente.",
      };
    }

    const nextOrder = Object.keys(serviceCategoryOrders).length + 1;

    const { error } = await supabase.rpc("upsert_my_service_category", {
      p_name: normalizedCategory,
      p_sort_order: nextOrder,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível cadastrar a categoria",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    setServiceCategories((currentCategories) => [
      ...currentCategories,
      normalizedCategory,
    ]);

    setServiceCategoryOrders((currentOrders) => ({
      ...currentOrders,
      [normalizedCategory]: nextOrder,
    }));

    setServiceCategoryStatuses((currentStatuses) => ({
      ...currentStatuses,
      [normalizedCategory]: true,
    }));

    setServCategory(normalizedCategory);

    return {
      success: true,
      title: "Categoria cadastrada",
      message: "A categoria já pode ser usada nos serviços e no carrossel da vitrine.",
    };
  };

  const handleRenameServiceCategory = async (
    currentName: string,
    newName: string,
  ): Promise<ServiceActionResult> => {
    const normalizedCurrentName = normalizeServiceCategoryName(currentName);
    const normalizedNewName = normalizeServiceCategoryName(newName);

    if (!normalizedNewName) {
      return {
        success: false,
        title: "Nome obrigatório",
        message: "Informe o novo nome da categoria.",
      };
    }

    const { data, error } = await supabase.rpc("rename_my_service_category", {
      p_current_name: normalizedCurrentName,
      p_new_name: normalizedNewName,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível alterar o nome",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      success?: boolean;
      message?: string;
      old_name?: string;
      new_name?: string;
    } | null;

    if (!result?.success) {
      return {
        success: false,
        title: "Nome não alterado",
        message: result?.message || "Verifique o nome informado.",
      };
    }

    setServiceCategories((currentCategories) =>
      currentCategories.map((category) =>
        category === normalizedCurrentName ? normalizedNewName : category,
      ),
    );

    setServiceCategoryOrders((currentOrders) => {
      const nextOrders = { ...currentOrders };
      nextOrders[normalizedNewName] = nextOrders[normalizedCurrentName] ?? 999;
      delete nextOrders[normalizedCurrentName];
      return nextOrders;
    });

    setServiceCategoryStatuses((currentStatuses) => {
      const nextStatuses = { ...currentStatuses };
      nextStatuses[normalizedNewName] =
        nextStatuses[normalizedCurrentName] !== false;
      delete nextStatuses[normalizedCurrentName];
      return nextStatuses;
    });

    const nextServices = services.map((service) => {
      if (
        normalizeServiceCategoryName(service.category) !== normalizedCurrentName
      ) {
        return service;
      }

      return {
        ...service,
        category: normalizedNewName,
      };
    });

    setLiveServices(nextServices);

    onUpdateState({
      ...state,
      services: nextServices,
    });

    if (servCategory === normalizedCurrentName) {
      setServCategory(normalizedNewName);
    }

    return {
      success: true,
      title: "Nome da categoria alterado",
      message: "O novo nome já será usado nos serviços e no carrossel da vitrine.",
    };
  };

  const handleToggleServiceCategoryActive = async (
    categoryName: string,
  ): Promise<ServiceActionResult> => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);
    const nextActive = serviceCategoryStatuses[normalizedCategory] === false;

    const { data, error } = await supabase.rpc(
      "set_my_service_category_active",
      {
        p_name: normalizedCategory,
        p_active: nextActive,
      },
    );

    if (error) {
      return {
        success: false,
        title: "Não foi possível alterar a categoria",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      success?: boolean;
      message?: string;
      active?: boolean;
    } | null;

    if (!result?.success) {
      return {
        success: false,
        title: "Alteração não concluída",
        message: result?.message || "Tente novamente em alguns instantes.",
      };
    }

    setServiceCategoryStatuses((currentStatuses) => ({
      ...currentStatuses,
      [normalizedCategory]: nextActive,
    }));

    let nextServices = services;

    if (!nextActive) {
      nextServices = services.map((service) => {
        if (
          normalizeServiceCategoryName(service.category) !== normalizedCategory
        ) {
          return service;
        }

        return {
          ...service,
          active: false,
        };
      });

      setLiveServices(nextServices);

      onUpdateState({
        ...state,
        services: nextServices,
      });
    }

    return {
      success: true,
      title: nextActive ? "Categoria ativada" : "Categoria desativada",
      message: nextActive
        ? "A categoria voltou ao cadastro. Ative manualmente os serviços que deseja exibir."
        : "A categoria e todos os serviços vinculados foram retirados da vitrine.",
    };
  };

  const handleToggleServiceActive = async (
    service: Service,
  ): Promise<ServiceActionResult> => {
    const serviceToSave: Service = {
      ...service,
      active: !service.active,
    };

    const { data, error } = await supabase.rpc("upsert_my_service", {
      p_service: buildServicePayload(serviceToSave),
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível alterar o serviço",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseServiceResponse | null;

    if (!savedRow?.id) {
      return {
        success: false,
        title: "Alteração não confirmada",
        message: "O serviço foi processado, mas o cadastro atualizado não retornou.",
      };
    }

    const savedService = mapSupabaseServiceToAppService(savedRow);
    const nextServices = services.map((currentService) => {
      return currentService.id === savedService.id ? savedService : currentService;
    });

    setLiveServices(nextServices);
    onUpdateState({
      ...state,
      services: nextServices,
    });

    return {
      success: true,
      title: savedService.active ? "Serviço ativado" : "Serviço desativado",
      message: savedService.active
        ? "O serviço voltou a aparecer na vitrine para novos agendamentos."
        : "O serviço foi retirado da vitrine, mas o histórico foi preservado.",
    };
  };

  const handleDeleteService = async (
    service: Service,
  ): Promise<ServiceActionResult> => {
    const { data, error } = await supabase.rpc("delete_my_service", {
      p_service_id: service.id,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível excluir o serviço",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      success?: boolean;
      message?: string;
      code?: string;
    } | null;

    if (!result?.success) {
      return {
        success: false,
        title:
          result?.code === "HAS_APPOINTMENTS"
            ? "Este serviço possui histórico"
            : "Não foi possível excluir o serviço",
        message:
          result?.message ||
          "Desative o serviço para removê-lo da vitrine sem perder informações antigas.",
      };
    }

    const nextServices = services.filter((currentService) => {
      return currentService.id !== service.id;
    });

    setLiveServices(nextServices);
    onUpdateState({
      ...state,
      services: nextServices,
    });

    return {
      success: true,
      title: "Serviço excluído",
      message: "O serviço foi removido definitivamente do cadastro.",
    };
  };

  const handleDeleteServiceCategory = async (
    categoryName: string,
  ): Promise<ServiceActionResult> => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);

    const { data, error } = await supabase.rpc("delete_my_service_category", {
      p_name: normalizedCategory,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível excluir a categoria",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      success?: boolean;
      message?: string;
      code?: string;
    } | null;

    if (!result?.success) {
      return {
        success: false,
        title:
          result?.code === "HAS_SERVICES"
            ? "Esta categoria ainda possui serviços"
            : "Não foi possível excluir a categoria",
        message:
          result?.message ||
          "Mova ou exclua os serviços vinculados antes de remover a categoria.",
      };
    }

    setServiceCategories((currentCategories) => {
      const nextCategories = currentCategories.filter((category) => {
        return category !== normalizedCategory;
      });

      if (servCategory === normalizedCategory) {
        setServCategory(nextCategories[0] || "");
      }

      return nextCategories;
    });

    setServiceCategoryOrders((currentOrders) => {
      const nextOrders = { ...currentOrders };
      delete nextOrders[normalizedCategory];
      return nextOrders;
    });

    setServiceCategoryStatuses((currentStatuses) => {
      const nextStatuses = { ...currentStatuses };
      delete nextStatuses[normalizedCategory];
      return nextStatuses;
    });

    return {
      success: true,
      title: "Categoria excluída",
      message: "A categoria foi removida definitivamente do cadastro.",
    };
  };

  const handleChangeServiceCategoryOrder = async (
    categoryName: string,
    order: number,
  ): Promise<ServiceActionResult> => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);
    const normalizedOrder = Number.isFinite(order) && order > 0 ? order : 999;

    setServiceCategoryOrders((currentOrders) => ({
      ...currentOrders,
      [normalizedCategory]: normalizedOrder,
    }));

    const { error } = await supabase.rpc("upsert_my_service_category", {
      p_name: normalizedCategory,
      p_sort_order: normalizedOrder,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível salvar a ordem",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const updatedServices = services.map((service) => {
      if (
        normalizeServiceCategoryName(service.category) !== normalizedCategory
      ) {
        return service;
      }

      return {
        ...service,
        categoryOrder: normalizedOrder,
      };
    });

    setLiveServices(updatedServices);

    onUpdateState({
      ...state,
      services: updatedServices,
    });

    return {
      success: true,
      title: "Ordem atualizada",
      message: "A posição da categoria no carrossel foi salva.",
    };
  };

  const sortedServices = sortServicesForDisplay({
    services,
    categoryOrders: serviceCategoryOrders,
  });

  return {
    services,
    sortedServices,
    isLoadingServices,
    showServiceModal,
    setShowServiceModal,
    editingService,
    setEditingService,
    serviceCategories,
    serviceCategoryOrders,
    serviceCategoryStatuses,
    servName,
    servCategory,
    servDuration,
    servDisplayOrder,
    servPrice,
    servDescription,
    servActive,
    servRequireDeposit,
    servDepositValue,
    setServName,
    setServCategory,
    setServDuration,
    setServDisplayOrder,
    setServPrice,
    setServDescription,
    setServActive,
    setServRequireDeposit,
    setServDepositValue,
    handleOpenCreateService,
    handleEditServiceTrigger,
    handleAddNewService,
    handleAddServiceCategory,
    handleRenameServiceCategory,
    handleToggleServiceCategoryActive,
    handleToggleServiceActive,
    handleDeleteService,
    handleDeleteServiceCategory,
    handleChangeServiceCategoryOrder,
  };
}
