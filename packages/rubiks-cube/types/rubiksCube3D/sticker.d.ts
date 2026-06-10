/** @import {BufferGeometry, ColorRepresentation} from 'three' */
export class Sticker extends Mesh<BufferGeometry<import("three").NormalBufferAttributes, import("three").BufferGeometryEventMap>, import("three").Material | import("three").Material[], import("three").Object3DEventMap> {
    /**
     * @param {BufferGeometry} geometry
     */
    constructor(geometry: BufferGeometry);
    /**
     * @param {ColorRepresentation} color
     */
    set color(color: ColorRepresentation);
    /**
     * @returns {ColorRepresentation} color
     */
    get color(): ColorRepresentation;
}
import type { BufferGeometry } from 'three';
import { Mesh } from 'three';
import type { ColorRepresentation } from 'three';
