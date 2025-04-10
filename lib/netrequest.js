/*
 * Copyright 2025 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

app.netrequest = {
  "display": {
    "badge": {
      "text": async function (e) {
        if (chrome.declarativeNetRequest) {
          if (chrome.declarativeNetRequest.setExtensionActionOptions) {
            let displayActionCountAsBadgeText = e !== undefined ? e : true;
            await chrome.declarativeNetRequest.setExtensionActionOptions({
              "displayActionCountAsBadgeText": displayActionCountAsBadgeText
            });
          }
        }
      }
    }
  },
  "engine": {
    "rulesets": {
      "update": function (options) {
        return new Promise((resolve, reject) => {
          app.storage.load(function () {
            if (chrome.declarativeNetRequest) {
              chrome.declarativeNetRequest.updateEnabledRulesets(options).then(resolve).catch(reject);
            }
          });
        });
      }
    },
    "rules": {
      "get": function () {
        return new Promise((resolve, reject) => {
          app.storage.load(function () {
            if (chrome.declarativeNetRequest) {
              if (app.netrequest.rules.scope === "dynamic") {
                chrome.declarativeNetRequest.getDynamicRules().then(resolve).catch(reject);
              } else {
                chrome.declarativeNetRequest.getSessionRules().then(resolve).catch(reject);
              }
            }
          });
        });
      },
      "update": function (options) {
        return new Promise((resolve, reject) => {
          app.storage.load(function () {
            if (chrome.declarativeNetRequest) {
              if (app.netrequest.rules.scope === "dynamic") {
                chrome.declarativeNetRequest.updateDynamicRules(options).then(resolve).catch(reject);
              } else {
                chrome.declarativeNetRequest.updateSessionRules(options).then(resolve).catch(reject);
              }
            }
          });
        });
      }
    }
  },
  "rules": {
    "stack": [],
    /*  */
    set scope (val) {app.storage.write("rulescope", val)},
    get scope () {return app.storage.read("rulescope") !== undefined ? app.storage.read("rulescope") : "dynamic"},
    /*  */
    "update": async function () {
      let addRules = app.netrequest.rules.stack;
      if (addRules && addRules.length) {
        let removeRuleIds = addRules.map(function (e) {return e.id});
        /*  */
        if (removeRuleIds && removeRuleIds.length) {
          await app.netrequest.engine.rules.update({
            "addRules": addRules,
            "removeRuleIds": removeRuleIds
          });
        }
      }
    },
    "push": function (e) {
      if (e) {
        if (e.action && e.condition) {
          let id = e.id !== undefined ? e.id : app.netrequest.rules.find.next.available.id();
          if (id) {
            let test = app.netrequest.rules.stack.filter(e => e.id === id);
            if (test && test.length === 0) {
              app.netrequest.rules.stack.push({
                "id": id,
                "action": e.action,
                "condition": e.condition,
                "priority": e.priority !== undefined ? e.priority : 1
              });
            }
          }
        }
      }
    },
    "find": {
      "next": {
        "available": {
          "id": function () {
            let target = 1;
            /*  */
            let addRules = app.netrequest.rules.stack;
            if (addRules && addRules.length) {
              let addRulesIds = addRules.map(function (e) {return e.id}).sort(function (a, b) {return a - b});
              if (addRulesIds && addRulesIds.length) {
                for (let index in addRulesIds) {
                  if (addRulesIds[index] > -1 && addRulesIds[index] === target) {
                    target++;
                  }
                }
              }
            }
            /*  */
            return target;
          }
        }
      }
    },
    "remove": {
      "by": {
        "ids": async function (removeRuleIds) {
          if (removeRuleIds && removeRuleIds.length) {
            await app.netrequest.engine.rules.update({"removeRuleIds": removeRuleIds});
            app.netrequest.rules.stack = await app.netrequest.engine.rules.get();
          }
        },
        "scope": async function (scope) {
          let removeRuleIds = [];
          /*  */
          if (scope === "dynamic") {
            let dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
            removeRuleIds = dynamicRules.map(function (e) {return e.id});
            await chrome.declarativeNetRequest.updateDynamicRules({"removeRuleIds": removeRuleIds});
          } else if (scope === "session") {
            let sessionRules = await chrome.declarativeNetRequest.getSessionRules();
            removeRuleIds = sessionRules.map(function (e) {return e.id});
            await chrome.declarativeNetRequest.updateSessionRules({"removeRuleIds": removeRuleIds});
          }
          /*  */
          app.netrequest.rules.stack = app.netrequest.rules.stack.filter(function (e) {return removeRuleIds.indexOf(e.id) === -1});
        },
        "condition": {
          "tabId": async function (tabId) {
            if (tabId) {
              let rules = await app.netrequest.engine.rules.get();
              if (rules && rules.length) {
                let removeRuleIds = rules.filter(function (e) {
                  if (e) {
                    if (e.condition) {                        
                      if (e.condition.tabIds[0] === tabId) {
                        return true;
                      }
                    }
                  }
                  /*  */
                  return false;
                }).map(function (e) {
                  return e.id;
                });
                /*  */
                await app.netrequest.rules.remove.by.ids(removeRuleIds);
              }
            }
          }
        },
        "action": {
          "type": async function (type, key) {
            if (type) {
              let rules = await app.netrequest.engine.rules.get();
              if (rules && rules.length) {
                let removeRuleIds = rules.filter(function (e) {
                  if (e) {
                    if (e.action) {
                      if (e.action.type === type) {
                        if (key) {
                          if (key in e.action) {
                            return true;
                          }
                        } else {
                          return true;
                        }
                      }
                    }
                  }
                  /*  */
                  return false;
                }).map(function (e) {
                  return e.id;
                });
                /*  */
                await app.netrequest.rules.remove.by.ids(removeRuleIds);
              }
            }
          }
        }
      }
    }
  }
};
