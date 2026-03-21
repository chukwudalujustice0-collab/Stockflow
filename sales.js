let salesCart = [];
let availableProducts = [];

async function loadSalesPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;

  fillHeader(profile);

  if (!profile.company_id) {
    alert("Create a company first.");
    window.location.href = "company.html";
    return;
  }

  await loadSalesStores(profile);
  await loadCustomers(profile);
  await loadRecentSales(profile);
  renderCart();
  toggleCashInput();
}

async function loadSalesStores(profile) {
  const storeSelect = document.getElementById("salesStore");
  if (!storeSelect) return;

  storeSelect.innerHTML = `<option value="">Select store</option>`;

  let stores = [];

  if (["director", "assistant_director"].includes(profile.role || "")) {
    const { data, error } = await supabaseClient
      .from("stores")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    console.log("LOAD SALES STORES:", data, error);
    stores = data || [];
  } else {
    const { data: accessRows, error: accessError } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", currentUser.id);

    console.log("STAFF STORE ACCESS:", accessRows, accessError);

    const ids = (accessRows || []).map((row) => row.store_id);

    if (ids.length > 0) {
      const { data, error } = await supabaseClient
        .from("stores")
        .select("id, name")
        .in("id", ids);

      console.log("ASSIGNED STORES:", data, error);
      stores = data || [];
    }
  }

  stores.forEach((store) => {
    const option = document.createElement("option");
    option.value = store.id;
    option.textContent = store.name;
    storeSelect.appendChild(option);
  });

  if (stores.length === 1) {
    storeSelect.value = stores[0].id;
    loadProductsForSale(stores[0].id);
  }
}

async function loadCustomers(profile) {
  const select = document.getElementById("saleCustomer");
  if (!select) return;

  select.innerHTML = `<option value="">Walk-in customer</option>`;

  const { data, error } = await supabaseClient
    .from("customers")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name", { ascending: true });

  console.log("SALE CUSTOMERS:", data, error);

  (data || []).forEach((customer) => {
    const option = document.createElement("option");
    option.value = customer.id;
    option.textContent = customer.name;
    select.appendChild(option);
  });
}

