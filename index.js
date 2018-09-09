/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * @fileoverview This file supports the codelab for Google Pay: 
 * Build a Fast Checkout Experience on the Web with Google Pay, representing
 * a sample t-shirt store that suggests a new t-shirt on every load and uses
 * Google Pay as a means of payment.
 *
 * Features:
 *  - Random t-shirt load (male / female choice)
 *  - Existing checkout page (fake stub)
 *  - Post checkout success page
 *
 * Note: This example uses minimal external resources (no jquery, react,
 * polymer, etc).
 */

 /**
  * Holds the properties of the currently selected t-shirt.
  * @type {object}
  * @private
  */
 let selectedShirt;

/**
 * Google Pay API Configuration
 */
const tokenizationSpecification = {
  type: 'PAYMENT_GATEWAY',
  parameters: {
    gateway: 'example',
    gatewayMerchantId: 'gatewayMerchantId'
  }
};

const cardPaymentMethod = {
  type: 'CARD',
  tokenizationSpecification: tokenizationSpecification,
  parameters: {
    allowedCardNetworks: ['VISA','MASTERCARD'],
    allowedAuthMethods: ['PAN_ONLY','CRYPTOGRAM_3DS'],
    billingAddressRequired: true,
    billingAddressParameters: {
      format: 'FULL',
      phoneNumberRequired: true
    }
  }
};

const googlePayBaseConfiguration = {
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: [cardPaymentMethod]
};

/**
 * Types of bandersnatches.
 * @const {object}
 */
const GLOBAL_RAM_CACHE = {};

/**
 * Handles the click of the button to pay with Google Pay. Takes
 * care of defining the payment data request to be used in order to load
 * the payments methods available to the user.
 */
function loadShirtDirectory(gender) {
  domId('loading').style.display = 'block';

  let optionIndex = Math.floor(Math.random() * 2);
  const shirtOptions = [
      './data/ladies_tshirts.json', './data/mens_tshirts.json'];

  if (gender == 'female') {
    optionIndex = 0;
  } else if (gender == 'male') {
    optionIndex = 1;
  }

  const shirtUrl = shirtOptions[optionIndex];

  // if we already fetched, it is in RAM.
  // (in the real world, this might not be the design)
  if (GLOBAL_RAM_CACHE[shirtUrl]) {
    return randomSelectShirtAndAssign(GLOBAL_RAM_CACHE[shirtUrl]);
  }

  // fetch URL and stash in RAM
  fetch(shirtUrl)
    .then(response => response.json())
    .then(listOfShirts => {
        GLOBAL_RAM_CACHE[shirtUrl] = listOfShirts;
        randomSelectShirtAndAssign(listOfShirts);
    });
}

function randomSelectShirtAndAssign(list) {
  const shirtIndex = Math.floor(Math.random() * list.length);
  selectedShirt = list[shirtIndex];
  renderSelectedShirt();
}

/**
 * Defines and handles the main operations related to the integration of
 * Google Pay. This function is executed when the Google Pay library script has
 * finished loading.
 */
function onGooglePayLoaded() {

  const googlePayClient = new google.payments.api.PaymentsClient({
    environment: 'TEST'
  });

  /**
   * Handles the click of the button to pay with Google Pay. Takes
   * care of defining the payment data request to be used in order to load
   * the payments methods available to the user.
   */
  function onGooglePaymentsButtonClicked() {

    const merchantInfo = {
      merchantId: '0123456789',
      merchantName: 'Example Merchant Name'
    };

    const transactionInfo = {
      totalPriceStatus: 'FINAL',
      totalPrice: selectedShirt.price.toString(), 
      currencyCode: 'USD'
    };

    const paymentDataRequest = Object.assign({
      merchantInfo: merchantInfo,
      transactionInfo: transactionInfo,
    }, googlePayBaseConfiguration);

    // Trigger to open the sheet with a list of payments method available
    googlePayClient
      .loadPaymentData(paymentDataRequest)
      .then(function(paymentData) {
        // Process result – processPaymentData(paymentData);
        console.log('googlePayClient success', paymentData);
        window.location.hash = '#shop-success';
      }).catch(function(err) {
        // Log error: { statusCode: CANCELED || DEVELOPER_ERROR }
        console.error('googlePayClient transaction failed', err);
      });
  }

  /**
   * Handles the creation of the button to pay with Google Pay.
   * Once created, this button is appended to the DOM, under the element 
   * 'buy-now'.
   */
  function createAndAddButton() {

    const googlePayButton = googlePayClient.createButton({
      // defaults to black if default or omitted
      buttonColor: 'default',
      // defaults to long if omitted
      buttonType: 'long',
      onClick: onGooglePaymentsButtonClicked
    });
    document.getElementById('buy-now').appendChild(googlePayButton);
  }

  // Determine readiness to pay using Google Pay
  googlePayClient.isReadyToPay(googlePayBaseConfiguration)
    .then(function(response) {
      // console.log('googlePayClient isReadyToPay', response);
      if (response.result) {
        createAndAddButton();
      }
    }).catch(function(err) {
      // Log error.
      console.error("googlePayClient is unable to pay", err);
      // Did you get "Google Pay APIs should be called in secure context"?
      //   you need to be on SSL/TLS (a https:// server)
    });
}

