// Code by Sunwan
//

this.easyDragUtils = {

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
        var platform = navigator.platform;
        if (platform.indexOf("Win") == 0)
          this._dlFolder = dir.path + this.WinDlFolder;
        else if (platform.indexOf("Mac") == 0)
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