async function loadDebtPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);

  await loadCustomersDropdown(auth.profile);
  await loadDebts(auth.profile);
}

async function loadCustomersDropdown(profile) {
  const select = document.getElementById("debtCustomer");

  const { data } = await supabaseClient
    .from("customers")
    .select("id,name")
    .eq("company_id", profile.company_id);

  select.innerHTML = data.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join("");
}

async function loadDebts(profile) {
  const list = document.getElementById("debtList");

  const { data } = await supabaseClient
    .from("debts")
    .select("*, customers(name)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (!data.length) {
    list.innerHTML = "No debts yet.";
    return;
  }

  list.innerHTML = data.map(d => `
    <div class="modern-list-card">
      <strong>${d.customers?.name}</strong>
      <p>Total: ₦${d.amount}</p>
      <p>Paid: ₦${d.amount_paid}</p>
      <p>Balance: ₦${d.balance}</p>
      <small>Status: ${d.status}</small>

      ${d.balance > 0 ? `
        <div style="margin-top:10px;">
          <input type="number" id="pay-${d.id}" placeholder="Amount paid" />
          <button onclick="payDebt('${d.id}')">Pay</button>
        </div>
      ` : `<p style="color:green;">Paid</p>`}
    </div>
  `).join("");
}

async function payDebt(debtId) {
  const input = document.getElementById(`pay-${debtId}`);
  const amount = parseFloat(input.value);

  if (!amount || amount <= 0) {
    alert("Enter valid amount");
    return;
  }

  const { data: debt } = await supabaseClient
    .from("debts")
    .select("*")
    .eq("id", debtId)
    .single();

  const newPaid = Number(debt.amount_paid) + amount;
  const newBalance = Number(debt.amount) - newPaid;

  let status = "partial";
  if (newBalance <= 0) {
    status = "paid";
  }

  await supabaseClient.from("debt_payments").insert([{
    debt_id: debtId,
    amount,
    created_by: currentUser.id
  }]);

  await supabaseClient
    .from("debts")
    .update({
      amount_paid: newPaid,
      balance: newBalance < 0 ? 0 : newBalance,
      status
    })
    .eq("id", debtId);

  loadDebtPage();
}

document.getElementById("debtForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const customerId = document.getElementById("debtCustomer").value;
  const amount = parseFloat(document.getElementById("debtAmount").value);
  const note = document.getElementById("debtNote").value;

  await supabaseClient.from("debts").insert([{
    company_id: currentProfile.company_id,
    customer_id: customerId,
    amount,
    amount_paid: 0,
    balance: amount,
    note,
    status: "unpaid",
    created_by: currentUser.id
  }]);

  loadDebtPage();
});

loadDebtPage();