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
    console.error("RECEIPT LOAD ERROR:", saleError);
    container.innerHTML = "<p>Unable to load receipt.</p>";
    return;
  }

  // NOTE: We are not yet storing sale items separately,
  // so we only show summary for now

  container.innerHTML = `
    <div class="receipt-box">
      <h3 style="margin-bottom:10px;">Receipt</h3>

      <p><strong>Sale ID:</strong> ${sale.id}</p>
      <p><strong>Date:</strong> ${new Date(sale.created_at).toLocaleString()}</p>
      <p><strong>Store:</strong> ${sale.store_id}</p>

      <hr style="margin:10px 0;" />

      <h2 style="margin:10px 0;">₦${Number(sale.total || 0).toLocaleString()}</h2>

      <p>Thank you for your purchase!</p>
    </div>
  `;
}

loadReceiptPage();
