let storesCache = [];

async function loadStoresPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;

  fillHeader(profile);

  if (!profile.company_id) {
    alert("Create a company first.");
    window.location.href = "company.html";
    return;
  }

  if (!["director", "assistant_director", "store_manager"].includes(profile.role || "")) {
    alert("You do not have permission to access stores.");
    window.location.href = "dashboard.html";
    return;
  }

  await loadStores(profile);
}

async function loadStores(profile) {
  const list = document.getElementById("storesList");
  if (!list) return;

  let stores = [];

  if (["director", "assistant_director"].includes(profile.role || "")) {
    const { data, error } = await supabaseClient
      .from("stores")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    console.log("STORES LOAD:", data, error);

    if (error) {
      list.innerHTML = "<p>Unable to load stores.</p>";
      return;
    }

    stores = data || [];
  } else {
    const { data: accessRows, error: accessError } = await supabaseClient
      .from("staff_store_access")
      .select("store_id")
      .eq("staff_id", currentUser.id);

    console.log("STORE ACCESS ROWS:", accessRows, accessError);

    if (accessError) {
      list.innerHTML = "<p>Unable to load assigned stores.</p>";
      return;
    }

    const storeIds = (accessRows || []).map((row) => row.store_id);

    if (!storeIds.length) {
      list.innerHTML = "<p>No store assigned.</p>";
      return;
    }

    const { data, error } = await supabaseClient
      .from("stores")
      .select("*")
      .in("id", storeIds)
      .order("created_at", { ascending: false });

    console.log("ASSIGNED STORES:", data, error);

    if (error) {
      list.innerHTML = "<p>Unable to load assigned stores.</p>";
      return;
    }

    stores = data || [];
  }

  storesCache = stores;

  if (!stores.length) {
    list.innerHTML = "<p>No stores created yet.</p>";
    return;
  }

  list.innerHTML = stores.map((store) => `
    <div class="modern-list-card">
      <strong>${store.name}</strong>
      <p>${store.store_type || "Store"}</p>
      <small>${store.address || ""}</small>

      ${
        ["director", "assistant_director"].includes(currentProfile.role || "")
          ? `
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="btn-outline inline-btn" onclick="startEditStore('${store.id}')">Edit</button>
              <button type="button" class="btn-danger inline-btn" onclick="deleteStore('${store.id}')">Delete</button>
            </div>
          `
          : ""
      }
    </div>
  `).join("");
}

async function getLatestSubscription() {
  const { data, error } = await supabaseClient
    .from("subscriptions")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("LATEST SUBSCRIPTION:", data, error);

  if (error) return null;
  return data || null;
}

async function canCreateMoreStores(companyId) {
  const subscription = await getLatestSubscription();
  const maxStores = subscription?.max_stores ?? 1;

  const { count, error } = await supabaseClient
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  console.log("STORE COUNT:", count, error);

  if (error) {
    return { allowed: false, message: "Unable to verify store limit." };
  }

  if (count >= maxStores) {
    return {
      allowed: false,
      message: `Your current plan allows only ${maxStores} store${maxStores > 1 ? "s" : ""}. Upgrade your plan to add more stores.`
    };
  }

  return { allowed: true, message: "" };
}

function resetStoreForm() {
  document.getElementById("editingStoreId").value = "";
  document.getElementById("storeName").value = "";
  document.getElementById("storeType").value = "";
  document.getElementById("storeAddress").value = "";
  document.getElementById("storeFormTitle").textContent = "Create Store";
  document.getElementById("saveStoreBtn").textContent = "Save Store";
  document.getElementById("cancelEditBtn").style.display = "none";
}

function startEditStore(storeId) {
  const store = storesCache.find((s) => s.id === storeId);
  if (!store) return;

  document.getElementById("editingStoreId").value = store.id;
  document.getElementById("storeName").value = store.name || "";
  document.getElementById("storeType").value = store.store_type || "";
  document.getElementById("storeAddress").value = store.address || "";
  document.getElementById("storeFormTitle").textContent = "Edit Store";
  document.getElementById("saveStoreBtn").textContent = "Update Store";
  document.getElementById("cancelEditBtn").style.display = "inline-block";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteStore(storeId) {
  if (!["director", "assistant_director"].includes(currentProfile.role || "")) {
    alert("Only director or assistant director can delete stores.");
    return;
  }

  const confirmed = confirm("Are you sure you want to delete this store?");
  if (!confirmed) return;

  const msg = document.getElementById("storeMessage");
  msg.textContent = "Deleting store...";

  const { error } = await supabaseClient
    .from("stores")
    .delete()
    .eq("id", storeId);

  console.log("DELETE STORE ERROR:", error);

  if (error) {
    msg.textContent = error.message || "Unable to delete store.";
    return;
  }

  msg.textContent = "Store deleted successfully.";
  await loadStores(currentProfile);
  resetStoreForm();
}

document.getElementById("cancelEditBtn")?.addEventListener("click", () => {
  resetStoreForm();
});

document.getElementById("storeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("storeMessage");
  const editingStoreId = document.getElementById("editingStoreId").value;
  const name = document.getElementById("storeName").value.trim();
  const storeType = document.getElementById("storeType").value.trim();
  const address = document.getElementById("storeAddress").value.trim();

  if (!currentProfile?.company_id) {
    msg.textContent = "Create a company first.";
    return;
  }

  if (!["director", "assistant_director"].includes(currentProfile.role || "")) {
    msg.textContent = "Only director or assistant director can create or edit stores.";
    return;
  }

  if (!name) {
    msg.textContent = "Enter store name.";
    return;
  }

  if (editingStoreId) {
    msg.textContent = "Updating store...";

    const { data, error } = await supabaseClient
      .from("stores")
      .update({
        name,
        store_type: storeType,
        address
      })
      .eq("id", editingStoreId)
      .select()
      .single();

    console.log("STORE UPDATE:", data, error);

    if (error) {
      msg.textContent = error.message || "Unable to update store.";
      return;
    }

    msg.textContent = "Store updated successfully.";
    resetStoreForm();
    await loadStores(currentProfile);
    return;
  }

  msg.textContent = "Checking plan...";

  const planCheck = await canCreateMoreStores(currentProfile.company_id);
  if (!planCheck.allowed) {
    msg.textContent = planCheck.message;
    return;
  }

  msg.textContent = "Saving store...";

  const { data, error } = await supabaseClient
    .from("stores")
    .insert([
      {
        company_id: currentProfile.company_id,
        name,
        store_type: storeType,
        address
      }
    ])
    .select()
    .single();

  console.log("STORE INSERT:", data, error);

  if (error) {
    msg.textContent = error.message || "Unable to create store.";
    return;
  }

  msg.textContent = "Store created successfully.";
  resetStoreForm();
  await loadStores(currentProfile);
});

loadStoresPage();