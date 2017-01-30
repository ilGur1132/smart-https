/* 
 * Copyright 2017 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
*/

var background = (function () {
  var _tmp = {};
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    for (var id in _tmp) {
      if (_tmp[id] && (typeof _tmp[id] === "function")) {
        if (request.path == 'background-to-options') {
          if (request.method === id) _tmp[id](request.data);
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {_tmp[id] = callback},
    "send": function (id, data) {chrome.runtime.sendMessage({"path": 'options-to-background', "method": id, "data": data})}
  }
})();

var httpObject = {}, httpsObject = {}, dwhitelisting, incognito, regexp;

var load = function () {
  document.getElementById('timeout').addEventListener('change', function (e) {background.send("timeout", e.target.value)});
  document.getElementById('regexp').addEventListener('change', function (e) {background.send("regexp", e.target.checked)});
  document.getElementById('incognito').addEventListener('change', function (e) {background.send("incognito", e.target.checked)});
  document.getElementById('consolelog').addEventListener('change', function (e) {background.send("consolelog", e.target.checked)});
  document.getElementById('open-homepage').addEventListener('change', function (e) {background.send("open-homepage", e.target.checked)});
  document.getElementById('dwhitelisting').addEventListener('change', function (e) {background.send("dwhitelisting", e.target.checked)});  
  document.getElementById('typemissmatch').addEventListener('change', function (e) {background.send("typemissmatch", e.target.checked)});
  document.getElementById('max-table-items').addEventListener('change', function (e) {background.send("max-table-items", e.target.value)});
  /*  */
  var removeItem = function (e, id) {
    var target = e.target || e.originalTarget;
    var obj = (id === "http") ? httpObject : httpsObject;
    if (target.tagName.toLowerCase() === 'td' || target.nodeName.toLowerCase() === 'td') {
      var domain = '';
      var tr = target.parentNode;
      for (var i = 0; i < tr.children.length; i++) {
        var td = tr.children[i];
        var type = td.getAttribute('type');
        if (type === 'url') domain = tr.children[i].getAttribute('domain');
      }
      if (target.getAttribute('type') === 'close') {
        delete obj['undefined'];
        delete obj[domain];
      }
    }
    background.send("store-" + id + "-data", obj);
  };
  /*  */
  var addItem = function (id, domain) {
    if (domain) {
      if (id === "http") {
        httpObject[domain] = {"url": domain, "error": true, "smart": false};
        background.send("store-http-data", httpObject);
        /*  */
        httpsObject = config.https.object;
        delete httpsObject[domain];
        background.send("store-https-data", httpsObject);
      } else {
        httpsObject[domain] = {"url": domain, "error": true, "smart": false};
        background.send("store-https-data", httpsObject);
        /*  */
        httpObject = config.http.object;
        delete httpObject[domain];
        background.send("store-http-data", httpObject);
      }
    }
  };
  /*  */
  document.getElementById('http-url-list').addEventListener('click', function (e) {removeItem(e, "http")});
  document.getElementById('https-url-list').addEventListener('click', function (e) {removeItem(e, "https")});
  document.getElementById('add-http-button').addEventListener('click', function (e) {addItem("http", document.getElementById('add-http-domain').value)});
  document.getElementById('add-https-button').addEventListener('click', function (e) {addItem("https", document.getElementById('add-https-domain').value)});
  document.getElementById('add-http-domain').addEventListener('keypress', function (e) {
     var key = e.which || e.keyCode;
     var target = e.target || e.originalTarget;
     if (key === 13 && target.value) addItem("http", target.value);
   });
  document.getElementById('add-https-domain').addEventListener('keypress', function (e) {
     var key = e.which || e.keyCode;
     var target = e.target || e.originalTarget;
     if (key === 13 && target.value) addItem("https", target.value);
   });
  /*  */
  var fillProtocolTable = function (id) {
    var count = 1;
    var obj = (id === "http") ? httpObject : httpsObject;
    var tbody = document.getElementById(id + '-url-list-tbody');
    tbody.textContent = '';
    /*  */
    var tmpArray = [];
    for (var domain in obj) {
      tmpArray.push({
        "domain": domain, 
        "url": obj[domain].url, 
        "smart": (obj[domain].smart ? true : false),
        "incognito": (obj[domain].incognito ? true : false)
      });
    }
    /*  */
    tmpArray.sort(function(a, b) {
      var tmp_a = a.domain.replace('www.', '');
      var tmp_b = b.domain.replace('www.', '');
      return (tmp_a < tmp_b) ? -1 : (tmp_a > tmp_b) ? 1 : 0;
    });
    /*  */
    for (var i = 0; i < tmpArray.length; i++) {
      var flag1 = dwhitelisting === false || tmpArray[i].smart === false;
      var flag2 = incognito === false || tmpArray[i].incognito === false;
      if (flag1 && flag2) {
        var a = document.createElement('a');
        var url = document.createElement('td');
        var http = document.createElement('tr');
        var close = document.createElement('td');
        var number = document.createElement('td');
        /*  */
        url.setAttribute('type', 'url');
        close.setAttribute('type', 'close');
        number.setAttribute('type', 'number');
        /*  */
        a.href = tmpArray[i].url; 
        url.setAttribute('domain', tmpArray[i].domain);
        a.setAttribute('target', '_blank'); 
        a.setAttribute("style", "text-decoration: none; color: #404040;");
        a.href = regexp ? '' : id + '://' + tmpArray[i].url.replace(id + '://', ''); 
        a.textContent = regexp ? new RegExp(tmpArray[i].domain) + " (Regular Expression)" : decodeURIComponent(tmpArray[i].domain + ' (' + a.href + ')');
        /*  */
        url.appendChild(a);
        number.textContent = count;
        /*  */
        http.appendChild(number);
        http.appendChild(url);
        http.appendChild(close);
        tbody.appendChild(http);
        count++;
      }
    }
  };
  background.receive("retrieve-data", function (o) {
    regexp = o.regexp;
    incognito = o.incognito;
    httpObject = o.httpObject;
    httpsObject = o.httpsObject;
    dwhitelisting = o.dwhitelisting;
    /*  */
    fillProtocolTable('http');
    fillProtocolTable('https');
    document.getElementById('timeout').value = o.timeout;
    document.getElementById('regexp').checked = o.regexp;
    document.getElementById('max-table-items').value = o.max;
    document.getElementById('open-homepage').checked = o.open;
    document.getElementById('incognito').checked = o.incognito;
    document.getElementById('consolelog').checked = o.consolelog;
    document.getElementById('typemissmatch').checked = o.typemissmatch;
    document.getElementById('dwhitelisting').checked = o.dwhitelisting;
  });
  /*  */
  background.send("retrieve-data");
  window.removeEventListener("load", load, false);
};

window.addEventListener("load", load, false);