async function loadStoresPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  const form = document.getElementById("storeForm");
  const msg = document.getElementById("storeMsg");

  if (!profile.company_id) {
    if (msg) msg.textContent = "Create a company first before adding stores.";
    const list = document.getElementById("storeList");
    if (list) list.innerHTML = "<p>No company found.</p>";
    if (form) disableStoreForm(true);
    return;
  }

  const isDirector = String(profile.role || "").toLowerCase() === "director";

  if (!isDirector) {
    if (msg) msg.textContent = "Only the company director can create stores.";
    disableStoreForm(true);
  } else {
    disableStoreForm(false);
  }

  await loadStores(profile.company_id);
}

function disableStoreForm(disabled) {
  const name = document.getElementById("storeName");
  const type = document.getElementById("storeType");
  const address = document.getElementById("storeAddress");
  const button = document.querySelector("#storeForm button[type='submit']");

  if (name) name.disabled = disabled;
  if (type) type.disabled = disabled;
  if (address) address.disabled = disabled;
  if (button) button.disabled = disabled;
}

document.getElementById("storeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("storeName")?.value.trim();
  const type = document.getElementById("storeType")?.value;
  const address = document.getElementById("storeAddress")?.value.trim();
  const msg = document.getElementById("storeMsg");

  const isDirector = String(currentProfile?.role || "").toLowerCase() === "director";

  if (!isDirector) {
    if (msg) msg.textContent = "Only the company director can create stores.";
    return;
  }

  if (!name) {
    if (msg) msg.textContent = "Store name is required.";
    return;
  }

  if (!currentProfile?.company_id) {
    if (msg) msg.textContent = "No company found.";
    return;
  }

  if (msg) msg.textContent = "Creating store...";

  const { error } = await supabaseClient
    .from("stores")
    .insert([
      {
        name: name,
        type: type,
        address: address,
        company_id: currentProfile.company_id
      }
    ]);

  if (error) {
    console.error("CREATE STORE ERROR:", error);
    if (msg) msg.textContent = error.message || "Failed to create store.";
    return;
  }

  if (msg) msg.textContent = "Store created successfully.";
  document.getElementById("storeForm")?.reset();

  await loadStores(currentProfile.company_id);
});

async function loadStores(companyId) {
  const list = document.getElementById("storeList");
  if (!list) return;

  list.innerHTML = "Loading...";

  const { data, error } = await supabaseClient
    .from("stores")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LOAD STORES ERROR:", error);
    list.innerHTML = "<p>Unable to load stores.</p>";
    return;
  }

  if (!data?.length) {
    list.innerHTML = "<p>No stores yet.</p>";
    return;
  }

  const isDirector = String(currentProfile?.role || "").toLowerCase() === "director";

  list.innerHTML = data.map((store) => `
    <div class="modern-list-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div style="flex:1;">
          <strong>${store.name}</strong>
          <p>${store.type || ""}</p>
          <small>${store.address || ""}</small>
        </div>

        ${
          isDirector
            ? `
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="editStore('${store.id}', ${JSON.stringify(store.name)}, ${JSON.stringify(store.type || "")}, ${JSON.stringify(store.address || "")})" class="btn-outline" style="padding:6px 10px; font-size:13px;">Edit</button>
                <button onclick="deleteStore('${store.id}')" class="btn-danger" style="padding:6px 10px; font-size:13px;">Delete</button>
              </div>
            `
            : ""
        }
      </div>
    </div>
  `).join("");
}

async function deleteStore(id) {
  const isDirector = String(currentProfile?.role || "").toLowerCase() === "director";
  if (!isDirector) {
    alert("Only the company director can delete stores.");
    return;
  }

  if (!confirm("Delete this store?")) return;

  const { error } = await supabaseClient
    .from("stores")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadStores(currentProfile.company_id);
}

function editStore(id, name, type, address) {
  const isDirector = String(currentProfile?.role || "").toLowerCase() === "director";
  if (!isDirector) {
    alert("Only the company director can edit stores.");
    return;
  }

  const newName = prompt("Edit store name:", name);
  if (!newName) return;

  updateStore(id, newName, type, address);
}

async function updateStore(id, name, type, address) {
  const isDirector = String(currentProfile?.role || "").toLowerCase() === "director";
  if (!isDirector) {
    alert("Only the company director can edit stores.");
    return;
  }

  const { error } = await supabaseClient
    .from("stores")
    .update({
      name: name,
      type: type,
      address: address
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadStores(currentProfile.company_id);
}

loadStoresPage();