/**
 * ====================
 * App UI
 * ====================
 */
function domId(id) {
  return document.getElementById(id);
}

function unescapeText(text) {
  let elem = document.createElement('textarea');
  elem.innerHTML = text;
  return elem.textContent;
}

function renderSelectedShirt() {
  domId('shop-image').onload = e => {
    domId('loading').style.display = 'none';
    domId('shop-image').style.display = 'block';
  };

  domId('shop-image').src = selectedShirt.largeImage;
  domId('shop-title').innerHTML = selectedShirt.title;
  domId('shop-description').innerHTML = unescapeText(selectedShirt.description);
  domId('shop-price').innerHTML =
      '$' + Number.parseFloat(selectedShirt.price).toFixed(2);
}

function uiPageError(msg) {
  domId('shop-err').style.display = 'block';
  domId('shop-err').style.display = 'block';
  domId('shop-checkout').style.display = 'none';
  domId('shop-success').style.display = 'none';
  loadShirt(gender);
}

function uiPageShirt(gender) {
  domId('shop-tshirt').style.display = 'block';
  domId('shop-checkout').style.display = 'none';
  domId('shop-success').style.display = 'none';
  loadShirt(gender);
}

function uiPageLegacyCheckoutForm() {
  domId('shop-tshirt').style.display = 'none';
  domId('shop-success').style.display = 'none';
  domId('shop-checkout').style.display = 'block';

  if (domId('shop-checkout').className == "") {
    domId('shop-checkout').className == "fa-loaded";
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
    link.crossorigin = "anonymous";
    domId('shop-checkout').appendChild(link);
  }
}

function uiPagePurcahseSuccess() {
  domId('shop-tshirt').style.display = 'none';
  domId('shop-checkout').style.display = 'none';
  domId('shop-success').style.display = 'block';
}

function onHashChange(e) {
  const urlHash = window.location.hash;
  console.log('onhashchange', urlHash);
/**
 * Updates the UI depending on the modal hash included in the URL. This hash
 * is used to either trigger a new load of either male or female t-shirts to
 * be used in this sample marketplace, or provides users more information about
 * whether the transaction succeeded or failed.
 */

  if (urlHash == '#shop-checkout') return uiPageLegacyCheckoutForm();
  if (urlHash == '#shop-success') return uiPagePurcahseSuccess();
  if (urlHash == '#shop-tshirt-male') return uiPageShirt('male');
  if (urlHash == '#shop-tshirt-female') return uiPageShirt('female');
  // if (urlHash == '#shop-tshirt-any') return uiPageShirt('any');

  return uiPageShirt('any');
}

function onCheckoutSubmit(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  alert("This is a demo, no real checkout built");
  return false;
}

/**
 * Takes care of initializing the necessary UI triggers to listen for URL
 * changes that respond to hash changes.
 */
  domId('reload-button').onclick = (e) => loadTshirtForHash(window.location.hash);

  onHashChange(null);
}

// when domready, load up our UI functionality
document.addEventListener("DOMContentLoaded", function(event) {
  uiInitialize();
});
