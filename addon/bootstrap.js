/* eslint no-var: 2, prefer-const: 2 */
/* exported install uninstall startup shutdown */
"use strict";

const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
const cacheToken = Math.random();
let easyDragUtils;
let defaultPreferencesLoader;

function install(data, reason) {

}

function uninstall() { }

const documentObserver = {
  observe(document) {
    if (document.createXULElement &&
      document.defaultView.location.origin + document.defaultView.location.pathname == "chrome://browser/content/browser.xhtml") {
      document.defaultView.easyDragUtils = easyDragUtils;
      Services.scriptloader.loadSubScriptWithOptions("chrome://easydragtogo/content/easydragtogo.js", { target: document.defaultView, ignoreCache: true });
    }
  }
};

const msgHandler = msg => {
  (msg.target.documentGlobal ?? msg.target.ownerGlobal).easyDragToGo.openURL(msg.data, msg.target.ownerDocument);
};

const fs = `data:application/javascript;charset=utf-8,(${encodeURIComponent((
  function (frame, cacheToken) {
    if (frame['easyDragToGo'] || !frame.content ||
      (frame.content.location.protocol == "moz-extension:" &&
        frame.content.location.pathname == "/_generated_background_page.html")) return;
    var { easyDragToGo } = ChromeUtils.importESModule("chrome://easydragtogo/content/easydragtogo.mjs?" + cacheToken);
    new easyDragToGo(frame, ChromeUtils.importESModule("chrome://easydragtogo/content/utils.mjs?" + cacheToken).easyDragUtils);
    frame.easyDragToGo.onLoad();
    const lsr = msg => {
      removeMessageListener("easyDragToGo:rm", lsr);
      frame.easyDragToGo.onShut();
      frame.easyDragToGo = null;
    }
    frame.addMessageListener("easyDragToGo:rm", lsr);
  }).toString())})(this,${cacheToken});`;

function startup(data, reason) {
  ({ easyDragUtils } = ChromeUtils.importESModule("chrome://easydragtogo/content/utils.mjs"));
  if (reason !== APP_STARTUP)
    Object.defineProperties(easyDragUtils, Object.getOwnPropertyDescriptors(
      ChromeUtils.importESModule("chrome://easydragtogo/content/utils.mjs?" + cacheToken).easyDragUtils));
  const { DefaultPreferencesLoader } = ChromeUtils.importESModule("chrome://easydragtogo/content/defaultPreferencesLoader.mjs?" + cacheToken);
  defaultPreferencesLoader = new DefaultPreferencesLoader();
  try {
    defaultPreferencesLoader.readFrom.push("chrome://_easydragtogo/content/defaults/preferences/easydragtogo.js");
    defaultPreferencesLoader.parseDirectory();
  } catch (ex) { }

  Services.mm.loadFrameScript(fs, true);
  Services.mm.addMessageListener("easyDragToGo:openURL", msgHandler);

  if (reason !== APP_STARTUP && !Services.wm.getMostRecentWindow('navigator:browser')?.easyDragToGo) {
    const enumerator = Services.wm.getEnumerator(null);
    while (enumerator.hasMoreElements()) {
      documentObserver.observe(enumerator.getNext().document);
    }
  }

  Services.obs.addObserver(documentObserver, "chrome-document-loaded");

  AddonManager.getAddonByID(data.id).then(addon => {
    Services.prefs.getBoolPref("extensions.easydragtogo.hide_warning", false) ?
      addon.__AddonInternal__.signedState = AddonManager.SIGNEDSTATE_NOT_REQUIRED
      : addon.__AddonInternal__.signedState = AddonManager.SIGNEDSTATE_MISSING;
  }
  );
}

function shutdown(data, reason) {
  if (reason === APP_SHUTDOWN) return;
  Services.mm.removeMessageListener("easyDragToGo:openURL", msgHandler);
  Services.obs.removeObserver(documentObserver, "chrome-document-loaded")
  Services.mm.broadcastAsyncMessage("easyDragToGo:rm");
  Services.mm.removeDelayedFrameScript(fs);
  defaultPreferencesLoader?.clearDefaultPrefs();
  defaultPreferencesLoader = null;
  const enumerator = Services.wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    const win = enumerator.getNext();
    delete win.easyDragToGo;
    delete win.easyDragUtils;
  }
}
