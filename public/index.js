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

/**
 * The shipping options offered for this article
 */
const shippingOptionParameters = {
  shippingOptions: [
    {
      id: 'shipping-001',
      label: '$1.99: Standard shipping',
      description: 'Delivered on May 15.'
    },
    {
      id: 'shipping-002',
      label: '$3.99: Expedited shipping',
      description: 'Delivered on May 12.'
    },
    {
      id: 'shipping-003',
      label: '$10: Express shipping',
      description: 'Delivered tomorrow.'
    },
  ],
}

const shippingSurcharge = {
  'shipping-001': 1.99,
  'shipping-002': 3.99,
  'shipping-003': 10
}

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
    environment: 'TEST',
    paymentDataCallback: paymentDataCallback
  });

  // Determine readiness to pay using Google Pay
  googlePayClient.isReadyToPay(googlePayBaseConfiguration)
    .then(response => {
      if (response.result) {
        createAndAddButton();
      }
    })
    .catch(error => {
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

  // Use a card payment method including all relevant properties
  const cardPaymentMethod = Object.assign({
    tokenizationSpecification: tokenizationSpecification
  }, baseCardPaymentMethod);

  cardPaymentMethod.parameters.billingAddressRequired = true;
  cardPaymentMethod.parameters.billingAddressParameters = {
    format: 'FULL',
    phoneNumberRequired: true
  };

  const transactionSurcharges = [{
    label: 'Shipping',
    type: 'LINE_ITEM',
    price: '0',
    status: 'PENDING'
  }];

  // Add the card, merchant and transaction info needed to perform the request
  const paymentDataRequest = Object.assign({}, googlePayBaseConfiguration, {
    allowedPaymentMethods: [cardPaymentMethod],
    transactionInfo: constructTransactionInfo(selectedShirt.price, transactionSurcharges),
    merchantInfo: merchantInfo,
    shippingAddressParameters: {'allowedCountryCodes': ['US', 'ES']},
    shippingOptionParameters: shippingOptionParameters,
    shippingOptionRequired: true,
    shippingAddressRequired: true,
    callbackIntents: ['SHIPPING_ADDRESS', 'SHIPPING_OPTION']
  });

  // Trigger to open the sheet with a list of payments method available
  googlePayClient
    .loadPaymentData(paymentDataRequest)
    .then(paymentData => {
      // Process result – processPaymentData(paymentData);
      console.info('googlePayClient payment load success: ', paymentData);
      window.location.hash = '#shop-success';
    })
    .catch(error => {
      // Log error: { statusCode: CANCELED || DEVELOPER_ERROR }
      console.error('googlePayClient payment load failed: ', error);
    });
}

/**
 * Function called every time any of the options in the payment change,
 * according to the configuration set on the {@link callbackIntents} of the
 * {@link loadPaymentData} call.
 * 
 * @param {!object} callbackPayload
 * @return {object} The new variable configuration to render the payments sheet.
 */
const paymentDataCallback = callbackPayload => {

  const selectedShippingOptionId = callbackPayload.shippingOptionData.id;
  const newSurcharges = [{
    label: 'Shipping',
    type: 'LINE_ITEM',
    price: shippingSurcharge[selectedShippingOptionId].toFixed(2),
    status: 'PENDING'
  }];

  const newShippingOptionParameters = Object.assign({
    defaultSelectedOptionId: selectedShippingOptionId
  }, shippingOptionParameters);

  return {
    newTransactionInfo: constructTransactionInfo(selectedShirt.price, newSurcharges),
    newShippingOptionParameters: newShippingOptionParameters
  };
};

/**
 * Function that helps constructs the necessary transaction info needed to be
 * passed to {@link loadPaymentData}, taking the simple price for the item and
 * a list of surcharges to be added.
 * 
 * @param {!number} price The simple price of the item being purchased.
 * @param {!array} surcharges A list of surcharges to be added. 
 * @return {object} The transaction info that {@link loadPaymentData} needs.
 */
const constructTransactionInfo = (price, surcharges) => {
  const totalSurcharges = surcharges
      .map(s => parseInt(s.price))
      .reduce((s1, s2) => s1 + s2, 0);

  const priceWithSurcharges = price + totalSurcharges;
  return {
    totalPriceStatus: 'FINAL',
    totalPrice: (priceWithSurcharges * 1.1).toFixed(2),
    totalPriceLabel: '$12.4',
    currencyCode: 'USD',
    displayItems: [
      {
        label: 'Subtotal',
        type: 'SUBTOTAL',
        price: priceWithSurcharges.toFixed(2),
      },
      {
        label: 'Estimated tax',
        type: 'TAX',
        price: (priceWithSurcharges * .1).toFixed(2),
      },
      ...surcharges
    ],
  }
};