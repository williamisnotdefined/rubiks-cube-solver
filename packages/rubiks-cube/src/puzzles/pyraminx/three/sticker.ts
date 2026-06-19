import type { BufferGeometry } from 'three';
import { DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { PyraminxFace } from '../core/types';
import { PyraminxFaceColors } from './config';

export class PyraminxSticker extends Mesh<BufferGeometry, MeshStandardMaterial> {
  backing: Mesh<BufferGeometry, MeshBasicMaterial>;
  stickerId: string;
  slotIndex: number;
  face: PyraminxFace;

  constructor(
    stickerId: string,
    slotIndex: number,
    face: PyraminxFace,
    geometry: BufferGeometry,
    backingGeometry: BufferGeometry,
  ) {
    super(
      geometry,
      new MeshStandardMaterial({
        color: PyraminxFaceColors[face],
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        roughness: 0.4,
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

  setFace(face: PyraminxFace): void {
    this.face = face;
    this.material.color.set(PyraminxFaceColors[face]);
  }
}
