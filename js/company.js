async function loadCompanyPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;

  fillHeader(profile);
  renderSidebarByRole(profile);

  await loadCurrentCompany(profile);
}

async function loadCurrentCompany(profile) {
  const box = document.getElementById("currentCompanyBox");
  if (!box) return;

  if (!profile.company_id) {
    box.innerHTML = "<p>No company created yet.</p>";
    return;
  }

  const { data: company, error } = await supabaseClient
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .maybeSingle();

  if (error || !company) {
    box.innerHTML = "<p>Unable to load company.</p>";
    return;
  }

  box.innerHTML = `
    <div class="store-item">
      <strong>${company.name}</strong><br>
      <small>Created: ${new Date(company.created_at).toLocaleString()}</small>
    </div>
  `;
}

document.getElementById("companyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const input = document.getElementById("companyNameInput");
  const msg = document.getElementById("companyMessage");

  if (!input || !msg) return;

  const name = input.value.trim();

  if (!currentUser || !currentProfile) {
    msg.textContent = "User not loaded.";
    return;
  }

  if (!name) {
    msg.textContent = "Enter company name.";
    return;
  }

  if (currentProfile.company_id) {
    msg.textContent = "You already have a company.";
    return;
  }

  msg.textContent = "Saving company...";

  const { data: company, error } = await supabaseClient
    .from("companies")
    .insert([
      {
        name: name,
        created_by: currentUser.id
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("COMPANY INSERT ERROR:", error);
    msg.textContent = error.message || "Unable to create company.";
    return;
  }

  const { error: profileError } = await supabaseClient
    .from("profiles")
    .update({
      company_id: company.id,
      role: "director"
    })
    .eq("id", currentUser.id);

  if (profileError) {
    console.error("PROFILE UPDATE ERROR:", profileError);
    msg.textContent = profileError.message || "Profile update failed.";
    return;
  }

  currentProfile.company_id = company.id;
  currentProfile.role = "director";

  msg.textContent = "Company created successfully. Redirecting to stores...";
  input.value = "";

  setTimeout(() => {
    window.location.href = "stores.html";
  }, 1200);
});

loadCompanyPage();