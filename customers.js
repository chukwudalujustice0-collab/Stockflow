

async function loadCustomersPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);
  await loadCustomers(auth.profile);
}

async function loadCustomers(profile) {

  const list = document.getElementById("customerList");

  const { data, error } = await supabaseClient
    .from("customers")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = error.message;
    return;
  }

  if (!data.length) {
    list.innerHTML = "No customers yet.";
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="modern-list-card">
      <strong>${c.name}</strong>
      <p>${c.phone || ""}</p>
      <small>${c.email || ""}</small>
    </div>
  `).join("");
}

document.getElementById("customerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("customerMsg");

  const name = document.getElementById("customerName").value;
  const phone = document.getElementById("customerPhone").value;
  const email = document.getElementById("customerEmail").value;
  const address = document.getElementById("customerAddress").value;

  msg.textContent = "Saving...";

  const { error } = await supabaseClient
    .from("customers")
    .insert([{
      company_id: currentProfile.company_id,
      name, phone, email, address,
      created_by: currentUser.id
    }]);

  if (error) {
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Saved!";
  e.target.reset();

  loadCustomers(currentProfile);
});

loadCustomersPage();