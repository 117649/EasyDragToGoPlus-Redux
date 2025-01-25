/* eslint no-var: 2, prefer-const: 2 */
/* exported install uninstall startup shutdown */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");

const appinfo = Services.appinfo;
const options = {
  application: appinfo.ID,
  appversion: appinfo.version,
  platformversion: appinfo.platformVersion,
  os: appinfo.OS,
  osversion: Services.sysinfo.getProperty("version"),
  abi: appinfo.XPCOMABI
};

function showRestartNotification(verb, window) {
  window.PopupNotifications._currentNotifications.shift();
  window.PopupNotifications.show(
    window.gBrowser.selectedBrowser,
    'addon-install-restart',
    'Easy DragToGo+ Redux' + verb + ', but a restart is required to ' + (verb == 'upgraded' || verb == 're-enabled' ? 'enable' : 'remove') + ' add-on functionality.',
    'addons-notification-icon',
    {
      label: 'Restart Now',
      accessKey: 'R',
      callback() {
        let cancelQuit = Cc['@mozilla.org/supports-PRBool;1'].createInstance(Ci.nsISupportsPRBool);
        Services.obs.notifyObservers(cancelQuit, 'quit-application-requested', 'restart');

        if (cancelQuit.data)
          return;

        if (Services.appinfo.inSafeMode)
          Services.startup.restartInSafeMode(Ci.nsIAppStartup.eAttemptQuit);
        else
          Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
      }
    },
    [{
      label: 'Not Now',
      accessKey: 'N',
      callback: () => { },
    }],
    {
      popupIconURL: 'chrome://easydragtogo/skin/addon-install-restart.svg',
      persistent: false,
      hideClose: true,
      timeout: Date.now() + 30000,
      removeOnDismissal: true
    }
  );
}

function install(data, reason) {

}

function uninstall() { }

const documentObserver = {
      observe(document) {
        if (document.createXULElement) {
          if (document.defaultView.location.origin + document.defaultView.location.pathname == "chrome://browser/content/browser.xhtml") {
            Services.scriptloader.loadSubScript("chrome://easydragtogo/content/easydragtogo.js", document.defaultView);
            Services.scriptloader.loadSubScript("chrome://easydragtogo/content/utils.js", document.defaultView);
          }
        }
      }
    };

function startup(data, reason) {
  const { DefaultPreferencesLoader } = ChromeUtils.importESModule("chrome://easydragtogo/content/defaultPreferencesLoader.mjs");
  try {
    var loader = new DefaultPreferencesLoader();
    loader.parseUri(
      "chrome://_easydragtogo/content/defaults/preferences/easydragtogo.js");
  } catch (ex) { }

  const window = Services.wm.getMostRecentWindow('navigator:browser');
  if (reason === ADDON_UPGRADE || reason === ADDON_DOWNGRADE) {
    showRestartNotification("upgraded", window);
    return;
  }

  if (reason === ADDON_INSTALL || (reason === ADDON_ENABLE && !window.easyDragToGo)) {
    const enumerator = Services.wm.getEnumerator(null);
    while (enumerator.hasMoreElements()) {
      const win = enumerator.getNext();

      (async function (win) {
        if (win.document.createXULElement) {
          if (win.location.origin + win.location.pathname == "chrome://browser/content/browser.xhtml") {
            Services.scriptloader.loadSubScript("chrome://easydragtogo/content/easydragtogo.js", win.document.defaultView);
            Services.scriptloader.loadSubScript("chrome://easydragtogo/content/utils.js", win.document.defaultView);
          }
        }
      })(win);
    }
  }

  (async function () {
    Services.obs.addObserver(documentObserver, "chrome-document-loaded");
  })();

  AddonManager.getAddonByID(data.id).then(addon => {
    Services.prefs.getBoolPref("extensions.easydragtogo.hide_warning") ?
      addon.__AddonInternal__.signedState = AddonManager.SIGNEDSTATE_NOT_REQUIRED
      : addon.__AddonInternal__.signedState = AddonManager.SIGNEDSTATE_MISSING;
    }
  );
}

function shutdown(data, reason) {
  Services.obs.removeObserver(documentObserver, "chrome-document-loaded")
  const enumerator = Services.wm.getEnumerator(null);
    while (enumerator.hasMoreElements()) {
      const win = enumerator.getNext();
      win?.easyDragToGo.onShut();
      delete win.easyDragToGo;
      delete win.easyDragUtils;
      delete win.easyDragToGoDNDObserver;
    }
}
