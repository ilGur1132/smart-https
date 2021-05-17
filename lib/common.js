/*
 * Copyright 2021 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

app.options.receive("regexp", function (flag) {
  config.addon.regexp = flag;
  core.update.options.page();
});

app.options.receive("fullurl", function (flag) {
  config.log.fullurl = flag;
  core.update.options.page();
});

app.options.receive("typemissmatch", function (flag) {
  config.addon.typemissmatch = flag;
  core.webrequest.init();
});

app.options.receive("uinsecurer", function (flag) {
  config.addon.uinsecurer = flag;
  core.webrequest.init();
});

app.options.receive("max-table-items", function (i) {
  if (i) {
    config.max.value = i;
    core.update.options.page();
  }
});

app.options.receive("store-https-data", function (o) {
  if (o) {
    config.https.object = o;
    core.stack.https = config.https.object;
    core.update.options.page();
  }
});

app.options.receive("store-http-data", function (o) {
  if (o) {
    config.http.object = o;
    core.stack.http = config.http.object;
    core.update.options.page();
  }
});

app.options.receive("timeout", function (o) {
  if (o) {
    config.xhr.timeout = o;
    core.update.options.page();
  }
});

app.options.receive("dwhitelisting", function (flag) {
  for (var id in core.stack.http) {
    if (core.stack.http[id].smart === true) {
      delete core.stack.http[id];
    }
  }
  /*  */
  config.http.object = core.stack.http;
  config.addon.dwhitelisting = flag;
  core.update.options.page();
});

app.options.receive("incognito", function (flag) {
  for (var id in core.stack.http) {
    if (core.stack.http[id].incognito === true) {
      delete core.stack.http[id];
    }
  }
  /*  */
  config.http.object = core.stack.http;
  config.addon.incognito = flag;
  core.update.options.page();
});

app.webrequest.on.completed.callback(function (details) {
  if (details.type === "main_frame") {
    core.check.complete[details.url] = true;
    core.check.error[details.url] = details.error ? true : false;
    if (!config.addon.typemissmatch) {
      window.setTimeout(function () {
        core.check.https(details);
      }, 1500);
    }
  }
});

app.tab.on.updated(function (info, tab) {
  if (config.addon.state === "enabled") {
    if (info.status === "complete") {
      app.tab.check.url(tab, function (tab) {
        var url = tab.url;
        if (url) {
          if (core.check.complete[url]) {
            core.check.https({
              "url": url,
              "error": core.check.error[url]
            });
          }
        }
      });
    }
  }
});

app.webrequest.on.before.request.callback(function (details) {
  if (details.type === 'main_frame') {
    var top = details.url;
    if (/^http:\/\//i.test(top)) {
      var newURL = top.replace(/^http:\/\//i, "https://");
      core.stack.http = config.http.object;
      core.stack.https = config.https.object;
      var domain = config.hostname(top);
      /*  */
      if (!config.http.proxy[domain]) {
        if (!config.https.proxy[domain]) {
          config.http.proxy[domain] = {"url": top, "error": false, "smart": true};
          config.http.object = core.stack.http;
          if (config.log.print) console.error(" - Smart switch to HTTPS: ", newURL);
        } else {
          if (config.log.print) console.error(" - Forced load in HTTPS: ", newURL);
        }
        core.handler.xhr(newURL, details); /* check for response errors */
        return {"redirectUrl": newURL}
      }
    }
  }
});

app.webrequest.on.headers.received.callback(function (details) {
  var domain = {};
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
      if (details.type === "main_frame" || details.type === "sub_frame") {
        var responseHeaders = details.responseHeaders;
      	for (var i = 0; i < responseHeaders.length; i++) {
          var name = responseHeaders[i].name.toLowerCase();
      		if (name === "content-security-policy") {
      			if (typeof responseHeaders[i].value === "string") {
      				if (responseHeaders[i].value.search("upgrade-insecure-requests") === -1) {
      					responseHeaders[i].value += "; upgrade-insecure-requests";
                if (config.log.print) console.error(" - Add Upgrade-Insecure-Requests to CSP for", domain, responseHeaders);
                return {"responseHeaders": responseHeaders};
              }
            }
          }
      	}
        /*  */
      	responseHeaders.push({"name": "Content-Security-Policy", "value": "upgrade-insecure-requests"});
        if (config.log.print) console.error(" - Add Upgrade-Insecure-Requests to CSP for", domain, responseHeaders);
      	return {"responseHeaders": responseHeaders};
      }
    }
  }
});

app.popup.receive("type", core.popup.listener);
app.options.receive("retrieve-data", core.update.options.page);
app.options.receive("consolelog", function (flag) {config.log.print = flag});
app.options.receive("open-homepage", function (flag) {config.welcome.open = flag});
app.popup.receive("storageData", function () {app.popup.send("storageData", config.addon.state)});

app.on.startup(core.start);
app.on.installed(core.install);