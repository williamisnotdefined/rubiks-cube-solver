// @ts-check
import { Mesh, MeshStandardMaterial } from 'three';
/** @import {BufferGeometry, ColorRepresentation} from 'three' */

export class Sticker extends Mesh {
    /**
     * @param {BufferGeometry} geometry
     */
    constructor(geometry) {
        super(
            geometry,
            new MeshStandardMaterial({
                color: 'white',
                metalness: 0,
                roughness: 0.4,
            }),
        );
        /** @type {{ color: ColorRepresentation }} */
        this.userData = { color: 'white' };
    }

    /**
     * @param {ColorRepresentation} color
     */
    set color(color) {
        const material = /** @type {MeshStandardMaterial} */ (this.material);
        material.color.set(color);
        this.userData.color = color;
    }

    /**
     * @returns {ColorRepresentation} color
     */
    get color() {
        const material = /** @type {MeshStandardMaterial} */ (this.material);
        return this.userData.color;
    }
}
