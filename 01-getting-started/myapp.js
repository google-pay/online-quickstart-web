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

/**
 * ====================
 * App Functionality
 * ====================
 */
const GLOBAL_RAM_CACHE = {};

// load a new random shirt into the UI
function loadShirt(gender) {
  domId('loading').style.display = 'block';
  const options = ['./data/ladies_tshirts.json', './data/mens_tshirts.json'];
  let optionIndex = Math.floor(Math.random()*2);
  if (gender == 'female') {
    optionIndex = 0;
  } else if (gender == 'male') {
    optionIndex = 1;
  }
  const url = options[optionIndex];
  // if we already fetched, it is in RAM.
  // (in the real world, this might not be the design)
  if (GLOBAL_RAM_CACHE[url]) {
    return randomSelectShirtAndAssign(GLOBAL_RAM_CACHE[url]);
  }
  // fetch URL and stash in RAM
  fetch(url)
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
  const shirt = list[shirtIndex];
  uiAssignShirt(shirt);
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
  var entities = [
    ['amp', '&'],
    ['apos', '\''],
    ['#x27', '\''],
    ['#x2F', '/'],
    ['#39', '\''],
    ['#47', '/'],
    ['lt', '<'],
    ['gt', '>'],
    ['nbsp', ' '],
    ['quot', '"']
  ];
  for (var i = 0, max = entities.length; i < max; ++i) {
    text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);
  }
  return text;
}

function uiAssignShirt(shirt) {
  domId('shop-image').onload = function(e) {
    // stopping loading only after the t-shirt image is loaded
    domId('loading').style.display = 'none';
  };
  domId('shop-image').src = shirt.largeImage;
  domId('shop-price').innerHTML = '$' + Number.parseFloat(shirt.price).toFixed(2);
  domId('shop-title').innerHTML = shirt.title;
  // parse escaped html as a string from json object (DANGER)
  const parser = new DOMParser();
  const parsedHtml = parser.parseFromString(decodeHTMLEntities(shirt.description), 'text/html');
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
  domId('shop-checkout').style.display = 'block';
  domId('shop-success').style.display = 'none';
}

function uiPagePurcahseSuccess() {
  domId('shop-tshirt').style.display = 'none';
  domId('shop-checkout').style.display = 'none';
  domId('shop-success').style.display = 'block';
}

function onHashChange(e) {
  const hash = window.location.hash;
  console.log('onhashchange', hash);
  if (hash == '#shop-checkout') return uiPageLegacyCheckoutForm();
  if (hash == '#shop-success') return uiPagePurcahseSuccess();
  if (hash == '#shop-tshirt-male') return uiPageShirt('male');
  if (hash == '#shop-tshirt-female') return uiPageShirt('female');
  // if (hash == '#shop-tshirt-any') return uiPageShirt('any');
  return uiPageShirt('any');
}

// assign UI to page elements
function uiInitialize() {
  window.addEventListener('hashchange', onHashChange.bind(this));
  // TODO only trigger this click function if hash matches, otherwise we run twice
  domId('nav-tshirt-male').addEventListener('click', loadShirt.bind(this, 'male'));
  domId('nav-tshirt-female').addEventListener('click', loadShirt.bind(this, 'female'));
  domId('nav-tshirt-any').addEventListener('click', loadShirt.bind(this, 'any'));
  onHashChange(null);
}

// when domready, load up our UI functionality
document.addEventListener("DOMContentLoaded", function(event) {
  uiInitialize();
});
