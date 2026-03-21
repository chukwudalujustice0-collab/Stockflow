

let statementData = [];

async function loadStatementPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);
  await loadCustomers(auth.profile);
}

async function loadCustomers(profile) {
  const select = document.getElementById("statementCustomer");

  const { data } = await supabaseClient
    .from("customers")
    .select("id,name")
    .eq("company_id", profile.company_id);

  select.innerHTML = data.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join("");
}

async function loadStatement() {

  const customerId = document.getElementById("statementCustomer").value;

  const { data: debts } = await supabaseClient
    .from("debts")
    .select("*")
    .eq("customer_id", customerId);

  const { data: payments } = await supabaseClient
    .from("debt_payments")
    .select("*");

  let totalDebt = 0;
  let totalPaid = 0;

  let combined = [];

  (debts || []).forEach(d => {
    totalDebt += Number(d.amount);

    combined.push({
      type: "debt",
      amount: d.amount,
      date: d.created_at
    });

    (payments || [])
      .filter(p => p.debt_id === d.id)
      .forEach(p => {
        totalPaid += Number(p.amount);

        combined.push({
          type: "payment",
          amount: p.amount,
          date: p.created_at
        });
      });
  });

  const balance = totalDebt - totalPaid;

  document.getElementById("totalDebt").textContent = `₦${totalDebt}`;
  document.getElementById("totalPaid").textContent = `₦${totalPaid}`;
  document.getElementById("totalBalance").textContent = `₦${balance}`;

  combined.sort((a,b) => new Date(b.date) - new Date(a.date));

  statementData = combined;

  document.getElementById("statementList").innerHTML = combined.map(item => `
    <div class="modern-list-card">
      <strong>${item.type.toUpperCase()}</strong>
      <p>₦${item.amount}</p>
      <small>${new Date(item.date).toLocaleString()}</small>
    </div>
  `).join("");
}

function exportStatement() {

  if (!statementData.length) {
    alert("No data");
    return;
  }

  let csv = "Type,Amount,Date\n";

  statementData.forEach(item => {
    csv += `${item.type},${item.amount},${item.date}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "statement.csv";
  a.click();
}

loadStatementPage();