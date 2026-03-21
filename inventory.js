

let inventoryProducts = [];

async function loadInventoryPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  if (!profile.company_id) {
    alert("Create a company first.");
    window.location.href = "company.html";
    return;
  }

  await loadInventoryStores(profile);
  await loadInventoryStats(profile);
  await loadStockMovements(profile);
}

async function getInventoryStoreIds(profile) {
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

async function loadInventoryStores(profile) {
  const select = document.getElementById("inventoryStore");
  if (!select) return;

  select.innerHTML = `<option value="">Select store</option>`;

  const storeIds = await getInventoryStoreIds(profile);

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
    await loadProductsForInventory(data[0].id);
  }
}

async function loadProductsForInventory(storeId) {
  const productSelect = document.getElementById("inventoryProduct");
  if (!productSelect) return;

  productSelect.innerHTML = `<option value="">Select product</option>`;

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  console.log("INVENTORY PRODUCTS:", data, error);

  inventoryProducts = data || [];

  inventoryProducts.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} (Qty: ${product.quantity})`;
    productSelect.appendChild(option);
  });
}

async function loadInventoryStats(profile) {
  const lowStockCountEl = document.getElementById("lowStockCount");
  const outOfStockCountEl = document.getElementById("outOfStockCount");
  const lowStockList = document.getElementById("lowStockList");

  const storeIds = await getInventoryStoreIds(profile);
  if (!storeIds.length) {
    lowStockList.innerHTML = "<p>No stores assigned.</p>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .in("store_id", storeIds)
    .order("created_at", { ascending: false });

  if (error) {
    lowStockList.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  const products = data || [];
  const lowStock = products.filter((p) => Number(p.quantity || 0) <= Number(p.reorder_level || 0));
  const outOfStock = products.filter((p) => Number(p.quantity || 0) <= 0);

  if (lowStockCountEl) lowStockCountEl.textContent = lowStock.length.toLocaleString();
  if (outOfStockCountEl) outOfStockCountEl.textContent = outOfStock.length.toLocaleString();

  if (!lowStock.length) {
    lowStockList.innerHTML = "<p>No low stock items.</p>";
    return;
  }

  lowStockList.innerHTML = lowStock.map((product) => `
    <div class="modern-list-card">
      <strong>${product.name}</strong>
      <p>Qty: ${product.quantity}</p>
      <small>Reorder level: ${product.reorder_level}</small>
    </div>
  `).join("");
}

async function loadStockMovements(profile) {
  const list = document.getElementById("stockMovementList");
  if (!list) return;

  const storeIds = await getInventoryStoreIds(profile);
  if (!storeIds.length) {
    list.innerHTML = "<p>No stock movements yet.</p>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("stock_movements")
    .select("*")
    .in("store_id", storeIds)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    list.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = "<p>No stock movements yet.</p>";
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

document.getElementById("inventoryStore")?.addEventListener("change", async (e) => {
  const storeId = e.target.value;
  await loadProductsForInventory(storeId);
});

document.getElementById("restockForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("inventoryMessage");
  const storeId = document.getElementById("inventoryStore").value;
  const productId = document.getElementById("inventoryProduct").value;
  const qty = parseInt(document.getElementById("restockQty").value || "0", 10);
  const note = document.getElementById("restockNote").value.trim();

  if (!storeId || !productId || qty <= 0) {
    msg.textContent = "Select store, product and valid quantity.";
    return;
  }

  const product = inventoryProducts.find((p) => p.id === productId);
  if (!product) {
    msg.textContent = "Product not found.";
    return;
  }

  msg.textContent = "Restocking...";

  const newQty = Number(product.quantity || 0) + qty;

  const { error: updateError } = await supabaseClient
    .from("products")
    .update({ quantity: newQty })
    .eq("id", productId);

  if (updateError) {
    msg.textContent = updateError.message || "Unable to update product stock.";
    return;
  }

  const { error: movementError } = await supabaseClient
    .from("stock_movements")
    .insert([
      {
        company_id: currentProfile.company_id,
        store_id: storeId,
        product_id: productId,
        movement_type: "restock",
        quantity: qty,
        note,
        created_by: currentUser.id
      }
    ]);

  if (movementError) {
    msg.textContent = movementError.message || "Unable to save stock movement.";
    return;
  }

  msg.textContent = "Product restocked successfully.";
  document.getElementById("restockForm").reset();

  await loadInventoryStores(currentProfile);
  await loadInventoryStats(currentProfile);
  await loadStockMovements(currentProfile);
}

loadInventoryPage();