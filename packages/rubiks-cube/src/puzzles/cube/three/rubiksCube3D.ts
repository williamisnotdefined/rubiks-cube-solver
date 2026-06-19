import { gsap } from 'gsap';
import type { ColorRepresentation } from 'three';
import { Group, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { RubiksCubeViewInterface } from '../controller/rubiksCubeController';
import type { CubeType } from '../core';
import { CubeTypes, Faces } from '../core';
import { centers, corners, edges } from '../state/rubiksCubeState';
import type { Slice } from '../state/slice';
import { Axi } from '../state/slice';
import type { StickerState } from '../state/stickerState';
import { defaultStickerState, getEmptyStickerState, getStickerFaceIndex } from '../state/stickerState';
import { CenterPiece } from './centerPiece';
import { CornerPiece } from './cornerPiece';
import type { CubeConfig } from './cubeConfig';
import { ColorToFace, FaceColors, getCubeConfig } from './cubeConfig';
import RubiksCube3DSettings from './cubeSettings';
import { EdgePiece } from './edgePiece';

type RubiksCubePiece = CornerPiece | EdgePiece | CenterPiece;

type SliceAnimationOptions = {
  animationSpeedMs?: number;
  ease?: gsap.EaseString | gsap.EaseFunction;
};

const ERROR_MARGIN = 0.0001;

export default class RubiksCube3D extends Object3D implements RubiksCubeViewInterface {
  _cubeSettings: RubiksCube3DSettings;
  _pieceGap: number;
  _cubeType: CubeType;
  _cubeConfig: CubeConfig;
  _mainGroup: Group;
  _animationGroup: Group;
  _currentAnimation: gsap.core.Tween | undefined;

  constructor(cubeSettings: RubiksCube3DSettings = new RubiksCube3DSettings()) {
    super();
    this._cubeSettings = cubeSettings;
    this._pieceGap = this._cubeSettings.pieceGap;
    this._cubeType = this._cubeSettings.cubeType;
    this._cubeConfig = getCubeConfig(this._cubeType);
    this._mainGroup = this.createCubeGroup();
    this._animationGroup = new Group();
    this._currentAnimation = undefined;

    this.add(this._mainGroup, this._animationGroup);
    this.setStickerState(defaultStickerState(this._cubeType));
  }

  createCubeGroup(): Group {
    const cubeInfo = this._cubeConfig;
    const pieceGap = this._pieceGap;
    const outerLayerMultiplier = cubeInfo.outerLayerMultiplier;
    const outerLayerOffset = (cubeInfo.pieceSize * (outerLayerMultiplier - 1)) / 2;
    const group = new Group();
    const core = new Mesh(
      new RoundedBoxGeometry(2 * cubeInfo.coreSize, 2 * cubeInfo.coreSize, 2 * cubeInfo.coreSize, 3, 0.75),
      new MeshBasicMaterial({ color: 'black' }),
    );
    group.add(core);
    for (const piece of corners(this._cubeConfig.layers)) {
      const corner = new CornerPiece();
      corner.scale.set(
        cubeInfo.pieceSize * outerLayerMultiplier,
        cubeInfo.pieceSize * outerLayerMultiplier,
        cubeInfo.pieceSize * outerLayerMultiplier,
      );
      corner.position.set(
        piece.position.x * (pieceGap + outerLayerOffset),
        piece.position.y * (pieceGap + outerLayerOffset),
        piece.position.z * (pieceGap + outerLayerOffset),
      );
      corner.rotation.set(piece.rotation.x, piece.rotation.y, piece.rotation.z);
      corner.userData = {
        position: Object.assign({}, piece.position),
        rotation: Object.assign({}, piece.rotation),
      };
      group.add(corner);
    }
    for (const piece of edges(this._cubeConfig.layers)) {
      const edge = new EdgePiece();
      edge.scale.set(
        cubeInfo.pieceSize,
        cubeInfo.pieceSize * outerLayerMultiplier,
        cubeInfo.pieceSize * outerLayerMultiplier,
      );
      edge.position.set(
        piece.position.x * (pieceGap + (Math.abs(piece.position.x) === 1 ? outerLayerOffset : 0)),
        piece.position.y * (pieceGap + (Math.abs(piece.position.y) === 1 ? outerLayerOffset : 0)),
        piece.position.z * (pieceGap + (Math.abs(piece.position.z) === 1 ? outerLayerOffset : 0)),
      );
      edge.rotation.set(piece.rotation.x, piece.rotation.y, piece.rotation.z);
      edge.userData = {
        position: Object.assign({}, piece.position),
        rotation: Object.assign({}, piece.rotation),
      };
      group.add(edge);
    }
    for (const piece of centers(this._cubeConfig.layers)) {
      const center = new CenterPiece();
      center.scale.set(cubeInfo.pieceSize, cubeInfo.pieceSize, cubeInfo.pieceSize * outerLayerMultiplier);
      center.position.set(
        piece.position.x * (pieceGap + (Math.abs(piece.position.x) === 1 ? outerLayerOffset : 0)),
        piece.position.y * (pieceGap + (Math.abs(piece.position.y) === 1 ? outerLayerOffset : 0)),
        piece.position.z * (pieceGap + (Math.abs(piece.position.z) === 1 ? outerLayerOffset : 0)),
      );
      center.rotation.set(piece.rotation.x, piece.rotation.y, piece.rotation.z);
      center.userData = {
        position: Object.assign({}, piece.position),
        rotation: Object.assign({}, piece.rotation),
      };
      group.add(center);
    }
    return group;
  }

  _getPieces(group: Group = this._mainGroup): RubiksCubePiece[] {
    return group.children.filter(
      (x): x is RubiksCubePiece => x instanceof CornerPiece || x instanceof EdgePiece || x instanceof CenterPiece,
    );
  }

  getStickerState(): StickerState {
    const state = getEmptyStickerState(this._cubeType);
    this._getPieces().forEach((piece) => {
      piece.stickers.forEach((sticker) => {
        const color = ColorToFace(sticker.color);
        const piecepos = new Vector3();
        piecepos.copy(piece.userData.position);
        const stickerpos = new Vector3();
        sticker.getWorldPosition(stickerpos);
        stickerpos.sub(piecepos);
        stickerpos.normalize();
        stickerpos.round();
        const { face, i, j } = getStickerFaceIndex(stickerpos, piece.userData.position, this._cubeConfig.layers);
        state[face][i][j] = color;
      });
    });
    return state;
  }

  setStickerState(stickerState: StickerState): void {
    this._getPieces().forEach((piece) => {
      piece.stickers.forEach((sticker) => {
        const piecepos = new Vector3();
        piecepos.copy(piece.userData.position);
        const stickerpos = new Vector3();
        sticker.getWorldPosition(stickerpos);
        stickerpos.sub(piecepos);
        stickerpos.normalize();
        stickerpos.round();
        const { face, i, j } = getStickerFaceIndex(stickerpos, piece.userData.position, this._cubeConfig.layers);
        const stickerFaceValue = stickerState[face][i][j];
        sticker.color = FaceColors[stickerFaceValue] as ColorRepresentation;
      });
    });
    if (this._cubeSettings.logo) {
      this.addLogo(this._cubeSettings.logo);
    }
  }

  addLogo(logo: string): void {
    this._mainGroup.children
      .filter((x) => x instanceof CornerPiece || x instanceof CenterPiece)
      .forEach((x) => {
        x.removeLogo();
      });

    if (this._cubeType === CubeTypes.Two) {
      const corner = this._mainGroup.children
        .filter((x) => x instanceof CornerPiece)
        .filter(
          (x) =>
            x.frontSticker.color === FaceColors.U ||
            x.topSticker.color === FaceColors.U ||
            x.rightSticker.color === FaceColors.U,
        )
        .at(-1);
      if (corner?.frontSticker.color === FaceColors.U) {
        corner.addLogo(Faces.F, logo);
      }
      if (corner?.topSticker.color === FaceColors.U) {
        corner.addLogo(Faces.U, logo);
      }
      if (corner?.rightSticker.color === FaceColors.U) {
        corner.addLogo(Faces.R, logo);
      }
      return;
    }
    const center = this._mainGroup.children
      .filter((x) => x instanceof CenterPiece)
      .filter((x) => x.frontSticker.color === FaceColors.U)
      .filter((x) => {
        const layerCount = this._cubeConfig.layers.length;
        const outerLayers = [this._cubeConfig.layers.at(0), this._cubeConfig.layers.at(layerCount - 1)];
        let centerLayers: (number | undefined)[] = [];
        if (layerCount % 2 === 1) {
          centerLayers = [this._cubeConfig.layers.at(Math.floor(layerCount / 2))];
        } else {
          centerLayers = this._cubeConfig.layers.slice(layerCount / 2 - 1, layerCount / 2 + 1);
        }
        return [x.userData.position.x, x.userData.position.y, x.userData.position.z].every(
          (layerValue) => centerLayers.includes(layerValue) || outerLayers.includes(layerValue),
        );
      })
      .at(0);
    center?.addLogo(logo);
  }

  getRotationLayer(slice: Slice): Object3D[] {
    return this._getPieces().filter((piece) => {
      switch (slice.axis) {
        case Axi.x:
          return slice.layerIds
            .map((id) => this._cubeConfig.layers[id])
            .some((layer) => Math.abs(layer - piece.userData.position.x) < ERROR_MARGIN);
        case Axi.y:
          return slice.layerIds
            .map((id) => this._cubeConfig.layers[id])
            .some((layer) => Math.abs(layer - piece.userData.position.y) < ERROR_MARGIN);
        case Axi.z:
          return slice.layerIds
            .map((id) => this._cubeConfig.layers[id])
            .some((layer) => Math.abs(layer - piece.userData.position.z) < ERROR_MARGIN);
        default:
          return false;
      }
    });
  }

  updateGap(pieceGap: number): void {
    this._currentAnimation?.progress(1);
    this._pieceGap = pieceGap;
    const outerLayerMultiplier = this._cubeConfig.outerLayerMultiplier;
    const outerLayerOffset = (this._cubeConfig.pieceSize * (outerLayerMultiplier - 1)) / 2;
    this._getPieces().forEach((piece) => {
      const xOuterLayer = Math.abs(Math.abs(piece.userData.position.x) - 1) < ERROR_MARGIN;
      const yOuterLayer = Math.abs(Math.abs(piece.userData.position.y) - 1) < ERROR_MARGIN;
      const zOuterLayer = Math.abs(Math.abs(piece.userData.position.z) - 1) < ERROR_MARGIN;
      piece.position.set(
        piece.userData.position.x * (pieceGap + (xOuterLayer ? outerLayerOffset : 0)),
        piece.userData.position.y * (pieceGap + (yOuterLayer ? outerLayerOffset : 0)),
        piece.userData.position.z * (pieceGap + (zOuterLayer ? outerLayerOffset : 0)),
      );
    });
  }

  clearAnimationGroup(): void {
    const cubeInfo = this._cubeConfig;
    const pieceGap = this._pieceGap;
    const outerLayerMultiplier = cubeInfo.outerLayerMultiplier;
    const outerLayerOffset = (cubeInfo.pieceSize * (outerLayerMultiplier - 1)) / 2;
    const middleLayers = cubeInfo.layers.slice(1, -1);
    this._getPieces(this._animationGroup).forEach((piece) => {
      piece.getWorldPosition(piece.position);
      piece.getWorldQuaternion(piece.quaternion);
      if (middleLayers.some((layer) => Math.abs(layer - piece.position.x / pieceGap) < ERROR_MARGIN)) {
        piece.userData.position.x = piece.position.x / pieceGap;
      } else {
        piece.userData.position.x = piece.position.x / (pieceGap + outerLayerOffset);
      }
      if (middleLayers.some((layer) => Math.abs(layer - piece.position.y / pieceGap) < ERROR_MARGIN)) {
        piece.userData.position.y = piece.position.y / pieceGap;
      } else {
        piece.userData.position.y = piece.position.y / (pieceGap + outerLayerOffset);
      }
      if (middleLayers.some((layer) => Math.abs(layer - piece.position.z / pieceGap) < ERROR_MARGIN)) {
        piece.userData.position.z = piece.position.z / pieceGap;
      } else {
        piece.userData.position.z = piece.position.z / (pieceGap + outerLayerOffset);
      }
      piece.userData.rotation.x = piece.rotation.x;
      piece.userData.rotation.y = piece.rotation.y;
      piece.userData.rotation.z = piece.rotation.z;
    });
    this._mainGroup.add(...this._animationGroup.children);
    this._animationGroup.rotation.set(0, 0, 0);
  }

  fillAnimationGroup(slice: Slice): void {
    const pieces = this.getRotationLayer(slice);
    this._animationGroup.add(...pieces);
  }

  setCurrentAnimationSpeed(animationSpeedMs: number): void {
    this._currentAnimation?.duration(animationSpeedMs / 1000);
  }

  reset(): void {
    this._currentAnimation?.progress(1);
    this.setStickerState(defaultStickerState(this._cubeType));
  }

  setState(stickerState: StickerState): void {
    this._currentAnimation?.progress(1);
    this.setStickerState(stickerState);
  }

  setType(cubeType: CubeType): void {
    if (!Object.values(CubeTypes).includes(cubeType)) {
      throw new Error(`Invalid cube type: ${cubeType}`);
    }
    this._currentAnimation?.progress(1);
    this._cubeType = cubeType;
    this._cubeConfig = getCubeConfig(cubeType);
    this.remove(this._mainGroup);
    this._mainGroup = this.createCubeGroup();
    this.add(this._mainGroup);
    this.setStickerState(defaultStickerState(cubeType));
  }

  slice(slice: Slice, options: SliceAnimationOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      this._currentAnimation?.progress(1);
      this.fillAnimationGroup(slice);
      const target = { rotation: 0 };
      const animationGroup = this._animationGroup;
      const rotationAxis = new Vector3(
        slice.axis === Axi.x ? slice.direction : 0,
        slice.axis === Axi.y ? slice.direction : 0,
        slice.axis === Axi.z ? slice.direction : 0,
      ).normalize();
      let previousRotation = 0;
      this._currentAnimation = gsap.to(target, {
        rotation: (Math.abs(slice.direction) * Math.PI) / 2,
        duration: (options?.animationSpeedMs ?? this._cubeSettings.animationSpeedMs) / 1000,
        ease: options?.ease ?? this._cubeSettings.animationStyle,
        onComplete: () => {
          this.clearAnimationGroup();
          resolve();
        },
        onUpdate: () => {
          const delta = target.rotation - (previousRotation || 0);
          animationGroup.rotateOnWorldAxis(rotationAxis, delta);
          previousRotation = target.rotation;
        },
      });
    });
  }
}
