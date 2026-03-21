async function loadDebtPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadCustomers(profile);
  await loadDebts(profile);
}

loadDebtPage();

// ======================
// LOAD CUSTOMERS
// ======================
async function loadCustomers(profile) {
  const select = document.getElementById("debtCustomer");
  if (!select) return;

  const { data } = await supabaseClient
    .from("customers")
    .select("id, name")
    .eq("company_id", profile.company_id);

  select.innerHTML = `<option value="">Select customer</option>`;

  (data || []).forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

// ======================
// SAVE DEBT
// ======================
document.getElementById("debtForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("debtMsg");

  const customerId = document.getElementById("debtCustomer").value;
  const amount = Number(document.getElementById("debtAmount").value);
  const note = document.getElementById("debtNote").value;

  if (!customerId || amount <= 0) {
    msg.textContent = "Fill all required fields";
    return;
  }

  msg.textContent = "Saving debt...";

  const { error } = await supabaseClient.from("debts").insert([{
    company_id: currentProfile.company_id,
    customer_id: customerId,
    amount,
    amount_paid: 0,
    balance: amount,
    status: "unpaid",
    note,
    created_by: currentUser.id
  }]);

  if (error) {
    console.error(error);
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Debt recorded";
  document.getElementById("debtForm").reset();

  await loadDebts(currentProfile);
});

// ======================
// LOAD DEBTS
// ======================
async function loadDebts(profile) {
  const list = document.getElementById("debtList");

  const { data } = await supabaseClient
    .from("debts")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (!data || !data.length) {
    list.innerHTML = "<p>No debts</p>";
    return;
  }

  list.innerHTML = data.map(d => `
    <div class="modern-list-card">
      <strong>₦${Number(d.amount).toLocaleString()}</strong>
      <p>Status: ${d.status}</p>
      <small>Balance: ₦${Number(d.balance).toLocaleString()}</small>
      <br>
      <a href="./customer-statement.html?id=${d.customer_id}" class="btn-outline inline-btn">
        View Customer
      </a>
    </div>
  `).join("");
}