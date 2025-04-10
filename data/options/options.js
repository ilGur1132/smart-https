/*
 * Copyright 2025 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var background = (function () {
  let tmp = {};
  chrome.runtime.onMessage.addListener(function (request) {
    for (let id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path === "background-to-options") {
          if (request.method === id) {
            tmp[id](request.data);
          }
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {
      tmp[id] = callback;
    },
    "send": function (id, data) {
      chrome.runtime.sendMessage({
        "method": id, 
        "data": data,
        "path": "options-to-background"
      }, function () {
        return chrome.runtime.lastError;
      });
    }
  }
})();

var config = {
  "http": {
    "object": {}
  },
  "https": {
    "object": {}
  },
  "enable": {
    "incognito": false
  },
  "print": {
    "full": {
      "url": false
    }
  },
  "disable": {
    "whitelisting": false
  },
  "upgrade": {
    "insecure": {
      "requests": false
    }
  },
  "enable": {
    "regular": {
      "expressions": false
    }
  },
  "add": {
    "item": function (id, domain) {
      if (domain) {
        if (id === "http") {
          config.http.object[domain] = {"url": domain, "error": true, "smart": false};
          background.send("store-http-data", config.http.object);
          /*  */
          delete config.https.object[domain];
          background.send("store-https-data", config.https.object);
        } else {
          config.https.object[domain] = {"url": domain, "error": true, "smart": false};
          background.send("store-https-data", config.https.object);
          /*  */
          delete config.http.object[domain];
          background.send("store-http-data", config.http.object);
        }
      }
    }
  },
  "remove": {
    "item": function (e, id) {
      const target = e.target;
      const obj = (id === "http") ? config.http.object : config.https.object;
      /*  */
      if (target.tagName.toLowerCase() === "td" || target.nodeName.toLowerCase() === "td") {
        let domain = '';
        /*  */
        const tr = target.parentNode;
        for (let i = 0; i < tr.children.length; i++) {
          const td = tr.children[i];
          const type = td.getAttribute("type");
          if (type === "url") domain = tr.children[i].getAttribute("domain");
        }
        /*  */
        if (target.getAttribute("type") === "close") {
          delete obj["undefined"];
          delete obj[domain];
        }
      }
      /*  */
      background.send("store-" + id + "-data", obj);
    }
  },
  "render": function (e) {
    config.print.full.url = e.fullurl;
    config.http.object = e.httpObject;
    config.https.object = e.httpsObject;
    config.enable.incognito = e.incognito;
    config.enable.regular.expressions = e.regexp;
    config.disable.whitelisting = e.dwhitelisting;
    config.upgrade.insecure.requests = e.uinsecurer;
    /*  */
    config.fill.protocol.table("http");
    config.fill.protocol.table("https");
    /*  */
    document.getElementById("timeout").value = e.timeout;
    document.getElementById("max-table-items").value = e.max;
    document.getElementById("consolelog").checked = e.consolelog;
    document.getElementById("fullurl").checked = config.print.full.url;
    document.getElementById("typemissmatch").checked = e.typemissmatch;
    document.getElementById("incognito").checked = config.enable.incognito;
    document.getElementById("regexp").checked = config.enable.regular.expressions;
    document.getElementById("dwhitelisting").checked = config.disable.whitelisting;
    document.getElementById("uinsecurer").checked = config.upgrade.insecure.requests;
  },
  "load": function () {
    document.getElementById("http-url-list").addEventListener("click", function (e) {config.remove.item(e, "http")});
    document.getElementById("https-url-list").addEventListener("click", function (e) {config.remove.item(e, "https")});
    document.getElementById("timeout").addEventListener("change", function (e) {background.send("timeout", e.target.value)});
    document.getElementById("regexp").addEventListener("change", function (e) {background.send("regexp", e.target.checked)});
    document.getElementById("fullurl").addEventListener("change", function (e) {background.send("fullurl", e.target.checked)});
    document.getElementById("incognito").addEventListener("change", function (e) {background.send("incognito", e.target.checked)});
    document.getElementById("consolelog").addEventListener("change", function (e) {background.send("consolelog", e.target.checked)});
    document.getElementById("uinsecurer").addEventListener("change", function (e) {background.send("uinsecurer", e.target.checked)});
    document.getElementById("dwhitelisting").addEventListener("change", function (e) {background.send("dwhitelisting", e.target.checked)});
    document.getElementById("typemissmatch").addEventListener("change", function (e) {background.send("typemissmatch", e.target.checked)});
    document.getElementById("max-table-items").addEventListener("change", function (e) {background.send("max-table-items", e.target.value)});
    document.getElementById("add-http-button").addEventListener("click", function () {config.add.item("http", document.getElementById("add-http-domain").value)});
    document.getElementById("add-https-button").addEventListener("click", function () {config.add.item("https", document.getElementById("add-https-domain").value)});
    /*  */
    document.getElementById("add-http-domain").addEventListener("keypress", function (e) {
      const key = e.which || e.keyCode;
      if (key === 13 && e.target.value) {
        config.add.item("http", e.target.value);
      }
    });
    /*  */
    document.getElementById("add-https-domain").addEventListener("keypress", function (e) {
      const key = e.which || e.keyCode;
      if (key === 13 && e.target.value) {
        config.add.item("https", e.target.value);
      }
    });
    /*  */
    background.send("load");
    window.removeEventListener("load", config.load, false);
  },
  "fill": {
    "protocol": {
      "table": function (id) {
        let count = 1;
        /*  */
        const obj = (id === "http") ? config.http.object : config.https.object;
        const tbody = document.getElementById(id + "-url-list-tbody");
        tbody.textContent = '';
        /*  */
        const tmpArray = [];
        for (let domain in obj) {
          tmpArray.push({
            "domain": domain,
            "url": obj[domain].url,
            "smart": (obj[domain].smart ? true : false),
            "incognito": (obj[domain].incognito ? true : false)
          });
        }
        /*  */
        tmpArray.sort(function(a, b) {
          const tmp_a = a.domain.replace("www.", '');
          const tmp_b = b.domain.replace("www.", '');
          return (tmp_a < tmp_b) ? -1 : (tmp_a > tmp_b) ? 1 : 0;
        });
        /*  */
        for (let i = 0; i < tmpArray.length; i++) {
          const flag1 = config.disable.whitelisting === false || tmpArray[i].smart === false;
          const flag2 = config.enable.incognito === false || tmpArray[i].incognito === false;
          /*  */
          if (flag1 && flag2) {
            const a = document.createElement("a");
            const url = document.createElement("td");
            const http = document.createElement("tr");
            const close = document.createElement("td");
            const number = document.createElement("td");
            /*  */
            url.setAttribute("type", "url");
            close.setAttribute("type", "close");
            number.setAttribute("type", "number");
            /*  */
            a.href = tmpArray[i].url;
            url.setAttribute("domain", tmpArray[i].domain);
            /*  */
            if (config.enable.regular.expressions) {
              a.removeAttribute("href");
            } else {
              a.setAttribute("rel", "noopener");
              a.setAttribute("target", "_blank");
              a.setAttribute("href", id + "://" + tmpArray[i].url.replace(id + "://", ''));
            }
            /*  */
            if (config.print.full.url) {
              a.textContent = config.enable.regular.expressions ? new RegExp(tmpArray[i].domain) + " (Regular Expression)" : decodeURIComponent(tmpArray[i].domain + " (" + a.href + ")");
            } else {
              a.textContent = config.enable.regular.expressions ? new RegExp(tmpArray[i].domain) : decodeURIComponent(tmpArray[i].domain);
            }
            /*  */
            url.appendChild(a);
            number.textContent = count;
            /*  */
            http.appendChild(number);
            http.appendChild(url);
            http.appendChild(close);
            tbody.appendChild(http);
            /*  */
            count++;
          }
        }
      }
    }
  }
};

background.receive("storage", config.render);
window.addEventListener("load", config.load, false);
