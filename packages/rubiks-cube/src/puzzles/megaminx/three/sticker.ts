import type { BufferGeometry } from 'three';
import { DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { MegaminxFace } from '../core/types';
import { MegaminxFaceColors } from './config';

export class MegaminxSticker extends Mesh<BufferGeometry, MeshStandardMaterial> {
  backing: Mesh<BufferGeometry, MeshBasicMaterial>;
  stickerId: string;
  slotIndex: number;
  face: MegaminxFace;

  constructor(
    stickerId: string,
    slotIndex: number,
    face: MegaminxFace,
    geometry: BufferGeometry,
    backingGeometry: BufferGeometry,
  ) {
    super(
      geometry,
      new MeshStandardMaterial({
        color: MegaminxFaceColors[face],
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        roughness: 0.42,
        side: DoubleSide,
      }),
    );
    this.backing = new Mesh(
      backingGeometry,
      new MeshBasicMaterial({
        color: 'black',
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        side: DoubleSide,
      }),
    );
    this.stickerId = stickerId;
    this.slotIndex = slotIndex;
    this.face = face;
  }

  setFace(face: MegaminxFace): void {
    this.face = face;
    this.material.color.set(MegaminxFaceColors[face]);
  }
}
