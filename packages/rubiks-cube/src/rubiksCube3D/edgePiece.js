// @ts-check
import { BoxGeometry, ExtrudeGeometry, Mesh, MeshBasicMaterial, Object3D } from 'three';
import { SVGLoader } from 'three/examples/jsm/Addons.js';
import { Sticker } from './sticker';
/** @import {Vector3Like} from 'three' */

/** @typedef {{ positon: Vector3Like, rotation: Vector3Like }} EdgePieceUserData*/

export class EdgePiece extends Object3D {
    constructor() {
        super();
        const boxGeom = new BoxGeometry(1, 1, 1);
        const boxMesh = new Mesh(boxGeom, new MeshBasicMaterial({ color: 'black' }));
        this.add(boxMesh);

        /** @type {EdgePieceUserData} */
        this.userData = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };

        this.frontSticker = new EdgeSticker();
        this.frontSticker.position.set(0, 0, 0.5);
        this.frontSticker.rotation.set(0, 0, 0);
        this.add(this.frontSticker);

        this.topSticker = new EdgeSticker();
        this.topSticker.position.set(0, 0.5, 0);
        this.topSticker.rotation.set(-Math.PI / 2, 0, Math.PI);
        this.add(this.topSticker);
    }

    get stickers() {
        return [this.frontSticker, this.topSticker];
    }
}

const loader = new SVGLoader();
const edgeSVG = loader.parse(`
<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <path d="M 150 0 L 350 0 C 450 0 500 50 500 120 L 500 500 L 0 500 L 0 120 C 0 50 50 0 150 0 Z"></path>
</svg>
`);
const edgeGeometry = new ExtrudeGeometry(SVGLoader.createShapes(edgeSVG.paths[0])[0], {
    depth: 15,
})
    .scale(0.002, 0.002, 0.002)
    .translate(-0.5, -0.5, 0);

export class EdgeSticker extends Sticker {
    constructor() {
        super(edgeGeometry);
    }
}
