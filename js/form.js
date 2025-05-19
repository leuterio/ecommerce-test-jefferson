/**
 * Form validation with just-validate.js (v4.2.0)
 */
const validate = new JustValidate(formEl, {
    errorFieldCssClass: ['is-invalid'],
    validateBeforeSubmitting: true
});

// basic validations (always visible)
validate
    .addField('#id_first_name', [
        { rule: 'required', errorMessage: 'First name is required' },
        { rule: 'maxLength', value: 255 },
        { rule: 'customRegexp', value: /\b([A-ZÀ-ÿ][-,a-z. ']+[ ]*)+$/gi, errorMessage: 'Contains an invalid character' }
    ], '.invalid-fname')
    .addField('#id_last_name', [
        { rule: 'required', errorMessage: 'Last name is required' },
        { rule: 'maxLength', value: 255 },
        { rule: 'customRegexp', value: /\b([A-ZÀ-ÿ][-,a-z. ']+[ ]*)+$/gi, errorMessage: 'Contains an invalid character' }
    ], '.invalid-lname')
    .addField('#id_email', [
        { rule: 'required', errorMessage: 'Email is required' },
        { rule: 'email', errorMessage: 'Email is invalid!' },
        { rule: 'maxLength', value: 255 }
    ], '.invalid-email')
    .addField('#id_phone_number', [
        { rule: 'required', errorMessage: 'Valid US phone number required' },
        { rule: 'customRegexp', value: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im, errorMessage: 'Invalid Number' },
        { rule: 'maxLength', value: 15 }
    ], '.invalid-ph')
    .addField('#id_shipping_address_line1', [
        { rule: 'required', errorMessage: 'Shipping address is required' },
        { rule: 'maxLength', value: 255 }
    ], '.invalid-shipping_address_line1')
    .addField('#id_shipping_address_line4', [
        { rule: 'required', errorMessage: 'Shipping city is required' },
        { rule: 'maxLength', value: 255 }
    ], '.invalid-shipping_address_line4')
    .addField('#id_shipping_state', [
        { rule: 'required', errorMessage: 'Shipping state/province is required' }
    ], '.invalid-shipping_state')
    .addField('#id_shipping_postcode', [
        { rule: 'required', errorMessage: 'Shipping ZIP/Postcode is required' },
        { rule: 'maxLength', value: 64 }
    ], '.invalid-shipping_postcode')
    .addField('#id_shipping_country', [
        { rule: 'required', errorMessage: 'Shipping country is required' }
    ], '.invalid-shipping_country');

// billing validations (added when form is visible)
const addBillingValidations = () => {
    validate
        .addField('#id_billing_first_name', [
            { rule: 'required', errorMessage: 'Billing first name is required' },
            { rule: 'maxLength', value: 255 },
            { rule: 'customRegexp', value: /\b([A-ZÀ-ÿ][-,a-z. ']+[ ]*)+$/gi, errorMessage: 'Contains an invalid character' }
        ], '.invalid-billing-fname')
        .addField('#id_billing_last_name', [
            { rule: 'required', errorMessage: 'Billing last name is required' },
            { rule: 'maxLength', value: 255 },
            { rule: 'customRegexp', value: /\b([A-ZÀ-ÿ][-,a-z. ']+[ ]*)+$/gi, errorMessage: 'Contains an invalid character' }
        ], '.invalid-billing-lname')
        .addField('#id_billing_address_line1', [
            { rule: 'required', errorMessage: 'Billing address is required' },
            { rule: 'maxLength', value: 255 }
        ], '.invalid-billing_address_line1')
        .addField('#id_billing_address_line4', [
            { rule: 'required', errorMessage: 'Billing city is required' },
            { rule: 'maxLength', value: 255 }
        ], '.invalid-billing_address_line4')
        .addField('#id_billing_state', [
            { rule: 'required', errorMessage: 'Billing state/province is required' }
        ], '.invalid-billing_state')
        .addField('#id_billing_postcode', [
            { rule: 'required', errorMessage: 'Billing ZIP/Postcode is required' },
            { rule: 'maxLength', value: 64 }
        ], '.invalid-billing_postcode')
        .addField('#id_billing_country', [
            { rule: 'required', errorMessage: 'Billing country is required' }
        ], '.invalid-billing_country');
};

//billing toggle
document.addEventListener('DOMContentLoaded', () => {
    const billingToggle = document.getElementById('same-as-billing');
    const billingSection = document.getElementById('billing-address-form');
    
    if (billingToggle && billingSection) {
        billingToggle.addEventListener('change', function() {
            const isSameAddress = this.checked;
            document.getElementById('billing_same_as_shipping_address').value = isSameAddress;
            billingSection.style.display = isSameAddress ? 'none' : 'block';
            
            // add billing validations when visible
            if (!isSameAddress) {
                addBillingValidations();
            }
        });
    }
});

// validation
validate
    .onFail((fields) => {
        console.log('Validation failed', fields);
        // focus on first invalid field
        const firstInvalid = Object.keys(fields).find(key => !fields[key].isValid);
        if (firstInvalid) {
            document.querySelector(`#${firstInvalid}`)?.focus();
        }
    })
    .onSuccess((event) => {
        console.log('Validation passed, submitting...');
        document.getElementById('payment_method').value = 'card_token';
        Spreedly.validate();
    });

/**
 * Spreedly credit card validation
 */
const style = 'color: #212529; font-size: 1rem; line-height: 1.5; font-weight: 400;width: calc(100% - 20px); height: calc(100% - 2px); position: absolute;padding: 0.13rem .75rem';

Spreedly.on("ready", function() {
    Spreedly.setFieldType('text');
    Spreedly.setPlaceholder('cvv', "CVV");
    Spreedly.setPlaceholder('number', "Card Number");
    Spreedly.setNumberFormat('prettyFormat');
    Spreedly.setStyle('cvv', style);
    Spreedly.setStyle('number', style);

    btnCC.removeAttribute('disabled');
});

function submitPaymentForm() {
    const isSameAddress = document.getElementById('same-as-billing').checked;
    cardErrBlock.innerHTML = '';
    
    var requiredFields = {
        "first_name": isSameAddress ? firstName.value : document.getElementById('id_billing_first_name').value,
        "last_name": isSameAddress ? lastName.value : document.getElementById('id_billing_last_name').value,
        "month": expMonth.value,
        "year": expYear.value
    };
    
    Spreedly.tokenizeCreditCard(requiredFields);
}

Spreedly.on('errors', function(errors) {
    console.log('Card validation errors', errors);
    let error_html = '';
    errors.forEach(element => {
        error_html += `${element.message}<br/>`;
        if (element["attribute"] == "number") {
            numberParent.classList.add("is-invalid");
            numberParent.classList.remove("is-valid");
        } else {
            numberParent.classList.remove("is-invalid");
        }
        if (element["attribute"] == "month") {
            expMonth.classList.add("is-invalid");
            document.querySelector('.is-invalid')?.focus();
        } else {
            expMonth.classList.remove("is-invalid");
        }
        if (element["attribute"] == "year") {
            expYear.classList.add("is-invalid");
            document.querySelector('.is-invalid')?.focus();
        } else {
            expYear.classList.remove("is-invalid");
        }
    });

    if (error_html) {
        cardErrBlock.innerHTML = `<div class="alert alert-danger">${error_html}</div>`;
    }
    btnCC.removeAttribute('disabled');
});

Spreedly.on('fieldEvent', function(name, type, activeEl, inputProperties) {
    if (type == "input" && name == "number") {
        if (inputProperties["validNumber"]) {
            Spreedly.setStyle('number', "background-color: #CDFFE6;");
            numberParent.classList.remove("is-invalid");
        } else {
            Spreedly.setStyle('number', "background-color: transparent;");
            numberParent.classList.remove("is-invalid");
            cardErrBlock.innerHTML = ``;
        }
    } else if (type == "input" && name == "cvv") {
        if (inputProperties["validCvv"]) {
            Spreedly.setStyle('cvv', "background-color: #CDFFE6;");
            cvvParent.classList.remove("is-invalid");
        } else {
            Spreedly.setStyle('cvv', "background-color: transparent");
            cvvParent.classList.remove("is-invalid");
            cardErrBlock.innerHTML = ``;
        }
    }
});

Spreedly.on('validation', function(inputProperties) {
    if (!inputProperties["validNumber"]) {
        numberParent.classList.add("is-invalid");
        Spreedly.transferFocus("number");
        numberParent.classList.remove("is-valid");
        cardErrBlock.innerHTML = `<div class="alert alert-danger">Please enter a valid card number</div>`;
    } else if (!inputProperties["validCvv"]) {
        cvvParent.classList.add("is-invalid");
        Spreedly.transferFocus("cvv");
        cvvParent.classList.remove("is-valid");
        cardErrBlock.innerHTML = `<div class="alert alert-danger">Please enter a valid CVV number</div>`;
    } else {
        submitPaymentForm();
    }
});

Spreedly.on('paymentMethod', function(token, pmData) {
    document.getElementById('card_token').value = token;
    createOrder();
});