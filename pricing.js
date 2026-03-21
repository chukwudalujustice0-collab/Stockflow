const PLAN_LIMITS = {
  free: { stores: 1, staff: 2 },
  starter: { stores: 3, staff: 5 },
  pro: { stores: 999, staff: 999 },
  enterprise: { stores: 9999, staff: 9999 }
};

async function loadPricingPage() {
  const auth = await requireAuth();
  if (!auth) return;

  const { profile } = auth;
  fillHeader(profile);

  await loadCurrentPlan();
}

async function loadCurrentPlan() {
  const currentPlanText = document.getElementById("currentPlanText");
  if (!currentPlanText) return;

  const { data, error } = await supabaseClient
    .from("subscriptions")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("CURRENT PLAN:", data, error);

  if (error || !data) {
    currentPlanText.textContent = "Free plan";
    return;
  }

  currentPlanText.textContent = `${data.plan || "free"} plan • ${data.status || "inactive"}`;
}

async function activateMockPlan(plan, amount) {
  const msg = document.getElementById("pricingMessage");

  if (!currentUser || !currentProfile) {
    msg.textContent = "User not loaded.";
    return;
  }

  if (!currentProfile.company_id) {
    msg.textContent = "Create a company first before upgrading.";
    return;
  }

  const limits = PLAN_LIMITS[plan];
  if (!limits) {
    msg.textContent = "Invalid plan selected.";
    return;
  }

  msg.textContent = "Activating subscription...";

  const mockReference = `MOCK-${plan.toUpperCase()}-${Date.now()}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseClient
    .from("subscriptions")
    .insert([
      {
        user_id: currentUser.id,
        company_id: currentProfile.company_id,
        plan,
        status: "active",
        amount,
        paystack_ref: mockReference,
        max_stores: limits.stores,
        max_staff: limits.staff,
        expires_at: expiresAt
      }
    ]);

  if (error) {
    console.error("SUBSCRIPTION ERROR:", error);
    msg.textContent = error.message || "Unable to activate plan.";
    return;
  }

  msg.classList.add("ok-message");
  msg.textContent = `${plan} plan activated successfully. Redirecting...`;

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 1000);
}

loadPricingPage();