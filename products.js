async function loadProductsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;

  fillHeader(profile);

  if (!profile.company_id) {
    alert("Create a company first.");
    window.location.href = "company.html";
    return;
  }

  if (!["director", "assistant_director", "store_manager"].includes(profile.role || "")) {
    alert("You do not have permission to access products.");
    window.location.href = "dashboard.html";
    return;
  }

  await loadStoresForProducts(profile);
  await loadProducts(profile);
}

async function loadStoresForProducts(profile) {
  const storeSelect = document.getElementById("productStore");
  if (!storeSelect) return;

  storeSelect.innerHTML = `<option value="">Select store</option>`;

  let stores = [];

  if (["director", "assistant_director"].includes(profile.role || "")) {
    const { data, error } = await supabaseClient
      .from("stores")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    console.log("PRODUCT STORES:", data, error);
    stores = data || [];
  } else if (profile.role === "store_manager") {
    const { data: accessRows } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", currentUser.id);

    const ids = (accessRows || []).map(row => row.store_id);

    if (ids.length > 0) {
      const { data } = await supabaseClient
        .from("stores")
        .select("id, name")
        .in("id", ids);

      stores = data || [];
    }
  }

  stores.forEach(store => {
    const option = document.createElement("option");
    option.value = store.id;
    option.textContent = store.name;
    storeSelect.appendChild(option);
  });
}

async function uploadProductImage(file) {
  if (!file) return null;

  const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error } = await supabaseClient.storage
    .from("product-images")
    .upload(safeName, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    console.error("IMAGE UPLOAD ERROR:", error);
    return null;
  }

  const { data } = supabaseClient.storage
    .from("product-images")
    .getPublicUrl(safeName);

  return data.publicUrl;
}

async function loadProducts(profile) {
  const productsList = document.getElementById("productsList");
  if (!productsList) return;

  let products = [];

  if (["director", "assistant_director"].includes(profile.role || "")) {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    console.log("LOAD PRODUCTS:", data, error);

    if (error) {
      productsList.innerHTML = `<p>${error.message}</p>`;
      return;
    }

    products = data || [];
  } else {
    const { data: accessRows } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", currentUser.id);

    const ids = (accessRows || []).map(row => row.store_id);

    if (ids.length > 0) {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .in("store_id", ids)
        .order("created_at", { ascending: false });

      if (error) {
        productsList.innerHTML = `<p>${error.message}</p>`;
        return;
      }

      products = data || [];
    }
  }

  if (!products.length) {
    productsList.innerHTML = "<p>No products yet.</p>";
    return;
  }

  productsList.innerHTML = products.map(product => `
    <div class="product-card">
      ${product.image_url ? `
        <img
          src="${product.image_url}"
          alt="${product.name}"
          style="width:100%; height:120px; object-fit:cover; border-radius:12px; margin-bottom:8px;"
        />
      ` : ""}

      <div class="product-top">
        <strong>${product.name}</strong>
        <span class="price">₦${Number(product.selling_price || 0).toLocaleString()}</span>
      </div>

      <div class="product-meta">
        <span>Qty: ${product.quantity}</span>
        <span>SKU: ${product.sku || "-"}</span>
      </div>

      <div class="product-bottom">
        <small>Cost: ₦${Number(product.cost_price || 0).toLocaleString()}</small>
        <small>Reorder: ${product.reorder_level}</small>
      </div>
    </div>
  `).join("");
}

document.getElementById("productForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("productMessage");

  const storeId = document.getElementById("productStore").value;
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value.trim();
  const sku = document.getElementById("productSku").value.trim();
  const costPrice = parseFloat(document.getElementById("costPrice").value || "0");
  const sellingPrice = parseFloat(document.getElementById("sellingPrice").value || "0");
  const quantity = parseInt(document.getElementById("productQty").value || "0", 10);
  const reorderLevel = parseInt(document.getElementById("reorderLevel").value || "0", 10);
  const imageFile = document.getElementById("productImage").files[0];

  if (!currentProfile?.company_id) {
    msg.textContent = "Create a company first.";
    return;
  }

  if (!storeId) {
    msg.textContent = "Select a store.";
    return;
  }

  if (!name) {
    msg.textContent = "Enter product name.";
    return;
  }

  msg.textContent = "Uploading image...";

  let imageUrl = null;
  if (imageFile) {
    imageUrl = await uploadProductImage(imageFile);

    if (!imageUrl) {
      msg.textContent = "Image upload failed.";
      return;
    }
  }

  msg.textContent = "Saving product...";

  const { error } = await supabaseClient
    .from("products")
    .insert([
      {
        company_id: currentProfile.company_id,
        store_id: storeId,
        name,
        category,
        sku,
        cost_price: costPrice,
        selling_price: sellingPrice,
        quantity,
        reorder_level: reorderLevel,
        image_url: imageUrl,
        created_by: currentUser.id
      }
    ]);

  if (error) {
    console.error("PRODUCT INSERT ERROR:", error);
    msg.textContent = error.message || "Unable to save product.";
    return;
  }

  msg.textContent = "Product saved successfully.";
  document.getElementById("productForm").reset();

  await loadStoresForProducts(currentProfile);
  await loadProducts(currentProfile);
});

loadProductsPage();