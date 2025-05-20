//
// Variables
//
let finalLineArr = [];
const warrantyCheckbox = document.getElementById("addWarranty");
const warrantyPackageId = 7;

// form
const formEl = document.querySelector(".form");
const firstName = document.querySelector("#id_first_name");
const lastName = document.querySelector("#id_last_name");
const email = document.querySelector("#id_email");
const expMonth = document.getElementById("id_expiry_month");
const expYear = document.getElementById("id_expiry_year");
const cvvParent = document.getElementById("bankcard-cvv");
const numberParent = document.getElementById("bankcard-number");
const cardErrBlock = document.getElementById("payment-error-block");

const ccCheckbox = document.getElementById("id_use_new_card");
const addCheckbox = document.getElementById("id_same_as_shipping");
const formCC = document.getElementById("form-cc");
const formShip = document.getElementById("form-shipping");
const formBill = document.getElementById("form-billing");
const validErrBlock = document.getElementById("validation-error-block");

// pay method buttons
const btnPaypal = document.querySelector(".pay-with-paypal");
const btnCC = document.querySelector(".pay-with-cc");

// Initialize warranty from sessionStorage if available
if (sessionStorage.getItem("warranty_selected") === "true" && warrantyCheckbox) {
    warrantyCheckbox.checked = true;
}

/**
 *  Get Campaign
 */
const getCampaign = async () => {
  console.log("get campaign");
  try {
    const response = await fetch(campaignRetrieveURL, {
      method: "GET",
      headers,
    });
    const data = await response.json();

    if (!response.ok) {
      console.log("Something went wrong");
      return;
    }

    console.log(data);
    getCampaignData(data);
  } catch (error) {
    console.log(error);
  }
};

const getCampaignData = (data) => {
  campaignName = data.name;
  campaignCurrency = data.currency;
  payEnvKey = data.payment_env_key;
  Spreedly.init(payEnvKey, {
    numberEl: "bankcard-number",
    cvvEl: "bankcard-cvv",
  });
};

/**
 * Warranty Selection Handler
 */
const handleWarrantySelection = (selected) => {
    const selectedOffer = document.querySelector('.offer.selected');
    const mainQuantity = parseInt(selectedOffer?.dataset?.quantity || "1", 10);
    
    // Update sessionStorage
    if (selected) {
        sessionStorage.setItem("warranty_selected", "true");
        sessionStorage.setItem("warranty_quantity", mainQuantity.toString());
        
        // Add warranty to finalLineArr if not already present
        if (!finalLineArr.some(item => item.package_id === warrantyPackageId)) {
            finalLineArr.push({
                package_id: warrantyPackageId,
                quantity: mainQuantity,
                is_upsell: false
            });
        }
    } else {
        sessionStorage.removeItem("warranty_selected");
        sessionStorage.removeItem("warranty_quantity");
        
        // Remove warranty from finalLineArr
        finalLineArr = finalLineArr.filter(item => item.package_id !== warrantyPackageId);
    }
    
    // Update UI
    calculateTotal();
    console.log("Updated line items:", finalLineArr);
};

/**
 *  Create Cart / New Prospect
 */
const createCart = async () => {
  console.log("create prospect");
  const formData = new FormData(formEl);
  const data = Object.fromEntries(formData);

  console.log(data);

  const cartData = {
    user: {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    },
    lines: finalLineArr,
  };

  try {
    const response = await fetch(cartsCreateURL, {
      method: "POST",
      headers,
      body: JSON.stringify(cartData),
    });
    const result = await response.json();

    if (!response.ok) {
      console.log("Something went wrong");
      return;
    }
  } catch (error) {
    console.log(error);
  }
};

/**
 * Use Create Order with Credit Card
 */
