// Code by Sunwan
//

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
});

var { easyDragUtils } = ChromeUtils.importESModule("chrome://easydragtogo/content/utils.mjs");

var easyDragSettings = {

  targets: ['text', 'link', 'img'],
  direction: ['any', 'right', 'left', 'up', 'down'],

  //进入 “配置”界面，设置扩展   
  //R:search-问问-fg
  onLoad: function (bindEvents) {
    for (var tag of this.targets) {
      var gesture = easyDragUtils.getGesture(tag);
      var dirDom = document.getElementById('direction-' + tag);   //这个是拖拽方向（如：向上、向下）
      if (!dirDom) continue;
      var sIndex = easyDragUtils.gestureModes.indexOf(gesture.mode);
      if (sIndex == -1) sIndex = 4;

      dirDom._selectedIndex = sIndex;

      for (var d in easyDragUtils.gestureDirections) {  //循环5种方向设置，分别加载设置
        var aMenu = document.getElementById(tag + '-edg-' + this.direction[d]);
        if (!aMenu) continue;
        var act = gesture.actions[easyDragUtils.gestureDirections[d]];
        if (act) {
          if (act.indexOf("search-") == 0)
            this.setSearchEngine(aMenu, act);
          else
            aMenu._selectedItem = act;
        }
        else
          aMenu._selectedItem = "do-nothing";
      }
    }

    for (let folder = 1; folder <= 4; folder++) {
      const suffix = folder == 1 ? "" : "_" + folder;
      if (bindEvents) document.getElementById("imgSaveFloder-browserButton" + suffix)?.addEventListener("command", () => this.browseDir(suffix));
      document.getElementById("imgSaveFloder-text" + suffix).value = easyDragUtils.getDownloadFolder(folder);
    }
    if (bindEvents) document.getElementById("myDefault")?.addEventListener("command", () => this.rstDefault());
    if (bindEvents) document.getElementById("myAccept")?.addEventListener("command", () => this.onAccept());

    var aPref = easyDragUtils.getPref("fromContentOuter.text", "search-d-fg");
    if (aPref.indexOf("search-") == 0)
      this.setSearchEngine(document.getElementById("textFromContentOuter"), aPref);
    else
      document.getElementById("textFromContentOuter")._selectedItem = aPref;
    document.getElementById("linkFromContentOuter")._selectedItem =
      easyDragUtils.getPref("fromContentOuter.link", "link-fg");
    document.getElementById("saveDomainName").checked = easyDragUtils.getPref("saveDomainName", true);
    document.getElementById("saveByDatetime").checked = easyDragUtils.getPref("saveByDatetime", true);
    document.getElementById("EasydragtogoTimeout-text").value = easyDragUtils.getPref("timeout", 1);
    document.getElementById("FirefoxTabOpen").checked = easyDragUtils.getPref("FirefoxTabOpen", true);
    document.getElementById("dragtogoEmailSearch").checked = easyDragUtils.getPref("dragtogoEmailSearch", true);
  },


  //保存设置方法
  onAccept: function () {
    for (var tag of this.targets) {
      var dirDom = document.getElementById('direction-' + tag);
      if (!dirDom) continue;

      var actions = {};
      for (var d in this.direction) {
        var aMenu = document.getElementById(tag + '-edg-' + this.direction[d]);
        if (aMenu) {
          if (/^search-(fg|bg|cur|find|site|savetext|copyToClipboard|list)$/.test(aMenu._selectedItem))
            actions[easyDragUtils.gestureDirections[d]] = 'search-' + aMenu._engine + '-' + RegExp.$1;
          else
            actions[easyDragUtils.gestureDirections[d]] = aMenu._selectedItem;
        }
      }

      //保存所有方向设置
      easyDragUtils.setGesture(tag, { mode: easyDragUtils.gestureModes[dirDom._selectedIndex], actions });
    }

    var aMenu = document.getElementById("textFromContentOuter");
    var actStr;
    if (/^search-(fg|bg|cur|find|site|savetext|copyToClipboard|list)$/.test(aMenu._selectedItem))
      actStr = 'search-' + aMenu._engine + '-' + RegExp.$1;
    else
      actStr = aMenu._selectedItem;
    easyDragUtils.setPref("fromContentOuter.text", actStr);
    easyDragUtils.setPref("fromContentOuter.link", document.getElementById("linkFromContentOuter")._selectedItem);
    easyDragUtils.setPref("saveDomainName", document.getElementById("saveDomainName").checked);
    easyDragUtils.setPref("saveByDatetime", document.getElementById("saveByDatetime").checked);
    for (var folder = 1; folder <= 4; folder++) {
      easyDragUtils.setPref("img.folder" + (folder == 1 ? "" : folder), document.getElementById("imgSaveFloder-text" + (folder == 1 ? "" : "_" + folder)).value);
    }
    easyDragUtils.setPref("timeout", parseInt(document.getElementById("EasydragtogoTimeout-text").value));
    easyDragUtils.setPref("FirefoxTabOpen", document.getElementById("FirefoxTabOpen").checked);
    easyDragUtils.setPref("dragtogoEmailSearch", document.getElementById("dragtogoEmailSearch").checked);
  },

  rstDefault: function () {
    var prefNames = easyDragUtils.pref.getChildList("", {});
    for (var aPref of prefNames) {
      if (aPref.indexOf("custom.") != 0)
        try { easyDragUtils.pref.clearUserPref(aPref); } catch (e) { }
    }

    this.onLoad();
  },

  browseDir: function (browseDirNo) {
    var GetbrowseDirid = "imgSaveFloder-text" + browseDirNo;
    var dirDom = document.getElementById(GetbrowseDirid);
    var picker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(picker);

    fp.init(window.browsingContext, null, picker.modeGetFolder);

    try {
      var dir = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      dir.initWithPath(dirDom.value);
      fp.displayDirectory = dir;
    } catch (e) { }

    fp.open(a => {
      if (a == picker.returnOK)
        dirDom.value = fp.file.path;
    });
  },

  setSearchEngine: function (menu, act) {
    if (/^search-(.+?)-?(fg|bg|cur|find|site|savetext|copyToClipboard|list)$/.test(act)) {
      var engineName = RegExp.$1;
      menu._selectedItem = "search-" + RegExp.$2;
      engineName ? (menu._engine = engineName) : (menu._engine = "d");
    }
    else {
      menu._selectedItem = "search-fg";
      menu._engine = "d";
    }
  },

  createEnginesList: async function (popup) {
    if (popup.childNodes.length > 3) return;
    var ss = lazy.SearchService;
    if (!ss) return;
    var engines = await ss.getEngines();
    if (ss.defaultEngine)
      popup.childNodes[0].label += "[" + ss.defaultEngine.name + "]";
    for (var i = 0; i < engines.length; i++) {
      var m = popup.appendChild(document.createXULElement("menuitem"));
      m.label = m.value = engines[i].name;
    }
  },

  updateImgFloderStatus: function () {
    var items = ["img-edg-any", "img-edg-up", "img-edg-down", "img-edg-right", "img-edg-left"];
    var enabled = false;
    for (var it of items) {
      try {
        enabled = enabled || !document.getElementById(it)._disabled &&
          document.getElementById(it)._selectedItem == "save-df-img";
      } catch (e) { }
    }
    document.getElementById("imgSaveFloder-text").disabled =
      document.getElementById("imgSaveFloder-browserButton").disabled =
      document.getElementById("saveDomainName").disabled = !enabled;
    document.getElementById("EasydragtogoTimeout-text").disabled = 0;
  }
};

window.addEventListener("load", () => easyDragSettings.onLoad(true), { once: true });
