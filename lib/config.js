/* 
 * Copyright 2017 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
*/

var config = {};

config.welcome = {
  "timeout": 3000,
  "url": 'http://mybrowseraddon.com/smart-https.html',
  get version () {return app.storage.read('version')},
  set version (val) {app.storage.write('version', val)},
  set open (val) {app.storage.write('welcome-flag', val)},
  get open () {return app.storage.read('welcome-flag') === "false" ? false : true}
};

config.addon = {
  get state () { 
    var _tmp = app.storage.read("state");
    if (!_tmp || _tmp === 'undefined' || typeof _tmp === 'undefined') return 'enabled';
    else return app.storage.read("state");
  },
  set state (val) {app.storage.write("state", val)},
  set regexp (val) {app.storage.write('regexp', val)},
  set incognito (val) {app.storage.write('incognito', val)},
  set dwhitelisting (val) {app.storage.write('dwhitelisting', val)},
  set typemissmatch (val) {app.storage.write('typemissmatch', val)},
  get regexp () {return app.storage.read('regexp') === "true" ? true : false},
  get incognito () {return app.storage.read('incognito') === "true" ? true : false},
  get dwhitelisting () {return app.storage.read('dwhitelisting') === "true" ? true : false},
  get typemissmatch () {return app.storage.read('typemissmatch') === "true" ? true : false}
};

config.max = {
  get value () { 
    var _tmp = app.storage.read("maxValue");
    if (!_tmp || _tmp === 'undefined' || typeof _tmp === 'undefined') return 50;
    else return parseInt(app.storage.read("maxValue"));
  },
  set value (val) { 
    if (!val || isNaN(val)) val = 50;
    val = parseInt(val);
    if (val < 0) val = 0;
    if (val > 1000) val = 1000;
    app.storage.write("maxValue", val);
    /*  */
    config.http.object = config.http.object;
    config.https.object = config.https.object;
  }
};

config.filter = function (o) {
  var size = 0, maxSize = config.max.value;
  for (var m in o) {if (o.hasOwnProperty(m)) size++}
  if (size >= 0 && maxSize >= 0) {
    while (size > maxSize) {
      for (var m in o) {
        delete o[m]; 
        size--;
        break;
      }
    }
  }
  /*  */
  return o;
};

config.log = {
  set print (val) {app.storage.write('logPrint', val)},
  get print () {return app.storage.read('logPrint') === "true" ? true : false}
};

config.xhr = {
  get timeout () {return (app.storage.read("xhrTimeout") ? parseInt(app.storage.read('xhrTimeout')) : 3000)},
  set timeout (val) {
    if (!val || isNaN(val)) val = 3000;
    val = parseInt(val);
    if (val < 0) val = 3000;
    if (val > 30000) val = 30000;
    app.storage.write("xhrTimeout", val);
  }
};

config.http = {
  get object () {return (app.storage.read("httpObject") ? JSON.parse(app.storage.read('httpObject')) : {})},
  set object (o) {
    o = config.filter(o);
    app.storage.write('httpObject', JSON.stringify(o));
  },
  "proxy": new Proxy({}, {
    get: function (target, name, receiver) {
      if (config.addon.regexp) {
        for (var id in httpObject) {
          var _regexp = new RegExp(id);
          var result = _regexp.test(name);
          if (result) return httpObject[id];
        }
      }
      return httpObject[name];
    },
    set: function (target, name, value) {
      if (config.addon.regexp) {
        for (var id in httpObject) {
          var _regexp = new RegExp(id);
          var result = _regexp.test(name);
          if (result) return httpObject[id] = value;
        }
      }
      httpObject[name] = value;
    },
    "deleteProperty": function (target, name) {
      if (config.addon.regexp) {
        for (var id in httpObject) {
          var _regexp = new RegExp(id);
          var result = _regexp.test(name);
          if (result) return delete httpObject[id];
        }
      }
      delete httpObject[name];
    }
  })
};

config.https = {
  get object () {return (app.storage.read("httpsObject") ? JSON.parse(app.storage.read('httpsObject')) : {})},
  set object (o) {
    o = config.filter(o);
    app.storage.write('httpsObject', JSON.stringify(o));
  },
  "proxy": new Proxy({}, {
    get: function (target, name, receiver) {
      if (config.addon.regexp) {
        for (var id in httpsObject) {
          var _regexp = new RegExp(id);
          var result = _regexp.test(name);
          if (result) return httpsObject[id];
        }
      }
      return httpsObject[name];
    },
    set: function (target, name, value) {
      if (config.addon.regexp) {
        for (var id in httpsObject) {
          var _regexp = new RegExp(id);
          var result = _regexp.test(name);
          if (result) return httpsObject[id] = value;
        }
      }
      httpsObject[name] = value;
    },
    "deleteProperty": function (target, name) {
      if (config.addon.regexp) {
        for (var id in httpsObject) {
          var _regexp = new RegExp(id);
          var result = _regexp.test(name);
          if (result) return delete httpsObject[id];
        }
      }
      delete httpsObject[name];
    }
  })
};