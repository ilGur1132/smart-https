/*
 * Copyright 2025 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var core = {
  "start": function () {
    core.load();
  },
  "install": function () {
    core.load();
  },
  "load": function () {
    core.init.requests(true, true);
    core.update.toolbar.icon(config.addon.state);
  },
  "stack": {
    "http": {}, 
    "https": {}
  },
  "init": {
    "requests": function (w, n) {
      if (w) core.webrequest.register();
      if (n) core.netrequest.register();
    },
    "stack": function () {
      core.stack.http = config.http.object;
      core.stack.https = config.https.object;
      /*  */
      core.init.requests(true, false);
    }
  },
  "webrequest": {
    "register": function () {
      app.webrequest.on.completed.remove();
      app.webrequest.on.before.request.remove();
      app.webrequest.on.headers.received.remove();
      /*  */
      if (config.addon.state === "enabled") {
        app.webrequest.on.completed.add({"types": ["main_frame"], "urls": ["http://*/*", "https://*/*"]});
        app.webrequest.on.before.request.add({"types": ["main_frame"], "urls": ["http://*/*", "https://*/*"]});
        /*  */
        if (config.addon.typemissmatch || config.addon.uinsecurer) {
          app.webrequest.on.headers.received.add({"types": ["main_frame", "sub_frame"], "urls": ["http://*/*", "https://*/*"]});
        }
      }
    }
  },
  "update": {
    "toolbar": {
      "icon": function (state) {
        app.button.icon(null, state);
        app.button.title(null, "Smart HTTPS is " + state.toUpperCase());
      }
    }
  },
  "netrequest": {
    "register": async function () {
      //app.netrequest.rules.scope = "dynamic";
      await app.netrequest.display.badge.text(false);
      await app.netrequest.rules.remove.by.action.type("modifyHeaders", "responseHeaders");
      /*  */
      if (config.addon.state === "enabled") {
        if (config.addon.uinsecurer) {
          app.netrequest.rules.push({
            "action": {
              "type": "modifyHeaders",
              "responseHeaders": [
                {
                  "operation": "set",
                  "header": "content-security-policy",
                  "value": "upgrade-insecure-requests"
                }
              ]
            },
            "condition": {
              "urlFilter": "|https*",
              "resourceTypes": ["main_frame", "sub_frame"]
            }
          });
        }
      }
      /*  */
      await app.netrequest.rules.update();
    }
  },
  "check": {
    set error (val) {app.session.write("error", val)},
    set complete (val) {app.session.write("complete", val)},
    get error () {return app.session.read("error") !== undefined ? app.session.read("error") : {}},
    get complete () {return app.session.read("complete") !== undefined ? app.session.read("complete") : {}},
    "https": function (details) {
      const top = details.url;
      const domain = config.hostname(top);
      /*  */
      const msg1 = " - HTTPS is OK (" + domain + "), cleaning whitelist table";
      const msg2 = " - HTTPS had Error (" + domain + "), but removed from whitelist because whitelisting is disabled";
      const msg3 = " - (" + domain + ") is added manually (either through toolbar popup or options page), whitelist table is not changed";
      const msg4 = " - HTTPS had Error (" + domain + "), but removed from whitelist because incognito mode (private browsing) is enabled";
      /*  */
      const clean = function (domain, msg) {
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
          const flag = /^https:\/\//i.test(details.url) && !config.http.proxy[domain].error;
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
  },
  "handler": {
    "error": function (error, details, force, host) {
      const top = details.url;
      const domain = host ? host : config.hostname(top);
      if (domain) {
        core.stack.https = config.https.object;
        if (!config.https.proxy[domain]) {
          if (error.indexOf("::ERR_") !== -1) {
            core.stack.http = config.http.object;
            /* if the error for this domain is yet not handled */
            if (config.http.proxy[domain] && !config.http.proxy[domain].error) {
              try {
                setTimeout(function () {
                  config.hastab(details, function (tab) {
                    if (tab) {
                      if (force || /^https:\/\//i.test(details.url)) {
                        config.http.proxy[domain].error = true;
                        config.http.proxy[domain].incognito = tab.incognito;
                        config.http.object = core.stack.http;
                        if (config.log.print) console.error(error + " - Reverting back to HTTP: ", decodeURIComponent(config.http.proxy[domain].url));
                        app.tab.update(tab.id, {"url": config.http.proxy[domain].url});
                      }
                    } else if (config.log.print) console.error(" - Couldn't find tab with url: ", decodeURIComponent(details.url));
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
    },
    "xhr": function (top, details) {
      const err = {};
      const headrequest = async function (url, details, callback) {
        try {
          const controller = new AbortController();
          const id = setTimeout(function () {controller.abort()}, config.xhr.timeout);
          const response = await fetch(url, {"method": "HEAD", "signal": controller.signal});
          clearTimeout(id);
          /*  */
          if (response) {
            if (response.status >= 400 || response.status < 200) {
              if (response.status === 0) {
                callback({"error": '', "details": details}); /* no head support */
              } else {
                callback({"error": ("net::ERR_FETCH_STATUS_CODE_" + response.status), "details": details});
              }
            } else { /* if the response URL is HTTP, we still have the error */
              if (/^http:\/\//i.test(response.url)) {
                callback({"error": "net::ERR_FETCH_REDIRECT_LOOP", "details": details});
              } else {
                if (response.ok) {
                  callback({"error": '', "details": details});
                } else {
                  callback({"error": "net::ERR_FETCH_NOT_OK", "details": details});
                }
              }
            }
          } else {
            callback({"error": "net::ERR_FETCH_NO_RESPONSE", "details": details});
          }
        } catch (e) {
          if (e) {
            if (e.message) {
              const txt = e.message.toLowerCase();
              /*  */
              if (txt.indexOf("aborted") !== -1) {
                callback({"error": "net::ERR_FETCH_TIMEOUT", "details": details});
              } else if (txt.indexOf("failed") !== -1) {
                callback({"error": "net::ERR_FETCH_FAILED", "details": details});
              } else {
                callback({"error": "net::ERR_FETCH_OTHER", "details": details});
              }
            } else {
              callback({"error": "net::ERR_FETCH_UNKNOWN", "details": details});
            }
          }
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
    }
  },
  "action": {
    "storage": function (changes, namespace) {
      /*  */
    },
    "tab": {
      "updated": function (info, tab) {
        if (config.addon.state === "enabled") {
          if (info.status === "complete") {
            if (tab.url) {
              let tmp = {};
              tmp.error = core.check.error;
              tmp.complete = core.check.complete;
              /*  */
              if (tmp.complete[tab.url]) {
                core.check.https({
                  "url": tab.url,
                  "error": tmp.error[tab.url]
                });
              }
            }
          }
        }
      }
    },
    "popup": {
      "load": function () {
        app.popup.send("storage", {
          "state": config.addon.state
        });
      },
      "type": function (type) {
        if (type === "controls") app.tab.options();
        if (type === "support") app.tab.open(app.homepage());
        if (type === "donation") app.tab.open(app.homepage() + "?reason=support");
        if (type === "state") {
          config.addon.state = config.addon.state === "disabled" ? "enabled" : "disabled";
          /*  */
          app.popup.send("storage", {"state": config.addon.state});
          core.update.toolbar.icon(config.addon.state);
          core.init.requests(true, true);
        }
        /*  */
        if (type === "whitelist") {
          app.tab.query.active(function (tab) {
            if (tab) {
              if (tab.url) {
                if (tab.url.indexOf("http://") === 0 || tab.url.indexOf("https://") === 0) {
                  const OLD = tab.url.replace("https://", "http://");
                  const domain = config.hostname(OLD);
                  /*  */
                  core.stack.http = config.http.object;
                  config.http.proxy[domain] = {"url": OLD, "error": true, "smart": false};
                  config.http.object = core.stack.http;
                  /*  */
                  core.stack.https = config.https.object;
                  delete config.https.proxy[domain];
                  config.https.object = core.stack.https;
                  /*  */
                  core.action.options.load();
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
                  const OLD = tab.url.replace("http://", "https://");
                  const domain = config.hostname(OLD);
                  /*  */
                  core.stack.https = config.https.object;
                  config.https.proxy[domain] = {"url": OLD, "error": true, "smart": false};
                  config.https.object = core.stack.https;
                  /*  */
                  core.stack.http = config.http.object;
                  delete config.http.proxy[domain];
                  config.http.object = core.stack.http;
                  /*  */
                  core.action.options.load();
                  app.tab.update(tab.id, {"url": OLD});
                }
              }
            }
          });
        }
      }
    },
    "options": {
      "consolelog": function (flag) {
        config.log.print = flag;
      },
      "regexp": function (flag) {
        config.addon.regexp = flag;
        core.action.options.load();
      },
      "fullurl": function (flag) {
        config.log.fullurl = flag;
        core.action.options.load();
      },
      "typemissmatch": function (flag) {
        config.addon.typemissmatch = flag;
        core.init.requests(true, true);
      },
      "uinsecurer": function (flag) {
        config.addon.uinsecurer = flag;
        core.init.requests(true, true);
      },
      "maxitems": function (i) {
        if (i) {
          config.max.value = i;
          core.action.options.load();
        }
      },
      "timeout": function (o) {
        if (o) {
          config.xhr.timeout = o;
          core.action.options.load();
        }
      },
      "dwhitelisting": function (flag) {
        for (let id in core.stack.http) {
          if (core.stack.http[id].smart === true) {
            delete core.stack.http[id];
          }
        }
        /*  */
        config.http.object = core.stack.http;
        config.addon.dwhitelisting = flag;
        core.action.options.load();
      },
      "incognito": function (flag) {
        for (let id in core.stack.http) {
          if (core.stack.http[id].incognito === true) {
            delete core.stack.http[id];
          }
        }
        /*  */
        config.http.object = core.stack.http;
        config.addon.incognito = flag;
        core.action.options.load();
      },
      "load": function () {
        app.options.send("storage", {
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
      },
      "store": {
        "data": {
          "http": function (o) {
            if (o) {
              config.http.object = o;
              core.stack.http = config.http.object;
              core.action.options.load();
            }
          },
          "https": function (o) {
            if (o) {
              config.https.object = o;
              core.stack.https = config.https.object;
              core.action.options.load();
            }
          }
        }
      }
    },
    "webrequest": {
      "on": {
        "completed": function (details) {
          const tmp = {};
          /*  */
          tmp.complete = core.check.complete;
          tmp.complete[details.url] = true;
          core.check.complete = tmp.complete;
          /*  */
          tmp.error = core.check.error;
          tmp.error[details.url] = details.error ? true : false;
          core.check.error = tmp.error;
          /*  */
          if (!config.addon.typemissmatch) {
            setTimeout(function () {
              core.check.https(details);
            }, 1500);
          }
        },
        "before": {
          "request": function (details) {
            const top = details.url;
            if (/^http:\/\//i.test(top)) {
              const newURL = top.replace(/^http:\/\//i, "https://");
              core.stack.http = config.http.object;
              core.stack.https = config.https.object;
              const domain = config.hostname(top);
              /*  */
              if (!config.http.proxy[domain]) {
                if (!config.https.proxy[domain]) {
                  config.http.proxy[domain] = {"url": top, "error": false, "smart": true};
                  config.http.object = core.stack.http;
                  if (config.log.print) console.error(" - Smart switch to HTTPS: ", decodeURIComponent(newURL));
                } else {
                  if (config.log.print) console.error(" - Forced load in HTTPS: ", decodeURIComponent(newURL));
                }
                /*  */
                app.tab.update(details.tabId, {"url": newURL});
                core.handler.xhr(newURL, details); /* check for response errors */
              }
            }
          }
        },
        "headers": {
          "received": function (details) {
            const domain = {};
            if (details.type === "main_frame") {
              domain[details.tabId] = config.hostname(details.url);
            }
            /*  */
            if (config.addon.typemissmatch) {
              if (/^http:\/\//i.test(details.url)) {
                if (config.http.proxy[domain]) {
                  if (!config.http.proxy[domain].error) {
                    core.handler.error("net::ERR_TYPE_MISMATCH", details, true, domain);
                  }
                }
              }
            }
            /*  */
            if (config.addon.uinsecurer) {
              if (/^https:\/\//i.test(details.url)) {
                const responseHeaders = details.responseHeaders;
                for (let i = 0; i < responseHeaders.length; i++) {
                  const name = responseHeaders[i].name.toLowerCase();
                  if (name === "content-security-policy") {
                    if (typeof responseHeaders[i].value === "string") {
                      if (responseHeaders[i].value.search("upgrade-insecure-requests") === -1) {
                        if (config.log.print) {
                          return console.error(" - Add Upgrade-Insecure-Requests to CSP for", domain);
                        }
          
                      }
                    }
                  }
                }
                /*  */
                if (config.log.print) {
                  return console.error(" - Add Upgrade-Insecure-Requests to CSP for", domain);
                }
              }
            }
          }
        }
      }
    }
  }
};

app.storage.load(core.init.stack);

app.tab.on.updated(core.action.tab.updated);

app.popup.receive("load", core.action.popup.load);
app.popup.receive("type", core.action.popup.type);

app.webrequest.on.completed.callback(core.action.webrequest.on.completed);
app.webrequest.on.before.request.callback(core.action.webrequest.on.before.request);
app.webrequest.on.headers.received.callback(core.action.webrequest.on.headers.received);

app.options.receive("load", core.action.options.load);
app.options.receive("regexp", core.action.options.regexp);
app.options.receive("fullurl", core.action.options.fullurl);
app.options.receive("timeout", core.action.options.timeout);
app.options.receive("incognito", core.action.options.incognito);
app.options.receive("consolelog", core.action.options.consolelog);
app.options.receive("uinsecurer", core.action.options.uinsecurer);
app.options.receive("max-table-items", core.action.options.maxitems);
app.options.receive("dwhitelisting", core.action.options.dwhitelisting);
app.options.receive("typemissmatch", core.action.options.typemissmatch);
app.options.receive("store-http-data", core.action.options.store.data.http);
app.options.receive("store-https-data", core.action.options.store.data.https);

app.on.startup(core.start);
app.on.installed(core.install);
app.on.storage(core.action.storage);
