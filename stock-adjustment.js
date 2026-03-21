

let adjustmentProducts = [];

async function loadStockAdjustmentPage() {
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
    alert("You do not have permission to adjust stock.");
    window.location.href = "dashboard.html";
    return;
  }

  await loadAdjustmentStores(profile);
  await loadRecentAdjustments(profile);
}

async function getAdjustmentStoreIds(profile) {
  if (["director", "assistant_director"].includes(profile.role || "")) {
    const { data } = await supabaseClient
      .from("stores")
      .select("id")
      .eq("company_id", profile.company_id);

    return (data || []).map((row) => row.id);
  }

  const { data } = await supabaseClient
    .from("staff_store_access")
    .select("store_id")
    .eq("staff_id", currentUser.id);

  return (data || []).map((row) => row.store_id);
}

async function loadAdjustmentStores(profile) {
  const select = document.getElementById("adjustStore");
  if (!select) return;

  select.innerHTML = `<option value="">Select store</option>`;

  const storeIds = await getAdjustmentStoreIds(profile);
  if (!storeIds.length) return;

  const { data } = await supabaseClient
    .from("stores")
    .select("id,name")
    .in("id", storeIds);

  (data || []).forEach((store) => {
    const option = document.createElement("option");
    option.value = store.id;
    option.textContent = store.name;
    select.appendChild(option);
  });

  if ((data || []).length === 1) {
    select.value = data[0].id;
    await loadAdjustmentProducts(data[0].id);
  }
}

async function loadAdjustmentProducts(storeId) {
  const select = document.getElementById("adjustProduct");
  if (!select) return;

  select.innerHTML = `<option value="">Select product</option>`;

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  console.log("ADJUSTMENT PRODUCTS:", data, error);

  adjustmentProducts = data || [];

  adjustmentProducts.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} (Qty: ${product.quantity})`;
    select.appendChild(option);
  });
}

async function loadRecentAdjustments(profile) {
  const list = document.getElementById("adjustmentList");
  if (!list) return;

  const storeIds = await getAdjustmentStoreIds(profile);
  if (!storeIds.length) {
    list.innerHTML = "<p>No adjustments yet.</p>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("stock_movements")
    .select("*")
    .in("store_id", storeIds)
    .in("movement_type", ["adjustment_in", "adjustment_out"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    list.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = "<p>No adjustments yet.</p>";
    return;
  }

  list.innerHTML = data.map((row) => `
    <div class="modern-list-card">
      <strong>${row.movement_type}</strong>
      <p>Qty: ${row.quantity}</p>
      <small>${row.note || ""}</small><br>
      <small>${new Date(row.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

document.getElementById("adjustStore")?.addEventListener("change", async (e) => {
  const storeId = e.target.value;
  await loadAdjustmentProducts(storeId);
});

document.getElementById("stockAdjustmentForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("adjustMessage");
  const storeId = document.getElementById("adjustStore").value;
  const productId = document.getElementById("adjustProduct").value;
  const adjustType = document.getElementById("adjustType").value;
  const qty = parseInt(document.getElementById("adjustQty").value || "0", 10);
  const note = document.getElementById("adjustNote").value.trim();

  if (!storeId || !productId || !adjustType || qty <= 0) {
    msg.textContent = "Fill all required fields correctly.";
    return;
  }

  const product = adjustmentProducts.find((p) => p.id === productId);
  if (!product) {
    msg.textContent = "Product not found.";
    return;
  }

  let newQty = Number(product.quantity || 0);

  if (adjustType === "adjustment_in") {
    newQty += qty;
  } else if (adjustType === "adjustment_out") {
    if (qty > newQty) {
      msg.textContent = "Adjustment quantity is greater than current stock.";
      return;
    }
    newQty -= qty;
  }

  msg.textContent = "Saving adjustment...";

  const { error: updateError } = await supabaseClient
    .from("products")
    .update({ quantity: newQty })
    .eq("id", productId);

  if (updateError) {
    msg.textContent = updateError.message || "Unable to update stock.";
    return;
  }

  const { error: movementError } = await supabaseClient
    .from("stock_movements")
    .insert([
      {
        company_id: currentProfile.company_id,
        store_id: storeId,
        product_id: productId,
        movement_type: adjustType,
        quantity: qty,
        note,
        created_by: currentUser.id
      }
    ]);

  if (movementError) {
    msg.textContent = movementError.message || "Unable to save adjustment.";
    return;
  }

  msg.textContent = "Stock adjustment saved successfully.";
  document.getElementById("stockAdjustmentForm").reset();

  await loadAdjustmentStores(currentProfile);
  await loadRecentAdjustments(currentProfile);
});

loadStockAdjustmentPage();