// Code by Sunwan
//



var easyDragSettings = {

    definedDirections:  ['RLUD', 'UD', 'RL', 'A', 'N'],
    targets:            ['text', 'link', 'img'],
    dir:                ['A', 'R', 'L', 'U', 'D'],
    direction:          ['any', 'right', 'left', 'up', 'down'],

//进入 “配置”界面，设置扩展   
//R:search-问问-fg
    onLoad: function() {
      for each (var tag in this.targets) {
        var actStr = easyDragUtils.getPref(tag + '.actionSets', '|'); //这个是拖拽对象类型（如：文字、链接）
        var dirDom = document.getElementById('direction-' + tag);   //这个是拖拽方向（如：向上、向下）
        if (!dirDom) continue;
        var index, sIndex = 4;
        if (actStr) {
          var aDirs = actStr.split('|')[0];
          for (index = 0; index < this.definedDirections.length; index++) {
            if (aDirs == this.definedDirections[index]) {
              sIndex = index;
              break;
            }
          }
        }

        dirDom._selectedIndex = sIndex;

        for (var d in this.dir) {  //循环5种方向设置，分别加载设置
          var aMenu = document.getElementById(tag + '-edg-' + this.direction[d]);
          if (!aMenu) continue;
          var act = "";
          var re = new RegExp(this.dir[d] + ':(.+?)(\\s+[ARLUD]:|$)', '');
          try { if ( re.test(actStr) ) act = RegExp.$1; } catch(e) {}
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

      var aPref = easyDragUtils.getPref("fromContentOuter.text", "search-c-fg");
      if (aPref.indexOf("search-") == 0)
        this.setSearchEngine(document.getElementById("textFromContentOuter"), aPref);
      else
        document.getElementById("textFromContentOuter")._selectedItem = aPref;
      document.getElementById("linkFromContentOuter")._selectedItem =
            easyDragUtils.getPref("fromContentOuter.link", "link-fg");
      document.getElementById("saveDomainName").checked = easyDragUtils.getPref("saveDomainName", true);
	   document.getElementById("saveByDatetime").checked = easyDragUtils.getPref("saveByDatetime", true);
      document.getElementById("imgSaveFloder-text").value = easyDragUtils.getDownloadFolder();
      document.getElementById("imgSaveFloder-text_2").value = easyDragUtils.getDownloadFolder2();
      document.getElementById("imgSaveFloder-text_3").value = easyDragUtils.getDownloadFolder3();
      document.getElementById("imgSaveFloder-text_4").value = easyDragUtils.getDownloadFolder4();	  
	  document.getElementById("EasydragtogoTimeout-text").value =  easyDragUtils.getPref("timeout",1);
	  document.getElementById("FirefoxTabOpen").checked = easyDragUtils.getPref("FirefoxTabOpen", true);
	   document.getElementById("dragtogoEmailSearch").checked = easyDragUtils.getPref("dragtogoEmailSearch", true);
    },


//保存设置方法
    onAccept: function() {
      for each (var tag in this.targets) {
        var actStr = "";
        var dirDom = document.getElementById('direction-' + tag);
        if (!dirDom) continue;

        actStr = this.definedDirections[dirDom._selectedIndex] + '|';
        for (var d in this.direction) {
          var aMenu = document.getElementById(tag + '-edg-' + this.direction[d]);
          if (aMenu) {
            if (/^search-(fg|bg|cur|find|site|savetext|copyToClipboard|list)$/.test(aMenu._selectedItem))
              actStr += ' ' + this.dir[d] + ':search-' + aMenu._engine + '-' + RegExp.$1;
            else
              actStr += ' ' + this.dir[d] + ':' + aMenu._selectedItem;
          }
        }
        
		//保存所有方向设置
        easyDragUtils.setPref(tag + '.actionSets', actStr);
      }

      aMenu = document.getElementById("textFromContentOuter");
      if (/^search-(fg|bg|cur|find|site|savetext|copyToClipboard|list)$/.test(aMenu._selectedItem))
        actStr = 'search-' + aMenu._engine + '-' + RegExp.$1;
      else
        actStr = aMenu._selectedItem;
      easyDragUtils.setPref("fromContentOuter.text", actStr);
      easyDragUtils.setPref("fromContentOuter.link", document.getElementById("linkFromContentOuter")._selectedItem);
      easyDragUtils.setPref("saveDomainName", document.getElementById("saveDomainName").checked);
      easyDragUtils.setPref("saveByDatetime", document.getElementById("saveByDatetime").checked);
      easyDragUtils.setPref("img.folder", document.getElementById("imgSaveFloder-text").value);
      easyDragUtils.setPref("img.folder2", document.getElementById("imgSaveFloder-text_2").value);
      easyDragUtils.setPref("img.folder3", document.getElementById("imgSaveFloder-text_3").value);
      easyDragUtils.setPref("img.folder4", document.getElementById("imgSaveFloder-text_4").value);	  
	  easyDragUtils.setPref("timeout", parseInt(document.getElementById("EasydragtogoTimeout-text").value));
      easyDragUtils.setPref("FirefoxTabOpen", document.getElementById("FirefoxTabOpen").checked);
      easyDragUtils.setPref("dragtogoEmailSearch", document.getElementById("dragtogoEmailSearch").checked);
    },

    rstDefault: function() {
      var prefNames = easyDragUtils.pref.getChildList( "", {} );
      for each (var aPref in prefNames) {
        if (aPref.indexOf("custom.") != 0)
          try { easyDragUtils.pref.clearUserPref(aPref); } catch(e) {}
      }

      this.onLoad();
    },

    browseDir: function(browseDirNo) {
	  var GetbrowseDirid="imgSaveFloder-text"+browseDirNo;
	  var dirDom = document.getElementById(GetbrowseDirid);
      var picker = Components.interfaces.nsIFilePicker;
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(picker);

      fp.init(window, null, picker.modeGetFolder);

      try {
        var dir = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsILocalFile);
        dir.initWithPath( dirDom.value );
        fp.displayDirectory = dir;
      } catch (e) {}

      if ( fp.show() == picker.returnOK )
        dirDom.value = fp.file.path;
    },

    setSearchEngine: function(menu, act) {
      if ( /^search-(.+?)-?(fg|bg|cur|find|site|savetext|copyToClipboard|list)$/.test(act) ) {
        menu._selectedItem = "search-" + RegExp.$2;
        var engineName = RegExp.$1;
        engineName ? (menu._engine = engineName) : (menu._engine = "c");
      }
      else {
        menu._selectedItem = "search-fg";
        menu._engine = "c";
      }
    },

    createEnginesList: function(popup) {
      if (popup.childNodes.length > 3) return;
      var ss = Components.classes["@mozilla.org/browser/search-service;1"]
                .getService(Components.interfaces.nsIBrowserSearchService);
      if (!ss) return;
      var engines = ss.getEngines({});
      if (ss.currentEngine)
        popup.childNodes[0].label += "[" + ss.currentEngine.name + "]";
      if (ss.defaultEngine)
        popup.childNodes[1].label += "[" + ss.defaultEngine.name + "]";
      for (var i = 0; i < engines.length; i++) {
        var m = popup.appendChild(document.createElement("menuitem"));
        m.label = m.value = engines[i].name;
      }
    },

    updateImgFloderStatus: function() {
      var items = ["img-edg-any", "img-edg-up", "img-edg-down", "img-edg-right", "img-edg-left"];
      var enabled = true;
      for each (var it in items) {
        try {
          enabled = enabled || !document.getElementById(it)._disabled &&
                      document.getElementById(it)._selectedItem == "save-df-img";
        } catch(e) {}
      }
      document.getElementById("imgSaveFloder-text").disabled =
      document.getElementById("imgSaveFloder-browserButton").disabled =
      document.getElementById("saveDomainName").disabled = !enabled;
	  document.getElementById("EasydragtogoTimeout-text").disabled =0;
    }
};
