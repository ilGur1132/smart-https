/*
 * Copyright 2024 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

app.webrequest = {
  "on": {
    "completed": {
      "listener": null,
      "callback": function (callback) {
        app.webrequest.on.completed.listener = callback;
      },
      "remove": function () {
        if (chrome.webRequest) {
          chrome.webRequest.onCompleted.removeListener(app.webrequest.on.completed.listener);
        }
      },
      "add": function (e) {
        const filter = e ? e : {"urls": ["*://*/*"]};
        /*  */
        if (chrome.webRequest) {
          chrome.webRequest.onCompleted.removeListener(app.webrequest.on.completed.listener);
          chrome.webRequest.onCompleted.addListener(app.webrequest.on.completed.listener, filter);
        }
      }
    },
    "headers": {
      "received": {
        "listener": null,
        "callback": function (callback) {
          app.webrequest.on.headers.received.listener = callback;
        },
        "remove": function () {
          if (chrome.webRequest) {
            chrome.webRequest.onHeadersReceived.removeListener(app.webrequest.on.headers.received.listener);
          }
        },
        "add": function (e) {
          const filter = e ? e : {"urls": ["*://*/*"]};
          const options = ["responseHeaders", "extraHeaders"];
          /*  */
          if (chrome.webRequest) {
            chrome.webRequest.onHeadersReceived.removeListener(app.webrequest.on.headers.received.listener);
            chrome.webRequest.onHeadersReceived.addListener(app.webrequest.on.headers.received.listener, filter, options);
          }
        }
      }
    },
    "before": {
      "request": {
        "listener": null,
        "callback": function (callback) {
          app.webrequest.on.before.request.listener = callback;
        },
        "remove": function () {
          if (chrome.webRequest) {
            chrome.webRequest.onBeforeRequest.removeListener(app.webrequest.on.before.request.listener);
          }
        },
        "add": function (e) {
          const options = [];
          const filter = e ? e : {"urls": ["*://*/*"]};
          /*  */
          if (chrome.webRequest) {
            chrome.webRequest.onBeforeRequest.removeListener(app.webrequest.on.before.request.listener);
            chrome.webRequest.onBeforeRequest.addListener(app.webrequest.on.before.request.listener, filter, options);
          }
        }
      }
    }
  }
};