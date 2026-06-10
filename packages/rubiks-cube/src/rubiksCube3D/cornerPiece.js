/// @ts-check
import {
    BoxGeometry,
    ExtrudeGeometry,
    Material,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Object3D,
    PlaneGeometry,
    SRGBColorSpace,
    TextureLoader,
} from 'three';
import { Sticker } from './sticker';
import { SVGLoader } from 'three/examples/jsm/Addons.js';
import { Faces } from '../core';
/** @import {Vector3Like} from 'three' */
/** @import {Face} from "../core" */

/** @typedef {{ positon: Vector3Like, rotation: Vector3Like }} CornerPieceUserData */
/**
 * @param {Material} frontMaterial
 * @param {Material} rightMaterial
 * @param {Material} topMaterial
 * @param {Material} coreMaterial
 * @returns {Group}
 */
export class CornerPiece extends Object3D {
    constructor() {
        super();
        const boxGeom = new BoxGeometry(1, 1, 1);
        const boxMesh = new Mesh(boxGeom, new MeshBasicMaterial({ color: 'black' }));
        this.add(boxMesh);
        /** @type {CornerPieceUserData} */
        this.userData = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };

        this.frontSticker = new CornerSticker();
        this.frontSticker.position.set(0, 0, 0.5);
        this.frontSticker.rotation.set(0, 0, 0);
        this.add(this.frontSticker);

        this.rightSticker = new CornerSticker();
        this.rightSticker.position.set(0.5, 0, 0);
        this.rightSticker.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        this.add(this.rightSticker);

        this.topSticker = new CornerSticker();
        this.topSticker.position.set(0, 0.5, 0);
        this.topSticker.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
        this.add(this.topSticker);
    }

    get stickers() {
        return [this.frontSticker, this.rightSticker, this.topSticker];
    }

    /**
     * @param {Face} face
     * @param {string} logoPath
     */
    addLogo(face, logoPath) {
        this.removeLogo();
        const material = new MeshStandardMaterial({
            transparent: true,
            color: 'white',
            metalness: 0,
            roughness: 0.4,
        });
        const mesh = new Mesh(new PlaneGeometry(0.9, 0.9), material);
        if (face === Faces.U) {
            mesh.position.set(0, 0.54, 0);
            mesh.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
        } else if (face === Faces.F) {
            mesh.position.set(0, 0, 0.54);
        } else if (face === Faces.R) {
            mesh.position.set(0.54, 0, 0);
            mesh.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        }
        this.logo = mesh;
        this.add(mesh);
        const texture = new TextureLoader().load(logoPath, (texture) => {
            texture.colorSpace = SRGBColorSpace;
            material.map = texture;
            material.needsUpdate = true;
            texture.anisotropy = 16;
        });
    }

    removeLogo() {
        if (!this.logo) return;
        this.remove(this.logo);
        this.logo.material.map?.dispose();
        this.logo.material.dispose();
        this.logo = null;
    }
}

const loader = new SVGLoader();
const cornerSVG = loader.parse(`
<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" xmlns:bx="https://boxy-svg.com">
  <path  d="M 25 0 H 500 V 500 H 0 V 25 A 25 25 0 0 1 25 0 Z" bx:shape="rect 0 0 500 500 25 0 0 0 1@a864c1ee"/>
</svg>
`);
const cornerGeometry = new ExtrudeGeometry(SVGLoader.createShapes(cornerSVG.paths[0])[0], {
    depth: 15,
})
    .scale(0.002, 0.002, 0.002)
    .translate(-0.5, -0.5, 0);

export class CornerSticker extends Sticker {
    constructor() {
        super(cornerGeometry);
    }
}
