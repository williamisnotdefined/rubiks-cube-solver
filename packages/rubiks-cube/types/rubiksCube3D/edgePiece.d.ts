/** @import {Vector3Like} from 'three' */
/** @typedef {{ positon: Vector3Like, rotation: Vector3Like }} EdgePieceUserData*/
export class EdgePiece extends Object3D<import("three").Object3DEventMap> {
    constructor();
    frontSticker: EdgeSticker;
    topSticker: EdgeSticker;
    get stickers(): EdgeSticker[];
}
export class EdgeSticker extends Sticker {
    constructor();
}
export type EdgePieceUserData = {
    positon: Vector3Like;
    rotation: Vector3Like;
};
import { Object3D } from 'three';
import { Sticker } from './sticker';
import type { Vector3Like } from 'three';
