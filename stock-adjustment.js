async function loadAdjustmentPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadStores(profile);
  await loadAdjustments(profile);
}

loadAdjustmentPage();

// ======================
// LOAD STORES
// ======================
async function loadStores(profile) {
  const select = document.getElementById("adjustStore");
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
// LOAD PRODUCTS
// ======================
document.getElementById("adjustStore")?.addEventListener("change", async (e) => {
  const storeId = e.target.value;

  const productSelect = document.getElementById("adjustProduct");
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
// SAVE ADJUSTMENT
// ======================
document.getElementById("stockAdjustmentForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("adjustMessage");

  const storeId = document.getElementById("adjustStore").value;
  const productId = document.getElementById("adjustProduct").value;
  const type = document.getElementById("adjustType").value;
  const qty = Number(document.getElementById("adjustQty").value);
  const note = document.getElementById("adjustNote").value;

  if (!storeId || !productId || !type || qty <= 0) {
    msg.textContent = "Fill all required fields";
    return;
  }

  msg.textContent = "Processing...";

  // get current quantity
  const { data: product } = await supabaseClient
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .single();

  let newQty = product?.quantity || 0;

  if (type === "adjustment_in") {
    newQty += qty;
  } else {
    newQty -= qty;
    if (newQty < 0) newQty = 0;
  }

  // update product
  const { error } = await supabaseClient
    .from("products")
    .update({ quantity: newQty })
    .eq("id", productId);

  if (error) {
    console.error(error);
    msg.textContent = error.message;
    return;
  }

  // record movement
  await supabaseClient.from("stock_movements").insert([{
    company_id: currentProfile.company_id,
    store_id: storeId,
    product_id: productId,
    movement_type: type,
    quantity: qty,
    note,
    created_by: currentUser.id
  }]);

  msg.textContent = "Adjustment saved";

  document.getElementById("stockAdjustmentForm").reset();

  await loadAdjustments(currentProfile);
});

// ======================
// LOAD ADJUSTMENTS
// ======================
async function loadAdjustments(profile) {
  const list = document.getElementById("adjustmentList");

  const { data } = await supabaseClient
    .from("stock_movements")
    .select("*")
    .eq("company_id", profile.company_id)
    .in("movement_type", ["adjustment_in", "adjustment_out"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (!data || !data.length) {
    list.innerHTML = "<p>No adjustments yet</p>";
    return;
  }

  list.innerHTML = data.map(a => `
    <div class="modern-list-card">
      <strong>${a.movement_type}</strong>
      <p>Qty: ${a.quantity}</p>
      <small>${a.note || ""}</small><br>
      <small>${new Date(a.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}