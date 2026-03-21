async function loadReceipt() {
  const auth = await requireAuth();
  if (!auth) return;

  const receiptBox = document.getElementById("receiptBox");
  if (!receiptBox) return;

  const params = new URLSearchParams(window.location.search);
  const saleId = params.get("sale_id");
  const cashReceived = Number(params.get("cash_received") || 0);
  const change = Number(params.get("change") || 0);

  if (!saleId) {
    receiptBox.innerHTML = "<p>Receipt not found. Missing sale ID.</p>";
    return;
  }

  const { data: sale, error: saleError } = await supabaseClient
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .maybeSingle();

  if (saleError || !sale) {
    console.error("RECEIPT SALE ERROR:", saleError);
    receiptBox.innerHTML = "<p>Unable to load receipt sale.</p>";
    return;
  }

  const { data: items, error: itemsError } = await supabaseClient
    .from("sale_items")
    .select("*")
    .eq("sale_id", sale.id);

  if (itemsError) {
    console.error("RECEIPT ITEMS ERROR:", itemsError);
    receiptBox.innerHTML = "<p>Unable to load receipt items.</p>";
    return;
  }

  const { data: company } = await supabaseClient
    .from("companies")
    .select("name")
    .eq("id", sale.company_id)
    .maybeSingle();

  const { data: store } = await supabaseClient
    .from("stores")
    .select("name")
    .eq("id", sale.store_id)
    .maybeSingle();

  const { data: staff } = await supabaseClient
    .from("profiles")
    .select("full_name,email")
    .eq("id", sale.sold_by)
    .maybeSingle();

  let productMap = {};
  const productIds = (items || []).map((item) => item.product_id).filter(Boolean);

  if (productIds.length) {
    const { data: products } = await supabaseClient
      .from("products")
      .select("id,name")
      .in("id", productIds);

    (products || []).forEach((product) => {
      productMap[product.id] = product.name;
    });
  }

  receiptBox.innerHTML = `
    <div style="text-align:center; margin-bottom:18px;">
      <h2 style="margin:0;">${company?.name || "StockFlow"}</h2>
      <p style="margin:6px 0 0;">${store?.name || ""}</p>
    </div>

    <div class="modern-list-card">
      <p><strong>Receipt ID:</strong> ${sale.id}</p>
      <p><strong>Date:</strong> ${new Date(sale.created_at).toLocaleString()}</p>
      <p><strong>Staff:</strong> ${staff?.full_name || staff?.email || "-"}</p>
      <p><strong>Payment:</strong> ${sale.payment_method || "-"}</p>
    </div>

    <div style="margin-top:14px;">
      ${(items || []).map((item) => `
        <div class="modern-list-card">
          <strong>${productMap[item.product_id] || "Product"}</strong>
          <p>${item.quantity} × ₦${Number(item.unit_price || 0).toLocaleString()}</p>
          <small>Subtotal: ₦${Number(item.subtotal || 0).toLocaleString()}</small>
        </div>
      `).join("")}
    </div>

    <div class="modern-card" style="margin-top:14px;">
      <p><strong>Total:</strong> ₦${Number(sale.total_amount || 0).toLocaleString()}</p>
      <p><strong>Cash Received:</strong> ₦${cashReceived.toLocaleString()}</p>
      <p><strong>Change:</strong> ₦${change.toLocaleString()}</p>
    </div>
  `;
}

loadReceipt();