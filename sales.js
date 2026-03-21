let cart = [];

// ======================
// INIT
// ======================
async function loadSalesPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);

  await loadStores(auth.profile);
  await loadCustomers(auth.profile);
}

loadSalesPage();

// ======================
// LOAD STORES
// ======================
async function loadStores(profile) {
  const select = document.getElementById("salesStore");
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
  stores.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

// ======================
// LOAD CUSTOMERS
// ======================
async function loadCustomers(profile) {
  const select = document.getElementById("saleCustomer");
  if (!select) return;

  const { data } = await supabaseClient
    .from("customers")
    .select("id, name")
    .eq("company_id", profile.company_id);

  const customers = data || [];

  customers.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

// ======================
// LOAD PRODUCTS
// ======================
document.getElementById("salesStore")?.addEventListener("change", async (e) => {
  const storeId = e.target.value;
  if (!storeId) return;

  const { data } = await supabaseClient
    .from("products")
    .select("*")
    .eq("store_id", storeId);

  renderProducts(data || []);
});

function renderProducts(products) {
  const list = document.getElementById("salesProductsList");

  if (!products.length) {
    list.innerHTML = "<p>No products</p>";
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="product-card">
      <strong>${p.name}</strong>
      <p>₦${Number(p.selling_price).toLocaleString()}</p>
      <button onclick="addToCart('${p.id}', '${p.name}', ${p.selling_price})">
        Add
      </button>
    </div>
  `).join("");
}

// ======================
// CART
// ======================
function addToCart(id, name, price) {
  const item = cart.find(i => i.id === id);

  if (item) {
    item.qty += 1;
  } else {
    cart.push({ id, name, price, qty: 1 });
  }

  renderCart();
}

function renderCart() {
  const list = document.getElementById("cartList");

  if (!cart.length) {
    list.innerHTML = "<p>No items in cart.</p>";
    updateTotals();
    return;
  }

  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <strong>${item.name}</strong>
      <p>${item.qty} x ₦${item.price}</p>
    </div>
  `).join("");

  updateTotals();
}

// ======================
// TOTALS
// ======================
function updateTotals() {
  const subtotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);

  document.getElementById("cartSubtotal").textContent = subtotal;
  document.getElementById("cartTotal").textContent = subtotal;

  const cash = Number(document.getElementById("cashReceived")?.value || 0);
  const change = cash - subtotal;

  document.getElementById("cartChange").textContent = change > 0 ? change : 0;
}

// ======================
// CHECKOUT
// ======================
document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
  const msg = document.getElementById("salesMessage");

  if (!cart.length) {
    msg.textContent = "Cart is empty";
    return;
  }

  const storeId = document.getElementById("salesStore").value;
  const customerId = document.getElementById("saleCustomer").value || null;
  const paymentMethod = document.getElementById("paymentMethod").value;

  if (!storeId) {
    msg.textContent = "Select store";
    return;
  }

  const total = cart.reduce((sum, i) => sum + i.qty * i.price, 0);

  msg.textContent = "Processing sale...";

  const { data: sale, error } = await supabaseClient
    .from("sales")
    .insert([{
      company_id: currentProfile.company_id,
      store_id: storeId,
      sold_by: currentUser.id,
      customer_id: customerId,
      total_amount: total,
      payment_method: paymentMethod
    }])
    .select()
    .single();

  if (error) {
    msg.textContent = error.message;
    return;
  }

  const saleId = sale.id;

  // insert items
  for (let item of cart) {
    await supabaseClient.from("sale_items").insert([{
      sale_id: saleId,
      product_id: item.id,
      quantity: item.qty,
      unit_price: item.price,
      subtotal: item.qty * item.price
    }]);

    // reduce stock
    await supabaseClient
      .from("products")
      .update({
        quantity: supabaseClient.rpc ? undefined : undefined
      })
      .eq("id", item.id);

    // safer stock reduction
    await supabaseClient.rpc("increment", {
      row_id: item.id,
      amount: -item.qty
    }).catch(() => {});
  }

  msg.textContent = "Sale completed";

  cart = [];
  renderCart();

  setTimeout(() => {
    window.location.href = "./receipt.html?sale=" + saleId;
  }, 800);
});