async function loadProductsForSale(storeId) {
  const list = document.getElementById("salesProductsList");
  if (!list) return;

  list.innerHTML = "<p>Loading products...</p>";

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  console.log("SALE PRODUCTS:", data, error);

  if (error) {
    list.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  availableProducts = data || [];
  renderProductsForSale();
}

function renderProductsForSale() {
  const list = document.getElementById("salesProductsList");
  const search = document.getElementById("productSearch")?.value.trim().toLowerCase() || "";

  if (!list) return;

  const filtered = availableProducts.filter((product) =>
    (product.name || "").toLowerCase().includes(search)
  );

  if (!filtered.length) {
    list.innerHTML = "<p>No products found.</p>";
    return;
  }

  list.innerHTML = filtered.map((product) => `
    <div class="product-card">
      <strong>${product.name}</strong>
      <small>₦${Number(product.selling_price || 0).toLocaleString()}</small>
      <small>Stock: ${product.quantity}</small>
      <button type="button" class="btn-primary inline-btn" onclick="addToCart('${product.id}')">Add</button>
    </div>
  `).join("");
}

function addToCart(productId) {
  const product = availableProducts.find((p) => p.id === productId);
  if (!product) return;

  const existing = salesCart.find((item) => item.id === productId);

  if (existing) {
    if (existing.quantity + 1 > Number(product.quantity)) {
      alert("Not enough stock.");
      return;
    }
    existing.quantity += 1;
    existing.subtotal = existing.quantity * existing.selling_price;
  } else {
    if (Number(product.quantity) < 1) {
      alert("Out of stock.");
      return;
    }

    salesCart.push({
      id: product.id,
      name: product.name,
      selling_price: Number(product.selling_price || 0),
      quantity: 1,
      subtotal: Number(product.selling_price || 0),
      available_quantity: Number(product.quantity || 0)
    });
  }

  renderCart();
}

function increaseCartItem(productId) {
  const item = salesCart.find((i) => i.id === productId);
  if (!item) return;

  if (item.quantity + 1 > item.available_quantity) {
    alert("Not enough stock.");
    return;
  }

  item.quantity += 1;
  item.subtotal = item.quantity * item.selling_price;
  renderCart();
}

function decreaseCartItem(productId) {
  const item = salesCart.find((i) => i.id === productId);
  if (!item) return;

  item.quantity -= 1;

  if (item.quantity <= 0) {
    salesCart = salesCart.filter((i) => i.id !== productId);
  } else {
    item.subtotal = item.quantity * item.selling_price;
  }

  renderCart();
}

function removeCartItem(productId) {
  salesCart = salesCart.filter((i) => i.id !== productId);
  renderCart();
}

function toggleCashInput() {
  const paymentMethod = document.getElementById("paymentMethod")?.value || "cash";
  const wrap = document.getElementById("cashReceivedWrap");
  if (!wrap) return;

  wrap.style.display = paymentMethod === "cash" ? "block" : "none";
}

function renderCart() {
  const cartList = document.getElementById("cartList");
  const subtotalEl = document.getElementById("cartSubtotal");
  const totalEl = document.getElementById("cartTotal");
  const changeEl = document.getElementById("cartChange");
  const cashReceivedInput = document.getElementById("cashReceived");
  const paymentMethod = document.getElementById("paymentMethod")?.value || "cash";

  if (!cartList) return;

  if (!salesCart.length) {
    cartList.innerHTML = "<p>No items in cart.</p>";
    if (subtotalEl) subtotalEl.textContent = "0";
    if (totalEl) totalEl.textContent = "0";
    if (changeEl) changeEl.textContent = "0";
    return;
  }

  const subtotal = salesCart.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal;

  let change = 0;
  const cashReceived = parseFloat(cashReceivedInput?.value || "0");

  if (paymentMethod === "cash" && cashReceived > 0) {
    change = cashReceived - total;
    if (change < 0) change = 0;
  } else {
    change = 0;
  }

  cartList.innerHTML = salesCart.map((item) => `
    <div class="cart-card">
      <div>
        <strong>${item.name}</strong>
        <p>₦${Number(item.selling_price).toLocaleString()} x ${item.quantity}</p>
        <small>Subtotal: ₦${Number(item.subtotal).toLocaleString()}</small>
      </div>

      <div class="cart-controls">
        <button type="button" onclick="decreaseCartItem('${item.id}')">-</button>
        <span>${item.quantity}</span>
        <button type="button" onclick="increaseCartItem('${item.id}')">+</button>
      </div>
    </div>
  `).join("");

  if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString();
  if (totalEl) totalEl.textContent = total.toLocaleString();
  if (changeEl) changeEl.textContent = change.toLocaleString();
}

async function loadRecentSales(profile) {
  const recentSalesList = document.getElementById("recentSalesList");
  if (!recentSalesList) return;

  let data = [];
  let error = null;

  if (["director", "assistant_director"].includes(profile.role || "")) {
    ({ data, error } = await supabaseClient
      .from("sales")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(10));
  } else {
    ({ data, error } = await supabaseClient
      .from("sales")
      .select("*")
      .eq("sold_by", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(10));
  }

  if (error) {
    recentSalesList.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    recentSalesList.innerHTML = "<p>No sales yet.</p>";
    return;
  }

  recentSalesList.innerHTML = data.map((sale) => `
    <div class="store-item">
      <strong>₦${Number(sale.total_amount || 0).toLocaleString()}</strong><br>
      <small>Payment: ${sale.payment_method}</small><br>
      <small>${new Date(sale.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

document.getElementById("salesStore")?.addEventListener("change", async (e) => {
  const storeId = e.target.value;
  salesCart = [];
  renderCart();

  if (storeId) {
    await loadProductsForSale(storeId);
  } else {
    document.getElementById("salesProductsList").innerHTML = "<p>Select a store first.</p>";
  }
});

document.getElementById("productSearch")?.addEventListener("input", () => {
  renderProductsForSale();
});

document.getElementById("cashReceived")?.addEventListener("input", () => {
  renderCart();
});

document.getElementById("paymentMethod")?.addEventListener("change", () => {
  toggleCashInput();
  renderCart();
});

document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
  const msg = document.getElementById("salesMessage");
  const storeId = document.getElementById("salesStore").value;
  const paymentMethod = document.getElementById("paymentMethod").value;
  const cashReceived = parseFloat(document.getElementById("cashReceived").value || "0");
  const customerId = document.getElementById("saleCustomer").value || null;

  if (!currentProfile?.company_id) {
    msg.textContent = "Create a company first.";
    return;
  }

  if (!storeId) {
    msg.textContent = "Select a store.";
    return;
  }

  if (!salesCart.length) {
    msg.textContent = "Cart is empty.";
    return;
  }

  if (paymentMethod === "credit" && !customerId) {
    msg.textContent = "Select a customer for credit sale.";
    return;
  }

  const totalAmount = salesCart.reduce((sum, item) => sum + item.subtotal, 0);

  if (paymentMethod === "cash" && cashReceived < totalAmount) {
    msg.textContent = "Cash received is less than total.";
    return;
  }

  msg.textContent = "Processing sale...";

  const { data: sale, error: saleError } = await supabaseClient
    .from("sales")
    .insert([
      {
        company_id: currentProfile.company_id,
        store_id: storeId,
        sold_by: currentUser.id,
        customer_id: customerId,
        total_amount: totalAmount,
        payment_method: paymentMethod
      }
    ])
    .select()
    .single();

  if (saleError) {
    msg.textContent = saleError.message || "Unable to create sale.";
    return;
  }

  for (const item of salesCart) {
    const { error: itemError } = await supabaseClient
      .from("sale_items")
      .insert([
        {
          sale_id: sale.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price,
          subtotal: item.subtotal
        }
      ]);

    if (itemError) {
      msg.textContent = itemError.message || "Unable to save sale items.";
      return;
    }

    const product = availableProducts.find((p) => p.id === item.id);
    const newQty = Number(product.quantity) - Number(item.quantity);

    const { error: updateError } = await supabaseClient
      .from("products")
      .update({ quantity: newQty })
      .eq("id", item.id);

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
          product_id: item.id,
          movement_type: "sale",
          quantity: item.quantity,
          note: `Sale #${sale.id}`,
          created_by: currentUser.id
        }
      ]);

    if (movementError) {
      msg.textContent = movementError.message || "Unable to save stock movement.";
      return;
    }
  }

  if (paymentMethod === "credit" && customerId) {
    const { error: debtError } = await supabaseClient
      .from("debts")
      .insert([
        {
          company_id: currentProfile.company_id,
          store_id: storeId,
          customer_id: customerId,
          amount: totalAmount,
          amount_paid: 0,
          balance: totalAmount,
          status: "unpaid",
          note: `Credit sale from sale #${sale.id}`,
          created_by: currentUser.id
        }
      ]);

    if (debtError) {
      msg.textContent = debtError.message || "Unable to create debt record.";
      return;
    }
  }

  const change = paymentMethod === "cash" ? Math.max(0, cashReceived - totalAmount) : 0;

  msg.textContent = "Sale completed successfully.";

  salesCart = [];
  renderCart();

  setTimeout(() => {
    window.location.href = `receipt.html?sale_id=${sale.id}&cash_received=${cashReceived || 0}&change=${change}`;
  }, 700);
});

loadSalesPage();