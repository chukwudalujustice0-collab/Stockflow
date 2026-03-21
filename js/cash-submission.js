async function loadCashPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadStores(profile);
  await loadCashHistory(profile);
}

loadCashPage();

// ======================
// LOAD STORES
// ======================
async function loadStores(profile) {
  const select = document.getElementById("cashStore");
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

  stores.forEach(store => {
    const opt = document.createElement("option");
    opt.value = store.id;
    opt.textContent = store.name;
    select.appendChild(opt);
  });
}

// ======================
// SUBMIT CASH
// ======================
document.getElementById("cashSubmissionForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("cashMessage");

  const storeId = document.getElementById("cashStore").value;
  const amount = Number(document.getElementById("cashAmount").value);
  const note = document.getElementById("cashNote").value;

  if (!storeId || amount <= 0) {
    msg.textContent = "Fill all required fields";
    return;
  }

  msg.textContent = "Submitting...";

  const { error } = await supabaseClient.from("cash_submissions").insert([{
    company_id: currentProfile.company_id,
    store_id: storeId,
    submitted_by: currentUser.id,
    amount,
    note,
    status: "pending"
  }]);

  if (error) {
    console.error(error);
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Cash submitted successfully";
  document.getElementById("cashSubmissionForm").reset();

  await loadCashHistory(currentProfile);
});

// ======================
// LOAD HISTORY
// ======================
async function loadCashHistory(profile) {
  const list = document.getElementById("cashSubmissionList");

  const { data } = await supabaseClient
    .from("cash_submissions")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (!data || !data.length) {
    list.innerHTML = "<p>No cash submissions</p>";
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="modern-list-card">
      <strong>₦${Number(c.amount).toLocaleString()}</strong>
      <p>Status: ${c.status}</p>
      <small>${c.note || ""}</small><br>
      <small>${new Date(c.created_at).toLocaleString()}</small>
    </div>
  `).join("");
}