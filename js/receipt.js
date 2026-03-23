async function loadReceiptPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);

  const params = new URLSearchParams(window.location.search);
  const saleId = params.get("sale");
  const container = document.getElementById("receiptContainer");

  if (!saleId) {
    container.innerHTML = "<p>No sale ID provided.</p>";
    return;
  }

  const { data: sale, error: saleError } = await supabaseClient
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .maybeSingle();

  if (saleError || !sale) {
    console.error("RECEIPT SALE LOAD ERROR:", saleError);
    container.innerHTML = "<p>Unable to load sale.</p>";
    return;
  }

  const [
    storeRes,
    sellerRes,
    itemsRes
  ] = await Promise.all([
    supabaseClient
      .from("stores")
      .select("id, name, address")
      .eq("id", sale.store_id)
      .maybeSingle(),

    supabaseClient
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", sale.sold_by)
      .maybeSingle(),

    supabaseClient
      .from("sale_items")
      .select("*")
      .eq("sale_id", sale.id)
      .order("created_at", { ascending: true })
  ]);

  const store = storeRes.data || {};
  const seller = sellerRes.data || {};
  const items = itemsRes.data || [];

  let company = null;
  if (sale.company_id) {
    const companyRes = await supabaseClient
      .from("companies")
      .select("name, logo_url")
      .eq("id", sale.company_id)
      .maybeSingle();

    company = companyRes.data || null;
  }

  const itemsHtml = items.length
    ? items.map((item) => `
        <tr>
          <td style="padding:10px 6px; border-bottom:1px solid rgba(255,255,255,0.15);">${item.product_name}</td>
          <td style="padding:10px 6px; border-bottom:1px solid rgba(255,255,255,0.15); text-align:center;">${item.quantity}</td>
          <td style="padding:10px 6px; border-bottom:1px solid rgba(255,255,255,0.15); text-align:right;">₦${Number(item.unit_price || 0).toLocaleString()}</td>
          <td style="padding:10px 6px; border-bottom:1px solid rgba(255,255,255,0.15); text-align:right;">₦${Number(item.subtotal || 0).toLocaleString()}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" style="padding:14px 6px; text-align:center;">No sale items recorded.</td></tr>`;

  container.innerHTML = `
    <div id="receiptCard" style="
      background: linear-gradient(160deg, #0f2f73 0%, #2563eb 55%, #c084fc 100%);
      color: #fff;
      border-radius: 24px;
      padding: 20px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
      overflow: hidden;
      position: relative;
    ">
      <div style="position:absolute; top:-30px; right:-20px; width:160px; height:160px; background:rgba(255,255,255,0.08); border-radius:50%;"></div>
      <div style="position:absolute; bottom:-40px; left:-25px; width:140px; height:140px; background:rgba(255,255,255,0.06); border-radius:50%;"></div>

      <div style="position:relative; z-index:2;">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:18px;">
          ${
            company?.logo_url
              ? `<img src="${company.logo_url}" alt="Store Logo" style="width:60px; height:60px; border-radius:14px; object-fit:cover; background:#fff;">`
              : `<div style="width:60px; height:60px; border-radius:14px; background:rgba(255,255,255,0.18); display:grid; place-items:center; font-size:26px;">🏪</div>`
          }

          <div>
            <h2 style="font-size:24px; margin:0;">${company?.name || store.name || "Store Receipt"}</h2>
            <p style="margin:4px 0 0; opacity:.9;">${store.address || "Store address not available"}</p>
          </div>
        </div>

        <div style="
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 18px;
        ">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div><strong>Receipt ID:</strong><br><small>${sale.id}</small></div>
            <div><strong>Date & Time:</strong><br><small>${new Date(sale.created_at).toLocaleString()}</small></div>
            <div><strong>Sold By:</strong><br><small>${seller.full_name || seller.email || "-"}</small></div>
            <div><strong>Payment Mode:</strong><br><small>${sale.payment_mode || "cash"}</small></div>
          </div>
        </div>

        <div style="
          background: rgba(255,255,255,0.10);
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 18px;
        ">
          <h3 style="margin:0 0 12px;">Items Bought</h3>

          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <thead>
                <tr>
                  <th style="text-align:left; padding:8px 6px;">Item</th>
                  <th style="text-align:center; padding:8px 6px;">Qty</th>
                  <th style="text-align:right; padding:8px 6px;">Price</th>
                  <th style="text-align:right; padding:8px 6px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div style="
          background: rgba(255,255,255,0.14);
          border-radius: 18px;
          padding: 16px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:18px;
        ">
          <span style="font-size:18px; font-weight:700;">Total Amount</span>
          <span style="font-size:24px; font-weight:800;">₦${Number(sale.total || 0).toLocaleString()}</span>
        </div>

        <div style="text-align:center; padding-top:8px;">
          <p style="font-size:18px; font-weight:700; margin-bottom:6px;">Thanks for patronage</p>
          <small style="opacity:.9;">Powered by StockFlow</small>
        </div>
      </div>
    </div>
  `;
}

async function downloadReceiptAsJpeg() {
  const card = document.getElementById("receiptCard");
  if (!card) return;

  const canvas = await html2canvas(card, {
    scale: 2,
    backgroundColor: null,
    useCORS: true
  });

  const link = document.createElement("a");
  link.download = `receipt-${new Date().getTime()}.jpeg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();
}

window.downloadReceiptAsJpeg = downloadReceiptAsJpeg;
loadReceiptPage();
