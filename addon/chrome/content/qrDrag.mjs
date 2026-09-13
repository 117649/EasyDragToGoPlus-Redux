/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const decoder = {};

export class QRDrag {
    prepare(event) {
        this.clear();
        const image = event.target;
        if (event.button != 0 || image.localName != "img" || !image.complete || !image.naturalWidth || !image.naturalHeight) return;
        try {
            const quad = image.getBoxQuads({ box: "content", relativeTo: image.ownerDocument })[0];
            if (!quad) return;
            const { p1, p2, p3, p4 } = quad;
            // Invert the content quad so borders, page zoom and 2D transforms do not shift the grabbed point.
            if (Math.abs(p3.x - p2.x - p4.x + p1.x) > .1 || Math.abs(p3.y - p2.y - p4.y + p1.y) > .1) return;
            const ax = p2.x - p1.x, ay = p2.y - p1.y, bx = p4.x - p1.x, by = p4.y - p1.y;
            const determinant = ax * by - ay * bx;
            if (!determinant) return;
            const dx = event.clientX - p1.x, dy = event.clientY - p1.y;
            const u = (dx * by - dy * bx) / determinant, v = (ax * dy - ay * dx) / determinant;
            if (u < 0 || u > 1 || v < 0 || v > 1) return;
            const style = image.ownerDocument.defaultView.getComputedStyle(image);
            const nw = image.naturalWidth, nh = image.naturalHeight;
            let x = u * nw, y = v * nh;
            if (style.objectFit != "fill") {
                const cw = image.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
                const ch = image.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
                const scale = style.objectFit == "cover" ? Math.max(cw / nw, ch / nh) : style.objectFit == "none" ? 1 :
                    Math.min(cw / nw, ch / nh, style.objectFit == "scale-down" ? 1 : Infinity);
                const position = style.objectPosition.match(/^(-?[\d.]+)(%|px) (-?[\d.]+)(%|px)$/);
                if (!position || !(scale > 0)) return;
                x = (u * cw - Number(position[1]) * (position[2] == "%" ? (cw - nw * scale) / 100 : 1)) / scale;
                y = (v * ch - Number(position[3]) * (position[4] == "%" ? (ch - nh * scale) / 100 : 1)) / scale;
            }
            if (x < 0 || x > nw || y < 0 || y > nh) return;
            this.image = image;
            this.source = image.currentSrc;
            this.x = x;
            this.y = y;
        } catch {
            this.clear();
        }
    }

    take(event) {
        const { image, source, x, y } = this;
        this.clear();
        if ((event.explicitOriginalTarget ?? event.target) != image || image?.currentSrc != source) return null;
        try {
            // The drag data store is writable only during dragstart; decoding must finish before it returns.
            if (!decoder.jsQR) Services.scriptloader.loadSubScriptWithOptions("chrome://easydragtogo/content/vendor/jsQR.js",
                { target: decoder, ignoreCache: true });
            const nw = image.naturalWidth, nh = image.naturalHeight;
            const regions = [];
            if (nw > 512 || nh > 512) {
                const w = Math.min(nw, 512), h = Math.min(nh, 512);
                regions.push([Math.max(0, Math.min(nw - w, x - w / 2)), Math.max(0, Math.min(nh - h, y - h / 2)), w, h]);
            }
            regions.push([0, 0, nw, nh]);
            const canvas = image.ownerDocument.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
            for (const [sx, sy, sw, sh] of regions) {
                const scale = Math.min(1, 512 / Math.max(sw, sh));
                canvas.width = Math.max(1, Math.round(sw * scale));
                canvas.height = Math.max(1, Math.round(sh * scale));
                const context = canvas.getContext("2d", { willReadFrequently: true });
                context.fillStyle = "white";
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
                const scan = { data: context.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height,
                    x: (x - sx) * canvas.width / sw, y: (y - sy) * canvas.height / sh, whole: sw == nw && sh == nh };
                for (let attempt = 0; attempt < 4; attempt++) {
                    const code = decoder.jsQR(scan.data, scan.width, scan.height, { inversionAttempts: "attemptBoth" });
                    if (!code?.data) break;
                    const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = code.location;
                    const corners = [topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner];
                    const sides = corners.map((p, i) => {
                        const q = corners[(i + 1) % 4];
                        return (q.x - p.x) * (scan.y - p.y) - (q.y - p.y) * (scan.x - p.x);
                    });
                    const left = Math.max(0, Math.floor(Math.min(...corners.map(p => p.x))));
                    const right = Math.min(scan.width, Math.ceil(Math.max(...corners.map(p => p.x))));
                    const top = Math.max(0, Math.floor(Math.min(...corners.map(p => p.y))));
                    const bottom = Math.min(scan.height, Math.ceil(Math.max(...corners.map(p => p.y))));
                    let selected = sides.every(side => side >= 0) || sides.every(side => side <= 0);
                    const modules = 17 + code.version * 4;
                    // A standalone QR may include its four-module quiet border, but no other picture content.
                    if (!selected && scan.whole && attempt == 0 &&
                        corners.every(p => Math.min(Math.abs(p.x - left), Math.abs(p.x - right)) <= 1 &&
                            Math.min(Math.abs(p.y - top), Math.abs(p.y - bottom)) <= 1) &&
                        Math.max(left, scan.width - right) <= (right - left) * 4 / modules + 1 &&
                        Math.max(top, scan.height - bottom) <= (bottom - top) * 4 / modules + 1) {
                        selected = true;
                        for (let y = 0; selected && y < scan.height; y++) for (let x = 0; x < scan.width; x++) {
                            if (x >= left && x < right && y >= top && y < bottom) continue;
                            const offset = (y * scan.width + x) * 4;
                            if (scan.data[offset] != scan.data[0] || scan.data[offset + 1] != scan.data[1] ||
                                scan.data[offset + 2] != scan.data[2]) {
                                selected = false;
                                break;
                            }
                        }
                    }
                    if (selected) {
                        return code.data;
                    }
                    // Remove an unrelated code from this scan before looking for the code under the grabbed point.
                    for (let y = top; y < bottom; y++) scan.data.fill(255, (y * scan.width + left) * 4, (y * scan.width + right) * 4);
                }
            }
        } catch {
            return null;
        }
        return null;
    }

    clear() {
        this.image = this.source = this.x = this.y = null;
    }
}
