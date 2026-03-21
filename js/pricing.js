async function loadPricingPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);

  await loadCurrentPlan();
}

loadPricingPage();

// ======================
// LOAD CURRENT PLAN
// ======================
async function loadCurrentPlan() {
  const planNameEl = document.getElementById("currentPlanName");
  const planMetaEl = document.getElementById("currentPlanMeta");

  const { data, error } = await supabaseClient
    .from("subscriptions")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("PLAN LOAD ERROR:", error);
    return;
  }

  if (!data) {
    planNameEl.textContent = "Current Plan: Free";
    planMetaEl.textContent = "No active subscription yet";
    return;
  }

  planNameEl.textContent = `Current Plan: ${data.plan}`;
  planMetaEl.textContent = `Stores: ${data.max_stores} • Staff: ${data.max_staff}`;
}

// ======================
// ACTIVATE PLAN
// ======================
async function activatePlan(plan, price, maxStores, maxStaff) {
  const msg = document.getElementById("pricingMessage");

  msg.textContent = "Activating plan...";

  // ⚠️ MOCK PAYMENT (for now)
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { error } = await supabaseClient
    .from("subscriptions")
    .insert([{
      user_id: currentUser.id,
      plan,
      price,
      max_stores: maxStores,
      max_staff: maxStaff,
      status: "active"
    }]);

  if (error) {
    console.error("PLAN ERROR:", error);
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Plan activated successfully";

  await loadCurrentPlan();
}