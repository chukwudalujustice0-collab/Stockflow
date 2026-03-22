async function loadProductsPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);

  if (!auth.profile.company_id) {
    const list = document.getElementById("productsList");
    if (list) list.innerHTML = "<p>Create a company first before adding products.</p>";
    return;
  }

  await loadStores(auth.profile);
  await loadProducts(auth.profile);
}

async function loadStores(profile) {
  const select = document.getElementById("productStore");
  if (!select) return;

  select.innerHTML = `<option value="">Select store</option>`;

  const { data, error } = await supabaseClient
    .from("stores")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD STORES ERROR:", error);
    return;
  }

  (data || []).forEach((store) => {
    const option = document.createElement("option");
    option.value = store.id;
    option.textContent = store.name;
    select.appendChild(option);
  });
}

async function uploadImage(file) {
  if (!file) return null;

  const bucketName = "product-images";
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error } = await supabaseClient.storage
    .from(bucketName)
    .upload(fileName, file, { upsert: true });

  if (error) {
    console.error("IMAGE UPLOAD ERROR:", error);
    return null;
  }

  const { data } = supabaseClient.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return data?.publicUrl || null;
}

async function loadProducts(profile) {
  const list = document.getElementById("productsList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD PRODUCTS ERROR:", error);
    list.innerHTML = "<p>Unable to load products.</p>";
    return;
  }

  const products = data || [];

  if (!products.length) {
    list.innerHTML = "<p>No products yet.</p>";
    return;
  }

  list.innerHTML = products.map((p) => `
    <div class="product-card">
      ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" />` : ""}
      <strong>${p.name}</strong>
      <p>${p.category || "No category"}</p>
      <p>₦${Number(p.selling_price || 0).toLocaleString()}</p>
      <small>Qty: ${Number(p.quantity || 0)}</small>
    </div>
  `).join("");
}

document.getElementById("productForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("productMessage");
  if (msg) msg.textContent = "Saving product...";

  const storeId = document.getElementById("productStore")?.value;
  const name = document.getElementById("productName")?.value.trim();
  const category = document.getElementById("productCategory")?.value.trim();
  const sku = document.getElementById("productSku")?.value.trim();
  const costPrice = Number(document.getElementById("costPrice")?.value || 0);
  const sellingPrice = Number(document.getElementById("sellingPrice")?.value || 0);
  const quantity = Number(document.getElementById("productQty")?.value || 0);
  const reorderLevel = Number(document.getElementById("reorderLevel")?.value || 0);
  const imageFile = document.getElementById("productImage")?.files?.[0] || null;

  if (!currentProfile?.company_id) {
    if (msg) msg.textContent = "No company found.";
    return;
  }

  if (!storeId || !name) {
    if (msg) msg.textContent = "Store and product name are required.";
    return;
  }

  let imageUrl = null;
  if (imageFile) {
    if (msg) msg.textContent = "Uploading image...";
    imageUrl = await uploadImage(imageFile);
  }

  if (msg) msg.textContent = "Saving product details...";

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
        image_url: imageUrl
      }
    ]);

  if (error) {
    console.error("SAVE PRODUCT ERROR:", error);
    if (msg) msg.textContent = error.message || "Failed to save product.";
    return;
  }

  if (msg) msg.textContent = "Product saved successfully.";
  document.getElementById("productForm")?.reset();

  await loadProducts(currentProfile);
});

loadProductsPage();