const createOrder = async () => {
  console.log("create order");

  const formData = new FormData(formEl);
  const data = Object.fromEntries(formData);
  const isBillingSameAsShipping = document.getElementById("same-as-billing").checked;

  const orderLineItems = [...finalLineArr];

  const selectedOffer = document.querySelector(".offer.selected");
  const mainQuantity = parseInt(selectedOffer?.dataset?.quantity || "1", 10);

  if (warrantyCheckbox.checked) {
    orderLineItems.push({
      package_id: warrantyPackageId,
      quantity: mainQuantity,
    });
  }

  const orderData = {
    user: {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    },
    lines: orderLineItems,
    use_default_shipping_address: false,
    use_default_billing_address: false,
    billing_same_as_shipping_address: isBillingSameAsShipping,
    payment_detail: {
      payment_method: data.payment_method,
      card_token: data.card_token,
    },
    shipping_address: {
      first_name: data.first_name,
      last_name: data.last_name,
      line1: data.shipping_address_line1,
      line4: data.shipping_address_line4,
      state: data.shipping_state,
      postcode: data.shipping_postcode,
      phone_number: data.phone_number,
      country: data.shipping_country,
    },
    shipping_method: data.shipping_method,
    metadata: warrantyCheckbox.checked ? { extended_warranty: true } : {},
    success_url: campaign.nextStep(nextURL),
  };

  if (!isBillingSameAsShipping) {
    orderData.billing_address = {
      first_name: data.billing_first_name,
      last_name: data.billing_last_name,
      line1: data.billing_address_line1,
      line4: data.billing_address_line4,
      state: data.billing_state,
      postcode: data.billing_postcode,
      country: data.billing_country,
    };
  }

  console.log(orderData);

  try {
    const response = await fetch(ordersURL, {
      method: "POST",
      headers,
      body: JSON.stringify(orderData),
    });
    const result = await response.json();

    if (!response.ok) {
      btnCC.disabled = false;
      btnCC.textContent = btnCC.dataset.text;

      const msg = result.non_field_errors ||
        result.postcode ||
        result.shipping_address?.phone_number ||
        Object.values(result)[0];
      validErrBlock.innerHTML = `
        <div class="alert alert-danger">
            ${msg}
        </div>
      `;
      return;
    }

    sessionStorage.setItem("ref_id", result.ref_id);

    if (warrantyCheckbox.checked) {
      sessionStorage.setItem("warranty_selected", "true");
      sessionStorage.setItem("warranty_quantity", mainQuantity.toString());
    } else {
      sessionStorage.removeItem("warranty_selected");
      sessionStorage.removeItem("warranty_quantity");
    }

    if (result.payment_complete_url) {
      window.location.href = result.payment_complete_url;
    } else {
      location.href = campaign.nextStep(nextURL);
    }
  } catch (error) {
    console.log(error);
  }
};

/**
 * Use Create Order with PayPal
 */
const createPayPalOrder = async () => {
  console.log("create order paypal");

  const formData = new FormData(formEl);
  const data = Object.fromEntries(formData);

  btnPaypal.disabled = true;

  const orderLineItems = [...finalLineArr];

  const selectedOffer = document.querySelector(".offer.selected");
  const mainQuantity = parseInt(selectedOffer?.dataset?.quantity || "1", 10);

  // add warranty
  if (warrantyCheckbox.checked) {
    orderLineItems.push({
      package_id: warrantyPackageId,
      quantity: mainQuantity
    });
  }

  // paypal obj
  const orderPPData = {
    user: {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    },
    lines: orderLineItems,
    payment_detail: {
      payment_method: data.payment_method,
    },
    shipping_method: data.shipping_method,
    success_url: campaign.nextStep(nextURL),
    metadata: warrantyCheckbox.checked ? { extended_warranty: true } : {},
  };

  try {
    const response = await fetch(ordersURL, {
      method: "POST",
      headers,
      body: JSON.stringify(orderPPData),
    });
    const result = await response.json();

    if (!response.ok) {
      console.log("Something went wrong");
      console.log(orderPPData);
      btnPaypal.disabled = false;
      return;
    }

    sessionStorage.setItem("ref_id", result.ref_id);

    // save warranty info
    if (warrantyCheckbox.checked) {
      sessionStorage.setItem("warranty_selected", "true");
      sessionStorage.setItem("warranty_quantity", mainQuantity.toString());
    } else {
      sessionStorage.removeItem("warranty_selected");
      sessionStorage.removeItem("warranty_quantity");
    }

    window.location.href = result.payment_complete_url;
  } catch (error) {
    console.log(error);
  }
};

