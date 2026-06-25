import type { BufferGeometry, ColorRepresentation } from 'three';
import { DoubleSide, Mesh, MeshStandardMaterial, Object3D } from 'three';
import type { Square1LayerName, Square1PieceDefinition, Square1PieceId, Square1PieceKind } from '../core/types';
import { SQUARE1_SHADOW_COLOR } from './config';
import type { Square1PieceGeometry } from './geometry';

export class Square1Piece extends Object3D {
  displayLayer: Square1LayerName;
  pieceId: Square1PieceId;
  pieceType: Square1PieceKind;
  sourceLayer: Square1LayerName;
  stickers: Mesh<BufferGeometry, MeshStandardMaterial>[];
  surface: Mesh<BufferGeometry, MeshStandardMaterial>;
  widthUnits: number;

  constructor(definition: Square1PieceDefinition, displayLayer: Square1LayerName, geometry: Square1PieceGeometry) {
    super();
    this.displayLayer = displayLayer;
    this.pieceId = definition.id;
    this.pieceType = definition.kind;
    this.sourceLayer = definition.layer;
    this.widthUnits = definition.widthUnits;
    this.surface = new Mesh(geometry.body, createMaterial(SQUARE1_SHADOW_COLOR, 0.52));
    this.stickers = geometry.stickers.map((sticker) => new Mesh(sticker.geometry, createMaterial(sticker.color, 0.34)));
    this.add(this.surface);
    for (const sticker of this.stickers) {
      this.add(sticker);
    }
  }
}

function createMaterial(color: ColorRepresentation, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    metalness: 0,
    roughness,
    side: DoubleSide,
  });
}
