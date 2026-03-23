let allProducts = [];
let accessibleStores = [];
let currentStoreScope = null; // null = all accessible, otherwise specific store id

async function loadProductsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadAccessibleStores(profile);
  configureProductPermissions(profile);
  await loadProducts(profile);
  bindProductEvents();
}

function getRole() {
  return String(currentProfile?.role || "").toLowerCase();
}

function isDirector() {
  return getRole() === "director";
}

function isManager() {
  return getRole() === "manager" || getRole() === "store_manager";
}

function isSalesRep() {
  return getRole() === "sales_rep";
}

function canAddProducts() {
  return isDirector() || isManager();
}

function canEditProducts() {
  return isDirector() || isManager();
}

function canDeleteProducts() {
  return isDirector();
}

function canAdjustPrice() {
  return isDirector();
}

function canViewAllStores() {
  return isDirector();
}

async function loadAccessibleStores(profile) {
  const productStore = document.getElementById("productStore");
  const storeFilter = document.getElementById("productStoreFilter");

  if (!productStore || !storeFilter) return;

  productStore.innerHTML = `<option value="">Select store</option>`;
  storeFilter.innerHTML = `<option value="">All Products</option>`;

  if (!profile.company_id) {
    accessibleStores = [];
    return;
  }

  if (canViewAllStores()) {
    const { data, error } = await supabaseClient
      .from("stores")
      .select("id, name, address")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD STORES ERROR:", error);
      accessibleStores = [];
      return;
    }

    accessibleStores = data || [];
  } else {
    // staff only sees assigned store through staff_store_access first, then fallback to single store in invitations accepted context not handled here
    let assignedStoreIds = [];

    const accessRes = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("user_id", currentUser.id);

    if (!accessRes.error && accessRes.data?.length) {
      assignedStoreIds = accessRes.data.map((row) => row.store_id).filter(Boolean);
    }

    // Fallback: if no explicit access rows, try infer from stores in same company and let manager/sales see company store filter if only one store exists
    if (!assignedStoreIds.length) {
      const storeRes = await supabaseClient
        .from("stores")
        .select("id, name, address")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (!storeRes.error) {
        const stores = storeRes.data || [];
        if (stores.length === 1) {
          accessibleStores = stores;
          assignedStoreIds = [stores[0].id];
        } else {
          accessibleStores = stores.filter(() => false);
        }
      }
    }

    if (assignedStoreIds.length) {
      const { data, error } = await supabaseClient
        .from("stores")
        .select("id, name, address")
        .in("id", assignedStoreIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("LOAD ASSIGNED STORES ERROR:", error);
        accessibleStores = [];
      } else {
        accessibleStores = data || [];
      }
    }
  }

  accessibleStores.forEach((store) => {
    const option1 = document.createElement("option");
    option1.value = store.id;
    option1.textContent = store.name;
    productStore.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = store.id;
    option2.textContent = store.name;
    storeFilter.appendChild(option2);
  });

  if (!canViewAllStores() && accessibleStores.length === 1) {
    currentStoreScope = accessibleStores[0].id;
    productStore.value = accessibleStores[0].id;
    productStore.disabled = true;
    storeFilter.value = accessibleStores[0].id;
  }
}

