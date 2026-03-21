

async function loadCashSubmissionPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;

  fillHeader(profile);

  if (!profile.company_id) {
    alert("Create a company first.");
    window.location.href = "company.html";
    return;
  }

  await loadCashStores(profile);
  await loadCashSubmissions(profile);
}

async function loadCashStores(profile) {
  const storeSelect = document.getElementById("cashStore");
  if (!storeSelect) return;

  storeSelect.innerHTML = `<option value="">Select store</option>`;

  let stores = [];

  if (["director", "assistant_director"].includes(profile.role || "")) {
    const { data, error } = await supabaseClient
      .from("stores")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    console.log("CASH STORES:", data, error);
    stores = data || [];
  } else {
    const { data: accessRows, error } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", currentUser.id);

    console.log("CASH STAFF ACCESS:", accessRows, error);

    const ids = (accessRows || []).map((row) => row.store_id);

    if (ids.length > 0) {
      const { data } = await supabaseClient
        .from("stores")
        .select("id, name")
        .in("id", ids);

      stores = data || [];
    }
  }

  stores.forEach((store) => {
    const option = document.createElement("option");
    option.value = store.id;
    option.textContent = store.name;
    storeSelect.appendChild(option);
  });

  if (stores.length === 1) {
    storeSelect.value = stores[0].id;
  }
}

async function loadCashSubmissions(profile) {
  const list = document.getElementById("cashSubmissionList");
  if (!list) return;

  let data = [];
  let error = null;

  if (["director", "assistant_director"].includes(profile.role || "")) {
    ({ data, error } = await supabaseClient
      .from("cash_submissions")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }));
  } else {
    ({ data, error } = await supabaseClient
      .from("cash_submissions")
      .select("*")
      .eq("submitted_by", currentUser.id)
      .order("created_at", { ascending: false }));
  }

  console.log("CASH SUBMISSIONS:", data, error);

  if (error) {
    list.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = "<p>No cash submissions yet.</p>";
    return;
  }

  const storeIds = [...new Set(data.map((row) => row.store_id).filter(Boolean))];
  let storeMap = {};

  if (storeIds.length > 0) {
    const { data: stores } = await supabaseClient
      .from("stores")
      .select("id, name")
      .in("id", storeIds);

    (stores || []).forEach((store) => {
      storeMap[store.id] = store.name;
    });
  }

  list.innerHTML = data.map((row) => `
    <div class="modern-list-card">
      <strong>₦${Number(row.amount || 0).toLocaleString()}</strong>
      <p>Store: ${storeMap[row.store_id] || "-"}</p>
      <small>Status: ${row.status}</small><br>
      <small>${row.note || ""}</small><br>
      <small>${new Date(row.created_at).toLocaleString()}</small>
      ${
        ["director", "assistant_director"].includes(profile.role || "")
          ? `
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="btn-primary inline-btn" onclick="updateCashSubmissionStatus('${row.id}', 'approved')">Approve</button>
              <button type="button" class="btn-danger inline-btn" onclick="updateCashSubmissionStatus('${row.id}', 'rejected')">Reject</button>
            </div>
          `
          : ""
      }
    </div>
  `).join("");
}

document.getElementById("cashSubmissionForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("cashMessage");
  const storeId = document.getElementById("cashStore").value;
  const amount = parseFloat(document.getElementById("cashAmount").value || "0");
  const note = document.getElementById("cashNote").value.trim();

  if (!currentProfile?.company_id) {
    msg.textContent = "Create a company first.";
    return;
  }

  if (!storeId) {
    msg.textContent = "Select a store.";
    return;
  }

  if (!amount || amount <= 0) {
    msg.textContent = "Enter a valid amount.";
    return;
  }

  msg.textContent = "Submitting cash...";

  const { error } = await supabaseClient
    .from("cash_submissions")
    .insert([
      {
        company_id: currentProfile.company_id,
        store_id: storeId,
        submitted_by: currentUser.id,
        amount,
        note,
        status: "pending"
      }
    ]);

  console.log("CASH INSERT ERROR:", error);

  if (error) {
    msg.textContent = error.message || "Unable to submit cash.";
    return;
  }

  msg.textContent = "Cash submitted successfully.";
  document.getElementById("cashSubmissionForm").reset();

  await loadCashStores(currentProfile);
  await loadCashSubmissions(currentProfile);
});

async function updateCashSubmissionStatus(id, status) {
  const { error } = await supabaseClient
    .from("cash_submissions")
    .update({ status })
    .eq("id", id);

  if (error) {
    alert(error.message || "Unable to update status.");
    return;
  }

  await loadCashSubmissions(currentProfile);
}

loadCashSubmissionPage();