# EasyDragToGo+ Redux  #

EasyDragToGo+ for Waterfox G3↑ & Firefox Developer Edition (see [installation guide](https://onemen.github.io/tabmixplus-docs/other/installation/)) - __[download here!](https://github.com/117649/EasyDragToGoPlus-Redux/releases/latest)__

Originally created by Sunwan.

Please read the tips.

## QR image dragging ##

Press an image containing a QR code, then drag. The drag carries the decoded text or link and uses its text/link gestures.
When a QR code is part of a larger picture, grab the code itself; dragging elsewhere keeps the picture.
An image containing only a QR code and its plain border also works when grabbed on that border. Image data is decoded locally; nothing is uploaded.
Decoding finishes during drag-start so a quick drag can carry its decoded payload. An unreadable image or unsuccessful scan keeps the image.
Cropped and rotated 2D images are supported;
perspective transforms and complex `object-position` expressions fall back to normal image dragging.

The bundled decoder is [jsQR 1.4.0](https://github.com/cozmo/jsQR), with its Apache 2.0 license in `addon/chrome/content/vendor/jsQR.LICENSE`.

## Tips ##
* :warning: If using Waterfox and/or bootstrapLoader the browser __must__ be restarted after installation!
  * (If using userChromeJS the startup cache may need to be cleared between updates.)
* If you don't want the waring sign under the addon card in 'about:addons' add a bool preference to your 'about:config' named `extensions.easydragtogo.hide_warning` and set it to `true`. Then it should gone after a restart. If it come back again restart again.
