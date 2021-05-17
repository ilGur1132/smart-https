/*
 * Copyright 2021 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var core = {
  "stack": {
    "http": {}, 
    "https": {}
  },
  "start": function () {
    core.load();
  },
  "install": function () {
    core.load();
  },
  "load": function () {
    core.stack.http = config.http.object;
    core.stack.https = config.https.object;
    /*  */
    core.webrequest.init();
    core.update.toolbar.icon(config.addon.state);
  }
};

core.webrequest = {
  "init": function () {
    app.webrequest.on.completed.remove();
    app.webrequest.on.before.request.remove();
    app.webrequest.on.headers.received.remove();
    /*  */
    if (config.addon.state === "enabled") {
      app.webrequest.on.completed.add({"urls": ["http://*/*", "https://*/*"]});
      app.webrequest.on.before.request.add({"urls": ["http://*/*", "https://*/*"]});
      /*  */
      if (config.addon.typemissmatch || config.addon.uinsecurer) {
        app.webrequest.on.headers.received.add({"urls": ["http://*/*", "https://*/*"]});
      }
    }
  }
};

core.update = {
  "toolbar": {
    "icon": function (state) {
      app.button.icon(state);
      app.button.title("Smart HTTPS is " + state.toUpperCase());
    }
  },
  "options": {
    "page": function () {
      app.options.send("retrieve-data", {
        "max": config.max.value,
        "regexp": config.addon.regexp,
        "fullurl": config.log.fullurl,
        "timeout": config.xhr.timeout,
        "consolelog": config.log.print,
        "httpObject": config.http.object,
        "httpsObject": config.https.object,
        "incognito": config.addon.incognito,
        "uinsecurer": config.addon.uinsecurer,
        "dwhitelisting": config.addon.dwhitelisting,
        "typemissmatch": config.addon.typemissmatch
      });
    }
  }
};

core.check = {
  "error": {},
  "complete": {},
  "https": function (details) {
    var top = details.url;
    var domain = config.hostname(top);
    /*  */
    var msg1 = " - HTTPS is OK (" + domain + "), cleaning whitelist table";
    var msg2 = " - HTTPS had Error (" + domain + "), but removed from whitelist because whitelisting is disabled";
    var msg3 = " - (" + domain + ") is added manually (either through toolbar popup or options page), whitelist table is not changed";
    var msg4 = " - HTTPS had Error (" + domain + "), but removed from whitelist because incognito mode (private browsing) is enabled";
    /*  */
    var clean = function (domain, msg) {
      if (config.http.proxy[domain].smart === true) {
        delete config.http.proxy[domain];
        config.http.object = core.stack.http;
        if (config.log.print) console.error(msg);
      } else if (config.log.print) console.error(msg3);
    };
    /*  */
    core.stack.http = config.http.object;
    core.stack.https = config.https.object;
    /*  */
    if (config.http.proxy[domain]) {
      if (!details.error || config.https.proxy[domain]) {
        var flag = /^https:\/\//i.test(details.url) && !config.http.proxy[domain].error;
        /*  */
        if (flag) clean(domain, msg1);
        else if (config.addon.dwhitelisting) clean(domain, msg2);
        else if (config.http.proxy[domain].incognito && config.addon.incognito) clean(domain, msg4);
      } else if (details.error) {
        if (config.addon.dwhitelisting) clean(domain, msg2);
        else if (config.http.proxy[domain].incognito && config.addon.incognito) clean(domain, msg4);
      }
    }
  }
};

