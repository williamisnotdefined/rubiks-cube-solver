import type { BufferGeometry, ColorRepresentation } from 'three';
import { Mesh, MeshStandardMaterial } from 'three';

export class Sticker extends Mesh<BufferGeometry, MeshStandardMaterial> {
  declare userData: { color: ColorRepresentation };

  constructor(geometry: BufferGeometry) {
    super(
      geometry,
      new MeshStandardMaterial({
        color: 'white',
        metalness: 0,
        roughness: 0.4,
      }),
    );
    this.userData = { color: 'white' };
  }

  set color(color: ColorRepresentation) {
    this.material.color.set(color);
    this.userData.color = color;
  }

  get color(): ColorRepresentation {
    return this.userData.color;
  }
}
