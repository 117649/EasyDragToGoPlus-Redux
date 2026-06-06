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
import { easyDragUtils } from "chrome://easydragtogo/content/utils.mjs";

export class easyDragToGo {

    constructor(frame) {
        this.frame = frame;
        frame.easyDragToGo = this;
        this.sendAsyncMessage = frame.sendAsyncMessage.bind(frame);
        this.loaded = false;
        this.moving = false;
        this.firstOver = true;
        this.StartAlready = false;
        this.onStartEvent = null;
        // drag start event
        this.onDropEvent = null;
        // drag drop event
        this.aDragSession = null;
        // drag session
        this.timeId = null;
        this._statustext = null;
        this.aRelatedToCurrent = null;
        this._listeners = {};
    }

    dragStart(aEvent) {
        this.onStartEvent = aEvent;
        this.StartAlready = true;
        this.dragsettimeout();
    }

    clean() {
        this.StartAlready = false;
        if (this.onDropEvent) {
            this.onDropEvent.preventDefault();
            this.onDropEvent.stopPropagation();
        }
        this.onStartEvent = this.onDropEvent = this.aDragSession = null;
        console.info("cleaned");
    }

    dragsettimeout() {
        var timeout = easyDragUtils.getPref("timeout", 0);
        if (timeout > 0) {
            this.timeId?.cancel();
            this.timeId = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
            this.timeId.initWithCallback(_=>{
                this.clean();
                this.StartAlready = 'TO';
            }, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
        }
    }

    //在TAB打开链接方法
    //X,Y为拖拽方向
    // target 为拖拽类型
    openURL(aEvent, aURI, src, target, X, Y) { 
        this.sendAsyncMessage("easyDragToGo:openURL", {aEvent:'', aURI, src, target, X, Y});
    }

    seemAsURL(url) {
        // url test
        var DomainName = /(\w+(\-+\w+)*\.)+\w{2,7}/;
        var HasSpace = /\S\s+\S/;
        var KnowNameOrSlash = /^(www|bbs|forum|blog)|\//;
        var KnowTopDomain1 = /\.(com|net|org|gov|edu|info|mobi|mil|asia)$/;
        var KnowTopDomain2 = /\.(de|uk|eu|nl|it|cn|be|us|br|jp|ch|fr|at|se|es|cz|pt|ca|ru|hk|tw|pl|me|tv|cc)$/;
        var IsIpAddress = /^([1-2]?\d?\d\.){3}[1-2]?\d?\d/;
        var seemAsURL = !HasSpace.test(url) && DomainName.test(url) && (KnowNameOrSlash.test(url) || KnowTopDomain1.test(url) || KnowTopDomain2.test(url) || IsIpAddress.test(url));
        return seemAsURL;
    }

    getForceURL(url) {
        var code;
        var str = "";
        url = url.replace(/\s|\r|\n|\u3000/g, "");
        for (var i = 0; i < url.length; i++) {
            code = url.charCodeAt(i);
            if (code >= 65281 && code <= 65373) str += String.fromCharCode(code - 65248);
            else str += url.charAt(i);
        }
        str = this.fixupSchemer(str, true);
        str = this.SecurityCheckURL(str);
        return str;
    }

    //* The Original Code is QuickDrag.
    _nodeAcceptsDrops(node) {
        //console.error(node);

        if (!node) { return false };

        return ((node.nodeName == "TEXTAREA")
            || ("mozIsTextField" in node && node.mozIsTextField(false))
            || ("isContentEditable" in node && node.isContentEditable)
            || ("ownerDocument" in node && "designMode" in node.ownerDocument && node.ownerDocument.designMode.toLowerCase() == "on")
            || (node.hasAttribute("dropzone") && node.getAttribute("dropzone").replace(/^\s+|\s+$/g, "").length)
        );
    }

    SecurityCheckURL(aURI) {
        if (/^data:/.test(aURI)) return "";
        if (/^javascript:/.test(aURI)) return aURI;
        var sourceURL = this.frame.content.location.href;
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
    }

    fixupSchemer(aURI, isURL) {
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

    printDataTransferTypes(ev) {
        var dt = ev.dataTransfer;

        console.info("print dataTransfer type:");
        var types = dt.types;
        for (var i = 0; i < types.length; i += 1) {
            console.info(types[i] + ": " + dt.getData(types[i]));
        }
    }

    onLoad() {
        const contentArea = this.frame;
        if (!this.loaded) {
            if (!contentArea) console.info('EasyDragToGo+ failed to initialize!');

            if (contentArea) {

                contentArea.addEventListener('dragstart', this._listeners.dragstart = (e) => {
                    this.printDataTransferTypes(e);
                    if (e.target.nodeName == "A") {
                        var selectLinkText = this.frame.content.document.getSelection().toString();
                        if (selectLinkText != "" && e.explicitOriginalTarget == this.frame.content.document.getSelection().focusNode) {
                            e.dataTransfer.setData("text/plain", selectLinkText);
                            e.dataTransfer.clearData("text/x-moz-url");
                            e.dataTransfer.clearData("text/x-moz-url-desc");
                            e.dataTransfer.clearData("text/x-moz-url-data");
                            e.dataTransfer.clearData("text/uri-list");
                        }
                    }
                    this.dragStart(e);
                }, true, true); // 开启e10s后只有在Capture phase 才能触发该块,但完全没用，target不准，永远是browser，e10s下该块基本无用

                contentArea.addEventListener('dragover', this._listeners.dragover = (e) => {

                    if (this._nodeAcceptsDrops(e.target)) {	//开启e10s后target永远是browser无法正确判断
                        console.info("dragover accpet drop clean.");
                        this.clean();
                        return;
                    }

                    var textStr = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/x-moz-url");
                    if (textStr) {
                        e.preventDefault();	 //2016-10-02 SHP MOD
                        this.moving = true;
                        this.onDragOver(e)	//2016-10-02 SHP MOD
                        this.moving = false;
                    }

                }, false, true);

                contentArea.addEventListener('dragend', this._listeners.dragend = (e) => {
                    this.clean();
                }, true, true);

                contentArea.addEventListener('drop', this._listeners.drop = (e) => {
                    if (this._nodeAcceptsDrops(e.target)) {
                        //console.info("drop accpet drop clean.");
                        this.clean();
                        return;
                    }

                    this.onDrop(e)	//2016-10-02 SHP MOD

                }, false, true);

                contentArea.addEventListener('keyup', this._listeners.keyup = (e) => {

                    if (e.keyCode == 27) {
                        console.info("escaped!");
                        this.clean();
                    }
                }, false);

                this.onShut = () => {
                    contentArea.removeEventListener('dragstart', this._listeners.dragstart, true);
                    contentArea.removeEventListener('dragover', this._listeners.dragover, false);
                    contentArea.removeEventListener('dragend', this._listeners.dragend, true);
                    contentArea.removeEventListener('drop', this._listeners.drop, false);
                    contentArea.removeEventListener('keyup', this._listeners.keyup, false);
                    this.loaded = false;
                }
            }
            this.loaded = true;
        }
    }

    onDragOver(aEvent) {
        // for drag tabs or bookmarks
        if (!this.StartAlready) {

            this.onStartEvent = aEvent;
            this.StartAlready = true;
            this.dragsettimeout();

            //console.info("DragOver First point");
            //console.info(this.onStartEvent.screenX);
            //console.info(this.onStartEvent.screenY);

        }
    }

    onDrop(aEvent) {

        if (!this.StartAlready || this.StartAlready == 'TO') {
            this.clean();
            return
        };

        var relX = aEvent.x - this.onStartEvent.x;
        var relY = aEvent.y - this.onStartEvent.y;

        // do nothing with drag distance less than 3px
        if (Math.abs(relX) < 3 && Math.abs(relY) < 3) {
            //console.error("shot distance clean.");
            this.clean();
            return;
        }
        // Drag and Drop from Content area
        this.onDropEvent = aEvent;

        var dt = aEvent.dataTransfer;

        console.info("drop types print:");
        var types = dt.types;

        for (var i = 0; i < types.length; i += 1) {
            console.info(types[i] + ": " + dt.getData(types[i]));
        }

        var textStr = dt.getData("text/plain");
        console.info("");
        console.info("textStr: " + textStr);

        if (!textStr) {
            textStr = dt.getData("text/x-moz-url");
            textStr = textStr.split(/(\r\n|\n)/)[0];
            console.info("textStrReplace: " + textStr);
        }

        var type = "STRING";	//拖拽内容类型:STRING,URL
        var target = "link";  //动作类型,text,link,img

        var url = textStr.replace(/\r\n/g, "\n").replace(/\r/g, "\n");	//2016-10-02 SHP MOD
        url = url.replace(/^[\s\n]+|[\s\n]+$/g, '');

        //console.error("url:" + url);

        if (!(/\s|\n/.test(url)) && (/^([a-z]{2,7}:\/\/|mailto:|about:|javascript:)/i.test(url))) {
            type = "URL";
        }// else STRING

        //console.error("type:" + type);

        var src; //资源地址
        if (url && type == "URL") {

            src = url = this.SecurityCheckURL(url);

            var promiseUrl = dt.getData("application/x-moz-file-promise-url");
            var dragHtml = dt.getData("text/html");

            var parser = new DOMParser();
            var doc = parser.parseFromString(dragHtml, "text/html");

            //console.error(doc);
            var hasImg = doc.getRootNode().body?.firstElementChild?.tagName == "IMG";

            if (hasImg) {
                src = promiseUrl;
                target = "img";

            } else if (aEvent.ctrlKey) {
                // as text with ctrlkey
                var aNode = this.onStartEvent.target;
                while (aNode && aNode.nodeName != "A") aNode = aNode.parentNode;
                if (aNode && aNode.textContent) {
                    url = aNode.textContent;
                    target = "text";
                }
            }
        } else if (url) {
            var tmpurl = url;
            if (aEvent.ctrlKey) {
                url = this.getForceURL(url) // force convert to a url
                url = this.SecurityCheckURL(url);
                if (url) target = "link";
                else url = tmpurl;
            } else if (this.seemAsURL(url)) { //seem as a url
                url = this.fixupSchemer(url, true);
                url = this.SecurityCheckURL(url);
                if (!url) { // not a url, search it
                    url = tmpurl;
                    target = "text";
                }
            } else //it's a text string, so search it
                target = "text";
        }

        url = this.fixupSchemer(url, false);
        url = this.SecurityCheckURL(url);

        console.info("");
        console.info("url: " + url);
        console.info("src: " + src);
        console.info("target: " + target);

        this.openURL(aEvent, url, src, target, relX, relY);

        //console.error("Drop clean.");
        this.clean();
    }
};