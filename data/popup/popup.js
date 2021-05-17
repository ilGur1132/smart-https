/*
 * Copyright 2021 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var background = (function () {
  var tmp = {};
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    for (var id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path == "background-to-popup") {
          if (request.method === id) tmp[id](request.data);
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {tmp[id] = callback},
    "send": function (id, data) {chrome.runtime.sendMessage({"path": "popup-to-background", "method": id, "data": data})}
  }
})();

var config = {
  "render": function (state) {
    var button = document.querySelector("[data-type='state']");
    if (button) button.setAttribute("state", state);
  },
  "load": function () {
    var explore = document.querySelector("#explore");
    if (navigator.userAgent.indexOf("Edg") !== -1 ) explore.style.display = "none";
    /*  */
    document.addEventListener("click", function (e) {
      var type = e.target ? e.target.dataset.type : null;
      if (type) background.send("type", type);
    });
    /*  */
    background.send("storageData");
    window.removeEventListener("load", config.load, false);
  }
};

background.receive("storageData", config.render);
window.addEventListener("load", config.load, false);