core.popup = {
  "listener": function (type) {
    if (type === "controls") app.tab.options();
    if (type === "support") app.tab.open(app.homepage());
    if (type === "donation") app.tab.open(app.homepage() + "?reason=support");
    if (type === "state") {
      config.addon.state = config.addon.state === 'disabled' ? 'enabled' : 'disabled';
      app.popup.send("storageData", config.addon.state);
      core.update.toolbar.icon(config.addon.state);
      core.webrequest.init();
    }
    /*  */
    if (type === "whitelist") {
      app.tab.query.active(function (tab) {
        if (tab) {
          if (tab.url) {
            if (tab.url.indexOf("http://") === 0 || tab.url.indexOf("https://") === 0) {
              var OLD = tab.url.replace("https://", "http://");
              var domain = config.hostname(OLD);
              /*  */
              core.stack.http = config.http.object;
              config.http.proxy[domain] = {"url": OLD, "error": true, "smart": false};
              config.http.object = core.stack.http;
              /*  */
              core.stack.https = config.https.object;
              delete config.https.proxy[domain];
              config.https.object = core.stack.https;
              /*  */
              core.update.options.page();
              app.tab.update(tab.id, {"url": OLD});
            }
          }
        }
      });
    }
    /*  */
    if (type === "blacklist") {
      app.tab.query.active(function (tab) {
        if (tab) {
          if (tab.url) {
            if (tab.url.indexOf("http://") === 0 || tab.url.indexOf("https://") === 0) {
              var OLD = tab.url.replace("http://", "https://");
              var domain = config.hostname(OLD);
              /*  */
              core.stack.https = config.https.object;
              config.https.proxy[domain] = {"url": OLD, "error": true, "smart": false};
              config.https.object = core.stack.https;
              /*  */
              core.stack.http = config.http.object;
              delete config.http.proxy[domain];
              config.http.object = core.stack.http;
              /*  */
              core.update.options.page();
              app.tab.update(tab.id, {"url": OLD});
            }
          }
        }
      });
    }
  }
};

core.handler = {
  "xhr": function (top, details) {
    var err = {};
    var headrequest = function (url, details, callback) {
      var xhr = new XMLHttpRequest();
      xhr.timeout = config.xhr.timeout; // xhr timeout in milliseconds
      xhr._details = details;
      try {
        xhr.onreadystatechange = function () {
          if (xhr && xhr.readyState === 4) {
            if (xhr.status >= 400 || xhr.status < 200) {
              if (xhr.status === 0) callback({"error": '', "details": xhr._details}); /* no head support */
              else callback({"error": ("net::ERR_XHR_STATUS_" + xhr.status), "details": xhr._details});
            } else { /* if the response URL is HTTP, we still have the error */
              if (/^http:\/\//i.test(xhr.responseURL)) {
                callback({"error": "net::ERR_XHR_REDIRECT", "details": xhr._details});
              } else callback({"error": '', "details": xhr._details});
            }
          }
        };
        xhr.open("HEAD", url, true);
        xhr.onerror = function () {callback({"error": "net::ERR_XHR_ERROR", "details": xhr._details})};
        xhr.ontimeout = function () {callback({"error": "net::ERR_XHR_TIMEOUT", "details": xhr._details})};
        xhr.send('');
      } catch (e) {
        callback({"error": "net::ERR_XHR_TRYCATCH", "details": xhr._details});
      }
    };
    /*  */
    headrequest(top, details, function (o) {
      if (o.error) {
        if (!err[top]) {
          err[top] = true;
          core.handler.error(o.error, o.details, true);
        }
      }
    });
  },
  "error": function (error, details, force, host) {
    var top = details.url;
    var domain = host ? host : config.hostname(top);
    if (domain) {
      core.stack.https = config.https.object;
      if (!config.https.proxy[domain]) {
        if (error.indexOf("::ERR_") !== -1) {
          core.stack.http = config.http.object;
          /* if the error for this domain is yet not handled */
          if (config.http.proxy[domain] && !config.http.proxy[domain].error) {
            try {
              window.setTimeout(function () {
                config.hastab(details, function (tab) {
                  if (tab) {
                    if (force || /^https:\/\//i.test(details.url)) {
                      config.http.proxy[domain].error = true;
                      config.http.proxy[domain].incognito = tab.incognito;
                      config.http.object = core.stack.http;
                      if (config.log.print) console.error(error + " - Reverting back to HTTP: ", config.http.proxy[domain].url);
                      app.tab.update(tab.id, {"url": config.http.proxy[domain].url});
                    }
                  } else if (config.log.print) console.error(" - Couldn't find tab with url: ", details.url);
                });
              }, 0);
            } catch (e) {
              if (config.log.print) console.error(" - Unknown Error!");
            }
          }
        } else {
          if (config.log.print) console.error(" - NEW error ", error);
        }
      } else {
        if (config.log.print) console.error(error + " - NOT reverting back to HTTP (forced HTTPS)");
      }
    } else {
      if (config.log.print) console.error(" - Invalid Domain: ", domain);
    }
  }
};
