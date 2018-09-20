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
 * @fileoverview This scripts handles the rest of the logic for the shop,
 * including elements for the t-shirt selection, a way to keep track of the
 * current tag selected (male, female, any) and forms to handle success and
 * error cases after the transaction is completed and a regular payment form
 * to be used when Google Pay is not available.
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
 * Local cache.
 * @const {object}
 */
const GLOBAL_RAM_CACHE = {};

/**
 * Directories from where to get the list of available t-shirts.
 * @const {array}
 */
const SHIRT_OPTIONS = [
  './data/ladies_tshirts.json', './data/mens_tshirts.json'];

/**
 * Takes care of loading the t-shirt directory from the files attached, or
 * fetches it from the cache if it was previously loaded.
 * @param  {?string} gender of the t-shirt directory to look into.
 */
function loadShirtDirectory(gender) {
  
  // Show loading indicator and hide shirt while list loads
  domId('shop-image').style.display = 'none';
  domId('loading').style.display = 'block';

  // Preset to random value if male or female were not explicitly defined
  let maleFemaleIndex = Math.floor(Math.random() * 2);
  if (gender === 'female') {
    maleFemaleIndex = 0;
  } else if (gender === 'male') {
    maleFemaleIndex = 1;
  }

  // Determine whether the t-shirt is taken from the male or female list
  const shirtUrl = SHIRT_OPTIONS[maleFemaleIndex];

  // If the date is already in RAM, take it from there.
  if (GLOBAL_RAM_CACHE[shirtUrl]) {
    return randomlySelectShirtAndAssign(GLOBAL_RAM_CACHE[shirtUrl]);
  }

  // Fetch URL and stash in RAM
  fetch(shirtUrl)
    .then(function(response) { 
      return response.json()
    })
    .then(function(listOfShirts) {
        GLOBAL_RAM_CACHE[shirtUrl] = listOfShirts;
        randomlySelectShirtAndAssign(listOfShirts);
    });
}

/**
 * Selects a random t-shirt from the list passed in.
 * @param  {!array} list of t-shirts from where to select one.
 */
function randomlySelectShirtAndAssign(list) {
  const shirtIndex = Math.floor(Math.random() * list.length);
  selectedShirt = list[shirtIndex];
  renderShirt(selectedShirt);
}

/**
 * Helper function to fetch an element inside of the DOM using its id.
 * @param {!string} id of the element to retrieve.
 * @return {object} The retrieved element.
 */
function domId(id) {
  return document.getElementById(id);
}

/**
 * Helper function to unescape the text loaded from the directory.
 * @param {!string} text to unescape.
 * @return {string} The resulting text.
 */
function unescapeText(text) {
  let elem = document.createElement('textarea');
  elem.innerHTML = text;
  return elem.textContent;
}

/**
 * Takes the currently selected t-shirt and fetches the different properties
 * of interest to be rendered in the detail view of the site.
 * @param {!object} shirt to render.
 */
function renderShirt(shirt) {
  domId('shop-image').onload = function(e) {
    domId('loading').style.display = 'none';
    domId('shop-image').style.display = 'block';
  };

  domId('shop-image').src = selectedShirt.largeImage;
  domId('shop-title').innerHTML = selectedShirt.title;
  domId('shop-description').innerHTML = unescapeText(selectedShirt.description);
  domId('shop-price').innerHTML =
      '$' + Number.parseFloat(selectedShirt.price).toFixed(2);
}

/**
 * Helper function to determine what layers to hide and show based on the state
 * of the view.
 * @param {!array} elementsToShow List holding elements that need to be shown.
 * @param {!array} elementsToHide List holding elements that needs to be hidden.
 */
function updateModalVisilibity(elementsToShow, elementsToHide) {
  elementsToShow.forEach(function(element) { 
    domId(element).style.display = 'flex';
  });
  elementsToHide.forEach(function(element) {
    domId(element).style.display = 'none';
  }); 
}

/**
 * Presents the t-shirt detail view UI.
 * @param {!string} gender to be used to load the t-shirt directory.
 */
function uiPageShirt(gender) {
  loadShirtDirectory(gender);
  updateModalVisilibity(
      ['shop-tshirt'], ['shop-checkout', 'shop-success']);
}

/**
 * Presents the legacy checkout form.
 */
function uiPageLegacyCheckoutForm() {
  updateModalVisilibity(
      ['shop-checkout'], ['shop-tshirt', 'shop-success']);

  if (domId('shop-checkout').className === '') {
    domId('shop-checkout').className = 'fa-loaded';

    const link = loadCssLink('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css');
    domId('shop-checkout').appendChild(link);
  }
}

/**
 * Presents the UI that determines success of the transaction.
 */
function uiPagePurchaseSuccess() {
  updateModalVisilibity(
      ['shop-success'], ['shop-tshirt', 'shop-checkout']);
}

/**
 * Handles changes on the URL hash, updates the state of the section buttons
 * and loads a t-shirt according to the option passed in the URL.
 * @param {?object} e Event accompanying the interaction.
 */
function handleHashChange(e) {
  const urlHash = window.location.hash;
  console.log('Hash changed to: ', urlHash);

  const navElementForHash = {
    '#shop-tshirt-any': 'nav-tshirt-any',
    '#shop-tshirt-male': 'nav-tshirt-male',
    '#shop-tshirt-female': 'nav-tshirt-female'
  };
  
  // Deactivate all first
  Object.keys(navElementForHash).forEach(function(key) {
    domId(navElementForHash[key]).className = '';
  });

  // Activate based on selected hash
  if (urlHash in navElementForHash) {
    domId(navElementForHash[urlHash]).className = 'active';
  }

  loadTshirtForHash(urlHash);
}

/**
 * Loads a CSS link using the url specified.
 * @param {!string} url pointing to the resource to load.
 * @return {object} The newly created link.
 */
function loadCssLink(url) {
  const link = document.createElement('link');
  link.type = 'text/css';
  link.rel = 'stylesheet';
  link.href = url;
  link.crossorigin = 'anonymous';

  return link;
}

/**
 * Updates the UI depending on the modal hash included in the URL. This hash
 * is used to either trigger a new load of either male or female t-shirts to
 * be used in this sample marketplace, or provides users more information about
 * whether the transaction succeeded or failed.
 * @param {?string} hash containing the section in the UI to navigate towards.
 * @return {undefined}
 */
function loadTshirtForHash(hash) {

  switch (hash) {
    case '#shop-checkout':
      return uiPageLegacyCheckoutForm();

    case '#shop-success':
      return uiPagePurchaseSuccess();

    case '#shop-tshirt-male':
      return uiPageShirt('male');

    case '#shop-tshirt-female':
      return uiPageShirt('female');

    default:
      return uiPageShirt('any');
  }
}

/**
 * Simulates a reaction to the submission of the legacy form.
 * @param {object} e Resulting event from the interaction. 
 * @return {boolan} Contains the result of the action.
 */
function onCheckoutSubmit(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  alert("This is a demo, no real checkout built");
  return false;
}

/**
 * Takes care of initializing the necessary UI triggers to listen for URL
 * changes that respond to hash changes.
 */
function initializeUi() {
  window.addEventListener('hashchange', function(e) {
    handleHashChange(e);
  });
  domId('reload-button').onclick = function(e) {
    loadTshirtForHash(window.location.hash);
  }

  // Handle current hash
  handleHashChange();
}

// When the DOM is ready, load up our UI functionality
document.addEventListener("DOMContentLoaded", initializeUi);
