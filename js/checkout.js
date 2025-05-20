//
// Variables
//
let finalLineArr = [];
const warrantyCheckbox = document.getElementById("addWarranty");
const warrantyPackageId = offers.warrantyPackageId || 7;

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

// initialize warranty from sessionStorage if available
if (
  sessionStorage.getItem("warranty_selected") === "true" &&
  warrantyCheckbox
) {
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

const updateOrderSummaryWithWarranty = (selected, quantity) => {
  const warrantySummary = document.querySelector(".warranty-summary");

  if (!warrantySummary) return;

  if (selected) {
    warrantySummary.style.display = "block";
    warrantySummary.querySelector(".warranty-quantity").textContent = quantity;
    warrantySummary.querySelector(".warranty-price").textContent =
      campaign.currency.format(quantity * 2);
  } else {
    warrantySummary.style.display = "none";
  }
};

const updateOrderSummary = () => {
  const summaryContainer = document.querySelector('.order-summary-items');
  if (!summaryContainer) return;

  summaryContainer.innerHTML = '';

  const mainProduct = finalLineArr.find(item => !item.is_upsell && item.package_id !== warrantyPackageId);
  if (mainProduct) {
    const offer = document.querySelector(`.offer[data-package-id="${mainProduct.package_id}"]`);
    if (offer) {
      const productElement = document.createElement('div');
      productElement.className = 'order-summary-item';
      productElement.innerHTML = `
        <div class="d-flex justify-content-between">
          <span>${offer.dataset.name}</span>
          <span>${mainProduct.quantity}</span>
          <span>${campaign.currency.format(offer.dataset.priceEach * mainProduct.quantity)}</span>
        </div>
      `;
      summaryContainer.appendChild(productElement);
    }
  }

  // add warrant
  const warrantyItem = finalLineArr.find(item => item.package_id === warrantyPackageId);
  if (warrantyItem) {
    const warrantyElement = document.createElement('div');
    warrantyElement.className = 'order-summary-item warranty-item';
    warrantyElement.innerHTML = `
      <div class="d-flex justify-content-between">
        <span>Warranty - 1 Year</span>
        <span>${warrantyItem.quantity}</span>
        <span>${campaign.currency.format(warrantyItem.quantity * 2)}</span>
      </div>
    `;
    summaryContainer.appendChild(warrantyElement);
  }

  // add upsells if
  finalLineArr.filter(item => item.is_upsell).forEach(upsell => {
    const upsellElement = document.createElement('div');
    upsellElement.className = 'order-summary-item upsell-item';
    upsellElement.innerHTML = `
      <div class="d-flex justify-content-between">
        <span>${upsell.name || 'Upsell Product'}</span>
        <span>${upsell.quantity}</span>
        <span>${campaign.currency.format(upsell.price * upsell.quantity)}</span>
      </div>
    `;
    summaryContainer.appendChild(upsellElement);
  });

  calculateTotal();
};

const handleWarrantySelection = (selected) => {
  const selectedOffer = document.querySelector(".offer.selected");
  if (!selectedOffer) {
    if (selected) warrantyCheckbox.checked = false;
    return;
  }

  const mainQuantity = parseInt(selectedOffer.dataset.quantity || "1", 10);

  const warrantyIndex = finalLineArr.findIndex(item => item.package_id === warrantyPackageId);
  
  if (selected) {
    if (warrantyIndex >= 0) {
      finalLineArr[warrantyIndex].quantity = mainQuantity;
    } else {
      finalLineArr.push({
        package_id: warrantyPackageId,
        quantity: mainQuantity,
        is_upsell: false
      });
    }
  } else if (warrantyIndex >= 0) {
    finalLineArr.splice(warrantyIndex, 1);
  }

  updateOrderSummary();
  calculateTotal();
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
  const isBillingSameAsShipping =
    document.getElementById("same-as-billing").checked;

  const orderLineItems = [...finalLineArr];

  const selectedOffer = document.querySelector(".offer.selected");
  const mainQuantity = parseInt(selectedOffer?.dataset?.quantity || "1", 10);

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
    success_url: campaign.nextStep(nextURL),
    metadata: warrantyCheckbox.checked ? { extended_warranty: true } : {},
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

      const msg =
        result.non_field_errors ||
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

  const orderPPData = {
    user: {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    },
    lines: [...finalLineArr],
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

    if (warrantyCheckbox.checked) {
      sessionStorage.setItem("warranty_selected", "true");
      sessionStorage.setItem(
        "warranty_quantity",
        parseInt(
          document.querySelector(".offer.selected")?.dataset?.quantity || "1",
          10
        ).toString()
      );
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
    first:
      /(?:[a-z0-9+!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi,
  };
  if (
    firstName.value != "" &&
    lastName.value != "" &&
    email_reg.first.test(email.value)
  ) {
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
    priceTotalElement.textContent = campaign.currency.format(
      package.priceTotal
    );

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
  const selectedPackage = document.querySelector(".offer.selected");
  if (!selectedPackage) {
    console.error("No package selected - resetting to default");
    return;
  }

  const packagePrice = parseFloat(selectedPackage.dataset.priceTotal) || 0;
  const shippingPrice = parseFloat(selectedPackage.dataset.priceShipping) || 0;
  let checkoutTotal = packagePrice + shippingPrice;

  if (warrantyCheckbox?.checked) {
    const qty = parseInt(selectedPackage.dataset.quantity || "1", 10);
    checkoutTotal += qty * 2;
    console.log(`Warranty added: ${qty} x $2.00`);
  }

  const totalElement = document.querySelector(".order-summary-total-value");
  if (totalElement) {
    totalElement.textContent = campaign.currency.format(checkoutTotal);
    console.log("New Total:", totalElement.textContent);
  }
};

//
// Inits & Event Listeners
//
document.addEventListener("DOMContentLoaded", function (event) {
  renderPackages();

  const $offer = document.querySelectorAll(".offer");
  const summaryShipPrice = document.querySelector(".selected-shipping-price");

  let offerExists = false;
  for (const offer of $offer) {
    if (offer.dataset.packageId === selectedOfferId) {
      offerExists = true;
      break;
    }
  }

  let firstLineItem;
  if (!offerExists && $offer.length > 0) {
    selectedOfferId = $offer[0].dataset.packageId;
    $offer[0].classList.add("selected");
    firstLineItem = {
      package_id: selectedOfferId,
      quantity: 1,
      is_upsell: false,
    };
  } else {
    firstLineItem = {
      package_id: selectedOfferId,
      quantity: 1,
      is_upsell: false,
    };
  }

  finalLineArr = [firstLineItem];

  if ($offer) {
    $offer.forEach(function (el) {
      el.addEventListener("click", function () {
        // reset
        $offer.forEach((o) => {
          o.classList.remove("selected");
          o.style.border = "none";
        });

        el.classList.add("selected");
        el.style.border = "2px solid #4CAF50";

        firstLineItem.package_id = el.dataset.packageId;
        document.getElementById("shipping_method").value =
          el.dataset.shippingMethod;

        // UI updates
        const priceElements = {
          name: ".selected-product-name",
          price: ".selected-product-price",
          shipping: ".selected-shipping-price",
        };

        for (const [key, selector] of Object.entries(priceElements)) {
          const element = document.querySelector(selector);
          if (element) {
            element.textContent =
              key === "shipping"
                ? el.dataset.priceShipping != 0.0
                  ? campaign.currency.format(el.dataset.priceShipping)
                  : "FREE"
                : key === "price"
                ? campaign.currency.format(el.dataset.priceEach)
                : el.dataset.name;
          }
        }

        // force warranty udate
        if (warrantyCheckbox?.checked) {
          handleWarrantySelection(true);
        } else {
          calculateTotal(); // recalc if no warrany
        }

        console.log(
          `Selected: ${el.dataset.name} (Qty: ${el.dataset.quantity})`
        );
      });
    });
  }

  for (const offer of $offer) {
    if (offer.dataset.packageId === selectedOfferId) {
      offer.classList.add("selected");
      offer.style.order = "-1";
      document.getElementById("shipping_method").value =
        offer.dataset.shippingMethod;
      document.querySelector(".selected-product-name").textContent =
        offer.dataset.name;
      document.querySelector(".selected-product-price").textContent =
        campaign.currency.format(offer.dataset.priceEach);
      document.querySelector(".selected-shipping-price").textContent =
        offer.dataset.priceShipping != 0.0
          ? campaign.currency.format(offer.dataset.priceShipping)
          : "FREE";
      break;
    }
  }

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
        const billingErrors =
          billingSection.querySelectorAll(".invalid-message");
        billingErrors.forEach((el) => (el.textContent = ""));
      }
    });
  }

  if (warrantyCheckbox) {
    warrantyCheckbox.addEventListener("change", function (e) {
      const selectedOffer = document.querySelector(".offer.selected");
      if (!selectedOffer && e.target.checked) {
        e.target.checked = false;
        alert("Please select a main product first");
        return;
      }
      handleWarrantySelection(e.target.checked);
    });

    if (warrantyCheckbox.checked) {
      const selectedOffer = document.querySelector(".offer.selected");
      if (selectedOffer) {
        handleWarrantySelection(true);
      } else {
        warrantyCheckbox.checked = false;
      }
    }
  }

  console.log("Initial line items:", JSON.stringify(finalLineArr, null, 2));
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