const retrieveCampaign = campaign.once(getCampaign);
retrieveCampaign();

/**
 * Use Create Create cart to capture prospect if email, first, and last names are valid
 */
const createProspect = () => {
  const email_reg = {
    first: /(?:[a-z0-9+!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi,
  };
  if (firstName.value != "" && lastName.value != "" && email_reg.first.test(email.value)) {
    sendProspect();
  }
};
const sendProspect = campaign.once(createCart);

/**
 * Create Packages
 */
const renderPackages = () => {
  const template = `
    <div class="offer-header d-flex justify-content-between align-items-center border-bottom">
      <div class="offer-title d-flex align-items-center px-3">
        <span class="offer-title-text fs-5 text-nowrap"></span>
      </div>
      <div class="px-3 py-3 text-nowrap fs-7 fw-bold">
        <span class="shipping-cost"></span> SHIPPING
      </div>
    </div>
    <div class="offer-content d-flex align-items-center ps-4 py-2">
      <div class="offer-content-img">
        <img src="" class="img-fluid p-image">
      </div>
      <div class="offer-content-info pe-2 ms-3">
        <div class="offer-content-price-each text-primary">
          <span class="price-each h4 fw-bold"></span>
          <span class="fs-8 fw-light">/each</span>
        </div>
        <div class="offer-content-price-orig text-secondary">
          <s>Orig <span class="price-each-retail"></span></s>
        </div>
        <div class="offer-content-price-total h6 fw-bold text-success">
          Total: <span class="price-total"></span>
        </div>
      </div>
    </div>`;

  const container = document.querySelector(".offers");

  for (let package of offers.packages) {
    let item = document.createElement("div");
    item.classList.add("offer");
    item.dataset.packageId = package.id;
    item.dataset.name = package.name;
    item.dataset.quantity = package.quantity;
    item.dataset.priceTotal = package.priceTotal.toFixed(2);
    item.dataset.priceEach = package.price.toFixed(2);
    item.dataset.priceShipping = package.shippingPrice.toFixed(2);
    item.dataset.shippingMethod = package.shippingMethod;
    item.innerHTML = template;
    item.querySelector(".offer-title-text").textContent = package.name;
    item.querySelector(".p-image").src = package.image;
    item.querySelector(".price-each-retail").textContent =
      campaign.currency.format(offers.priceRetail);

    let priceElement = item.querySelector(".price-each");
    let priceTotalElement = item.querySelector(".price-total");

    priceElement.textContent = campaign.currency.format(package.price);
    priceTotalElement.textContent = campaign.currency.format(package.priceTotal);

    if (package.shippingPrice != 0) {
      item.querySelector(".shipping-cost").textContent = package.shippingPrice;
      item.querySelector(".offer-content-price-total").style.display = "none";
    } else {
      item.querySelector(".shipping-cost").textContent = "FREE";
    }

    container.appendChild(item);
  }
};

/**
 * Calculate totals
 */
const calculateTotal = () => {
  let selectedPackage = document.querySelector(".offer.selected");
  if (!selectedPackage) return;

  let packagePrice = parseFloat(selectedPackage.dataset.priceTotal);
  let shippingPrice = parseFloat(selectedPackage.dataset.priceShipping);
  let checkoutTotal = packagePrice + shippingPrice;

  // Add warranty cost if selected
  if (warrantyCheckbox && warrantyCheckbox.checked) {
    const qty = parseInt(selectedPackage.dataset.quantity || "1", 10);
    checkoutTotal += qty * 2; // $2 per warranty item
  }

  document.querySelector(".order-summary-total-value").textContent = 
    campaign.currency.format(checkoutTotal);
};

//
// Inits & Event Listeners
//
document.addEventListener("DOMContentLoaded", function (event) {
  renderPackages();

  let firstLineItem = {
    package_id: selectedOfferId,
    quantity: 1,
    is_upsell: false,
  };

  finalLineArr.push(firstLineItem);

  const summaryShipPrice = document.querySelector(".selected-shipping-price");
  const $offer = document.querySelectorAll(".offer");

  if ($offer) {
    $offer.forEach(function (el, key) {
      el.addEventListener("click", function () {
        el.classList.toggle("selected");

        let pid = el.dataset.packageId;
        let pName = el.dataset.name;
        let pPriceEach = el.dataset.priceEach;
        let pPriceShipping = el.dataset.priceShipping;
        let shippingMethod = el.dataset.shippingMethod;
        let pQuantity = el.dataset.quantity;

        document.getElementById("shipping_method").value = shippingMethod;
        document.querySelector(".selected-product-name").textContent = pName;
        document.querySelector(".selected-product-price").textContent =
          campaign.currency.format(pPriceEach);

        if (pPriceShipping != 0.0) {
          summaryShipPrice.textContent = campaign.currency.format(pPriceShipping);
        } else {
          summaryShipPrice.textContent = "FREE";
        }

        $offer.forEach(function (ell, els) {
          if (key !== els) {
            ell.classList.remove("selected");
          }
        });

        firstLineItem.package_id = pid;
        console.log("Change Line Items:", finalLineArr);
        calculateTotal();
      });
    });
  }

  // initial package setup
  for (const offer of $offer) {
    packageId = offer.dataset.packageId;
    shippingId = offer.dataset.shippingMethod;
    if (packageId === selectedOfferId) {
      offer.classList.add("selected");
      offer.style.order = "-1";
      document.getElementById("shipping_method").value = shippingId;
      document.querySelector(".selected-product-name").textContent =
        offer.dataset.name;
      document.querySelector(".selected-product-price").textContent =
        campaign.currency.format(offer.dataset.priceEach);
      if (offer.dataset.priceShipping != 0.0) {
        summaryShipPrice.textContent = campaign.currency.format(
          offer.dataset.priceShipping
        );
      } else {
        summaryShipPrice.textContent = "FREE";
      }
    }
  }

  // Billing address toggle
  const billingToggle = document.getElementById("same-as-billing");
  const billingSection = document.getElementById("billing-address-form");

  if (billingToggle && billingSection) {
    billingToggle.addEventListener("change", function () {
      const isSameAddress = this.checked;
      document.getElementById("billing_same_as_shipping_address").value =
        isSameAddress;

      billingSection.style.display = isSameAddress ? "none" : "block";

      const billingInputs = billingSection.querySelectorAll("input, select");
      billingInputs.forEach((input) => {
        input.required = !isSameAddress;
      });

      if (isSameAddress) {
        const billingErrors = billingSection.querySelectorAll(".invalid-message");
        billingErrors.forEach((el) => (el.textContent = ""));
      }
    });
  }

  // Warranty checkbox event listener
  if (warrantyCheckbox) {
    warrantyCheckbox.addEventListener('change', function(e) {
        handleWarrantySelection(e.target.checked);
    });
    
    // Initialize if already checked
    if (warrantyCheckbox.checked) {
        handleWarrantySelection(true);
    }
  }

  console.log("Default Line Items:", finalLineArr);
  calculateTotal();
});

firstName.addEventListener("blur", createProspect);
lastName.addEventListener("blur", createProspect);
email.addEventListener("blur", createProspect);

btnPaypal.addEventListener("click", (event) => {
  const tempSubmit = document.createElement("button");
  tempSubmit.type = "submit";
  tempSubmit.style.display = "none";
  formEl.appendChild(tempSubmit);

  validate.onSuccess(() => {
    console.log("Paypal Button Clicked");
    document.getElementById("payment_method").value = "paypal";
    createPayPalOrder();
    formEl.removeChild(tempSubmit);
  });

  validate.onFail(() => {
    formEl.removeChild(tempSubmit);
  });

  tempSubmit.click();
});

btnCC.addEventListener("click", (event) => {
  formEl.requestSubmit();
});