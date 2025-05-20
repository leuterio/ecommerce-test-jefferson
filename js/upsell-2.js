const btnUpsell = document.querySelector(".btn-success");
const quantitySelect = document.getElementById("quantity");
const basePrice = 10;
const packageId = 8;
const warrantyPackageId = 7;

const getOrder = async () => {
  try {
    const response = await fetch(`${ordersURL}${refId}/`, {
      method: "GET",
      headers,
    });
    const result = await response.json();

    if (!response.ok || result.supports_post_purchase_upsells === false) {
      window.location.href = campaign.skipSteps(confirmationURL);
    }
  } catch (error) {
    console.error("Get order error:", error);
  }
};

const retrieveOrder = campaign.once(getOrder);

const createUpsell = async () => {
  if (!btnUpsell || btnUpsell.disabled) return;

  const quantity = parseInt(quantitySelect.value || "1", 10);
  
  btnUpsell.disabled = true;
  btnUpsell.textContent = btnUpsell.dataset.loadingText;

  try {
    // add upsell atual, sem warranty
    const orderData = {
      lines: [{ package_id: packageId, quantity }],
      metadata: {}
    };

    const response = await fetch(`${ordersURL}${refId}/upsells/`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to add upsell");

    location.href = campaign.nextStep(nextURL);
  } catch (error) {
    console.error("Upsell error:", error);
    btnUpsell.disabled = false;
    btnUpsell.textContent = btnUpsell.dataset.text;

    const errorBlock = document.getElementById("upsell-error-block");
    if (errorBlock) {
      errorBlock.innerHTML = `
        <div class="alert alert-danger">
          ${error.message || "Failed to process upsell. Please try again."}
        </div>
      `;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  retrieveOrder();
  const sendUpsell = campaign.once(createUpsell);

  if (btnUpsell) {
    btnUpsell.addEventListener("click", sendUpsell);
  }

  document.querySelectorAll(".upsell-no").forEach(anchor => {
    anchor.href = campaign.nextStep(nextURL);
  });

  if (quantitySelect) {
    quantitySelect.addEventListener("change", () => {
      const qty = parseInt(quantitySelect.value || "1", 10);
      document.getElementById("total-price").textContent = (qty * basePrice).toFixed(2);
    });

    quantitySelect.dispatchEvent(new Event("change"));
  }
});
