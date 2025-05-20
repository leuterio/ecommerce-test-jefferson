const btnUpsell = document.querySelector('.btn-success');
const quantitySelect = document.getElementById('quantity');
const basePrice = 10;
const packageId = 8;

/**
 * Get Order Details for Upsell page
 */
const getOrder = async () => {
    console.log("get order");
    try {
        const response = await fetch(`${ordersURL}${refId}/`, {
            method: 'GET',
            headers,
        });
        const result = await response.json();

        if (!response.ok) {
            console.log('Something went wrong');
            return;
        }

        if (result.supports_post_purchase_upsells === false) {
            window.location.href = campaign.skipSteps(confirmationURL);
        }

        console.log(result);
    } catch (error) {
        console.log(error);
    }
};

const retrieveOrder = campaign.once(getOrder);

/**
 * Create Upsell
 */
const createUpsell = async () => {
    console.log("create upsell");

    const quantity = parseInt(quantitySelect.value || "1", 10);

    // Obter dados da garantia
    const warrantySelected = sessionStorage.getItem("warranty_selected") === "true";
    const warrantyQuantity = parseInt(sessionStorage.getItem("warranty_quantity") || "1", 10);

    // Criar array de itens
    const upsellLineItems = [
        {
            package_id: packageId,
            quantity: quantity
        },
        ...(warrantySelected ? [{
            package_id: 7, // Garantia
            quantity: warrantyQuantity
        }] : [])
    ];

    btnUpsell.disabled = true;
    btnUpsell.textContent = btnUpsell.dataset.loadingText;

    try {
        const response = await fetch(`${ordersURL}${refId}/upsells/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ lines: upsellLineItems }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.log('Something went wrong');
            btnUpsell.disabled = false;
            btnUpsell.textContent = btnUpsell.dataset.text;
            return;
        }

        console.log(result);
        location.href = campaign.nextStep(nextURL);
    } catch (error) {
        console.log(error);
    }
};

document.addEventListener("DOMContentLoaded", function () {
    retrieveOrder();

    const sendUpsell = campaign.once(createUpsell);

    btnUpsell.addEventListener('click', () => {
        sendUpsell();
    });

    [...document.getElementsByClassName('upsell-no')].forEach(anchor => {
        anchor.href = campaign.nextStep(nextURL);
    });

    quantitySelect.addEventListener('change', () => {
        const qty = parseInt(quantitySelect.value || "1", 10);
        const total = (qty * basePrice).toFixed(2);
        document.getElementById('total-price').textContent = total;
    });
});
