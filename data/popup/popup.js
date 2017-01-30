/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var background = (function () {
  var _tmp = {};
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    for (var id in _tmp) {
      if (_tmp[id] && (typeof _tmp[id] === "function")) {
        if (request.path == 'background-to-popup') {
          if (request.method === id) _tmp[id](request.data);
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {_tmp[id] = callback},
    "send": function (id, data) {chrome.runtime.sendMessage({"path": 'popup-to-background', "method": id, "data": data})}
  }
})();

background.receive("storageData", function (state) {
  var button = document.querySelector("[data-type='state']");
  if (button) button.setAttribute("state", state);
});

var load = function () {
  document.addEventListener("click", function (e) {
    var type = e.target ? e.target.dataset.type : null;
    if (type) background.send("type", type);
  });
  /*  */
  background.send("storageData");
  window.removeEventListener("load", load, false);
};

window.addEventListener("load", load, false);