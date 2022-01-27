// ==========================================================================
// Version: MPL 1.1/GPL 2.0/LGPL 2.1
// The contents of this file are subject to the Mozilla Public License VersionaEvent
// 1.1 (the "License"); you may not use this file except in compliance with
// the License. You may obtain a copy of the License at
// http://www.mozilla.org/MPL/
//
// Software distributed under the License is distributed on an "AS IS" basis,
// WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
// for the specific language governing rights and limitations under the
// License.
//
// The Original Code is Easy DragToGo code.
//
// The Initial Developer of the Original Code is Sunwan.
// Portions created by the Initial Developer are Copyright (C) 2008
// the Initial Developer. All Rights Reserved.
//
// Contributor(s):
//   Sunwan <SunwanCN@gmail.com>
//
// Alternatively, the contents of this file may be used under the terms of
// either of the GNU General Public License Version 2 or later (the "GPL"),
// or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
// in which case the provisions of the GPL or the LGPL are applicable instead
// of those above. If you wish to allow use of your version of this file only
// under the terms of either the GPL or the LGPL, and not to allow others to
// use your version of this file under the terms of the MPL, indicate your
// decision by deleting the provisions above and replace them with the notice
// and other provisions required by the GPL or the LGPL. If you do not delete
// the provisions above, a recipient may use your version of this file under
// the terms of any one of the MPL, the GPL or the LGPL.
// ==========================================================================

