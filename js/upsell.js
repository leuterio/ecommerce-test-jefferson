const btnUpsell = document.querySelector(".btn-success");
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

function goTo(path) {
  const isGitHubPages = window.location.hostname.includes("github.io");
  const basePath = isGitHubPages ? `/${window.location.pathname.split('/')[1]}` : '';
  window.location.href = `${basePath}${path}`;
}

const createUpsell = async () => {
  if (!btnUpsell || btnUpsell.disabled) return;

  btnUpsell.disabled = true;
  btnUpsell.textContent = btnUpsell.dataset.loadingText;

  try {
    const orderData = {
      lines: Array.isArray(upsellLineItem) ? [...upsellLineItem] : [],
      metadata: {}
    };

    const response = await fetch(`${ordersURL}${refId}/upsells/`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to add upsell");

    goTo("/upsell-2.html");
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
    anchor.addEventListener("click", e => {
      e.preventDefault();
      goTo("/upsell-2.html");
    });
  });
});
