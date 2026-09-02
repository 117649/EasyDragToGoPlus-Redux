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

this.easyDragToGo = {

    _statusTextField: window.StatusPanel,
    _clearStatusTimer: null,

    //* The Original Code is FireGestures.
    setStatusText: function (aText) {
        easyDragToGo._statusTextField._label = aText;
    },
    //* The Original Code is FireGestures.
    clearStatusText: function (aMillisec) {
        if (easyDragToGo._clearStatusTimer) {
            window.clearTimeout(easyDragToGo._clearStatusTimer);
            easyDragToGo._clearStatusTimer = null;
        }
        var text = easyDragToGo._statusTextField._label;
        var callback = function (self) {
            self._clearStatusTimer = null;
            if (self._statusTextField._label == text)
                self.setStatusText("");
        };
        easyDragToGo._clearStatusTimer = window.setTimeout(callback, aMillisec, this);
    },

    getSaveContext: function (browsingContextId, referrerInfo) {
        var windowGlobal = BrowsingContext.get(browsingContextId)?.currentWindowGlobal ?? gBrowser.selectedBrowser.browsingContext.currentWindowGlobal;
        return {
            cookieJarSettings: windowGlobal.cookieJarSettings,
            isPrivate: PrivateBrowsingUtils.isBrowserPrivate(windowGlobal.browsingContext.top.embedderElement ?? gBrowser.selectedBrowser),
            principal: windowGlobal.documentPrincipal,
            referrerInfo: ChromeUtils.importESModule("resource://gre/modules/E10SUtils.sys.mjs").E10SUtils.deserializeReferrerInfo(referrerInfo),
        };
    },

    //在TAB打开链接方法
    //X,Y为拖拽方向
    // target 为拖拽类型
    openURL: function ({ aURI, src, target, X, Y, sourceURL, sourceNodeLocalName, contentType, contentDisposition,
        referrerInfo, browsingContextId }, doc) {
        if (!aURI) return;
        var aRelatedToCurrent = easyDragUtils.getPref("FirefoxTabOpen", true) || null;

        var act = target.indexOf("fromContentOuter") == -1 ?
            easyDragUtils.getGestureAction(target, X, Y) : easyDragUtils.getPref(target, "link-fg");

        if (!act) return;
        var browser = URILoadingHelper.getTargetWindow(window).gBrowser;
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
                gBrowser.finder.highlight(true, aURI);
                gLazyFindCommand('onFindCommand').then(() => {
                    gFindBar._findField.value = aURI;
                    gFindBar._find();
                });
                return;

            //save text
            case "search-savetext":
                saveURL("data:text/plain," + "From URL:" + encodeURIComponent(gBrowser.currentURI.spec + "\r\n\r\n" + aURI), null,
                    gBrowser.selectedTab.label + ".txt", null, true, true, undefined, undefined, document);

                return;

            //* The Original Code is http://www.cnblogs.com/ziyunfei/archive/2011/12/20/2293928.html
            //search-list
            case "search-list":
                try {
                    const search_container = document.getElementById("search-container");
                    if (search_container) {
                        const searchbar_new = document.getElementById("searchbar-new");
                        const searchbar = document.getElementById("searchbar");
                        if (window.getComputedStyle(searchbar_new).display !== "none") {
                            searchbar_new.value = aURI;
                            searchbar_new.searchModeShortcut();
                        } else {
                            searchbar.inputField.value = aURI;
                            searchbar.openSuggestionsPanel(true);
                            searchbar.inputField.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                            setTimeout(_ => { if (searchbar.inputField.focused) searchbar.inputField.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); }, 600);
                        }
                    } else {
                        gURLBar.value = aURI;
                        gURLBar.searchModeShortcut();
                    }
                } catch (e) {
                    alert("Easy DragToGo+ error :  Search In Search/Urlbar. \n\n" + e.name + " :  " + e.message);
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
                } catch (e) { }

                if (cur)
                    // open in current tab
                    loadURI(uri, null, postData.value, true, gBrowser.contentPrincipal.originAttributes.userContextId);
                else {
                    // for Tree Style Tab extension
                    if ("TreeStyleTabService" in window && (target == "link" && !sourceNodeLocalName || target == "img")) try {
                        TreeStyleTabService.readyToOpenChildTab(gBrowser.selectedTab);
                    } catch (e) { }

                    //alert('uri:'+uri)
                    gBrowser.addTab(uri, { relatedToCurrent: aRelatedToCurrent, triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal({}), postData: postData.value, inBackground: bg, allowThirdPartyFixup: false, userContextId: gBrowser.contentPrincipal.originAttributes.userContextId });
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
                loadURI(uri, null, postData.value, true, gBrowser.contentPrincipal.originAttributes.userContextId, null, null, null, gBrowser.selectedBrowser.contentPrincipal);
                break;

            case "save-link":
                // save links as...
                var saveContext = this.getSaveContext(browsingContextId, referrerInfo);
                urlSecurityCheck(aURI, saveContext.principal, Ci.nsIScriptSecurityManager.DISALLOW_SCRIPT);
                saveURL(aURI, null, null, null, true, false, saveContext.referrerInfo, saveContext.cookieJarSettings, doc,
                    saveContext.isPrivate, saveContext.principal);
                break;

            case "img-fg":
                // open imgs in new tab and selected it
                bg = false;
            case "img-bg":
                // for Tree Style Tab extension
                if ("TreeStyleTabService" in window && target == "img") try {
                    TreeStyleTabService.readyToOpenChildTab(gBrowser.selectedTab);
                } catch (e) { }
                // open imgs in new tab
                gBrowser.addTab(src, { triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal({}), inBackground: bg, allowThirdPartyFixup: false, userContextId: gBrowser.contentPrincipal.originAttributes.userContextId });
                break;


            //* The Original Code is http://www.cnblogs.com/ziyunfei/archive/2011/12/20/2293928.html
            case "img-searchfg":
                //搜索相似图片(Google)
                var searchbyimageUrl = easyDragUtils.getPref("searchbyimageUrl", "");
                var searchuri = searchbyimageUrl + encodeURIComponent(src);
                gBrowser.addTab(searchuri, { relatedToCurrent: aRelatedToCurrent, triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal({}), postData: postData.value, inBackground: false, allowThirdPartyFixup: false, userContextId: gBrowser.contentPrincipal.originAttributes.userContextId });
                break;

            case "img-searchbg":
                var searchuri = easyDragUtils.getPref("searchbyimageUrl", "") + encodeURIComponent(src);
                gBrowser.addTab(searchuri, { relatedToCurrent: aRelatedToCurrent,
                    triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal({}), postData: postData.value, inBackground: true,
                    allowThirdPartyFixup: false, userContextId: gBrowser.contentPrincipal.originAttributes.userContextId });
                break;

            case "img-cur":
                // open imgs in current
                loadURI(src, null, null, false, gBrowser.contentPrincipal.originAttributes.userContextId);
                break;

            case "save-img":
                // save imgs as...
                var saveContext = this.getSaveContext(browsingContextId, referrerInfo);
                urlSecurityCheck(src, saveContext.principal, Ci.nsIScriptSecurityManager.DISALLOW_SCRIPT);
                internalSave(src, null, null, null, contentDisposition, contentType, false, "SaveImageTitle", null, saveContext.referrerInfo,
                    saveContext.cookieJarSettings, null, false, null, saveContext.isPrivate, saveContext.principal);
                break;

            case "save-df-img":
            case "save-df-img2":
            case "save-df-img3":
            case "save-df-img4":
                // direct save imgs to folder
                var saveContext = this.getSaveContext(browsingContextId, referrerInfo);
                urlSecurityCheck(src, saveContext.principal, Ci.nsIScriptSecurityManager.DISALLOW_SCRIPT);
                this.saveimg(src, doc, act == "save-df-img" ? 1 : Number(act.slice(-1)), sourceURL, {
                    contentDisposition,
                    contentType,
                    cookieJarSettings: saveContext.cookieJarSettings,
                    isPrivate: saveContext.isPrivate,
                    loadingPrincipal: saveContext.principal,
                    referrerInfo: saveContext.referrerInfo,
                    url: src,
                    userContextId: saveContext.principal.originAttributes.userContextId,
                }).then(err => { if (err) alert("Saving image failed: " + err); }, err => alert("Saving image failed: " + err));
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

    customCode: function (code, url, src, target, X, Y) {
        try { new Function("target", "url", "src", "X", "Y", code)(target, url, src, X, Y); } catch (ex) { alert("Easy DragToGo+ Error: \n" + ex); }
    },

    getSearchSubmission: function (searchStr, action) {
        try {
            //site search
            if (action.indexOf("-site") != -1) searchStr = "site:" + URILoadingHelper.getTargetWindow(window).gBrowser.currentURI.host + " " + searchStr;

            const searchbar_new = document.getElementById("searchbar-new");
            var ss = this.SearchService;
            var engine, engineName;
            if (/^search-(.+?)-?(fg|bg|cur|site)$/.test(action)) engineName = RegExp.$1;
            else engineName = "c";

            let d = PrivateBrowsingUtils.isBrowserPrivate(gBrowser.selectedTab.linkedBrowser) ? ss.defaultPrivateEngine : ss.defaultEngine;
            let c = (searchbar_new && window.getComputedStyle(searchbar_new).display !== "none" && ss.getEngineByName(searchbar_new.searchMode?.engineName) || ss.getEngineByName(gURLBar.searchMode?.engineName)) ?? d;
            if (engineName == "c") engine = c ?? d;
            else if (engineName == "d") engine = d ?? c;
            else {
                engine = ss.getEngineByName(engineName);
                if (!engine) engine = c ?? d;
            }
            return engine.getSubmission(searchStr, null);
        } catch (e) {
            return null;
        }
    },

    saveimg: async function (aSrc, aDoc, dirid, sourceURL, source) {
        if (!aSrc) return "No Src!";

        if (/^file\:\/\/\//.test(aSrc)) return "Local image, does not need save!";

        var path = easyDragUtils.getDownloadFolder(dirid);

        if (path == "U" || path == "u") {
            path = Components.classes["@mozilla.org/file/directory_service;1"].
                getService(Components.interfaces.nsIProperties).
                get("DefRt", Components.interfaces.nsIFile).path;
        }

        var fileName = null;
        var fileExt = null;
        var { contentDisposition, contentType } = source;

        try {
            if (contentType) fileExt = Components.classes["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService)
                .getFromTypeAndExtension(contentType, "").primaryExtension;
            if (contentDisposition) fileName = Components.classes["@mozilla.org/network/mime-hdrparam;1"]
                .getService(Ci.nsIMIMEHeaderParam).getParameter(contentDisposition, "filename", aDoc.characterSet, true, { value: null });
        } catch (e) { }

        if (!fileName) fileName = aSrc.substr(aSrc.lastIndexOf('/') + 1);
        if (fileName) fileName = fileName.replace(/\?.*/, "").replace(/[\\\/\*\|:"<>]/g, "-");
        if (fileName.indexOf('.') == -1 && fileExt) fileName = fileName + '.' + fileExt;

        if (easyDragUtils.getPref("saveByDatetime", true)) {
            var d = new Date()
            var vMon = d.getMonth() + 1;
            var vMon2 = vMon < 10 ? "0" + vMon : vMon;
            var vDay = d.getDate();
            var vDay2 = vDay < 10 ? "0" + vDay : vDay;
            fileName = d.getFullYear() + "-" + vMon2 + "-" + vDay2 + " " + decodeURI(fileName);
        }

        if (!fileName) return "No image!";

        var fileSaving = Components.classes["@mozilla.org/file/local;1"].
            createInstance(Components.interfaces.nsIFile);
        try {
            fileSaving.initWithPath(path);
            if (!fileSaving.exists() || !fileSaving.isDirectory()) return "The download folder does not exist!";
        } catch (e) {
            return "Invalid download path";
        }
        // create a subdirectory with the domain name of current page
        if (easyDragUtils.getPref("saveDomainName", true)) {
            var domainName = makeURI(sourceURL).host;
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

        const { Downloads } = ChromeUtils.importESModule("resource://gre/modules/Downloads.sys.mjs", {});
        try { await (await Downloads.createDownload({ source, target: fileSaving })).start(); } catch (e) { return e.message || String(e); }

        var lang = document.documentElement.lang;

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
    }
};
ChromeUtils.defineESModuleGetters(this.easyDragToGo, {
    SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
});