var easyDragToGo = {

    loaded: false,
    moving: false,
    StartAlready: false,
    onStartEvent: null,
    // drag start event
    onDropEvent: null,
    // drag drop event
    aDragSession: null,
    // drag session
    timeId: null,
    _statusTextField: null,
    _clearStatusTimer: null,
    _statustext: null,
    aReferrerURI: null,
    _statustext: null,
    onLoad: function () {
        if (!easyDragToGo.loaded) {
            var contentArea = getBrowser().mPanelContainer;
            if (!contentArea) console.info('EasyDragToGo+ failed to initialize!');

        easyDragToGo._statusTextField = document.getElementById("statusbar-display");
        if (!easyDragToGo._statusTextField)
            easyDragToGo._statusTextField = gBrowser.getStatusPanel();

            if (contentArea) {

            /*
	            eval("nsDragAndDrop.dragOver =" + nsDragAndDrop.dragOver.toString().replace(
	            'aEvent.stopPropagation();',
	            'if ( !easyDragToGo.moving ) { $& }')
	            );
	
		          eval("nsDragAndDrop.checkCanDrop =" + nsDragAndDrop.checkCanDrop.toString().replace(
		          'if ("canDrop" in aDragDropObserver)',
		          'if (easyDragToGo.StartAlready) this.mDragSession.canDrop = true; $&')
			       	 );
	       	  */

                contentArea.addEventListener('dragstart', function (e) {
                	//console.info("ondragstart");	//2016-12-31 SHP COMMENT:开了e10s后不进来了，目前不知道有什么影响

                    if (e.target.nodeName == "A") {
                        var selectLinkText = document.commandDispatcher.focusedWindow.getSelection().toString();
                        if (selectLinkText != "" && e.explicitOriginalTarget == document.commandDispatcher.focusedWindow.getSelection().focusNode) {
                            e.dataTransfer.setData("text/plain", selectLinkText);
                            e.dataTransfer.clearData("text/x-moz-url");
                            e.dataTransfer.clearData("text/x-moz-url-desc");
                            e.dataTransfer.clearData("text/x-moz-url-data");
                            e.dataTransfer.clearData("text/uri-list");
                        }
                    }
                    easyDragToGo.dragStart(e);
                }, false);
                
                contentArea.addEventListener('dragover', function (e) {
                    if (easyDragToGo._nodeAcceptsDrops(e.target)) {
                    		//console.info("dragover accpet drop clean.");
                        easyDragToGo.clean();
                        return;
                    }
                    e.preventDefault();	 //2016-10-02 SHP MOD
                    easyDragToGo.moving = true;
                    easyDragToGoDNDObserver.onDragOver(e)	//2016-10-02 SHP MOD
                    easyDragToGo.moving = false;
                }, false);
                contentArea.addEventListener('dragdrop', function (e) {

                    if (easyDragToGo._nodeAcceptsDrops(e.target)) {
                    		//console.info("dragdrop accpet drop clean.");
                        easyDragToGo.clean();
                        return;
                    }

                    //nsDragAndDrop.drop(e, easyDragToGoDNDObserver);	//2016-10-02 SHP MOD
                    //easyDragToGoDNDObserver.onDrop(e)	//2016-10-02 SHP MOD
                }, false);
                contentArea.addEventListener('drop', function (e) {
                    if (easyDragToGo._nodeAcceptsDrops(e.target)) {
                    		//console.info("drop accpet drop clean.");
                        easyDragToGo.clean();
                        return;
                    }
                    //nsDragAndDrop.drop(e, easyDragToGoDNDObserver);	//2016-10-02 SHP MOD
                    easyDragToGoDNDObserver.onDrop(e)	//2016-10-02 SHP MOD
                }, false);
                

                contentArea.addEventListener('keyup', function (e) {

                	if (e.keyCode == 27 ){
                		console.error("escaped!");
										easyDragToGo.clean();
                	}            
                }, false);
                
            }
            easyDragToGo.loaded = true;
        }
    },

    dragStart: function (aEvent) {
        this.onStartEvent = aEvent;
        this.StartAlready = true;
        this.dragsettimeout();
    },

    clean: function () {
        this.StartAlready = false;
        if (this.onDropEvent) {
            this.onDropEvent.preventDefault();
            this.onDropEvent.stopPropagation();
        }
        this.onStartEvent = this.onDropEvent = this.aDragSession = null;
        //console.error("cleaned");
    },

    dragsettimeout: function () {
        var timeout = easyDragUtils.getPref("timeout", 0);
        if (timeout > 0) {
            clearTimeout(this.timeId);
            var event = {
                notify: function (timer) {
                		//console.error("timeout clean.");
                    easyDragToGo.clean()
                }
            }
            timeId = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
            timeId.initWithCallback(event, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
        }
    },


    //* The Original Code is FireGestures.
    setStatusText: function (aText) {
       easyDragToGo._statusTextField.label = aText;
    },
    //* The Original Code is FireGestures.
    clearStatusText: function (aMillisec) {
     if (easyDragToGo._clearStatusTimer) {
            window.clearTimeout(easyDragToGo._clearStatusTimer);
            easyDragToGo._clearStatusTimer = null;
        }
        var text = easyDragToGo._statusTextField.label;
        var callback = function(self) {
            self._clearStatusTimer = null;
            if (self._statusTextField.label == text)
                self.setStatusText("");
        };
        easyDragToGo._clearStatusTimer = window.setTimeout(callback, aMillisec, this);
    },


    //在TAB打开链接方法
    //X,Y为拖拽方向
    // target 为拖拽类型
    openURL: function (aEvent,aURI, src, target, X, Y) {
        if (!aURI) return;
        if (easyDragUtils.getPref("FirefoxTabOpen", true)) {
            aReferrerURI = gBrowser.currentURI;
        } else {
            aReferrerURI = null;
        }

        var act = "";

        if (target.indexOf("fromContentOuter") == -1) {

            var actionSets = easyDragUtils.getPref(target + ".actionSets", "|");

            if (!actionSets || actionSets == "|") return;

            var dir;
            var directions = actionSets.split('|')[0];

            switch (directions) {
            case "A":
                // any direction
                dir = "A";
                break;
            case "UD":
                // up and down
                dir = (Y > 0) ? "D" : "U";
                break;
            case "RL":
                // right and left
                dir = (X > 0) ? "R" : "L";
                break;
            case "RLUD":
                // right left up down
                if (X > Y)(X + Y > 0) ? (dir = "R") : (dir = "U");
                else(X + Y > 0) ? (dir = "D") : (dir = "L");
                break;
            default:
                return;
            }
            //console.info("X:"+X);
            //console.info("Y:"+Y);
            //console.info(actionSets);
            //console.info(dir);

            var re = new RegExp(dir + ':(.+?)(\\s+[ARLUD]:|$)', '');
            try {
                if (re.test(actionSets)) act = RegExp.$1;
            } catch (e) {}
        } else {
            act = easyDragUtils.getPref(target, "link-fg");
        }
				
        if (!act) return;
        var browser = getTopWin().getBrowser();
        var uri = "";
        var bg = true;
        var postData = {};


        // get search strings
        if ((target == "text" || target == "fromContentOuter.text") && act.indexOf("search-") == 0) {
            var submission = this.getSearchSubmission(aURI, act);
            if (submission) {
                uri = submission.uri.spec;
                postData.value = submission.postData;
                if (uri && /(fg|bg|cur|find|site|savetext|copyToClipboard|list)$/.test(act)) act = "search-" + RegExp.$1; //得到如“search-fg”
                else act = "";
            } else act = "";

            if (!act) alert("No Search Engines!");
        }
        
        //console.info("action: " + act);

        switch (act) {
            //find text
        case "search-find":
            gFindBar.onFindCommand();
            var Highlight = gFindBar.getElement("highlight");
            Highlight.setAttribute('checked', true);
            Highlight.click();
            Highlight.click();
            return;

            //save text
        case "search-savetext":
          saveURL("data:text/plain," + "From URL:"+encodeURIComponent(gBrowser.currentURI.spec + "\r\n\r\n" + document.commandDispatcher.focusedWindow.getSelection()), gBrowser.selectedTab.label + ".txt",null, true, true, undefined,document);

            return;

            //* The Original Code is http://www.cnblogs.com/ziyunfei/archive/2011/12/20/2293928.html
            //search-list
        case "search-list":
            var searchhide = function (isHide) {
                    if (isHide) {
                        curSet = navBar.currentSet.split(",");
                        var i = curSet.indexOf(searchId);
                        if (i != -1) {
                            curSet.splice(i, 1);
                            curSet = curSet.join(",");
                            navBar.setAttribute("currentset", curSet);
                            navBar.currentSet = curSet;
                            document.persist(navBar.id, "currentset");
                            try {
                                BrowserToolboxCustomizeDone(true);
                            } catch (e) {}
                            try {
                                BrowserToolboxCustomizeDone(true);
                            } catch (e) {}
                            try {
                                BrowserToolboxCustomizeDone(true);
                            } catch (e) {}
                            try {
                                BrowserToolboxCustomizeDone(true);
                            } catch (e) {}
                            try {
                                BrowserToolboxCustomizeDone(true);
                            } catch (e) {}
                            try {
                                BrowserToolboxCustomizeDone(true);
                            } catch (e) {}
                            try {
                                BrowserToolboxCustomizeDone(true);
                            } catch (e) {}
                        }
                    } else {
                        var pos = curSet.length;
                        curSet.splice(pos, 0, searchId);
                        curSet = curSet.join(",");
                        navBar.setAttribute("currentset", curSet);
                        navBar.currentSet = curSet;
                        document.persist(navBar.id, "currentset");
                        try {
                            BrowserToolboxCustomizeDone(true);
                        } catch (e) {}
                    }
                }

            var searchId = "search-container";
            var searchIsHidden = false;
            //判断搜索栏是否隐藏
            var navBar = document.getElementById("nav-bar");
            var curSet = navBar.currentSet.split(",");

            if (curSet.indexOf(searchId) == -1) {
                searchIsHidden = true;
            }
            //显示搜索栏
            if (searchIsHidden) {
                searchhide(false);
            }


            try {
                var search_container = document.getElementById("search-container");
                var searchclass = search_container.getAttribute("class");
                search_container.setAttribute("class", "");

                var popup = document.getAnonymousElementByAttribute(document.querySelector("#searchbar").searchButton, "anonid", "searchbar-popup");
                var serach = function () {
                        popup.removeEventListener("command", serach, false);
                        popup.removeEventListener("popuphidden", closeSerach, false);
                        setTimeout(function (selectedEngine) {
                            gBrowser.loadOneTab(null, aReferrerURI, null, null, false, false);
                            BrowserSearch.loadSearch(aURI, false);
                            popup.querySelector("#" + String(selectedEngine.id).replace(/\s/g, '\\$&')).click();
                            search_container.setAttribute("class", searchclass);
                            if (searchIsHidden) searchhide(true);
                        }, 50, popup.querySelector("*[selected=true]"));
                    };

                var closeSerach = function () {
                        popup.removeEventListener("command", serach, false);
                        popup.removeEventListener("popuphidden", closeSerach, false);
                        search_container.setAttribute("class", searchclass);
                        if (searchIsHidden) searchhide(true);
                    };


                popup.addEventListener("command", serach, false);
                popup.addEventListener("popuphidden", closeSerach, false);
                popup.openPopup(null, null, easyDragToGo.onStartEvent.screenX - 100, easyDragToGo.onStartEvent.screenY - 100);
            } catch (e) {
                alert("Easy DragToGo+ error :  May be Remove the search bar. \n\n" + e.name + " :  " + e.message);
                        }
            return;
            //copyToClipboard
        case "search-copyToClipboard":
            Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(aURI);
            return;


        case "search-site":
            bg = false;
            //  alert('act is :'+act);
        case "search-fg":
        case "link-fg":
            // open a new tab and selected it
            bg = false;

        case "search-bg":
        case "link-bg":
        try {
            if (!uri) uri = getShortcutOrURI(aURI, postData);
        } catch (e) {
            uri = aURI;
            // alert(e.name  +   " :  "   +  e.message+aURI+postData);
        }


            try {
                var cur = (!bg || browser.mTabs.length == 1) && browser.webNavigation.currentURI.spec == "about:blank" && !browser.mCurrentBrowser.webProgress.isLoadingDocument || (/^(javascript):/i.test(uri));
                //Old code:     (/^(javascript|mailto):/i.test(uri));
            } catch (e) {}

            if (cur)
            // open in current tab
            loadURI(uri, null, postData.value, true);
            else {
                // for Tree Style Tab extension
                if ("TreeStyleTabService" in window && (target == "link" && !this.aDragSession.sourceNode.localName || target == "img")) try {	//2016-10-02 SHP COMMENT:这里会出现问题，aDragSession 已经木有，不过是针对树形tab扩展的，木有改
                    TreeStyleTabService.readyToOpenChildTab(gBrowser.selectedTab);
                } catch (e) {}

                //alert('uri:'+uri)
                gBrowser.loadOneTab(uri, aReferrerURI, null, postData.value, bg, false);
            }
            break;

        case "search-cur":
        case "link-cur":
            // open in current
        try {
            if (!uri) uri = getShortcutOrURI(aURI, postData);
        } catch (e) {
            uri = aURI;
            // alert(e.name  +   " :  "   +  e.message+aURI+postData);
        }
            loadURI(uri, null, postData.value, true);
            break;

        case "save-link":
            // save links as...
            //var doc = this.onStartEvent.target.ownerDocument;
            var doc = aEvent.target.ownerDocument;
            var ref = makeURI(doc.location.href, doc.characterSet);
            saveURL(aURI, null, null, true, false, ref, doc);
            break;

        case "img-fg":
            // open imgs in new tab and selected it
            bg = false;
        case "img-bg":
            // for Tree Style Tab extension
            if ("TreeStyleTabService" in window && target == "img") try {
                TreeStyleTabService.readyToOpenChildTab(gBrowser.selectedTab);
            } catch (e) {}
            // open imgs in new tab
            gBrowser.loadOneTab(src, null, null, null, bg, false);
            break;


            //* The Original Code is http://www.cnblogs.com/ziyunfei/archive/2011/12/20/2293928.html
        case "img-searchfg":
            //搜索相似图片(Google)
            var searchbyimageUrl=easyDragUtils.getPref("searchbyimageUrl", "");
            var searchuri = searchbyimageUrl + encodeURIComponent(easyDragToGo.onStartEvent.dataTransfer.getData("application/x-moz-file-promise-url"));
            gBrowser.loadOneTab(searchuri, aReferrerURI, null, postData.value, false, false);
            break;

        case "img-searchbg":
            var searchuri = "http://www.google.com/searchbyimage?image_url=" + encodeURIComponent(easyDragToGo.onStartEvent.dataTransfer.getData("application/x-moz-file-promise-url"));
            gBrowser.loadOneTab(searchuri, aReferrerURI, null, postData.value, true, false);
            break;

        case "img-cur":
            // open imgs in current
            loadURI(src, null, null, false);
            break;

        case "save-img":
            // save imgs as...
            var doc = aEvent.target.ownerDocument;
            saveImageURL(src, null, "SaveImageTitle",
                             false, false, doc.documentURIObject, doc);
            break;

        case "save-df-img":
            // direct save imgs to folder
            var doc = aEvent.target.ownerDocument;
            var err = this.saveimg(src, doc, 1);
            if (err) alert("Saving image failed: " + err);
            break;

        case "save-df-img2":
            // direct save imgs to folder
            var doc = aEvent.target.ownerDocument;
            var err = this.saveimg(src, doc, 2);
            if (err) alert("Saving image failed: " + err);
            break;

        case "save-df-img3":
            // direct save imgs to folder
            var doc = aEvent.target.ownerDocument;
            var err = this.saveimg(src, doc, 3);
            if (err) alert("Saving image failed: " + err);
            break;

        case "save-df-img4":
            // direct save imgs to folder
            var doc = aEvent.target.ownerDocument;
            var err = this.saveimg(src, doc, 4);
            if (err) alert("Saving image failed: " + err);
            break;
        default:
            // for custom
            if (/^custom#(.+)/.test(act)) {
                var custom = RegExp.$1;
                if (custom) {
                    var code = easyDragUtils.getPref("custom." + custom, "return");
                    if (code) {
                            this.customCode(code, aURI, src, target, X, Y);
                    }
                }
            }
            // do nothing
            break;
        }
    },

             getsrc:function(){
    return _src;
},


    customCode: function (code, url, src, target, X, Y) {
        var customFn = new Function("target", "url", "src", "X", "Y", code);
        var runcustomjs = Function()
        {
        customFn(target, url, src, X, Y);
        }
         try {
            let context = Components.utils.getGlobalForObject({});
            let aSandbox = new Components.utils.Sandbox(context, {
                sandboxPrototype: context,
                wantXrays: false,
            });
            aSandbox.importFunction(runcustomjs);
        } catch (ex) {
          alert("Easy DragToGo+ Error: \n" + ex );
        }
    },

    getSearchSubmission: function (searchStr, action) {
        try {
            //site search
            if (action.indexOf("-site") != -1) searchStr = "site:" + getTopWin().getBrowser().currentURI.host + " " + searchStr;

            var ss = Components.classes["@mozilla.org/browser/search-service;1"].getService(Components.interfaces.nsIBrowserSearchService);
            var engine, engineName;
            if (/^search-(.+?)-?(fg|bg|cur|site)$/.test(action)) engineName = RegExp.$1;
            else engineName = "c";

            if (engineName == "c") engine = ss.currentEngine || ss.defaultEngine;
            else if (engineName == "d") engine = ss.defaultEngine || ss.currentEngine;
            else {
                engine = ss.getEngineByName(engineName);
                if (!engine) engine = ss.currentEngine || ss.defaultEngine;
            }
            return engine.getSubmission(searchStr, null);
        } catch (e) {
            return null;
        }
    },

    saveimg: function (aSrc, aDoc, dirid) {
        if (!aSrc) return "No Src!";

        if (/^file\:\/\/\//.test(aSrc)) return "Local image, does not need save!";

        var path = easyDragUtils.getDownloadFolder();
        switch (dirid) {
        case 2:
            path = easyDragUtils.getDownloadFolder2();
            break;
        case 3:
            path = easyDragUtils.getDownloadFolder3();
            break;
        case 4:
            path = easyDragUtils.getDownloadFolder4();
            break;
        }

        if (path == "U" || path == "u") {
            path = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties).
            get("DefRt", Components.interfaces.nsIFile).path;
        }

        var fileName = null;
        var fileExt = null;

        try {
            var imageCache = Components.classes["@mozilla.org/image/tools;1"]
                                       .getService(Components.interfaces.imgITools)
                                       .getImgCacheForDocument(aDoc);
            var props = imageCache.findEntryProperties(makeURI(aSrc, getCharsetforSave(null)));

            if (props.has("type")) {
                contentType = props.get("type", Ci.nsISupportsCString).toString();
                var mimeService = Components.classes["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
                fileExt = mimeService.getFromTypeAndExtension(contentType, "").primaryExtension;
            }

            if (props.has("content-disposition")) {
                contentDisposition = props.get("content-disposition", nsISupportsCString);
                mhp = Components.classes["@mozilla.org/network/mime-hdrparam;1"].getService(Ci.nsIMIMEHeaderParam)
                fileName = mhp.getParameter(contentDisposition, "filename", aDoc.characterSet, true, {value: null});
            }
        } catch (e) {
        	console.error(e);
        	console.error(e.description);
        }

        if (!fileName) fileName = aSrc.substr(aSrc.lastIndexOf('/') + 1);
        if (fileName) fileName = fileName.replace(/\?.*/, "").replace(/[\\\/\*\|:"<>]/g, "-");
        if (fileName.indexOf('.') == -1) fileName = fileName + '.' + fileExt;

        if (easyDragUtils.getPref("saveByDatetime", true)) {
            var d = new Date()
            var vMon = d.getMonth() + 1;
            var vMon2 = vMon < 10 ? "0" + vMon : vMon;
            var vDay = d.getDate();
            var vDay2 = vDay < 10 ? "0" + vDay : vDay;
            fileName = d.getFullYear() + "-" + vMon2 + "-" + vDay2 + " " +  decodeURI(fileName);
        }

        if (!fileName) return "No image!";

        var fileSaving = Components.classes["@mozilla.org/file/local;1"].
        createInstance(Components.interfaces.nsILocalFile);
        fileSaving.initWithPath(path);
        if (!fileSaving.exists() || !fileSaving.isDirectory()) return "The download folder does not exist!";
        // create a subdirectory with the domain name of current page
        if (easyDragUtils.getPref("saveDomainName", true)) {
            var domainName = getTopWin().getBrowser().currentURI.host;
            if (domainName) {
                fileSaving.append(domainName);
                if (!fileSaving.exists() || !fileSaving.isDirectory()) {
                    try {
                        fileSaving.create(1, 0755); // 1: DIRECTORY_TYPE
                    } catch (e) {
                        return "Create directory failed!";
                    }
                }
                path = fileSaving.path;
            }
        }
        fileSaving.append(fileName);

        // does not overwrite the original file
        var newFileName = fileName;
        while (fileSaving.exists()) {
            if (newFileName.indexOf('.') != -1) {
                var ext = newFileName.substr(newFileName.lastIndexOf('.'));
                var file = newFileName.substring(0, newFileName.length - ext.length);
                newFileName = this.getAnotherName(file) + ext;
            } else newFileName = this.getAnotherName(newFileName);
            //优化保存的文件名
            //newFileName = decodeURI(newFileName);
            fileSaving.initWithPath(path);
            fileSaving.append(newFileName);
        }

        var cacheKey = Components.classes['@mozilla.org/supports-string;1'].
                       createInstance(Components.interfaces.nsISupportsString);
        cacheKey.data = aSrc;

        var urifix = Components.classes['@mozilla.org/docshell/urifixup;1'].
                     getService(Components.interfaces.nsIURIFixup);
        var uri = urifix.createFixupURI(aSrc, 0);
        var hosturi = null;
        if (uri.host.length > 0) hosturi = urifix.createFixupURI(uri.host, 0);

        var options = {
            source: uri,
            target: fileSaving,
        };
        const {Downloads} = Cu.import("resource://gre/modules/Downloads.jsm", {});
        var downloadPromise = Downloads.createDownload(options)
        downloadPromise.then(function success(d) { d.start(); });

        var tPrefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefBranch);
        var lang = tPrefs.getComplexValue('general.useragent.locale', Ci.nsISupportsString).data;

        var SaveLabel = "The image(" + newFileName + ") has been saved to " + path;
        if (lang.indexOf("CN") != -1) SaveLabel = "图片(" + newFileName + ")已保存到:" + path;

        easyDragToGo.setStatusText(SaveLabel);
        easyDragToGo.clearStatusText(2000);

        return 0;
    },

    // filenameNoExt -> filenameNoExt[1] -> filenameNoExt[2] ...
    getAnotherName: function (fName) {
        if (/\[(\d+)\]$/.test(fName)) {
            var i = 1 + parseInt(RegExp.$1);
            fName = fName.replace(/\[\d+\]$/, "[" + i + "]");
        } else fName += "[1]";
        return fName;
    },

    //* The Original Code is QuickDrag.
    // Wrapper for nsDragAndDrop.js's data retrieval; see nsDragAndDrop.drop
    _getDragData: function (aEvent) {
    		
        var data = "";
        var type = "text/unicode";

        // Gecko 1.9.1 and newer: WHATWG drag-and-drop
        // Try to get text/x-moz-url, if possible
        data = aEvent.dataTransfer.getData("text/x-moz-url");

        if (data.length != 0) type = "text/x-moz-url";
        else data = aEvent.dataTransfer.getData("text/plain");

        return ({
            data: data,
            type: type
        });
    },

    seemAsURL: function (url) {
        // url test
        var DomainName = /(\w+(\-+\w+)*\.)+\w{2,7}/;
        var HasSpace = /\S\s+\S/;
        var KnowNameOrSlash = /^(www|bbs|forum|blog)|\//;
        var KnowTopDomain1 = /\.(com|net|org|gov|edu|info|mobi|mil|asia)$/;
        var KnowTopDomain2 = /\.(de|uk|eu|nl|it|cn|be|us|br|jp|ch|fr|at|se|es|cz|pt|ca|ru|hk|tw|pl|me|tv|cc)$/;
        var IsIpAddress = /^([1-2]?\d?\d\.){3}[1-2]?\d?\d/;
        var seemAsURL = !HasSpace.test(url) && DomainName.test(url) && (KnowNameOrSlash.test(url) || KnowTopDomain1.test(url) || KnowTopDomain2.test(url) || IsIpAddress.test(url));
        return seemAsURL;
    },

    getForceURL: function (url) {
        var code;
        var str = "";
        url = url.replace(/\s|\r|\n|\u3000/g, "");
        for (var i = 0; i < url.length; i++) {
            code = url.charCodeAt(i);
            if (code >= 65281 && code <= 65373) str += String.fromCharCode(code - 65248);
            else str += url.charAt(i);
        }
        str = this.fixupSchemer(str,true);
        str = this.SecurityCheckURL(str);
        return str;
    },

    //* The Original Code is QuickDrag.
    _nodeAcceptsDrops: function (node) {
        if (!node) return (false);

        return ((node.nodeName == "TEXTAREA") || ("mozIsTextField" in node && node.mozIsTextField(false)) || ("isContentEditable" in node && node.isContentEditable) || ("ownerDocument" in node && "designMode" in node.ownerDocument && node.ownerDocument.designMode.toLowerCase() == "on") || (node.hasAttribute("dropzone") && node.getAttribute("dropzone").replace(/^\s+|\s+$/g, "").length));
    },

    SecurityCheckURL: function (aURI) {
        if (/^data:/.test(aURI)) return "";
        if (/^javascript:/.test(aURI)) return aURI;
        var sourceURL = getBrowser().currentURI.spec;
        const nsIScriptSecurityManager = Components.interfaces.nsIScriptSecurityManager;
        var secMan = Components.classes["@mozilla.org/scriptsecuritymanager;1"].getService(nsIScriptSecurityManager);
        const nsIScriptSecMan = Components.interfaces.nsIScriptSecurityManager;
        try {
            secMan.checkLoadURIStr(sourceURL, aURI, nsIScriptSecMan.STANDARD);
        } catch (e) {
            var strlist = /(\.com)|(\.net)|(\.org)|(\.gov.cn)|(\.info)|(\.cn)|(\.cc)|(\.com.cn)|(\.net.cn)|(\.org.cn)|(\.name)|(\.biz)|(\.tv)|(\.la)/ig;
          //  if (strlist.test(aURI)) aURI = "http://" + aURI;
        }

      /*   try {
            secMan.checkLoadURIStr(sourceURL, aURI, nsIScriptSecMan.STANDARD);
        } catch (e) {
           aURI = "";
        } */
        return aURI;
    },

    fixupSchemer: function (aURI,isURL) {
        var RegExpURL = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        if (aURI.match(RegExpURL)) return aURI;

         if (isURL && /^(?::\/\/|\/\/|\/)?(([1-2]?\d?\d\.){3}[1-2]?\d?\d(\/.*)?|[a-z]+[\-\w]+\.[\-\w\.]+(\/.*)?)$/i.test(aURI)) aURI = "http://" + RegExp.$1;
        else if (/^\w+[\-\.\w]*@(\w+(\-+\w+)*\.)+\w{2,7}$/.test(aURI) && !easyDragUtils.getPref("dragtogoEmailSearch", true)) aURI = "mailto:" + aURI;
        else {
            var table = "ttp=>http,tp=>http,p=>http,ttps=>https,tps=>https,ps=>https,s=>https";
            var regexp = new RegExp();
            if (aURI.match(regexp.compile('^(' + table.replace(/=>[^,]+|=>[^,]+$/g, '').replace(/\s*,\s*/g, '|') + '):', 'g'))) {
                var target = RegExp.$1;
                table.match(regexp.compile('(,|^)' + target + '=>([^,]+)'));
                aURI = aURI.replace(target, RegExp.$2);
            }
        }
        return aURI;
    }
};


var easyDragToGoDNDObserver = {

    onDragOver: function (aEvent) {
        // for drag tabs or bookmarks
        if (!easyDragToGo.StartAlready) {

            easyDragToGo.onStartEvent = aEvent;
            easyDragToGo.StartAlready = true;
            easyDragToGo.dragsettimeout();

            //console.info("DragOver First point");
            //console.info(easyDragToGo.onStartEvent.screenX);
            //console.info(easyDragToGo.onStartEvent.screenY);

        }
    },

    onDrop: function (aEvent) {

        if (!easyDragToGo.StartAlready){ 
        	easyDragToGo.clean();
        	return 
       	};
       	
        var relX = aEvent.screenX - easyDragToGo.onStartEvent.screenX;
        var relY = aEvent.screenY - easyDragToGo.onStartEvent.screenY;
        
        // do nothing with drag distance less than 3px
        if (Math.abs(relX) < 3 && Math.abs(relY) < 3) {
        		//console.error("shot distance clean.");
            easyDragToGo.clean();
            return;
        }

        console.error("print types:");
        var types = dt.types;
        
        for(var i = 0; i < types.length; i+=1){
        	console.error(types[i] + ": " + dt.getData(types[i]));	
        }

        console.error(aEvent);

				// Drag and Drop from Content area
        easyDragToGo.onDropEvent = aEvent;
        
        
        var url,textStr;
        var dt = aEvent.dataTransfer;

        textStr = dt.getData("text/plain");

        var str, src;
        var selectStr = "";
        var type = "STRING";
        var target = "link";

        url = str = textStr.replace(/\r\n/g, "\n").replace(/\r/g, "\n");	//2016-10-02 SHP MOD

        console.error("str:" + str);

/*

        var dragData = easyDragToGo._getDragData(aEvent);

        //selected string
        var lines = dragData.data.replace(/^\s+|\s+$/g, "").split(/\s*\n\s*/);
        var selectStr = lines.join(" ");

        console.error("selectStr" + selectStr);

        if (str != selectStr) {

            var idx = str.indexOf("\n");
            if (idx > 0) {
            	 	
                url = str.substr(0, idx);
                str = str.substr(idx + 1);
            }
            
            if (str == selectStr) {
            	  
            		url = str;
            }
            else if (!(/\s|\n/.test(url)) && (/^([a-z]{2,7}:\/\/|mailto:|about:|javascript:)/i.test(url))) {
            		type = "URL";
            }
            else {
            		url = selectStr;
            }
        } else if (dragData.type == "text/x-moz-url"){
        	//2016-10-02 SHP MOD：
        	//加上这段是因为baidu首页的图片通过dataTransfer.getData("text/x-moz-url")拿到的URL居然没有Tile
        	//按官Mozilla方说法应该是有title的https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Recommended_Drag_Types
        	//这导致上面(str != selectStr)相等...，于是乎下面就不当它是图片了，又不知道原作者到底要怎么玩，就强制玩这么一下吧
        	//onDrop 这一大段主要目的应该是判断拖拽是什么类型的对象，若是文本试着转成URL。但不道这段为啥搞这么复杂，能力有限，部分目的无法完全搞懂，在这里吐槽一下下:)
        		type = "URL";
        }
        
*/
        
        

        url = url.replace(/^[\s\n]+|[\s\n]+$/g, '');

				console.info("url:" + url);
				console.info("type:" + type);

        if (url && type == "URL") {

            src = url = easyDragToGo.SecurityCheckURL(url);
            
            var promiseUrl = dt.getData("application/x-moz-file-promise-url");
            var promiseFileName = promiseUrl;
            var dragHtml = dt.getData("text/html");
            
						var parser = new DOMParser();
						var doc = parser.parseFromString(dragHtml, "text/html");
						
						console.error(doc);
						var hasImg = doc.querySelector("img");
						
            console.info(hasImg);

						// 直接简单匹配文件名判断是否为图片，目前在e10s开启的情况下，contentArea拿不到dragstart事件，
						// 不能通过dragstart event.target拿到拖拽源
						// application/x-moz-file-promise-url 是直接拖放到操作系统，自动下载图片时使用的URL，firefox自动赋值
						
            if ( /\.(jp[e]?g|gif|png|bmp)$/gi.test(promiseFileName)) { //改为使用x-moz-file-promise-dest-filename断是否为图片，url在twitter下扩展名会增加东西
								src = promiseUrl;
                target = "img";

            } else if (aEvent.ctrlKey) {
                // as text with ctrlkey
                var aNode = easyDragToGo.onStartEvent.target;
                while (aNode && aNode.nodeName != "A") aNode = aNode.parentNode;
                if (aNode && aNode.textContent) {
                    url = aNode.textContent;
                    target = "text";
                }
            }
        } else if (url) {
            var tmpurl = url;
            if (aEvent.ctrlKey) {
                url = easyDragToGo.getForceURL(url) // force convert to a url
                url = easyDragToGo.SecurityCheckURL(url);
                if (url) target = "link";
                else url = tmpurl;
            } else if (easyDragToGo.seemAsURL(url)) { //seem as a url
                url = easyDragToGo.fixupSchemer(url,true);
                url = easyDragToGo.SecurityCheckURL(url);
                if (!url) { // not a url, search it
                    url = tmpurl;
                    target = "text";
                 }
             } else //it's a text string, so search it
             target = "text";
        }

				url = easyDragToGo.fixupSchemer(url,false);
				url = easyDragToGo.SecurityCheckURL(url);
				
				console.info("url:" + url);
				console.info("src:" + src);
				console.info("target:" + target);
				
				setTimeout(function(){
					easyDragToGo.openURL(aEvent,url, src, target, relX, relY);
				},50);
				
				//easyDragToGo.openURL(aEvent,url, src, target, relX, relY)

				//console.error("Drop clean.");
     		easyDragToGo.clean();
 		}
};

window.addEventListener('load', easyDragToGo.onLoad, false);
