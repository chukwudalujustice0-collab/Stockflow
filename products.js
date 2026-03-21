async function loadProductsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);

  await loadStores(auth.profile);
  await loadProducts(auth.profile);
}

// ======================
// LOAD STORES
// ======================
async function loadStores(profile) {
  const select = document.getElementById("productStore");
  if (!select) return;

  select.innerHTML = `<option value="">Select store</option>`;

  let stores = [];

  if (["director", "assistant_director"].includes(profile.role)) {
    const { data } = await supabaseClient
      .from("stores")
      .select("id, name")
      .eq("company_id", profile.company_id);

    stores = data || [];
  } else {
    const { data: access } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", currentUser.id);

    const ids = (access || []).map(i => i.store_id);

    if (ids.length) {
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
    select.appendChild(option);
  });
}

// ======================
// IMAGE UPLOAD
// ======================
async function uploadImage(file) {
  if (!file) return null;

  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error } = await supabaseClient.storage
    .from("product-images")
    .upload(fileName, file);

  if (error) {
    console.error(error);
    return null;
  }

  const { data } = supabaseClient.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// ======================
// LOAD PRODUCTS
// ======================
async function loadProducts(profile) {
  const list = document.getElementById("productsList");
  if (!list) return;

  let products = [];

  if (["director", "assistant_director"].includes(profile.role)) {
    const { data } = await supabaseClient
      .from("products")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    products = data || [];
  } else {
    const { data: access } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", currentUser.id);

    const ids = (access || []).map(i => i.store_id);

    if (ids.length) {
      const { data } = await supabaseClient
        .from("products")
        .select("*")
        .in("store_id", ids);

      products = data || [];
    }
  }

  if (!products.length) {
    list.innerHTML = "<p>No products yet.</p>";
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="product-card">
      ${p.image_url ? `<img src="${p.image_url}" />` : ""}

      <strong>${p.name}</strong>
      <p>₦${Number(p.selling_price || 0).toLocaleString()}</p>

      <small>Qty: ${p.quantity}</small>
    </div>
  `).join("");
}

// ======================
// SAVE PRODUCT
// ======================
document.getElementById("productForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("productMessage");

  const storeId = document.getElementById("productStore").value;
  const name = document.getElementById("productName").value;
  const category = document.getElementById("productCategory").value;
  const sku = document.getElementById("productSku").value;
  const cost = document.getElementById("costPrice").value || 0;
  const price = document.getElementById("sellingPrice").value || 0;
  const qty = document.getElementById("productQty").value || 0;
  const reorder = document.getElementById("reorderLevel").value || 0;
  const imageFile = document.getElementById("productImage").files[0];

  if (!storeId || !name) {
    msg.textContent = "Fill required fields";
    return;
  }

  msg.textContent = "Uploading image...";

  const imageUrl = await uploadImage(imageFile);

  msg.textContent = "Saving product...";

  const { error } = await supabaseClient.from("products").insert([{
    company_id: currentProfile.company_id,
    store_id: storeId,
    name,
    category,
    sku,
    cost_price: cost,
    selling_price: price,
    quantity: qty,
    reorder_level: reorder,
    image_url: imageUrl,
    created_by: currentUser.id
  }]);

  if (error) {
    console.error(error);
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Product saved";
  document.getElementById("productForm").reset();

  await loadProducts(currentProfile);
});

loadProductsPage();