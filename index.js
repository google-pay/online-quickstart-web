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
 * Note: This example uses minimal external resources (no jquery, react,
 * polymer, etc).
 */

/**
 * Google Pay API Configuration
 */
const allowedNetworks = ['VISA', 'MASTERCARD'];
const allowedAuthMethods = ['PAN_ONLY', 'CRYPTOGRAM_3DS'];

const baseCardPaymentMethod = {
  type: 'CARD',
  parameters: {
    allowedCardNetworks: allowedNetworks,
    allowedAuthMethods: allowedAuthMethods
  }
};

const googlePayBaseConfiguration = {
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: [baseCardPaymentMethod]
};

/**
 * Holds the Google Pay client used to call the different methods available
 * through the API.
 * @type {PaymentsClient}
 * @private
 */
let googlePayClient;

/**
 * Defines and handles the main operations related to the integration of
 * Google Pay. This function is executed when the Google Pay library script has
 * finished loading.
 */
function onGooglePayLoaded() {

  googlePayClient = new google.payments.api.PaymentsClient({
    environment: 'TEST'
  });

  // Determine readiness to pay using Google Pay
  googlePayClient.isReadyToPay(googlePayBaseConfiguration)
    .then(function(response) {
      if (response.result) {
        createAndAddButton();
      }
    }).catch(function(error) {
      console.error("googlePayClient is unable to pay", error);
      // Did you get "Google Pay APIs should be called in secure context"?
      // You need to be on SSL/TLS (a https:// server)
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

  googlePayButton.setAttribute('id', 'google-pay-button');
  document.getElementById('buy-now').appendChild(googlePayButton);
}

/**
 * Handles the click of the button to pay with Google Pay. Takes
 * care of defining the payment data request to be used in order to load
 * the payments methods available to the user.
 */
function onGooglePaymentsButtonClicked() {

  const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY',
    parameters: {
      gateway: 'example',
      gatewayMerchantId: 'gatewayMerchantId'
    }
  };

  const merchantInfo = {
    merchantId: '01234567890123456789',
    merchantName: 'Example Merchant Name'
  };

  const transactionInfo = {
    totalPriceStatus: 'FINAL',
    totalPrice: selectedShirt.price.toString(),
    currencyCode: 'USD'
  };

  // Use a card payment method including all relevant properties
  const cardPaymentMethod = Object.assign({
    tokenizationSpecification: tokenizationSpecification
  }, baseCardPaymentMethod);

  cardPaymentMethod.parameters.billingAddressRequired = true;
  cardPaymentMethod.parameters.billingAddressParameters = {
    format: 'FULL',
    phoneNumberRequired: true
  };

  // Add the card, merchant and transaction info needed to perform the request
  const paymentDataRequest = Object.assign({}, googlePayBaseConfiguration, {
    allowedPaymentMethods: [cardPaymentMethod],
    transactionInfo: transactionInfo,
    merchantInfo: merchantInfo
  });

  // Trigger to open the sheet with a list of payments method available
  googlePayClient
    .loadPaymentData(paymentDataRequest)
    .then(function(paymentData) {
      // Process result – processPaymentData(paymentData);
      console.info('googlePayClient payment load success: ', paymentData);
      window.location.hash = '#shop-success';

    }).catch(function(error) {
      // Log error: { statusCode: CANCELED || DEVELOPER_ERROR }
      console.error('googlePayClient payment load failed: ', error);
    });
}
