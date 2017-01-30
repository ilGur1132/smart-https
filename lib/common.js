/* 
 * Copyright 2017 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
*/
 
var httpObject = config.http.object, httpsObject = config.https.object;

window.setTimeout(function () {
  var version = config.welcome.version;
  if (version !== app.version()) {
    if (app.loadReason === "install" || app.loadReason === "startup") {
      if (config.welcome.open) {
        app.tabs.open(config.welcome.url + "?version=" + app.version() + (version ? "&p=" + version + "&type=upgrade" : "&type=install"));
      }
      config.welcome.version = app.version();
    }
  }
}, config.welcome.timeout);

var setToolbarIcon = function (state) {
  app.button.label = 'Smart HTTPS is ' + state.toUpperCase();
  app.button.icon = {
    "path": {
      "16": '../../data/icons/' + state + '/16.png',
      "32": '../../data/icons/' + state + '/32.png',
      "48": '../../data/icons/' + state + '/48.png',
      "64": '../../data/icons/' + state + '/64.png'
    }
  };
};

var optionsSend = function () {
  app.options.send("retrieve-data", {
    "max": config.max.value,
    "open": config.welcome.open,
    "regexp": config.addon.regexp,
    "timeout": config.xhr.timeout,
    "consolelog": config.log.print,
    "httpObject": config.http.object, 
    "httpsObject": config.https.object, 
    "incognito": config.addon.incognito,
    "dwhitelisting": config.addon.dwhitelisting, 
    "typemissmatch": config.addon.typemissmatch
  });
};

app.popup.receive("type", function (type) {
  if (type === "controls") app.tabs.openOptions();
  if (type === "support") app.tabs.open(config.welcome.url);
  if (type === "state") {
    (config.addon.state === 'disabled') ? config.addon.state = 'enabled' : config.addon.state = 'disabled';
    app.popup.send("storageData", config.addon.state);
    setToolbarIcon(config.addon.state);
    app.webRequest.init();
  }
  if (type === "whitelist") {
    app.tabs.getActive(function (tab) {
      if (tab.url.indexOf("http://") === 0 || tab.url.indexOf("https://") === 0) {
        var OLD = tab.url.replace("https://", "http://");
        var domain = app.toHostname(OLD);
        /*  */
        httpObject = config.http.object;
        config.http.proxy[domain] = {"url": OLD, "error": true, "smart": false};
        config.http.object = httpObject;
        /*  */
        httpsObject = config.https.object;
        delete config.https.proxy[domain];
        config.https.object = httpsObject;
        /*  */
        app.tabs.update(tab, OLD, true);
      }
    });
  }  
  if (type === "blacklist") {
    app.tabs.getActive(function (tab) {
      if (tab.url.indexOf("http://") === 0 || tab.url.indexOf("https://") === 0) {
        var OLD = tab.url.replace("http://", "https://");
        var domain = app.toHostname(OLD);
        /*  */
        httpsObject = config.https.object;
        config.https.proxy[domain] = {"url": OLD, "error": true, "smart": false};
        config.https.object = httpsObject;
        /*  */
        httpObject = config.http.object;
        delete config.http.proxy[domain];
        config.http.object = httpObject;
        /*  */
        app.tabs.update(tab, OLD, true);
      }
    });
  }
});

app.options.receive("max-table-items", function (i) {
  if (i) {
    config.max.value = i;
    optionsSend();
  }
});

app.options.receive("store-https-data", function (o) {
  if (o) {
    config.https.object = o;
    httpsObject = config.https.object;
    optionsSend();
  }
});

app.options.receive("store-http-data", function (o) {
  if (o) {
    config.http.object = o;
    httpObject = config.http.object;
    optionsSend();
  }
});

app.options.receive("timeout", function (o) {
  if (o) {
    config.xhr.timeout = o;
    optionsSend();
  }
});

app.options.receive("regexp", function (flag) {
  config.addon.regexp = flag; 
  optionsSend();
});

app.options.receive("dwhitelisting", function (flag) {
  for (var id in httpObject) {
    if (httpObject[id].smart === true) {
      delete httpObject[id];
    }
  }
  config.http.object = httpObject;
  config.addon.dwhitelisting = flag;
  optionsSend();
});

app.options.receive("incognito", function (flag) {
  for (var id in httpObject) {
    if (httpObject[id].incognito === true) {
      delete httpObject[id];
    }
  }
  config.http.object = httpObject;
  config.addon.incognito = flag;
  optionsSend();
});

app.options.receive("typemissmatch", function (flag) {
  config.addon.typemissmatch = flag;
  app.webRequest.init();
});

var errorHandler = function (error, details, force, host) {
  var top = details.url;
  var domain = host ? host : app.toHostname(top);
  if (domain) {
    httpsObject = config.https.object;
    if (!config.https.proxy[domain]) {
      if (error.indexOf("::ERR_") !== -1) {
        httpObject = config.http.object;
        /* if the error for this domain is yet not handled */
        if (config.http.proxy[domain] && !config.http.proxy[domain].error) {
          try {
            window.setTimeout(function () {
              app.tabQuery(details, function (tab) {
                if (tab) {
                  if (force || /^https:\/\//i.test(details.url)) {
                    config.http.proxy[domain].error = true;
                    config.http.proxy[domain].incognito = tab.incognito;
                    config.http.object = httpObject;
                    if (config.log.print) console.error(error + " - Reverting back to HTTP: ", config.http.proxy[domain].url);
                    app.tabs.update(tab, config.http.proxy[domain].url, false);
                  }
                } else if (config.log.print) console.error(" - Couldn't find tab with url: ", details.url);
              });
            }, 0);
          } catch (e) {
            if (config.log.print) console.error(" - Unknown Error!");
          }
        }
      }
      else {
        if (config.log.print) console.error(" - NEW error ", error);
      }
    }
    else {
      if (config.log.print) console.error(error + " - NOT reverting back to HTTP (forced HTTPS)");
    }
  }
  else {
    if (config.log.print) console.error(" - Invalid Domain: ", domain);
  }
};

