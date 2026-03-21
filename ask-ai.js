

async function loadAIPage() {
  const auth = await requireAuth();
  if (!auth) return;

  fillHeader(auth.profile);
}

loadAIPage();

// ======================
// QUICK PROMPT
// ======================
function usePrompt(text) {
  document.getElementById("aiQuestion").value = text;
}

// ======================
// HANDLE AI FORM
// ======================
document.getElementById("aiForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("aiMessage");
  const responseBox = document.getElementById("aiResponseBox");
  const question = document.getElementById("aiQuestion").value.toLowerCase();

  msg.textContent = "Analyzing your business...";

  try {
    // ======================
    // LOAD DATA
    // ======================
    const { data: products } = await supabaseClient
      .from("products")
      .select("*")
      .eq("company_id", currentProfile.company_id);

    const { data: sales } = await supabaseClient
      .from("sales")
      .select("*")
      .eq("company_id", currentProfile.company_id);

    // ======================
    // AI LOGIC (SMART RULES)
    // ======================
    let answer = "I couldn't find enough data.";

    // BEST SELLING
    if (question.includes("best") || question.includes("top")) {
      const { data: items } = await supabaseClient
        .from("sale_items")
        .select("*");

      const count = {};

      (items || []).forEach(i => {
        count[i.product_id] = (count[i.product_id] || 0) + i.quantity;
      });

      let bestId = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      const best = products.find(p => p.id == bestId);

      if (best) {
        answer = `Your best selling product is ${best.name} with ${count[bestId]} units sold.`;
      }
    }

    // LOW STOCK
    else if (question.includes("low") || question.includes("stock")) {
      const low = (products || []).filter(p =>
        p.quantity <= (p.reorder_level || 0)
      );

      if (low.length) {
        answer = "Low stock items:\n" + low.map(p => `• ${p.name} (${p.quantity})`).join("\n");
      } else {
        answer = "All products are well stocked.";
      }
    }

    // SALES SUMMARY
    else if (question.includes("sales")) {
      const total = (sales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      answer = `Total sales: ₦${total.toLocaleString()}`;
    }

    // RESTOCK SUGGESTION
    else if (question.includes("restock")) {
      const low = (products || []).filter(p =>
        p.quantity <= (p.reorder_level || 0)
      );

      if (low.length) {
        answer = "You should restock:\n" + low.map(p => `• ${p.name}`).join("\n");
      } else {
        answer = "No urgent restocking needed.";
      }
    }

    responseBox.innerHTML = `<pre>${answer}</pre>`;
    msg.textContent = "";

  } catch (err) {
    console.error(err);
    msg.textContent = "Something went wrong.";
  }
});