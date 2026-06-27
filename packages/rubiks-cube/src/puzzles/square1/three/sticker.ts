import type { BufferGeometry, ColorRepresentation } from 'three';
import { DoubleSide, Mesh, MeshStandardMaterial, Object3D } from 'three';
import type {
  Square1Face,
  Square1LayerName,
  Square1PieceDefinition,
  Square1PieceId,
  Square1PieceKind,
  Square1StickerLocalSurface,
} from '../core/types';
import { SQUARE1_SHADOW_COLOR, Square1FaceColors } from './config';
import type { Square1PieceGeometry } from './geometry';

export class Square1Sticker extends Mesh<BufferGeometry, MeshStandardMaterial> {
  readonly square1Face: Square1Face;
  readonly square1Surface: Square1StickerLocalSurface;

  constructor(face: Square1Face, surface: Square1StickerLocalSurface, geometry: BufferGeometry) {
    super(geometry, createMaterial(Square1FaceColors[face], 0.34));
    this.square1Face = face;
    this.square1Surface = surface;
  }
}

export class Square1Piece extends Object3D {
  readonly pieceId: Square1PieceId;
  readonly pieceIndex: number;
  readonly pieceType: Square1PieceKind;
  readonly sourceLayer: Square1LayerName;
  readonly stickers: Square1Sticker[];
  readonly surface: Mesh<BufferGeometry, MeshStandardMaterial>;
  readonly widthUnits: 1 | 2 | 6;

  constructor(definition: Square1PieceDefinition, geometry: Square1PieceGeometry) {
    super();
    this.pieceId = definition.id;
    this.pieceIndex = definition.pieceIndex;
    this.pieceType = definition.kind;
    this.sourceLayer = definition.sourceLayer;
    this.widthUnits = definition.widthUnits;
    this.surface = new Mesh(geometry.body, createMaterial(SQUARE1_SHADOW_COLOR, 0.52));
    this.stickers = geometry.stickers.flatMap((sticker) => {
      const definitionSticker = definition.stickers.find((candidate) => candidate.localSurface === sticker.surface);
      return definitionSticker ? [new Square1Sticker(definitionSticker.face, sticker.surface, sticker.geometry)] : [];
    });
    this.add(this.surface);
    for (const sticker of this.stickers) {
      this.add(sticker);
    }
  }

  dispose(): void {
    this.surface.geometry.dispose();
    this.surface.material.dispose();
    for (const sticker of this.stickers) {
      sticker.geometry.dispose();
      sticker.material.dispose();
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
