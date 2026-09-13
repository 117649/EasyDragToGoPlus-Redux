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
const { QRDrag } = ChromeUtils.importESModule(import.meta.url.replace("easydragtogo.mjs", "qrDrag.mjs"));

export class easyDragToGo {

    constructor(frame, utils) {
        this.frame = frame;
        this.utils = utils;
        frame.easyDragToGo = this;
        this.StartAlready = false;
        this.onStartEvent = null;
        // drag start event
        this.onDropEvent = null;
        // drag drop event
        this.timeId = null;
        this.qr = new QRDrag();
        this.qrType = null;
    }

    dragStart(aEvent) {
        this.onStartEvent = aEvent;
        this.StartAlready = true;
        this.dragsettimeout();
    }

    clean() {
        this.qr.clear();
        this.qrType = null;
        this.timeId?.cancel();
        this.timeId = null;
        this.StartAlready = false;
        if (this.onDropEvent) {
            this.onDropEvent.preventDefault();
            this.onDropEvent.stopPropagation();
        }
        this.onStartEvent = this.onDropEvent = null;
    }

    dragsettimeout() {
        var timeout = this.utils.getPref("timeout", 0);
        if (timeout > 0) {
            this.timeId?.cancel();
            this.timeId = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
            this.timeId.initWithCallback(_=>{
                this.clean();
                this.StartAlready = 'TO';
            }, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
        }
    }

    seemAsURL(url) {
        if (/\s/.test(url)) return false;
        try { return /[.:]|^localhost$/i.test(Services.io.newURI("http://" + url).host); } catch (e) { return false; }
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
        if (/^data:/i.test(aURI)) return "";
        try {
            Components.classes["@mozilla.org/scriptsecuritymanager;1"].getService(Components.interfaces.nsIScriptSecurityManager)
                .checkLoadURIStrWithPrincipal(
                this.frame.content.document.nodePrincipal, aURI, Components.interfaces.nsIScriptSecurityManager.STANDARD);
        } catch (e) { return ""; }
        return aURI;
    }

    fixupSchemer(aURI, isURL) {
        var RegExpURL = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        if (aURI.match(RegExpURL)) return aURI;

        if (isURL) try { aURI = Services.io.newURI("http://" + aURI.replace(/^(?::\/\/|\/\/|\/)/, "")).spec; } catch (e) { }
        else if (/^\w+[\-\.\w]*@(\w+(\-+\w+)*\.)+\w{2,7}$/.test(aURI) && !this.utils.getPref("dragtogoEmailSearch", true)) aURI = "mailto:" + aURI;
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

    onLoad() {
        this.frame.addEventListener('mousedown', this, true, true);
        this.frame.addEventListener('mouseup', this, true, true);
        this.frame.addEventListener('pagehide', this, true);
        this.frame.addEventListener('dragstart', this, true, true);
        this.frame.addEventListener('dragover', this, false, true);
        this.frame.addEventListener('dragend', this, true, true);
        this.frame.addEventListener('drop', this, false, true);
        this.frame.addEventListener('keyup', this, false);
    }

    onShut() {
        this.qr.clear();
        this.frame.removeEventListener('mousedown', this, true);
        this.frame.removeEventListener('mouseup', this, true);
        this.frame.removeEventListener('pagehide', this, true);
        this.frame.removeEventListener('dragstart', this, true);
        this.frame.removeEventListener('dragover', this, false);
        this.frame.removeEventListener('dragend', this, true);
        this.frame.removeEventListener('drop', this, false);
        this.frame.removeEventListener('keyup', this, false);
    }

    handleEvent(e) {
        switch (e.type) {
            case 'mousedown':
                this.qr.prepare(e);
                break;
            case 'mouseup':
            case 'pagehide':
                this.qr.clear();
                break;
            case 'dragstart': {
                this.qrType = null;
                const decoded = this.qr.take(e);
                if (decoded) {
                    let link = decoded.trim();
                    // Treat executable and application-specific QR payloads as text.
                    if (/\s/.test(link)) link = "";
                    else if (/^(https?|ftp|mailto):/i.test(link)) link = this.SecurityCheckURL(link);
                    else if (!/^[\w+.-]+:/.test(link) && this.seemAsURL(link)) link = this.SecurityCheckURL(this.fixupSchemer(link, true));
                    else link = "";
                    e.dataTransfer.clearData();
                    e.dataTransfer.setData("text/plain", decoded);
                    if (link) {
                        e.dataTransfer.setData("text/uri-list", link);
                        e.dataTransfer.setData("text/x-moz-url", link + "\n" + decoded);
                    }
                    this.qrType = link ? "link" : "text";
                }
                if (e.target.nodeName == "A") {
                    var selection = this.frame.content.document.getSelection();
                    var selectLinkText = selection.toString();
                    if (selectLinkText != "" && e.explicitOriginalTarget == selection.focusNode) {
                        e.dataTransfer.setData("text/plain", selectLinkText);
                        e.dataTransfer.clearData("text/x-moz-url");
                        e.dataTransfer.clearData("text/x-moz-url-desc");
                        e.dataTransfer.clearData("text/x-moz-url-data");
                        e.dataTransfer.clearData("text/uri-list");
                    }
                }
                this.dragStart(e);
                break;
            }
            case 'dragover':
                if (this._nodeAcceptsDrops(e.target)) {
                    this.clean();
                    return;
                }
                if (e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/x-moz-url")) {
                    e.preventDefault();
                    this.onDragOver(e);
                }
                break;
            case 'dragend':
                this.clean();
                break;
            case 'drop':
                if (this._nodeAcceptsDrops(e.target)) this.clean();
                else this.onDrop(e);
                break;
            case 'keyup':
                if (e.keyCode == 27) this.clean();
        }
    }

    onDragOver(aEvent) {
        // for drag tabs or bookmarks
        if (!this.StartAlready) this.dragStart(aEvent);
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
        var dt = aEvent.dataTransfer;

        var textStr = dt.getData("text/plain");

        if (!textStr) {
            textStr = dt.getData("text/x-moz-url");
            textStr = textStr.split(/(\r\n|\n)/)[0];
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

        var src, contentType, contentDisposition, referrerInfo; //资源地址
        var sourceNode = this.onStartEvent.type == "dragover" ? null : this.onStartEvent.target;
        if (this.qrType) {
            target = this.qrType;
            url = target == "link" ? this.SecurityCheckURL(dt.getData("text/uri-list")) : textStr;
            if (target == "link") src = url;
        } else if (url && type == "URL") {

            src = url = this.SecurityCheckURL(url);

            var promiseUrl = dt.getData("application/x-moz-file-promise-url");
            var dragHtml = dt.getData("text/html");
            var hasImg = dragHtml && new DOMParser().parseFromString(dragHtml, "text/html").getRootNode().body?.firstElementChild?.tagName == "IMG";

            if (hasImg) {
                src = promiseUrl || url;
                target = "img";
                if (sourceNode?.currentURI) try {
                    var props = Components.classes["@mozilla.org/image/tools;1"].getService(Components.interfaces.imgITools)
                        .getImgCacheForDocument(sourceNode.ownerDocument).findEntryProperties(sourceNode.currentURI, sourceNode.ownerDocument);
                    try { contentType = props.get("type", Components.interfaces.nsISupportsCString).data; } catch (e) { }
                    try { contentDisposition = props.get("content-disposition", Components.interfaces.nsISupportsCString).data; } catch (e) { }
                } catch (e) { }

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

        if (target != "text") url = this.SecurityCheckURL(this.fixupSchemer(url, false));

        if (sourceNode) try {
            var referrer = Components.classes["@mozilla.org/referrer-info;1"].createInstance(Components.interfaces.nsIReferrerInfo);
            referrer.initWithElement(sourceNode);
            referrerInfo = ChromeUtils.importESModule("resource://gre/modules/E10SUtils.sys.mjs").E10SUtils.serializeReferrerInfo(referrer);
        } catch (e) { }

        if (this.onStartEvent.type == "dragover") {
            target = "fromContentOuter." + (target == "text" ? "text" : "link");
            if (this.utils.getPref(target, "") == "do-nothing") {
                this.clean();
                return;
            }
        }

        this.onDropEvent = aEvent;

        this.frame.sendAsyncMessage("easyDragToGo:openURL", {
            aURI: url,
            src,
            target,
            X: relX,
            Y: relY,
            sourceURL: this.frame.content.location.href,
            sourceNodeLocalName: this.onStartEvent.target.localName,
            contentType,
            contentDisposition,
            referrerInfo,
            browsingContextId: this.frame.docShell.browsingContext.id,
        });

        //console.error("Drop clean.");
        this.clean();
    }
};
