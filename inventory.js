async function loadInventoryPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadStores(profile);
  await loadLowStock(profile);
  await loadMovements(profile);
}

loadInventoryPage();

// ======================
// LOAD STORES
// ======================
async function loadStores(profile) {
  const select = document.getElementById("inventoryStore");
  if (!select) return;

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

  select.innerHTML = `<option value="">Select store</option>`;

  stores.forEach(store => {
    const opt = document.createElement("option");
    opt.value = store.id;
    opt.textContent = store.name;
    select.appendChild(opt);
  });
}

// ======================
// LOAD PRODUCTS BY STORE
// ======================
document.getElementById("inventoryStore")?.addEventListener("change", async (e) => {
  const storeId = e.target.value;

  const productSelect = document.getElementById("inventoryProduct");
  if (!productSelect) return;

  productSelect.innerHTML = `<option value="">Select product</option>`;

  if (!storeId) return;

  const { data } = await supabaseClient
    .from("products")
    .select("id, name")
    .eq("store_id", storeId);

  (data || []).forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    productSelect.appendChild(opt);
  });
});

// ======================
// RESTOCK
// ======================
document.getElementById("restockForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("inventoryMessage");

  const storeId = document.getElementById("inventoryStore").value;
  const productId = document.getElementById("inventoryProduct").value;
  const qty = Number(document.getElementById("restockQty").value);
  const note = document.getElementById("restockNote").value;

  if (!storeId || !productId || qty <= 0) {
    msg.textContent = "Fill all required fields";
    return;
  }

  msg.textContent = "Updating stock...";

  // GET CURRENT QTY
  const { data: product } = await supabaseClient
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .single();

  const newQty = (product?.quantity || 0) + qty;

  // UPDATE PRODUCT
  const { error } = await supabaseClient
    .from("products")
    .update({ quantity: newQty })
    .eq("id", productId);

  if (error) {
    console.error(error);
    msg.textContent = error.message;
    return;
  }

  // RECORD MOVEMENT
  await supabaseClient.from("stock_movements").insert([{
    company_id: currentProfile.company_id,
    store_id: storeId,
    product_id: productId,
    movement_type: "restock",
    quantity: qty,
    note,
    created_by: currentUser.id
  }]);

  msg.textContent = "Stock updated successfully";

  document.getElementById("restockForm").reset();

  await loadLowStock(currentProfile);
  await loadMovements(currentProfile);
});

// ======================
// LOW STOCK
// ======================
async function loadLowStock(profile) {
  const list = document.getElementById("lowStockList");

  const { data } = await supabaseClient
    .from("products")
    .select("*")
    .eq("company_id", profile.company_id);

  const low = (data || []).filter(p =>
    p.quantity <= (p.reorder_level || 0)
  );

  document.getElementById("lowStockCount").textContent = low.length;
  document.getElementById("outOfStockCount").textContent =
    low.filter(p => p.quantity === 0).length;

  if (!low.length) {
    list.innerHTML = "<p>No low stock products</p>";
    return;
  }

  list.innerHTML = low.map(p => `
    <div class="modern-list-card">
      <strong>${p.name}</strong>
      <p>Qty: ${p.quantity}</p>
      <small>Reorder level: ${p.reorder_level}</small>
    </div>
  `).join("");
}

// ======================
// MOVEMENTS
// ======================
async function loadMovements(profile) {
  const list = document.getElementById("stockMovementList");

  const { data } = await supabaseClient
    .from("stock_movements")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!data || !data.length) {
    list.innerHTML = "<p>No movements yet</p>";
    return;
  }

  list.innerHTML = data.map(m => `
    <div class="modern-list-card">
      <strong>${m.movement_type}</strong>
      <p>Qty: ${m.quantity}</p>
      <small>${new Date(m.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}