/*
 * Copyright 2021 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var app = {};

app.error = function () {
  return chrome.runtime.lastError;
};

app.popup = {
  "message": {},
  "receive": function (id, callback) {
    app.popup.message[id] = callback;
  },
  "send": function (id, data) {
    chrome.runtime.sendMessage({
      "data": data,
      "method": id,
      "path": "background-to-popup"
    });
  }
};

app.options = {
  "message": {},
  "receive": function (id, callback) {
    app.options.message[id] = callback;
  },
  "send": function (id, data) {
    chrome.runtime.sendMessage({
      "data": data,
      "method": id,
      "path": "background-to-options"
    });
  }
};

app.button = {
  "title": function (title, callback) {
    chrome.browserAction.setTitle({"title": title}, function (e) {
      if (callback) callback(e);
    });
  },
  "icon": function (path, callback) {
    if (path && typeof path === "object") {
      chrome.browserAction.setIcon({"path": path}, function (e) {
        if (callback) callback(e);
      });
    } else {
      chrome.browserAction.setIcon({
        "path": {
          "16": "../data/icons/" + (path ? path + '/' : '') + "16.png",
          "32": "../data/icons/" + (path ? path + '/' : '') + "32.png",
          "48": "../data/icons/" + (path ? path + '/' : '') + "48.png",
          "64": "../data/icons/" + (path ? path + '/' : '') + "64.png"
        }
      }, function (e) {
        if (callback) callback(e);
      }); 
    }
  }
};

app.on = {
  "management": function (callback) {
    chrome.management.getSelf(callback);
  },
  "uninstalled": function (url) {
    chrome.runtime.setUninstallURL(url, function () {});
  },
  "installed": function (callback) {
    chrome.runtime.onInstalled.addListener(function (e) {
      app.storage.load(function () {
        callback(e);
      });
    });
  },
  "startup": function (callback) {
    chrome.runtime.onStartup.addListener(function (e) {
      app.storage.load(function () {
        callback(e);
      });
    });
  },
  "message": function (callback) {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      app.storage.load(function () {
        callback(request, sender, sendResponse);
      });
      /*  */
      return true;
    });
  }
};

app.storage = (function () {
  chrome.storage.onChanged.addListener(function () {
    chrome.storage.local.get(null, function (e) {
      app.storage.local = e;
      if (app.storage.callback) {
        if (typeof app.storage.callback === "function") {
          app.storage.callback(true);
        }
      }
    });
  });
  /*  */
  return {
    "local": {},
    "callback": null,
    "read": function (id) {
      return app.storage.local[id];
    },
    "on": {
      "changed": function (callback) {
        if (callback) {
          app.storage.callback = callback;
        }
      }
    },
    "write": function (id, data, callback) {
      var tmp = {};
      tmp[id] = data;
      app.storage.local[id] = data;
      chrome.storage.local.set(tmp, function (e) {
        if (callback) callback(e);
      });
    },
    "load": function (callback) {
      var keys = Object.keys(app.storage.local);
      if (keys && keys.length) {
        if (callback) callback("cache");
      } else {
        chrome.storage.local.get(null, function (e) {
          app.storage.local = e;
          if (callback) callback("disk");
        });
      }
    }
  }
})();

app.tab = {
  "options": function () {
    chrome.runtime.openOptionsPage();
  },
  "get": function (tabId, callback) {
    chrome.tabs.get(tabId, function (e) {
      if (callback) callback(e);
    });
  },
  "update": function (tabId, options, callback) {
    if (tabId) {
      chrome.tabs.update(tabId, options, function (e) {
        if (callback) callback(e);
      });
    } else {
      chrome.tabs.update(options, function (e) {
        if (callback) callback(e);
      });
    }
  },
  "open": function (url, index, active, callback) {
    var properties = {
      "url": url, 
      "active": active !== undefined ? active : true
    };
    /*  */
    if (index !== undefined) {
      if (typeof index === "number") {
        properties.index = index + 1;
      }
    }
    /*  */
    chrome.tabs.create(properties, function (tab) {
      if (callback) callback(tab);
    }); 
  },
  "query": {
    "all": function (callback) {
      chrome.tabs.query({}, function (tabs) {
        if (tabs && tabs.length) {
          callback(tabs);
        }
      });
    },
    "index": function (callback) {
      chrome.tabs.query({"active": true, "currentWindow": true}, function (tabs) {
        if (tabs && tabs.length) {
          callback(tabs[0].index);
        } else callback(undefined);
      });
    },
    "active": function (callback) {
      chrome.tabs.query({"active": true, "currentWindow": true}, function (tabs) {
        if (tabs && tabs.length) {
          app.tab.check.url(tabs[0], function (tab) {
            callback(tab);
          });
        }
      });
    }
  },
  "on": {
    "updated": function (callback) {
      chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
        app.storage.load(function () {
           callback(info, tab);
        });
      });
    }
  },
  "check": {
    "url": function (tab, callback) {
      if (tab.url) callback(tab);
      else {
        chrome.tabs.executeScript(tab.id, {
          "runAt": "document_start",
          "code": "document.location.href"
        }, function (result) {
          var error = chrome.runtime.lastError;
          if (result && result.length) {
            tab.url = result[0];
          }
          /*  */
          callback(tab);
        });
      }
    }
  }
};