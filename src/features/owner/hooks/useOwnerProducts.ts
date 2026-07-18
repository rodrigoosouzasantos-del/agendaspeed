import { useEffect, useState, type FormEvent } from "react";

import { Product } from "../../../types";
import { supabase } from "../../../lib/supabase";
import {
  SUPABASE_PRODUCTS_SELECT,
  SupabaseProductResponse,
  mapSupabaseProductToAppProduct,
} from "../owner.data";

interface ConfirmationRequest {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "warning" | "danger";
  onConfirm: () => void | Promise<void>;
}

interface UseOwnerProductsParams {
  tenantId: string;
  showOwnerFeedback: (message: string, title?: string) => void;
  requestConfirmation: (confirmation: ConfirmationRequest) => void;
}

export function useOwnerProducts({
  tenantId,
  showOwnerFeedback,
  requestConfirmation,
}: UseOwnerProductsParams) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsLoadError, setProductsLoadError] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productCode, setProductCode] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productQuantity, setProductQuantity] = useState(0);
  const [productCostPrice, setProductCostPrice] = useState(0);
  const [productSalePrice, setProductSalePrice] = useState(0);
  const [productActive, setProductActive] = useState(true);
  const [productPopup, setProductPopup] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const loadProductsFromSupabase = async (showLoading = true) => {
    if (!tenantId) {
      setProducts([]);
      setProductsLoadError("");
      return [];
    }

    if (showLoading) {
      setIsLoadingProducts(true);
    }

    setProductsLoadError("");

    const { data, error } = await supabase
      .from("products")
      .select(SUPABASE_PRODUCTS_SELECT)
      .eq("tenant_id", tenantId)
      .order("code", { ascending: true })
      .order("description", { ascending: true });

    if (error) {
      console.error("Erro ao carregar produtos:", error.message);
      setProductsLoadError(error.message || "Erro ao carregar produtos.");
      setIsLoadingProducts(false);
      return [];
    }

    const nextProducts = (Array.isArray(data) ? data : []).map((row) =>
      mapSupabaseProductToAppProduct(row as SupabaseProductResponse),
    );

    setProducts(nextProducts);
    setIsLoadingProducts(false);
    return nextProducts;
  };

  useEffect(() => {
    if (!tenantId) {
      setProducts([]);
      setProductsLoadError("");
      setIsLoadingProducts(false);
      return;
    }

    void loadProductsFromSupabase(true);
    // Carrega produtos reais quando o tenant é identificado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const resetProductForm = () => {
    setProductCode("");
    setProductDescription("");
    setProductQuantity(0);
    setProductCostPrice(0);
    setProductSalePrice(0);
    setProductActive(true);
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    resetProductForm();
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductCode(product.code);
    setProductDescription(product.description);
    setProductQuantity(Number(product.quantity) || 0);
    setProductCostPrice(Number(product.costPrice) || 0);
    setProductSalePrice(Number(product.salePrice) || 0);
    setProductActive(product.active !== false);
    setShowProductModal(true);
  };

  const handleCloseProductModal = () => {
    if (isSavingProduct) return;

    setShowProductModal(false);
    setEditingProduct(null);
    resetProductForm();
  };

  const handleSaveProduct = async (event: FormEvent) => {
    event.preventDefault();

    if (!tenantId) {
      showOwnerFeedback("Não foi possível identificar a empresa ativa.");
      return;
    }

    const normalizedCode = productCode.trim().toUpperCase();
    const normalizedDescription = productDescription.trim();

    if (!normalizedCode || !normalizedDescription) {
      showOwnerFeedback("Informe o código e a descrição do produto.");
      return;
    }

    setIsSavingProduct(true);

    const productPayload = {
      tenant_id: tenantId,
      code: normalizedCode,
      description: normalizedDescription,
      quantity: Math.max(0, Number(productQuantity) || 0),
      cost_price: Math.max(0, Number(productCostPrice) || 0),
      sale_price: Math.max(0, Number(productSalePrice) || 0),
      active: productActive,
    };

    const productQuery = editingProduct
      ? supabase
          .from("products")
          .update(productPayload)
          .eq("tenant_id", tenantId)
          .eq("id", editingProduct.id)
      : supabase.from("products").insert(productPayload);

    const { data, error } = await productQuery
      .select(SUPABASE_PRODUCTS_SELECT)
      .single();

    if (error) {
      setIsSavingProduct(false);

      if (error.code === "23505") {
        setProductPopup({
          title: "Código já cadastrado",
          message: "Já existe um produto com esse código nesta empresa.",
        });
        return;
      }

      showOwnerFeedback(error.message || "Não foi possível salvar o produto.");
      return;
    }

    const savedProduct = mapSupabaseProductToAppProduct(
      data as SupabaseProductResponse,
    );

    setProducts((currentProducts) => {
      const productExists = currentProducts.some(
        (product) => product.id === savedProduct.id,
      );

      const nextProducts = productExists
        ? currentProducts.map((product) =>
            product.id === savedProduct.id ? savedProduct : product,
          )
        : [...currentProducts, savedProduct];

      return nextProducts.sort((firstProduct, secondProduct) =>
        firstProduct.code.localeCompare(secondProduct.code, "pt-BR", {
          numeric: true,
        }),
      );
    });

    setIsSavingProduct(false);
    setShowProductModal(false);
    setEditingProduct(null);
    resetProductForm();
  };

  const handleToggleProductActive = async (product: Product) => {
    if (!tenantId) return;

    const { data, error } = await supabase
      .from("products")
      .update({ active: !product.active })
      .eq("tenant_id", tenantId)
      .eq("id", product.id)
      .select(SUPABASE_PRODUCTS_SELECT)
      .single();

    if (error) {
      showOwnerFeedback(error.message || "Não foi possível alterar o status do produto.");
      return;
    }

    const savedProduct = mapSupabaseProductToAppProduct(
      data as SupabaseProductResponse,
    );

    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === savedProduct.id
          ? savedProduct
          : currentProduct,
      ),
    );
  };

  const handleDeleteProduct = (product: Product) => {
    if (!tenantId) return;

    requestConfirmation({
      title: "Excluir produto?",
      message: `Deseja excluir definitivamente o produto "${product.description}"? Esta ação não poderá ser desfeita.`,
      confirmLabel: "Sim, excluir",
      tone: "danger",
      onConfirm: async () => {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("tenant_id", tenantId)
          .eq("id", product.id);

        if (error) {
          showOwnerFeedback(
            error.message ||
              "Não foi possível excluir o produto. Ele pode estar vinculado a um recebimento.",
            "Produto não excluído",
          );
          return;
        }

        setProducts((currentProducts) =>
          currentProducts.filter(
            (currentProduct) => currentProduct.id !== product.id,
          ),
        );
      },
    });
  };


  return {
    products,
    isLoadingProducts,
    productsLoadError,
    showProductModal,
    editingProduct,
    isSavingProduct,
    productCode,
    productDescription,
    productQuantity,
    productCostPrice,
    productSalePrice,
    productActive,
    productPopup,
    setProductCode,
    setProductDescription,
    setProductQuantity,
    setProductCostPrice,
    setProductSalePrice,
    setProductActive,
    setProductPopup,
    handleOpenCreateProduct,
    handleEditProduct,
    handleCloseProductModal,
    handleSaveProduct,
    handleToggleProductActive,
    handleDeleteProduct,
  };
}
