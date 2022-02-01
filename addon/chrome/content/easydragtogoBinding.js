/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// This is loaded into all XUL windows. Wrap in a block to prevent
// leaking to window scope.
{

  class MozGMenuFunc extends MozXULElement {
    constructor() {
      super();

      this.addEventListener("command", (event) => {
        this._selectedItem = this.childNodes[0].selectedItem.value;
      });

    }

    initialize() {
      var pref = Components.classes['@mozilla.org/preferences-service;1'].
        getService(Components.interfaces.nsIPrefService).getBranch("extensions.easydragtogo.custom.");
      var prefNames = pref.getChildList("", {});
      if (prefNames[0] || prefNames.length > 1) {
        var popup = this.childNodes[0].childNodes[0];
        var m = popup.appendChild(document.createXULElement("separator"));
        m.setAttribute("class", "groove");
      }
      for (var aPref of prefNames) {
        if (aPref) {
          m = popup.appendChild(popup.childNodes[0].cloneNode(true));
          m.setAttribute("value", "custom#" + aPref);
          m.setAttribute("label", "Custom: " + aPref);
        }
      }

      var mItems = this.childNodes[0].childNodes[0].childNodes;
      var sItems = [];
      for (var mItem of mItems) {
        var mValue = mItem.value;
        if (mValue) {
          if (mValue.indexOf("custom#") >= 0) mItem.hidden = false;
          else if (mValue.indexOf("link") >= 0) mItem.hidden = this._Type == "text";
          else if (mValue.indexOf("search-") >= 0) mItem.hidden = !(this._Type == "text");
          else if (mValue.indexOf("img") >= 0) mItem.hidden = !(this._Type == "image");
          sItems.push(!mItem.hidden);
        } else {
          for (var sItem of sItems) {
            if (sItem) {
              mItem.hidden = false;
              break;
            }
            mItem.hidden = true;
          }
          sItems = [];
        }
      }

    }

    get _Type() {
      return this.getAttribute('_Type');
    }

    set _disabled(val) {
      this.childNodes[0].disabled = val;
      this.childNodes[1].childNodes[1].disabled = val;
    }

    get _disabled() {
      return this.childNodes[0].disabled;
    }

    set _engine(val) {
      var menu = this.childNodes[1].childNodes[1];
      menu.value = val;
      try {
        if ((val == "d") && menu.getAttribute("label").indexOf("[") == -1) {
          var ss = Components.classes["@mozilla.org/browser/search-service;1"].
          getService(Components.interfaces.nsISearchService);
          if (val == "d" && ss.defaultEngine)
            menu.setAttribute("label", menu.getAttribute("label") + "[" + ss.defaultEngine.name + "]");
        } else if (val != "d")
          menu.setAttribute("label", val);
      } catch (e) {}
    }

    get _engine() {
      return this.childNodes[1].childNodes[1].value;
    }

    set _engineHidden(val) {
      this.childNodes[1].hidden = val;
    }

    get _engineHidden() {
      return this.childNodes[1].hidden;
    }

    set _selectedItem(val) {
      if (val.indexOf("search-") == 0 && val.indexOf("-find") == -1 && val.indexOf("savetext") && val.indexOf("search-list") == -1 && val.indexOf("copyToClipboard") == -1)
        this._engineHidden = false;
      else
        this._engineHidden = true;
      this.childNodes[0].value = val;
      if (this._Type == "image")
        easyDragSettings.updateImgFloderStatus();
    }

    get _selectedItem() {
      return this.childNodes[0].selectedItem.value;
    }
  }

  class MozGMenuList extends MozGMenuFunc {
    connectedCallback() {
      if (this.delayConnectedCallback()) {
        return;
      }
      this.textContent = "";
      this.appendChild(MozXULElement.parseXULToFragment(`
        <menulist class="easydragtogo-Menu" minwidth="&gesture.menuSearch.width;">
          <menupopup maxheight="250px">
            <menuitem value="link-fg" label="&settings.link-fg;"/>
            <menuitem value="link-bg" label="&settings.link-bg;"/>
            <menuitem value="link-cur" label="&settings.link-cur;"/>
            <menuitem value="save-link" label="&settings.save-link;"/>
            <menuitem value="search-fg" label="&settings.search-fg;"/>
            <menuitem value="search-bg" label="&settings.search-bg;"/>
            <menuitem value="search-cur" label="&settings.search-cur;"/>
            <menuitem value="search-find" label="&settings.search-find;"/>
            <menuitem value="search-site" label="&settings.search-site;"/>
            <menuitem value="search-list" label="&settings.search-list;"/>
            <menuitem value="search-savetext" label="&settings.search-savetext;"/>
            <menuitem value="search-copyToClipboard" label="&settings.search-copyToClipboard;"/>
            <separator class="groove"/>
            <menuitem value="img-fg" label="&settings.img-fg;"/>
            <menuitem value="img-bg" label="&settings.img-bg;"/>
            <menuitem value="img-cur" label="&settings.img-cur;"/>
            <menuitem value="img-searchfg" label="&settings.img-searchfg;"/>
            <menuitem value="img-searchbg" label="&settings.img-searchbg;"/>
            <menuitem value="save-img" label="&settings.save-img;"/>
            <menuitem value="save-df-img" label="&settings.save-df-img;"/>
            <menuitem value="save-df-img2" label="&settings.save-df-img2;"/>
            <menuitem value="save-df-img3" label="&settings.save-df-img3;"/>
            <menuitem value="save-df-img4" label="&settings.save-df-img4;"/>
            <separator class="groove"/>
            <menuitem value="do-nothing" label="&settings.do-nothing;"/>
          </menupopup>
        </menulist>
        <hbox class="easydragtogo-Menu">
          <label value="&settings.search-engine;"/>
          <menulist class="easydragtogo-Menu" minwidth="&gesture.menuEngine.width;">
            <menupopup maxheight="250px" defaultenginelabel="&settings.engine-default;" onpopupshowing="easyDragSettings.createEnginesList(this);">
              <menuitem value="d" label="&settings.engine-default;"/>
              <separator class="groove"/>
            </menupopup>
          </menulist>
        </hbox>
      `, ["chrome://easydragtogo/locale/easydragtogoConfig.dtd"]));

      this.querySelector("menuitem[value=do-nothing]").previousSibling.value??='img';
      this.initialize();
    }
  }

  class MozEasydragtogo_Direction extends MozXULElement {
    constructor() {
      super();

      this.addEventListener("command", (event) => {
        this.getDirection();
      });

    }

    connectedCallback() {
      if (this.delayConnectedCallback()) {
        return;
      }
      this.textContent = "";
      this.appendChild(MozXULElement.parseXULToFragment(`
      <radiogroup class="easydragtogo-Menu">
        <hbox class="easydragtogo-Menu">
          <radio class="direc-four"></radio>
          <radio class="direc-ud"></radio>
          <radio class="direc-rl"></radio>
          <radio class="direc-any"></radio>
          <radio class="direc-none"></radio>
        </hbox>
      </radiogroup>
    `));

    }

    get _mId() {
      return this.getAttribute('_mId');
    }

    set _selectedIndex(val) {
      this.childNodes[0].selectedIndex = val;
      this.getDirection();
    }

    get _selectedIndex() {
      return this.childNodes[0].selectedIndex;
    }

    getDirection() {
      var mode = this._selectedIndex;
      document.getElementById(this._mId + '-edg-any')._disabled = mode != 3;
      document.getElementById(this._mId + '-edg-up')._disabled = mode == 2 || mode == 3 || mode == 4;
      document.getElementById(this._mId + '-edg-down')._disabled = mode == 2 || mode == 3 || mode == 4;
      document.getElementById(this._mId + '-edg-right')._disabled = mode == 1 || mode == 3 || mode == 4;
      document.getElementById(this._mId + '-edg-left')._disabled = mode == 1 || mode == 3 || mode == 4;
      if (this._mId == "img")
        easyDragSettings.updateImgFloderStatus();
    }
  }

  customElements.define("gMenuFunc", MozGMenuFunc);
  customElements.define("gMenuList", MozGMenuList);
  customElements.define("easydragtogo-Direction", MozEasydragtogo_Direction);

}