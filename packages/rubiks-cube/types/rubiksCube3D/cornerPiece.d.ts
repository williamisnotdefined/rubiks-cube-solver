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
export class CornerPiece extends Object3D<import("three").Object3DEventMap> {
    constructor();
    frontSticker: CornerSticker;
    rightSticker: CornerSticker;
    topSticker: CornerSticker;
    get stickers(): CornerSticker[];
    /**
     * @param {Face} face
     * @param {string} logoPath
     */
    addLogo(face: Face, logoPath: string): void;
    logo: Mesh<PlaneGeometry, MeshStandardMaterial, import("three").Object3DEventMap>;
    removeLogo(): void;
}
export class CornerSticker extends Sticker {
    constructor();
}
export type CornerPieceUserData = {
    positon: Vector3Like;
    rotation: Vector3Like;
};
import { Object3D } from 'three';
import type { Face } from "../core";
import { PlaneGeometry } from 'three';
import { MeshStandardMaterial } from 'three';
import { Mesh } from 'three';
import { Sticker } from './sticker';
import type { Vector3Like } from 'three';
