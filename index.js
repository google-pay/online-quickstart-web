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
 * Google Pay Codelab, Example TShirt Store (minimal example)
 *
 * Features:
 * - Random Shirt Load (male/female choice)
 * - Existing Checkout Page (fake stub)
 * - Post Checkout Success Page
 *
 * NOTE: use minimal external resources (no jquery, react, polymer, etc)
 */

 let selectedShirt;

/**
 * ====================
 * Google Pay API Functionality
 * ====================
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


function onGooglePayLoaded() {
  // console.log('onGooglePayLoaded triggered');
  const googlePayClient = new google.payments.api.PaymentsClient({
    environment: 'TEST'
  });

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

  // console.log('googlePayClient', googlePayClient);
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
 * App Functionality
 * ====================
 */
const GLOBAL_RAM_CACHE = {};

// load a new random shirt into the UI
function loadShirt(gender) {
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
    .then(function(response) {

      if (response.status != 200) {
        console.error('fetch error', response);
        return uiPageError('unable to load data');
      }

      response.json().then(function(list) {
        GLOBAL_RAM_CACHE[url] = list;
        randomSelectShirtAndAssign(list);
      });
    });

}

function randomSelectShirtAndAssign(list) {
  const shirtIndex = Math.floor(Math.random()*list.length);
  selectedShirt = list[shirtIndex];
  renderSelectedShirt();
}

/**
 * ====================
 * App UI
 * ====================
 */
function domId(id) {
  return document.getElementById(id);
}

function decodeHTMLEntities(text) {
  let entities = [
    ['amp', '&'],
    ['apos', '\''],
    ['#x27', '\''],
    ['#x2F', '/'],
    ['#39', '\''],
    ['#47', '/'],
    ['lt', '<'],
    ['gt', '>'],
    ['nbsp', ' '],
    ['quot', '"'],
  ];

  for (let i = 0, max = entities.length; i < max; ++i) {
    text = text.replace(
        new RegExp('&' + entities[i][0] + ';', 'g'), entities[i][1]);
  }

  return text;
}

function renderSelectedShirt() {
  domId('shop-image').onload = function(e) {
    // stopping loading only after the t-shirt image is loaded
    domId('loading').style.display = 'none';
  };
  domId('shop-image').src = selectedShirt.largeImage;
  domId('shop-title').innerHTML = selectedShirt.title;
  domId('shop-price').innerHTML =
      '$' + Number.parseFloat(selectedShirt.price).toFixed(2);

  // parse escaped html as a string from json object (DANGER)
  const parser = new DOMParser();
  const parsedHtml = parser.parseFromString(
      decodeHTMLEntities(selectedShirt.description), 'text/html');

  domId('shop-description').innerHTML = (
    parsedHtml
    && parsedHtml.body
    && parsedHtml.body.innerHTML
  ) || '';
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

// assign UI to page elements
function uiInitialize() {
  window.addEventListener('hashchange', onHashChange.bind(this));

  // TODO (alanblout): only trigger this click function if hash matches, otherwise we run twice
  domId('nav-tshirt-male').addEventListener(
      'click', loadShirt.bind(this, 'male'));
  domId('nav-tshirt-female').addEventListener(
      'click', loadShirt.bind(this, 'female'));
  domId('nav-tshirt-any').addEventListener(
      'click', loadShirt.bind(this, 'any'));

  onHashChange(null);
}

// when domready, load up our UI functionality
document.addEventListener("DOMContentLoaded", function(event) {
  uiInitialize();
});
