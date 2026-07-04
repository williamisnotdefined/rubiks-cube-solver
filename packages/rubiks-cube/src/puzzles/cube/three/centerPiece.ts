import {
  BoxGeometry,
  ExtrudeGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { Sticker } from './sticker';

export class CenterPiece extends Object3D {
  frontSticker: CenterSticker;
  logo: Mesh<PlaneGeometry, MeshStandardMaterial> | null;

  constructor() {
    super();
    const boxGeom = new BoxGeometry(1, 1, 1);
    const boxMesh = new Mesh(boxGeom, new MeshBasicMaterial({ color: 'black' }));
    this.add(boxMesh);
    this.userData = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };

    this.frontSticker = new CenterSticker();
    this.frontSticker.position.set(0, 0, 0.5);
    this.frontSticker.rotation.set(0, 0, 0);
    this.add(this.frontSticker);

    this.logo = null;
  }

  get stickers(): CenterSticker[] {
    return [this.frontSticker];
  }

  addLogo(logoPath: string): void {
    this.removeLogo();
    const material = new MeshStandardMaterial({
      transparent: true,
      color: 'white',
      metalness: 0,
      roughness: 0.4,
    });
    const mesh = new Mesh(new PlaneGeometry(0.9, 0.9), material);
    mesh.position.set(0, 0, 0.54);
    this.logo = mesh;
    this.add(mesh);
    new TextureLoader().load(logoPath, (texture) => {
      texture.colorSpace = SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
      texture.anisotropy = 16;
    });
  }

  removeLogo(): void {
    if (!this.logo) return;
    this.remove(this.logo);
    this.logo.material.map?.dispose();
    this.logo.material.dispose();
    this.logo = null;
  }
}

const loader = new SVGLoader();
const centerSVG = loader.parse(`
<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <path  d="M 120 0 L 380 0 C 450 0 500 50 500 120 L 500 380 C 500 450 450 500 380 500 L 120 500 C 50 500 0 450 0 380 L 0 120 C 0 50 50 0 120 0 Z"></path>
</svg>
`);
const centerGeometry = new ExtrudeGeometry(centerSVG.paths[0].toShapes()[0], {
  depth: 15,
})
  .scale(0.002, 0.002, 0.002)
  .translate(-0.5, -0.5, 0);

export class CenterSticker extends Sticker {
  constructor() {
    super(centerGeometry);
  }
}
