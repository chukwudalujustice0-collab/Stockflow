async function loadReceipt() {
  const auth = await requireAuth();
  if (!auth) return;

  const container = document.getElementById("receiptContainer");

  const params = new URLSearchParams(window.location.search);
  const saleId = params.get("sale");

  if (!saleId) {
    container.innerHTML = "<p>No receipt found.</p>";
    return;
  }

  // ======================
  // LOAD SALE
  // ======================
  const { data: sale, error: saleError } = await supabaseClient
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .single();

  if (saleError || !sale) {
    console.error(saleError);
    container.innerHTML = "<p>Unable to load sale.</p>";
    return;
  }

  // ======================
  // LOAD ITEMS
  // ======================
  const { data: items, error: itemsError } = await supabaseClient
    .from("sale_items")
    .select("*")
    .eq("sale_id", saleId);

  if (itemsError) {
    console.error(itemsError);
    container.innerHTML = "<p>Unable to load items.</p>";
    return;
  }

  // ======================
  // LOAD STORE
  // ======================
  const { data: store } = await supabaseClient
    .from("stores")
    .select("name")
    .eq("id", sale.store_id)
    .maybeSingle();

  // ======================
  // LOAD CUSTOMER
  // ======================
  let customerName = "Walk-in Customer";

  if (sale.customer_id) {
    const { data: customer } = await supabaseClient
      .from("customers")
      .select("name")
      .eq("id", sale.customer_id)
      .maybeSingle();

    if (customer) {
      customerName = customer.name;
    }
  }

  // ======================
  // RENDER RECEIPT
  // ======================
  const itemsHtml = (items || []).map(item => `
    <tr>
      <td>${item.quantity}</td>
      <td>₦${Number(item.unit_price).toLocaleString()}</td>
      <td>₦${Number(item.subtotal).toLocaleString()}</td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="receipt-box">
      <h2 style="text-align:center;">StockFlow Receipt</h2>

      <p><strong>Store:</strong> ${store?.name || "-"}</p>
      <p><strong>Customer:</strong> ${customerName}</p>
      <p><strong>Date:</strong> ${new Date(sale.created_at).toLocaleString()}</p>

      <table style="width:100%; margin-top:10px;">
        <thead>
          <tr>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <hr />

      <h3>Total: ₦${Number(sale.total_amount).toLocaleString()}</h3>
      <p><strong>Payment:</strong> ${sale.payment_method}</p>

      <p style="text-align:center; margin-top:20px;">
        Thank you for your business
      </p>
    </div>
  `;
}

loadReceipt();