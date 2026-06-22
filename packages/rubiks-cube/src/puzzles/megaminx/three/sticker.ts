import type { BufferGeometry } from 'three';
import { DoubleSide, Mesh, MeshStandardMaterial, Object3D } from 'three';
import type { MegaminxFace } from '../core/types';
import { MegaminxFaceColors, type MegaminxVisualStyle, MegaminxVisualStyles } from './config';

export type MegaminxPieceType = 'center' | 'corner' | 'edge';

export class MegaminxSticker extends Mesh<BufferGeometry, MeshStandardMaterial> {
  stickerId: string;
  slotIndex: number;
  face: MegaminxFace;
  slotFace: MegaminxFace;
  pieceKey: string;
  pieceType: MegaminxPieceType;
  visualStyle: MegaminxVisualStyle;

  constructor(
    stickerId: string,
    slotIndex: number,
    face: MegaminxFace,
    pieceKey: string,
    pieceType: MegaminxPieceType,
    geometry: BufferGeometry,
  ) {
    super(
      geometry,
      new MeshStandardMaterial({
        color: MegaminxFaceColors[face],
        metalness: 0,
        roughness: 0.24,
        side: DoubleSide,
      }),
    );
    this.stickerId = stickerId;
    this.slotIndex = slotIndex;
    this.face = face;
    this.slotFace = face;
    this.pieceKey = pieceKey;
    this.pieceType = pieceType;
    this.visualStyle = MegaminxVisualStyles.Stickerless;
    this.applyAppearance();
  }

  setFace(face: MegaminxFace): void {
    this.face = face;
    this.applyAppearance();
  }

  setVisualStyle(visualStyle: MegaminxVisualStyle): void {
    this.visualStyle = visualStyle;
    this.applyAppearance();
  }

  private applyAppearance(): void {
    this.material.color.set(MegaminxFaceColors[this.face]);
    this.material.roughness = this.visualStyle === MegaminxVisualStyles.Stickerless ? 0.24 : 0.5;
  }
}

export class MegaminxPhysicalPiece extends Object3D {
  pieceId: string;
  pieceType: MegaminxPieceType;
  stickers: MegaminxSticker[];
  faces: Set<MegaminxFace>;

  constructor(pieceId: string, pieceType: MegaminxPieceType) {
    super();
    this.pieceId = pieceId;
    this.pieceType = pieceType;
    this.stickers = [];
    this.faces = new Set();
  }

  addSticker(sticker: MegaminxSticker): void {
    this.stickers.push(sticker);
    this.faces.add(sticker.slotFace);
    this.add(sticker);
  }
}
