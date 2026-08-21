// Code by Sunwan
//

export const easyDragUtils = {

    pref:           Components.classes['@mozilla.org/preferences-service;1'].
                      getService(Components.interfaces.nsIPrefService).getBranch("extensions.easydragtogo."),
    WinDlFolder:    '\\My Documents\\My Pictures',
    MacDlFolder:    '/Pictures',
    UnixDlFolder:   '/Desktop',

    _dlFolder: null,
    get dlFolder() {
      if (!this._dlFolder) {
        var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"].
                            getService(Components.interfaces.nsIProperties);
        var dir = fileLocator.get("Home", Components.interfaces.nsIFile);
        var platform = Services.appinfo.OS;
        if (platform.indexOf("WINNT") == 0)
          this._dlFolder = dir.path + this.WinDlFolder;
        else if (platform.indexOf("Darwin") == 0)
          this._dlFolder = dir.path + this.MacDlFolder;
        else
          this._dlFolder = dir.path + this.UnixDlFolder;
      }
      return this._dlFolder;
    },

    getDownloadFolder: function() {
      return this.getPref("img.folder", this.dlFolder);
    },
    getDownloadFolder2: function() {
      return this.getPref("img.folder2", this.dlFolder);
    },
    getDownloadFolder3: function() {
      return this.getPref("img.folder3", this.dlFolder);
    },	
    getDownloadFolder4: function() {
      return this.getPref("img.folder4", this.dlFolder);
    },

    gestureModes: ["RLUD", "UD", "RL", "A", "N"],
    gestureDirections: ["A", "R", "L", "U", "D"],

    getGesture: function(target) {
      var value = this.getPref(target + ".actionSets", "|");
      var actions = {};
      for (var direction of this.gestureDirections) {
        var match = value.match(new RegExp(direction + ":(.+?)(\\s+[ARLUD]:|$)"));
        if (match) actions[direction] = match[1];
      }
      return { mode: value.split("|")[0], actions };
    },

    setGesture: function(target, gesture) {
      this.setPref(target + ".actionSets", gesture.mode + "|" + this.gestureDirections.map(direction =>
        gesture.actions[direction] ? " " + direction + ":" + gesture.actions[direction] : ""
      ).join(""));
    },

    getGestureAction: function(target, X, Y) {
      var gesture = this.getGesture(target);
      var direction;
      switch (gesture.mode) {
        case "A": direction = "A"; break;
        case "UD": direction = Y > 0 ? "D" : "U"; break;
        case "RL": direction = X > 0 ? "R" : "L"; break;
        case "RLUD":
          direction = X > Y ? (X + Y > 0 ? "R" : "U") : (X + Y > 0 ? "D" : "L");
          break;
        default: return "";
      }
      return gesture.actions[direction] || "";
    },

    getPref: function(prefname, value) {
      try {
        var scelta;
        if (typeof(value) == "boolean")
          scelta = this.pref.getBoolPref(prefname);
        else if (typeof(value) == "number")
          scelta = this.pref.getIntPref(prefname);
        else if (typeof(value) == "string")
          scelta = this.pref.getStringPref(prefname);
        return scelta;
      } catch (e) {
        this.setPref(prefname, value);
        return value;
      }
    },

    setPref: function(prefname, value) {
      if (typeof(value) == "boolean")
        this.pref.setBoolPref(prefname, value);
      else if (typeof(value) == "number")
        this.pref.setIntPref(prefname, value);
      else if (typeof(value) == "string") {
        this.pref.setStringPref(prefname, value);
      }
    }
};
