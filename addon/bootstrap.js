/* eslint no-var: 2, prefer-const: 2 */
/* exported install uninstall startup shutdown */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

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

function startup(data, reason) {
  Components.utils.import("chrome://easydragtogo/content/defaultPreferencesLoader.jsm");
  try {
    var loader = new DefaultPreferencesLoader();
    loader.parseUri(
      "chrome://easydragtogo-defaults/content/easydragtogo.js");
  } catch (ex) { }

  Components.utils.import("chrome://easydragtogo/content/ChromeManifest.jsm");

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
    let documentObserver = {
      observe(document) {
        if (document.createXULElement) {
          if (document.defaultView.location.origin + document.defaultView.location.pathname == "chrome://browser/content/browser.xhtml") {
            Services.scriptloader.loadSubScript("chrome://easydragtogo/content/easydragtogo.js", document.defaultView);
            Services.scriptloader.loadSubScript("chrome://easydragtogo/content/utils.js", document.defaultView);
          }
        }
      }
    };
    Services.obs.addObserver(documentObserver, "chrome-document-loaded");
  })();

  (async function () {
    try {
      Services.prefs.getBoolPref("extensions.easydragtogo.hide_warning") ?
        (await AddonManager.getAddonByID(`${data.id}`)).__AddonInternal__.signedState = AddonManager.SIGNEDSTATE_NOT_REQUIRED
        : (await AddonManager.getAddonByID(`${data.id}`)).__AddonInternal__.signedState === AddonManager.SIGNEDSTATE_NOT_REQUIRED ? (await AddonManager.getAddonByID(`${data.id}`)).__AddonInternal__.signedState = AddonManager.SIGNEDSTATE_MISSING : '';
    } catch (error) { }
  }());
}

function shutdown(data, reason) {
  const window = Services.wm.getMostRecentWindow('navigator:browser');
  if (reason === ADDON_DISABLE) {
    showRestartNotification("disabled", window);
  } else if (reason === ADDON_UNINSTALL) {
    showRestartNotification("uninstalled", window);
  }
}
