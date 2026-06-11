import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});

global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.XMLSerializer = dom.window.XMLSerializer;
global.Node = dom.window.Node;
global.CustomEvent = dom.window.CustomEvent;

if (!global.CSSStyleSheet) {
  global.CSSStyleSheet = class CSSStyleSheet {
    cssText = '';

    replaceSync(cssText: string): void {
      this.cssText = cssText;
    }
  } as unknown as typeof CSSStyleSheet;
}

global.window.CSSStyleSheet = global.CSSStyleSheet;
global.window.HTMLCanvasElement.prototype.getContext = () => ({
  fillRect: () => {},
  clearRect: () => {},
  getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  fill: () => {},
  measureText: () => ({ width: 0 }),
  _fillStyle: 'rgba(0,0,0,0)',
  get fillStyle() {
    return this._fillStyle;
  },
  set fillStyle(val) {
    this._fillStyle = val;
  },
});
