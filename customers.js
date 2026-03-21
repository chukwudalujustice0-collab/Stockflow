async function loadCustomersPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadCustomers(profile);
}

loadCustomersPage();

// ======================
// LOAD CUSTOMERS
// ======================
async function loadCustomers(profile) {
  const list = document.getElementById("customerList");

  const { data, error } = await supabaseClient
    .from("customers")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    list.innerHTML = "<p>Error loading customers</p>";
    return;
  }

  if (!data.length) {
    list.innerHTML = "<p>No customers yet</p>";
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="modern-list-card">
      <strong>${c.name}</strong>
      <p>${c.phone || ""}</p>
      <small>${c.email || ""}</small>
      <br>
      <a href="./customer-statement.html?id=${c.id}" class="btn-outline inline-btn">
        View Statement
      </a>
    </div>
  `).join("");
}

// ======================
// ADD CUSTOMER
// ======================
document.getElementById("customerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("customerMsg");

  const name = document.getElementById("customerName").value;
  const phone = document.getElementById("customerPhone").value;
  const email = document.getElementById("customerEmail").value;
  const address = document.getElementById("customerAddress").value;

  if (!name) {
    msg.textContent = "Enter name";
    return;
  }

  msg.textContent = "Saving...";

  const { error } = await supabaseClient.from("customers").insert([{
    company_id: currentProfile.company_id,
    name,
    phone,
    email,
    address,
    created_by: currentUser.id
  }]);

  if (error) {
    console.error(error);
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Customer saved";
  document.getElementById("customerForm").reset();

  await loadCustomers(currentProfile);
});