function configureProductPermissions(profile) {
  const formSection = document.getElementById("productFormSection");
  const msg = document.getElementById("productMessage");
  const openBtn = document.getElementById("openProductFormBtn");
  const floatingBtn = document.getElementById("floatingNewProductBtn");

  if (!profile.company_id) {
    if (formSection) formSection.style.display = "none";
    if (msg) msg.textContent = "Create a company first.";
    if (floatingBtn) floatingBtn.style.display = "none";
    return;
  }

  if (!canAddProducts()) {
    if (formSection) formSection.style.display = "none";
    if (msg) msg.textContent = "You do not have permission to add products.";
    if (openBtn) openBtn.style.display = "none";
    if (floatingBtn) floatingBtn.style.display = "none";
  } else {
    if (formSection) formSection.style.display = "block";
    if (openBtn) {
      openBtn.addEventListener("click", () => {
        document.getElementById("productFormSection")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  if (!canAdjustPrice()) {
    const unitPrice = document.getElementById("productPrice");
    const sellingPrice = document.getElementById("productSellingPrice");
    if (unitPrice) unitPrice.disabled = isSalesRep();
    if (sellingPrice) sellingPrice.disabled = isSalesRep();
  }
}

function bindProductEvents() {
  document.getElementById("productForm")?.addEventListener("submit", saveProduct);
  document.getElementById("clearProductFormBtn")?.addEventListener("click", resetProductForm);
  document.getElementById("productSearch")?.addEventListener("input", renderProducts);
  document.getElementById("productStoreFilter")?.addEventListener("change", async (e) => {
    currentStoreScope = e.target.value || null;
    await loadProducts(currentProfile);
  });
}

async function loadProducts(profile) {
  const list = document.getElementById("productsList");
  if (!list) return;

  list.innerHTML = "<p>Loading products...</p>";

  if (!profile.company_id) {
    list.innerHTML = "<p>No company found.</p>";
    return;
  }

  let query = supabaseClient
    .from("products")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (currentStoreScope) {
    query = query.eq("store_id", currentStoreScope);
  } else if (!canViewAllStores()) {
    const ids = accessibleStores.map((s) => s.id);
    if (!ids.length) {
      allProducts = [];
      updateProductSummary([]);
      list.innerHTML = "<p>No assigned store products available.</p>";
      return;
    }
    query = query.in("store_id", ids);
  }

  const { data, error } = await query;

  if (error) {
    console.error("LOAD PRODUCTS ERROR:", error);
    list.innerHTML = "<p>Unable to load products.</p>";
    return;
  }

  allProducts = data || [];
  updateProductSummary(allProducts);
  renderProducts();
}

function updateProductSummary(products) {
  const totalProductsCount = document.getElementById("totalProductsCount");
  const totalStockValue = document.getElementById("totalStockValue");

  const count = products.length;
  const totalValue = products.reduce((sum, p) => {
    const qty = Number(p.quantity || 0);
    const price = Number(p.selling_price || p.price || 0);
    return sum + qty * price;
  }, 0);

  if (totalProductsCount) totalProductsCount.textContent = String(count);
  if (totalStockValue) totalStockValue.textContent = `₦${totalValue.toLocaleString()}`;
}

function renderProducts() {
  const list = document.getElementById("productsList");
  const search = (document.getElementById("productSearch")?.value || "").trim().toLowerCase();

  if (!list) return;

  let filtered = [...allProducts];

  if (search) {
    filtered = filtered.filter((p) =>
      String(p.name || "").toLowerCase().includes(search) ||
      String(p.category || "").toLowerCase().includes(search)
    );
  }

  if (!filtered.length) {
    list.innerHTML = "<p>No products found.</p>";
    return;
  }

  list.innerHTML = filtered.map((product) => {
    const qty = Number(product.quantity || 0);
    const unitPrice = Number(product.selling_price || product.price || 0);
    const stockValue = qty * unitPrice;
    const stockText = `${qty} item${qty === 1 ? "" : "s"} available`;
    const lowStock = qty <= Number(product.reorder_level || 0);

    return `
      <div class="product-premium-card">
        <div class="product-premium-left">
          ${
            product.image_url
              ? `<img src="${product.image_url}" alt="${escapeHtml(product.name || "Product")}" class="product-premium-image" />`
              : `<div class="product-premium-image product-fallback-box">📦</div>`
          }
        </div>

        <div class="product-premium-main">
          <div class="product-premium-top">
            <div>
              <h4 class="product-premium-name">${escapeHtml(product.name || "Unnamed Product")}</h4>
              <p class="product-premium-stock ${lowStock ? "low-stock-text" : ""}">${stockText}</p>
            </div>
            ${product.store_id ? `<small class="small-text">${getStoreNameById(product.store_id)}</small>` : ""}
          </div>

          <div class="product-premium-meta">
            <div>
              <span class="product-meta-label">Unit Price</span>
              <strong>₦${unitPrice.toLocaleString()}</strong>
            </div>

            <div style="text-align:right;">
              <span class="product-meta-label">Product Value</span>
              <strong>₦${stockValue.toLocaleString()}</strong>
            </div>
          </div>

          <div class="product-premium-actions">
            ${
              canEditProducts()
                ? `<button type="button" class="btn-outline inline-btn" onclick="startEditProduct('${product.id}')">Edit</button>`
                : ""
            }

            ${
              canDeleteProducts()
                ? `<button type="button" class="btn-danger inline-btn" onclick="deleteProduct('${product.id}')">Delete</button>`
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function getStoreNameById(storeId) {
  const found = accessibleStores.find((s) => s.id === storeId);
  return found?.name || "Store";
}

async function saveProduct(e) {
  e.preventDefault();

  const msg = document.getElementById("productMessage");
  const productId = document.getElementById("productId")?.value.trim();
  const name = document.getElementById("productName")?.value.trim();
  const storeId = document.getElementById("productStore")?.value;
  const category = document.getElementById("productCategory")?.value.trim();
  const quantity = Number(document.getElementById("productQuantity")?.value || 0);
  const reorderLevel = Number(document.getElementById("productReorderLevel")?.value || 0);
  const price = Number(document.getElementById("productPrice")?.value || 0);
  const sellingPrice = Number(document.getElementById("productSellingPrice")?.value || 0);
  const imageUrl = document.getElementById("productImage")?.value.trim();

  if (!canAddProducts() && !canEditProducts()) {
    if (msg) msg.textContent = "You do not have permission to manage products.";
    return;
  }

  if (!name || !storeId) {
    if (msg) msg.textContent = "Product name and store are required.";
    return;
  }

  if (!canViewAllStores()) {
    const allowed = accessibleStores.some((s) => s.id === storeId);
    if (!allowed) {
      if (msg) msg.textContent = "You can only manage products in your assigned store.";
      return;
    }
  }

  if (!canAdjustPrice() && productId) {
    const oldProduct = allProducts.find((p) => p.id === productId);
    if (oldProduct) {
      if (
        Number(oldProduct.price || 0) !== price ||
        Number(oldProduct.selling_price || 0) !== sellingPrice
      ) {
        if (msg) msg.textContent = "Only the director can adjust price.";
        return;
      }
    }
  }

  if (msg) msg.textContent = productId ? "Updating product..." : "Saving product...";

  const payload = {
    name,
    company_id: currentProfile.company_id,
    store_id: storeId,
    category,
    quantity,
    reorder_level: reorderLevel,
    image_url: imageUrl
  };

  if (canAdjustPrice() || !productId) {
    payload.price = price;
    payload.selling_price = sellingPrice;
  }

  let error;

  if (productId) {
    const res = await supabaseClient
      .from("products")
      .update(payload)
      .eq("id", productId);
    error = res.error;
  } else {
    const res = await supabaseClient
      .from("products")
      .insert([payload]);
    error = res.error;
  }

  if (error) {
    console.error("SAVE PRODUCT ERROR:", error);
    if (msg) msg.textContent = error.message || "Failed to save product.";
    return;
  }

  if (msg) msg.textContent = productId ? "Product updated successfully." : "Product created successfully.";
  resetProductForm();
  await loadProducts(currentProfile);
}

function resetProductForm() {
  document.getElementById("productForm")?.reset();
  document.getElementById("productId").value = "";
  document.getElementById("productFormTitle").textContent = "Add Product";
  document.getElementById("saveProductBtn").textContent = "Save Product";

  if (!canViewAllStores() && accessibleStores.length === 1) {
    document.getElementById("productStore").value = accessibleStores[0].id;
  }
}

function startEditProduct(productId) {
  if (!canEditProducts()) {
    alert("You do not have permission to edit products.");
    return;
  }

  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  document.getElementById("productId").value = product.id;
  document.getElementById("productName").value = product.name || "";
  document.getElementById("productStore").value = product.store_id || "";
  document.getElementById("productCategory").value = product.category || "";
  document.getElementById("productQuantity").value = product.quantity || 0;
  document.getElementById("productReorderLevel").value = product.reorder_level || 0;
  document.getElementById("productPrice").value = product.price || 0;
  document.getElementById("productSellingPrice").value = product.selling_price || 0;
  document.getElementById("productImage").value = product.image_url || "";

  document.getElementById("productFormTitle").textContent = "Edit Product";
  document.getElementById("saveProductBtn").textContent = "Update Product";
  document.getElementById("productFormSection")?.scrollIntoView({ behavior: "smooth" });
}

async function deleteProduct(productId) {
  if (!canDeleteProducts()) {
    alert("Only the director can delete products.");
    return;
  }

  if (!confirm("Delete this product?")) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    alert(error.message || "Failed to delete product.");
    return;
  }

  await loadProducts(currentProfile);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.startEditProduct = startEditProduct;
window.deleteProduct = deleteProduct;

loadProductsPage();
