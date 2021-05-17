/*
 * Copyright 2021 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

app.version = function () {return chrome.runtime.getManifest().version};
app.homepage = function () {return chrome.runtime.getManifest().homepage_url};

if (!navigator.webdriver) {
  app.on.uninstalled(app.homepage() + "?v=" + app.version() + "&type=uninstall");
  app.on.installed(function (e) {
    app.on.management(function (result) {
      if (result.installType === "normal") {
        app.tab.query.index(function (index) {
          var previous = e.previousVersion !== undefined && e.previousVersion !== app.version();
          var doupdate = previous && parseInt((Date.now() - config.welcome.lastupdate) / (24 * 3600 * 1000)) > 45;
          if (e.reason === "install" || (e.reason === "update" && doupdate)) {
            var parameter = (e.previousVersion ? "&p=" + e.previousVersion : '') + "&type=" + e.reason;
            var url = app.homepage() + "?v=" + app.version() + parameter;
            app.tab.open(url, index, e.reason === "install");
            config.welcome.lastupdate = Date.now();
          }
        });
      }
    });
  });
}

app.on.message(function (request, sender) {
  if (request) {
    if (request.path === "popup-to-background") {
      for (var id in app.popup.message) {
        if (app.popup.message[id]) {
          if ((typeof app.popup.message[id]) === "function") {
            if (id === request.method) {
              app.popup.message[id](request.data);
            }
          }
        }
      }
    }
    /*  */
    if (request.path === "options-to-background") {
      for (var id in app.options.message) {
        if (app.options.message[id]) {
          if ((typeof app.options.message[id]) === "function") {
            if (id === request.method) {
              app.options.message[id](request.data);
            }
          }
        }
      }
    }
  }
});