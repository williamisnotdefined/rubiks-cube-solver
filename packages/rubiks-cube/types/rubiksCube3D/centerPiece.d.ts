/** @import {Vector3Like} from 'three' */
/** @typedef {{ positon: Vector3Like, rotation: Vector3Like }} CenterPieceUserData */
export class CenterPiece extends Object3D<import("three").Object3DEventMap> {
    constructor();
    frontSticker: CenterSticker;
    /** @type {Mesh<PlaneGeometry, MeshStandardMaterial> | null} */
    logo: Mesh<PlaneGeometry, MeshStandardMaterial> | null;
    get stickers(): CenterSticker[];
    /**
     * @param {string} logoPath
     */
    addLogo(logoPath: string): void;
    removeLogo(): void;
}
export class CenterSticker extends Sticker {
    constructor();
}
export type CenterPieceUserData = {
    positon: Vector3Like;
    rotation: Vector3Like;
};
import { Object3D } from 'three';
import { Mesh } from 'three';
import { PlaneGeometry } from 'three';
import { MeshStandardMaterial } from 'three';
import { Sticker } from './sticker';
import type { Vector3Like } from 'three';
