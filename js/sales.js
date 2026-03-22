let cart = [];
let salesProductsCache = [];

async function loadSalesPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);

  if (!auth.profile.company_id) {
    const salesProductsList = document.getElementById("salesProductsList");
    const recentSalesList = document.getElementById("recentSalesList");

    if (salesProductsList) {
      salesProductsList.innerHTML = "<p>Create a company first before recording sales.</p>";
    }

    if (recentSalesList) {
      recentSalesList.innerHTML = "<p>No company found.</p>";
    }
    return;
  }

  await loadStores();
  await loadRecentSales();
  renderCart();
}

async function loadStores() {
  const select = document.getElementById("salesStore");
  if (!select) return;

  select.innerHTML = `<option value="">Select store</option>`;

  const { data, error } = await supabaseClient
    .from("stores")
    .select("id, name")
    .eq("company_id", currentProfile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD SALES STORES ERROR:", error);
    return;
  }

  (data || []).forEach((store) => {
    const option = document.createElement("option");
    option.value = store.id;
    option.textContent = store.name;
    select.appendChild(option);
  });
}

document.getElementById("salesStore")?.addEventListener("change", async (e) => {
  const storeId = e.target.value;
  await loadProductsForStore(storeId);
});

document.getElementById("productSearch")?.addEventListener("input", () => {
  renderSalesProducts();
});

async function loadProductsForStore(storeId) {
  const list = document.getElementById("salesProductsList");
  if (!list) return;

  if (!storeId) {
    salesProductsCache = [];
    list.innerHTML = "<p>Select a store first.</p>";
    return;
  }

  list.innerHTML = "<p>Loading products...</p>";

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD SALES PRODUCTS ERROR:", error);
    list.innerHTML = "<p>Unable to load products.</p>";
    return;
  }

  salesProductsCache = data || [];
  renderSalesProducts();
}

function renderSalesProducts() {
  const list = document.getElementById("salesProductsList");
  const searchValue = document.getElementById("productSearch")?.value.trim().toLowerCase() || "";

  if (!list) return;

  let filtered = salesProductsCache;

  if (searchValue) {
    filtered = filtered.filter((p) =>
      String(p.name || "").toLowerCase().includes(searchValue)
    );
  }

  if (!filtered.length) {
    list.innerHTML = "<p>No matching products found.</p>";
    return;
  }

  list.innerHTML = filtered.map((product) => `
    <div class="product-card">
      ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" />` : ""}
      <strong>${product.name}</strong>
      <p>${product.category || "No category"}</p>
      <p>₦${Number(product.selling_price || 0).toLocaleString()}</p>
      <small>Qty: ${Number(product.quantity || 0)}</small>
      <button
        type="button"
        class="btn-primary full-btn"
        style="margin-top:10px;"
        onclick="addToCart('${product.id}')"
        ${Number(product.quantity || 0) <= 0 ? "disabled" : ""}
      >
        ${Number(product.quantity || 0) <= 0 ? "Out of Stock" : "Add to Cart"}
      </button>
    </div>
  `).join("");
}

function addToCart(productId) {
  const product = salesProductsCache.find((p) => p.id === productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);

  if (existing) {
    if (existing.quantity >= Number(product.quantity || 0)) {
      alert("Not enough stock available.");
      return;
    }
    existing.quantity += 1;
  } else {
    if (Number(product.quantity || 0) <= 0) {
      alert("Product is out of stock.");
      return;
    }

    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.selling_price || 0),
      quantity: 1,
      stock: Number(product.quantity || 0)
    });
  }

  renderCart();
}

function increaseCartItem(productId) {
  const item = cart.find((row) => row.id === productId);
  if (!item) return;

  if (item.quantity >= item.stock) {
    alert("Cannot add more than available stock.");
    return;
  }

  item.quantity += 1;
  renderCart();
}

function decreaseCartItem(productId) {
  const item = cart.find((row) => row.id === productId);
  if (!item) return;

  item.quantity -= 1;

  if (item.quantity <= 0) {
    cart = cart.filter((row) => row.id !== productId);
  }

  renderCart();
}

function removeCartItem(productId) {
  cart = cart.filter((row) => row.id !== productId);
  renderCart();
}

function renderCart() {
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");

  if (!cartList || !cartTotal) return;

  if (!cart.length) {
    cartList.innerHTML = "<p>No items in cart.</p>";
    cartTotal.textContent = "0";
    return;
  }

  let total = 0;

  cartList.innerHTML = cart.map((item) => {
    const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
    total += subtotal;

    return `
      <div class="modern-list-card">
        <strong>${item.name}</strong>
        <p>₦${Number(item.price).toLocaleString()} × ${item.quantity}</p>
        <small>Subtotal: ₦${subtotal.toLocaleString()}</small>

        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
          <button type="button" class="btn-outline inline-btn" onclick="decreaseCartItem('${item.id}')">-</button>
          <button type="button" class="btn-outline inline-btn" onclick="increaseCartItem('${item.id}')">+</button>
          <button type="button" class="btn-danger inline-btn" onclick="removeCartItem('${item.id}')">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  cartTotal.textContent = total.toLocaleString();
}

document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
  const msg = document.getElementById("salesMessage");
  const storeId = document.getElementById("salesStore")?.value;

  if (!storeId) {
    if (msg) msg.textContent = "Select a store first.";
    return;
  }

  if (!cart.length) {
    if (msg) msg.textContent = "Add at least one product to cart.";
    return;
  }

  const total = cart.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);

  if (msg) msg.textContent = "Processing sale...";

  const { data: saleData, error: saleError } = await supabaseClient
    .from("sales")
    .insert([
      {
        company_id: currentProfile.company_id,
        store_id: storeId,
        sold_by: currentUser.id,
        total: total
      }
    ])
    .select()
    .single();

  if (saleError) {
    console.error("CREATE SALE ERROR:", saleError);
    if (msg) msg.textContent = saleError.message || "Failed to save sale.";
    return;
  }

  for (const item of cart) {
    const matchingProduct = salesProductsCache.find((p) => p.id === item.id);
    const currentQty = Number(matchingProduct?.quantity || 0);
    const newQty = currentQty - Number(item.quantity || 0);

    const { error: updateError } = await supabaseClient
      .from("products")
      .update({ quantity: newQty })
      .eq("id", item.id);

    if (updateError) {
      console.error("UPDATE PRODUCT STOCK ERROR:", updateError);
    }
  }

  if (msg) msg.textContent = "Sale completed successfully.";
  cart = [];
  renderCart();

  await loadProductsForStore(storeId);
  await loadRecentSales();

  setTimeout(() => {
    window.location.href = `./receipt.html?sale=${saleData.id}`;
  }, 700);
});

async function loadRecentSales() {
  const list = document.getElementById("recentSalesList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("sales")
    .select("*")
    .eq("company_id", currentProfile.company_id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("LOAD RECENT SALES ERROR:", error);
    list.innerHTML = "<p>Unable to load recent sales.</p>";
    return;
  }

  const sales = data || [];

  if (!sales.length) {
    list.innerHTML = "<p>No sales yet.</p>";
    return;
  }

  list.innerHTML = sales.map((sale) => `
    <div class="modern-list-card">
      <strong>₦${Number(sale.total || 0).toLocaleString()}</strong>
      <p>Store ID: ${sale.store_id || "-"}</p>
      <small>${new Date(sale.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}

loadSalesPage();