var handleExtraErrors = function (top, details) {
  var _error = {};
  var _headRequest = function (url, details, callback) {
    var xhr = app.XMLHttpRequest();
    xhr.timeout = config.xhr.timeout; // xhr timeout in milliseconds
    xhr._details = details;
    try {
      xhr.onreadystatechange = function () {
        if (xhr && xhr.readyState === 4) {
          if (xhr.status >= 400 || xhr.status < 200) {
            if (xhr.status === 0) callback({"error": '', "details": xhr._details}); /* no head support */
            else callback({"error": ('net::ERR_XHR_STATUS_' + xhr.status), "details": xhr._details});
          }
          else { /* if the response URL is HTTP, we still have the error */
            if (/^http:\/\//i.test(xhr.responseURL)) callback({"error": 'net::ERR_XHR_REDIRECT', "details": xhr._details});
            else callback({"error": '', "details": xhr._details});
          }
        }
      };
      xhr.open('HEAD', url, true);
      xhr.onerror = function () {callback({"error": 'net::ERR_XHR_ERROR', "details": xhr._details})};
      xhr.ontimeout = function () {callback({"error": 'net::ERR_XHR_TIMEOUT', "details": xhr._details})};
      xhr.send('');
    } catch (e) {callback({"error": 'net::ERR_XHR_TRYCATCH', "details": xhr._details})}
  };
  /*  */
  _headRequest(top, details, function (o) {
    if (o.error) {
      if (!_error[top]) {
        _error[top] = true;
        errorHandler(o.error, o.details, true); 
      }
    }
  });
};

app.onBeforeRequest(function (details) {
  var top = details.url;
  if (/^http:\/\//i.test(top)) {
    var newURL = top.replace(/^http:\/\//i, 'https://');
    httpObject = config.http.object;
    httpsObject = config.https.object;
    var domain = app.toHostname(top);
    /*  */
    if (!config.http.proxy[domain]) {
      if (!config.https.proxy[domain]) {
        config.http.proxy[domain] = {"url": top, "error": false, "smart": true};
        config.http.object = httpObject;
        if (config.log.print) console.error(" - Smart switch to HTTPS: ", newURL);
      } else {
        if (config.log.print) console.error(" - Forced load in HTTPS: ", newURL);
      }
      handleExtraErrors(newURL, details); /* check for response errors */ 
      return {"redirectUrl": newURL}
    }
  }
  /*  */
  return;
});

app.onHeadersReceived(function (domain, details) {
  if (config.addon.typemissmatch) {
    if (/^http:\/\//i.test(details.url)) {
      if (config.http.proxy[domain]) {
        if (!config.http.proxy[domain].error) {
          errorHandler("net::ERR_TYPE_MISMATCH", details, true, domain);
        }
      }
    }
  }
});

app.onCompleted(function (e) {
  var _check = function (details) {
    var top = details.url;
    var domain = app.toHostname(top);
    var msg1 = " - HTTPS is OK (" + domain + "), cleaning whitelist table";
    var msg2 = " - HTTPS had Error (" + domain + "), but removed from whitelist because whitelisting is disabled";
    var msg3 = " - (" + domain + ") is added manually (either through toolbar popup or options page), whitelist table is not changed";
    var msg4 = " - HTTPS had Error (" + domain + "), but removed from whitelist because incognito mode (private browsing) is enabled";
    var _clean = function (domain, msg) {
      if (config.http.proxy[domain].smart === true) {
        delete config.http.proxy[domain];
        config.http.object = httpObject;
        if (config.log.print) console.error(msg);
      } else if (config.log.print) console.error(msg3);
    };
    /*  */
    httpObject = config.http.object;
    httpsObject = config.https.object;
    if (config.http.proxy[domain]) {
      if (!details.error || config.https.proxy[domain]) {
        var flag = /^https:\/\//i.test(details.url) && !config.http.proxy[domain].error;
        if (flag) _clean(domain, msg1);
        else if (config.addon.dwhitelisting) _clean(domain, msg2);
        else if (config.http.proxy[domain].incognito && config.addon.incognito) _clean(domain, msg4);
      }
      else if (details.error) {
        if (config.addon.dwhitelisting) _clean(domain, msg2);
        else if (config.http.proxy[domain].incognito && config.addon.incognito) _clean(domain, msg4);
      }
    }
  };
  /* prevent re-direct error */
  window.setTimeout(function () {_check(e)}, 1500);
});

app.webRequest.init();
app.options.receive("retrieve-data", optionsSend);
window.setTimeout(function () {setToolbarIcon(config.addon.state)} ,300);
app.options.receive("consolelog", function (flag) {config.log.print = flag});
app.options.receive("open-homepage", function (flag) {config.welcome.open = flag});
app.popup.receive("storageData", function () {app.popup.send("storageData", config.addon.state)});