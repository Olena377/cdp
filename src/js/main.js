window.$ = window.jQuery = require('jquery');
var bootstrap = require('bootstrap');
var capitalized = require('capitalized-pkg');

document.getElementById('modal-button').addEventListener('click', function() {
  var str = 'my cdp task';
  document.getElementById('modal-body').innerHTML = capitalized(str)
});