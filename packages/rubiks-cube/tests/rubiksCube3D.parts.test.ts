import './setup';
import { TextureLoader } from 'three';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CubeTypes, Faces } from '../src/core';
import { CenterPiece } from '../src/rubiksCube3D/centerPiece';
import { CornerPiece } from '../src/rubiksCube3D/cornerPiece';
import { ColorToFace, FaceColors, getCubeConfig } from '../src/rubiksCube3D/cubeConfig';
import RubiksCube3DSettings from '../src/rubiksCube3D/cubeSettings';
import { EdgePiece } from '../src/rubiksCube3D/edgePiece';
import RubiksCube3D from '../src/rubiksCube3D/rubiksCube3D';
import { Sticker } from '../src/rubiksCube3D/sticker';
import { Axi } from '../src/state/slice';

describe('rubiksCube3D pieces', () => {
  beforeEach(() => {
    vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
      onLoad?.({ anisotropy: 0, colorSpace: '', dispose: vi.fn() } as never);
      return {} as never;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('reads cube configuration and color mapping', () => {
    expect(getCubeConfig(CubeTypes.Two).layers).toEqual([-1, 1]);
    expect(getCubeConfig(CubeTypes.Seven).layers).toHaveLength(7);
    expect(ColorToFace(FaceColors.U)).toBe(Faces.U);
    expect(() => ColorToFace('pink')).toThrow('Invalid color');
    expect(() => getCubeConfig('bad' as never)).toThrow('Unsupported cube type');
  });

  test('uses settings defaults and overrides', () => {
    const defaults = new RubiksCube3DSettings();
    const overrides = new RubiksCube3DSettings({
      animationSpeedMs: 0,
      animationStyle: 'none',
      cubeType: CubeTypes.Five,
      logo: 'logo.png',
      pieceGap: 1.1,
    });

    expect(defaults.cubeType).toBe(CubeTypes.Three);
    expect(overrides.cubeType).toBe(CubeTypes.Five);
    expect(overrides.animationSpeedMs).toBe(0);
    expect(overrides.animationStyle).toBe('none');
    expect(overrides.logo).toBe('logo.png');
    expect(overrides.pieceGap).toBe(1.1);
  });

  test('sets sticker color', () => {
    const sticker = new Sticker(new EdgePiece().frontSticker.geometry);

    sticker.color = FaceColors.F;

    expect(sticker.color).toBe(FaceColors.F);
  });

  test('creates edge, center, and corner pieces with stickers', () => {
    const edge = new EdgePiece();
    const center = new CenterPiece();
    const corner = new CornerPiece();

    expect(edge.stickers).toHaveLength(2);
    expect(center.stickers).toHaveLength(1);
    expect(corner.stickers).toHaveLength(3);
  });

  test('adds and removes center logos', () => {
    const center = new CenterPiece();

    center.addLogo('center.png');
    expect(center.logo).not.toBeNull();
    center.addLogo('center-again.png');
    expect(center.logo).not.toBeNull();
    center.removeLogo();
    expect(center.logo).toBeNull();
    center.removeLogo();
    expect(center.logo).toBeNull();
  });

  test.each([Faces.U, Faces.F, Faces.R, Faces.B])('adds and removes corner logo on %s', (face) => {
    const corner = new CornerPiece();

    corner.addLogo(face, 'corner.png');
    expect(corner.logo).not.toBeNull();
    corner.removeLogo();
    expect(corner.logo).toBeNull();
  });

  test.each([
    ['frontSticker', Faces.F],
    ['topSticker', Faces.U],
    ['rightSticker', Faces.R],
  ] as const)('places 2x2 logo on the %s upper sticker', (stickerName, expectedFace) => {
    const cube = new RubiksCube3D(new RubiksCube3DSettings({ cubeType: CubeTypes.Two }));
    const corners = cube._mainGroup.children.filter((child): child is CornerPiece => child instanceof CornerPiece);
    for (const corner of corners) {
      corner.frontSticker.color = FaceColors.D;
      corner.topSticker.color = FaceColors.D;
      corner.rightSticker.color = FaceColors.D;
      corner.removeLogo();
    }
    const corner = corners.at(-1) as CornerPiece;
    corner[stickerName].color = FaceColors.U;

    cube.addLogo('cube-logo.png');

    expect(corner.logo).not.toBeNull();
    if (expectedFace === Faces.F) {
      expect(corner.logo?.position.z).toBeCloseTo(0.54);
    }
    if (expectedFace === Faces.U) {
      expect(corner.logo?.position.y).toBeCloseTo(0.54);
    }
    if (expectedFace === Faces.R) {
      expect(corner.logo?.position.x).toBeCloseTo(0.54);
    }
  });

  test('adds centered logos on odd and even cubes', () => {
    const three = new RubiksCube3D(new RubiksCube3DSettings({ cubeType: CubeTypes.Three }));
    const four = new RubiksCube3D(new RubiksCube3DSettings({ cubeType: CubeTypes.Four }));

    three.addLogo('three-logo.png');
    four.addLogo('four-logo.png');

    expect(three._mainGroup.children.some((child) => child instanceof CenterPiece && child.logo)).toBe(true);
    expect(four._mainGroup.children.some((child) => child instanceof CenterPiece && child.logo)).toBe(true);
  });

  test('updates gaps, filters rotation layers, and rejects invalid cube types', () => {
    const cube = new RubiksCube3D(new RubiksCube3DSettings({ cubeType: CubeTypes.Four, pieceGap: 1.04 }));

    expect(cube.getRotationLayer({ axis: Axi.x, layerIds: [0], direction: 1 })).not.toHaveLength(0);
    expect(cube.getRotationLayer({ axis: Axi.y, layerIds: [0], direction: 1 })).not.toHaveLength(0);
    expect(cube.getRotationLayer({ axis: Axi.z, layerIds: [0], direction: 1 })).not.toHaveLength(0);
    expect(cube.getRotationLayer({ axis: 'bad' as never, layerIds: [0], direction: 1 })).toHaveLength(0);

    cube.updateGap(1.08);
    cube.setCurrentAnimationSpeed(12);
    expect(() => cube.setType('bad' as never)).toThrow('Invalid cube type');
    cube.setType(CubeTypes.Three);
    expect(cube._cubeType).toBe(CubeTypes.Three);
  });
});
