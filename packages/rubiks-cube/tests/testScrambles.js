// @ts-check
import { CubeTypes } from '../src/core';

/** @type {{cubeType: import("../src/core").CubeType, scramble: string, solution: string}[]} */
export const scrambles = [
    {
        cubeType: CubeTypes.Two,
        scramble: "R' F U' F' U2 F R U' R' U' F'",
        solution: "z R U R' R2 U2 R U2 R2 z' x",
    },
    {
        cubeType: CubeTypes.Two,
        scramble: "R F R U2 R' U2 R2 U' R2 U2 F",
        solution: "y R U' R2 U2 y' R U' R2 F R2 U' R' U R U R' U' R' F R F' x2",
    },
    {
        cubeType: CubeTypes.Two,
        scramble: "R U2 R2 U' F R' U2 R' U2 R U2",
        solution: "x y' U R U R2 R U R' F' R U R' U' F R' F' R U D2 z'",
    },
    {
        cubeType: CubeTypes.Two,
        scramble: "R U2 F' R2 U' F' U R' U' R U2",
        solution: "z' x R U2 R F R2 U' R2 U' R2 U R2 F' U x2 y",
    },
    {
        cubeType: CubeTypes.Two,
        scramble: "R' F' R2 U' R' U F' U F U2 R2",
        solution: "x R U R y' U U y' R' F R U' R' F R U' R U R' F' U' y2 x'",
    },
    {
        cubeType: CubeTypes.Three,
        scramble: "D U R2 B2 D' B2 D R2 F2 L2 R B U2 R2 U' B' L D' R U' R",
        solution: "D L R' F R D2 R U' R' F u R U2' R' U R U' R' U' L U L' D U L' U' L U2 L' U L L F' L' F U R' U2 R U2' R' U R U2' R' U R U2' R' U' R U y'",
    },
    {
        cubeType: CubeTypes.Three,
        scramble: "L2 D' L2 F2 R2 B2 U L2 U L' R U' R D' B' R U L' F U'",
        solution:
            "x' z' U' r' z x' y x z' D U' z y' U' D U' R u' R' U R U' r U' r' y' U2' R U R' U2' R U' R' y' R U R' y' U' R' U R y' U R' D' r U' z' u' z D R U R U2' U R' U' U R U' R' U' R U R D z' U' z U' U' z' U R' U2' y x",
    },
    {
        cubeType: CubeTypes.Three,
        scramble: "L D F2 B D R L' B' U D2 B U2 D2 B U2 B' U2 R2 L2 B2",
        solution:
            "y B2' D' R' D R' U R r U' r' y' R U' R2' U R U L' U U L U L' U' L U2 U R U R' U R U' R' U' L' U' L U' L' U U L U R U R' F' R U R' U' R' F R2 U' R' U'",
    },
    {
        cubeType: CubeTypes.Three,
        scramble: "R2 U2 F2 U L2 U' L2 F2 U2 F2 U2 R B U2 L' R2 D2 B2 D R",
        solution:
            "z2 R D R F U' D R U' R' U R' U' R U' R U' R' U2 R U' R' y' y' U R U' R' U' R U' R' U R U' R' U' R' U' R U' R' U R U r U2' R' U' R U' r' R U R' U' R' F R2 U' R' U' R U R' F' U x2",
    },
    {
        cubeType: CubeTypes.Three,
        scramble: "U' D2 B' R2 B' D2 R2 B F2 D2 F' L2 F R F2 L2 D' B D R U",
        solution: "z2 y D' R' D2 U' R' F D' U y' L' U L U R U' R2' U R y' d U2' U' R' D' R U' R' D R U' L U L' y' U L' U' L U R U R' U' R' F R F' U' x2 y'",
    },
    {
        cubeType: CubeTypes.Four,
        scramble: "D2 F D2 F U2 L2 F R2 F2 D2 L2 R B L' B' L' D' F U Uw2 Rw2 L' Fw2 L' F' L' B' Uw2 B Rw2 F' L Uw' B' U Rw2 D U2 Fw' Rw' B' F2 Uw' B2 L'",
        solution:
            "z r U' r' F U r' y u' u' U2 l' U2 l z' x' r2' F U2 x' U' U' r2' 3r2 B U' r' F' 3r 3r' U' U' r2 U' r2' 3r2 U' 3r' r U2 r' U' U' r2 U' U' r2' 3r2 U r' U' 3r' r2 U2' r' x' y' x' u' U' R' U' R u D' F D u' R' U' R 3d U' U L' U L d U' R U' R' u' U R U' R' u U' R U' R' u' U' y' R' U' R u U' R U R' L U L' 3d R U' R' U' R U' R' U R U' R' y R U' R' U R U' R' 3d' U' F' U F U' L' U2 R U R' U2 L R' U R' U' R3 U' R' U R U R2' z2",
    },
    {
        cubeType: CubeTypes.Four,
        scramble: "R B2 U2 R' L2 F2 D2 U2 L' U2 L' U F2 L D2 U' F L B' R' Uw2 F' U2 Fw2 B2 Rw2 B' R' B Uw2 R2 Uw2 R' B Uw' L' Uw2 U' Rw' Fw Rw2 Fw2 B' R2 B2",
        solution:
            "z' 3r' F' u U2' r2' U r y' R u D' l' U2 l 3r2' y F D R' y u' z L2' U x2 3r U r U r2' r' U2' r U' r' 3r U 3r2' r2 U2 r' 3r U r U' r2' 3r U2 3r' r x' y' x' u2' y R U R' x U R' U' x' R u2' D' L' u D R' U R L' U L y' 3r U' 3r' F R U2 R' u' y2 R U' R' u' U R U' R' u F R' F' R u' R U' R' u L' U L U2' F U F' R' U2' R U R' U2' R U L U' L' U2 U' R U2' R' U F' U' F U2' 3l L2' U' L U' L' U2 L U' L 3l' U2' R U R' F' U' 2R2 U2' 2R2 u2' 2R2 u2' U' R U R' U' R' F R2 U' R' U x2 y",
    },
    {
        cubeType: CubeTypes.Four,
        scramble: "R2 D2 B L2 D' U' L2 D' L2 R2 D' U2 B' L2 B R F' L B2 Fw2 L2 D' R2 Uw2 U' Fw2 D L' Uw2 B2 U B Uw2 D2 Fw L2 D' L' Fw2 Uw' B' Uw' Rw F'",
        solution:
            "x' x' f' U' r U r' U2' r' F' u' l' U2 l L' R u2' 3r' x' R2 u2' R F u2' z 3r' F x' 3r U' r U r' U 3r' r U' r' 3r' U' 3r r' U2' r U r U2' r' x' y' x' U R' u F' U F u' D' F u D y R U R' R' U2' R y' u' y U F R' F' R u' R U2' R' u F' U F u' y L' U L d U R' F R F' R U' R' U' R' F U' F' R y' U2 L' U L y' R' U2' F R F' U2' r U2 x r U2' r U2 r' U2' x' r U2 r' U2' r U2 r' U2' r' U' R U2 R2' U' R2 U' R2' U2' R R' U R U' R' F' U' F R U 3l' U R' U' x' R U' R U' x2",
    },
    {
        cubeType: CubeTypes.Four,
        scramble: "L B' F2 D F2 R2 D' L2 F2 U' R2 D B' U R' D F2 U' R' F2 Fw2 D' R Fw2 U D' Fw2 D' L Uw2 U' R' D2 Fw' U2 R Uw F2 Rw' L Fw' L F2 D",
        solution:
            "x U D l' D R' U R r2' U r 3r' 3d r U2' r' x D R z' x' y' D R u' U' F z U r 3r U' x2 r' 3r' U' r U r 3r 3r U' 3r' r U r2' 3r U r U' r U r' x' y' x' u2' y R U' R' u2' F2 D2' u y 3r U' 3r' F y L' U L u' y L' U L U R U' R' u' R U R' F R' F' R u U2' r2 D r' U2' r D' r' U2' r' y U' U R U' R2' U R y' U' R' U R U' y' R' U' R2 U R' U R' U R U R' U' R U2' r U2 x r U2' r U2 r' U2' x' r U2 r' U2' r U2 r' U2' r' U2' R U R' U R U' y R U' R' F' U' m2' U2' m2' U' m2' U2' m2' U x2 y",
    },
    {
        cubeType: CubeTypes.Four,
        scramble: "L' B R2 B' U2 F' U2 L2 F L2 B2 L2 B2 U' R U' D' L F' U Uw2 Fw2 B' F U' Rw2 U' F' B L2 D' U' L' U' Rw' Fw2 D' R Fw D R' Fw2 Uw Fw2 L'",
        solution:
            "x y' U2 x' U2' r' U' r2 y u2' U' l' U2 l x' z' x' F u L F R u2' D R y2 x y r2' U L' U' r2 U' 3r r2 U' 3r 3r r U' r' U r2' U2' r2 3r' U r U2' r' x' y' x' R' u F' U' F u' D' F u D R U R' y R U R' y F' U' F u' y2 U R U' R' u' F R' F' R u R U2 R' u' R U R' d R' U R R U R' y' R' U' R y' U' R' U R R R' R U R' D' L' U L D U' F' L U L' F U2' R U' R2' F R F' U2' r U2 x r U2' r U2 r' U2' x' r U2 r' U2' r U2 r' U2' r' R U2 R' U' R U' R' 2R2 U2' 2R2 u2' 2R2 u2' U2 y' x R' U R' D2' R U' R' D2' R2 x",
    },
    {
        cubeType: CubeTypes.Five,
        scramble:
            "L U2 Uw Bw L' Dw B2 Fw2 U' Dw L2 Fw2 Lw' F Lw D' Uw' B Rw Fw F2 Rw' Dw' Lw U2 L2 Dw' B2 Bw' R D2 Rw2 Dw2 Uw B Fw' Rw2 F2 Rw' Dw D' Uw Bw L' Dw' R2 Fw2 Lw' Rw2 D2 Lw2 U Fw2 L Bw' Lw Uw2 B' Dw' L2",
        solution:
            "D' r' R u D r' U l' U' l L u' l y U 3l' 3l l' U l y' U' r' F' r2 U r' z x' U' r U2' r' x' z' U l' U2 l z' D' x r2 F 3r' U L U2 3l' l2 F' x' 4r' U' U' r2 3r2' F 4r U' 4r' 3r2 4r' U 4r U' r' U 4r U' 4r U 4r' 3r r' U' r2 3r' U 4r 4r U' 4r' r U r2' U2' r U' r r' r U r' 4r U2' 4r' r U r' U2' r U r' z' y 3d' U L' U L u D2 L' U 4d R U' R' u' U' L' U L U R U' R' U d' 4d R U' R' u R' F R F' R U' R' 3u' u U' R U' R' u' R' F R F' R U' R' 3u' u U R U' R' d d U' R U' R' u' 3u R U' R2' U' R y' d R U' R' d' d' L' U L u d L' U' L 4d R U' R' u' U2 R' U R U' R' U' R R U2' R' y L U L' U' L' U2 L 4d' L U L' R2 D 4r' U' 4r D' R2' U' R U R' U U' U R U R' U R U R' U' R U2' R' U2 R' D' R U' R' D R U' x2",
    },
    {
        cubeType: CubeTypes.Five,
        scramble:
            "U' L Uw Lw Bw' Lw R' Uw2 Bw Rw D U Rw' B Dw2 Rw2 D' L' Rw2 B2 Uw' L' Fw2 Bw2 Uw Fw B' Lw L R' U F B2 Rw' U' Rw D2 U2 Dw F' B Fw Dw' Lw U Dw Rw2 F Bw' Uw2 Rw' B2 Fw Dw' Lw L' Rw2 Uw B' Dw'",
        solution:
            "y U' B' r2' F D l L u2 y' D l' 3l' U' 3l U r U r' F' d' r U r' x' y' x' r2 3r' 3r r' U2' 3r' r z' U' r U2' r' z' 4r' U 3r2' U' r' F 4r U' r' x' U2' r2 4r2' F x' R U r' U' l D' x 4r' U r 3r2 U' 3r2' U 4r U2 r' U' 4r U' r' U' r 4r' U' 4r U' U' 3r U 3r' r' 4r U' r' U r' U2' r2 4r' 4r U' 4r' 3r r' U' 3r' 4r U' r U r' U' r U z' 3u y' y' R' F R F' R U' R' d D' R U R U' R2' D2 R U' R' y' u R' F R F' R U' R' 3d' L' U L u' 4d R' U' R u2 U' L' U L y R' F R F' R U' R' 3u' U2 R U' R' u' 3u' R U' R2' U' R y' U' 4d R U' R' u U d' R U' R' u' 3u U' R' U2 R U' R' U R L U L' D' U' L' U L D R' F R L' U' L U' R' F R L' U' L U' R U' R' U' R U' R' U R U R' U R' F' R U R U' R' F z2",
    },
    {
        cubeType: CubeTypes.Five,
        scramble:
            "Bw' R' D Dw' Bw' Rw' Fw Bw B2 Dw2 Lw' Dw2 L2 B' D Dw2 Bw' F2 Dw2 L2 Lw' Dw2 F Rw' L' R' F' R' L' Uw Fw2 L2 F' D2 L2 Rw Bw' L' Dw Bw Rw' Fw U2 Dw2 Uw L2 Fw' F D F Lw' L' Rw Uw Dw' Lw R2 Rw Bw2 Fw'",
        solution:
            "y l F' U' r' 3r 4r' u 3u2' 4u U r' F' L u' U r U2' r' z x' F 3l' l2 z' U' r U2' r' z' x' x' F' U r2' F 4r2' U' 3r' U 2-3l' L F' U x' R' U r 2L' F' 4r U' U 3r2 U' 3r r 4r' U 4r r' U 4r 4r 4r' r' U 3r U 3r' r' 4r U 4r2' r2 U r2' 4r U' 3r r' U' 3r' U2' r 4r U' 4r' U' r U r' U r U' r' x' y' x' U' F R' F' R u' R' U R 3u' R' U R' U' R R U' D R U' R' 3u U U' R' F R F' R U' R' d R U' R' u' R' F R F' R U' R' u' U U R U' R' 3u 4d' L' U L U d U L' U L R' F R F' R U' R' u U' d y U' L' U L u2 R U' R2' U' R y' u' R U' R' u F R' F' R u' U R U' R' u U' L' U L 4d R' U R2 U' R' y' L' U' L U R U' R' y R U' R2' F R U2' R' F' R U L' U L F R' F' R2 U2' R' U R U2' R' U R U' R2' F R F' x2 y",
    },
    {
        cubeType: CubeTypes.Five,
        scramble:
            "D U Lw2 R Uw2 Lw' Fw2 Bw' U2 Fw' U2 Fw Rw' Uw' D' L2 Lw' F' Rw2 R' L' F Rw' Fw Dw' U' R' B2 Bw L' Fw' L' B U' Rw B2 L Dw2 Uw' R' Bw2 Uw2 U2 B R2 Uw2 Fw Bw Uw2 L' Dw Bw' Dw' R2 2F' Dw2 L' R Uw' R",
        solution:
            "x z F 3r' F u' D r' 2-4d l' U l2 l' U l 3r U 3r' F r U' r' x' y' F' U' 3r' r z' U r U2' r' z' L2' x' U' r R B l F' r' 2-3l' U2 r2 U' x2' 4r2' R2 U' U' R U r2 3r' 4r' F 4r2 U' r2' U' 3r 4r 4r r 4r' U2' r U r r2 U' r2' U' r U' r' U 4r r' U2' r 4r 3r2' U 3r2 U2' r' U2' r U r2' U2' r2 4r' 4r U r' U 4r' r U 2-3l' U 4r' r2 U2' r' U r U2' r' U' x' y' x' R U' R' u d D' R U R U' R2' y' R' U R 3d' U' L' U L 3u U 4d R U' R' 3u L' U L d' U' L' U L U R U' R' u d U y' U R U' R' u U' R U' R' u2' 3u y R U' R2' U' R y' U' u U' L' U L u' R' F R F' R U' R' d R' F R F' R U' R' d' U' L' U2 L2 U L2' U L U' L' U L U2' L' U L y U U L' U L U' L' U' L U' R U R' U' R' F R F' U R U' R' U' R2' D' 4r U2 4r' R U R' D R U' R U R' U R x2 y",
    },
    {
        cubeType: CubeTypes.Five,
        scramble:
            "Lw' B Rw Bw' Fw2 R2 Bw2 Lw R2 Uw' R2 Rw' Bw' F L F D' F2 Bw2 U2 Lw' Fw' Bw2 D Dw Fw R2 Fw D2 Dw' R' Uw2 Rw' Uw' Rw' F2 L B' Dw2 Lw' Uw' Bw' U' Rw R2 Bw2 Dw2 L' Bw2 R2 Rw L2 Bw2 D' Fw2 Rw L D' U2",
        solution:
            "z y F U r U' r' U2 x' l' U l2 L' R u' 3u d U' l z 4d' x U' l U2 l' F' L u 3u' r U2' r' z x' R U' 3r2 U' U' 3r' F R U' r U' U' r2' 4r B 4r2' U' r' D' 4r U 4r' r U' r' 4r U' U' r' U r U' 4r U' U' r' U r U' r' U r U' U' 4r 3r' U 3r 4r U U' U 4r2' U 3r2 U' 3r2' U 4r U' 3r U' 3r' r' U2' r r U2' r' 4r r' U U' r U2' r' U' r U r' U2' r x' z' R U' R' 4d R U' R' 3u' R U R' 2-3d' R U R U' R2' R U' R' u y' u L' U' L 4d R U' R' 3d' U L' U L 3u' R U' R' y u' R' F R F' R U' R' u' 3u U2 R U' R' y u' U' d' R U' R' u' 3u2 R U' R2' U' R y' F R' F' R 3u' R U' R' 3u u' U' d R U' R' u 3u' y U' R U' R' U R U' R' U R' U' R U' R R' R U R' 4d' R' U' R y' 4d' U' L' U L y' U L F U F' U' L2' U L U2 R U2' R' U' R U R' U' R U' R' U2' x2 y'",
    },
    {
        cubeType: CubeTypes.Six,
        scramble:
            "L U L' R2 B2 Rw' F2 R' Lw' D2 3Fw2 D' 3Fw2 Dw2 3Rw2 R2 L' Fw' R' Uw 3Rw Fw' 3Fw R2 Uw' R2 Lw' D2 3Rw L Bw Dw' Lw2 U2 F2 Fw' Lw2 Rw2 3Rw' R Uw' Rw' F2 3Rw' Uw D2 3Fw Fw 3Uw' F2 Lw' Dw' Lw' Rw' 3Uw 3Fw Uw' Rw2 Bw2 Dw2 U2 B' Bw' R2 3Fw' Lw2 3Rw' F' L2 3Uw U' R 3Fw' D2 Lw' Rw' 3Uw' Fw' U 3Rw2",
        solution:
            "x' y D2' r2 U' r' 4r U' 4r' U' D' U' 3r' r z' F U 3r U' U' 4r' z' U r U r' x 3r U 3r' r' F r U 3r' F2 3r U' r U' r' y' 3r r' z' y' r U2' r' z x' U2 3r2 r2' U2' 3r2 r2' x z' U2 3r' U2' 3r z U2 4l' U2 F 3r 4l R u' R2' u r' f x' d' D U' r2' U' 4r2 x' U' r' U r U 4r' 3r x' D x' D' U' 3r2 U 3r U' 3r U' 3r' x U r U2' r' U2 r U' r2' U 3r U r' U' 3r' r U' r U' r' U r U r' x' U 4r2 3r2' U' U' 4r2 3r2' U' U' 3r U' 3r' U 3r r' U 3r' r3 U2' r2' 3r r' U 3r' r U' r U' r' U 3r U2' 3r' r U2' r' U2 r U' r' 3r2 U2' D2' z' u u' U 4u' U R U' R' 3u' 4u2 R U' R' u U L' U L U u' R' U' R U' 3d' U' y' U R' U' R U' 3u R U' R' z2 U u2' U2 F R' F' R U' u 4u' R U' R' u 4u' R U' R' u 3u' R' U' R U' d2' U' U' y' U' R' F R F' R U' R' 3u 4u' U R U' R' U' u2 3u2' z2 U R U' R' u U U y' U R U' R' u' U R' U' R U' d' U' R U' R' z2 u y' R' U' R U' 3u 4u R' U R u 3u' 4u' U R U' R' u' 3u 4u y' R' U R U' 4u L' U L 4u' u' 3u y' R' F R F' R U' R' 3u' u2 R' F R F' R U' R' u' U L U x' y D' y' R R y' R U' R2' U R y' R' U R U' R' U' r R R' r' R U2 L' U' L R U' R' U' L' U L U L' U' L U' U' R' F R U R' F' R F U' F' R' U R U' R' F' U' F R U R' U' r r' R U' y R U R' x2 y",
    },
    {
        cubeType: CubeTypes.Six,
        scramble:
            "D Fw' R2 F2 Dw' Lw' Rw' F U2 3Uw 3Fw' Bw Rw2 L2 Bw2 B2 Uw 3Rw' Lw Rw2 3Uw2 Dw2 3Fw2 U2 Rw F Bw L 3Rw Dw2 3Fw' Dw2 D Bw' F Fw' D 3Fw' F' R' L B Rw' 3Fw2 U' L2 Lw' D Bw Uw2 3Fw2 Uw2 Bw' Fw U' Fw2 L 3Rw Bw' D' 3Rw' 3Uw2 Lw' U' Dw F R' B Rw U2 B2 Fw' 3Rw R 3Fw2 3Uw2 D' 3Fw' L Dw",
        solution:
            "y' U 3r r F' F D' r r' U' r z y z' y' x U r' U' r U' r' U l y x' D U x' 4r2 L 3u x' U' U' r2 D' 3l2' U2 x' r u x U' 4r' F U x' 4l' U2 r U' 4r' z' F' 3r U2' 3r' x U' r' U' 4l R' 3u' 4u 3l' U2 3l 3u R2 u r U' U' r' z x' x' x' x' 2-3l' U2 r' F x' U 3r2' R2 U' r2' x U R' R' U' l U x x L U 3r2' x2' 5r U' 3r 4r' 5r' D 5r U 3r' U' 3r U 5r 3r' U r U r' U r U' r' U r U 2L' 5r 5r' 3r2 U 3r 5r2 3r' U' 3r 5r2' U' 4r r' U' r2 4r' 5r2 r' U' r' U' U' 5r' r3 U r' 5r U 5r2' 4r U' 4r' 5r 3r U' 3r' U 3r U' 3r2' U' U' 3r 4r' r2 U r' U' r U' r2' U 4r U' r' U 5r' r U' U' r U2' r' U2' r U r' 3r U2' 3r' U' r U' 4r r' U r' U' r 4r' z' U' L' U L R U' R' u F R' F' R u' 4u L' U' L' U L2 y' u L' U L 3u' L' U L u' y L' U L 4d L' U L 3u y' y U' y' 3u 3u 4u' 4u' U' y 5d 5d' U' U U' L' U L u' R' F R F' R U' R' 3u' d U' R U' R' u' U2 R U' R' 3u' u R U' R2' U' R y' L' U L R' F R F' R U' R' 3u' R' F R F' R U' R' 3u R U' R' u L' U L u' 4u' R' F R F' R U' R' U' d R U' R' u' 4u R' F R F' R U' R' 4u' u R U2' R2' U' R y' R' U2' R U R' U2' R U' L' U2 L U2' L' U L U R U' R' 5r U' 5r' U2 5r U 5r' U U U' R2' D' R U' R' D R U R' D' R U R' D R U R U' R' U' R 3r2' F2 U2' 3r2 R2' U2' F2 3r2 x2 y",
    },
    {
        cubeType: CubeTypes.Six,
        scramble:
            "Dw R2 3Rw2 Bw L' B U' B' 3Fw2 Fw F U Lw2 3Uw2 Fw2 Lw2 U' L' Lw F2 Uw2 Bw' Rw Bw' Dw' Uw2 D 3Fw2 D' Rw' U' B2 L U' Fw B2 Bw2 3Fw' L' 3Fw Lw' B2 Bw2 3Rw' Fw Uw Lw Fw' F Dw 3Rw U2 L' F' R2 F' 3Rw' Dw L 3Fw' Dw2 Lw 3Rw2 Rw2 B2 3Fw D2 3Uw R2 U L Dw 3Fw D' B 3Uw Lw U Dw2 Fw'",
        solution:
            "z x D 3r D' U F l' 3r r' U 3r2' x y x' D' 3r2' y x D x U r' U r' y x U' 3r' y' F' U r U r' U' 3r' 3r U' 3r' U 3r U' 3r' U 3l x U 3r' r U 3r r' x' z U' r' U l z' U' 4r 3r' U' U' 3r 4r' z U' r' U 4l x' U' 3r2 4r2' x z' U' 3l' U2 3l L 3u2' 4u U l' U2 l z U' 3r x' U2 4r2 U' x U x r2' x' L2' U' 3r 4r' 5r' D x' U' 5r' 3r' R2 U 4r 5r' r' U 2-4l' F' U 5r' 3r U' 5r U' r' U' r U' r' U' 3r 3r U 3r' r2 U 4r' 5r' 4r2 U 4r2' U' r' 5r' 3r U' 3r' 5r r' U r 5r' U 5r' 5r 5r' r2 U r2' 5r2 r' U2 r U' U' 5r' 5r' 5r 3r' U' 3r r' U' r U 3r U2' 3r' 5r' 3r U' 3r' U' 5r r' U r2 U' U' 5r' U r' U' U' 5r 3r' U' U' 5r' 3r 3r r' U r U r' U 3r' r U r U' r' U r U2' z' 5d R U' R' 4u' u 3u' y L' U' L' U L2 U' L' U L R U' R' 3u R U' R' 4d L' U L 3-5d' L' U L d' U' L' U L y' y' u R' F R F' R U' R' 3u' u U' R U' R' 3u d' R U' R' y' u R U' R' y 3u' R' F R F' R U' R' 3u U' R' U' R u d U R U' R' u 4u y R U' R2' U' R y' 4u' 3u U' U R U' R' 3u' 4u 3u' y L' U L 3d U 5d' L' U L 4u' U L' U L U d R U' x R' U r' U2' r2 U2' r U2' r' U2 r U2' r2' U2' r' U x' 5d' U' R U R' U' R U R2' U2' R L' U L 5d' U' R U R2' U2' R 5d' L' U L2 F' L' F U2 U' F U R2' D' R U' R' D R2 F' R' U R U' x2",
    },
    {
        cubeType: CubeTypes.Six,
        scramble:
            "3Fw' Lw 3Rw U' Rw B2 U R' B2 Fw' 3Fw Dw2 B F' L R2 B Bw2 Uw' 3Fw U' B2 Bw Rw2 U' F L' Bw 3Fw' R Uw' 3Fw R L' 3Fw2 B' Fw U F2 L2 R 3Uw2 Lw B Bw' Lw2 U' Fw Dw U Uw L R 3Rw B' L B Uw' Lw Rw2 F D F Lw Dw' Lw2 F' Fw L' B2 U' F B Dw Lw D2 B F Rw2 B'",
        solution:
            "x' z' U' 4r U 3r' r 4r2' 3r2 F 4r x' 4l' y U U' 4r' 3r r' U' 4r' 3r U' r 4l' L' U 3r r' U' x' 3r' r 3u x' U U 3r U' U' r' x' 3d' d U l U r' z' 3l' U U 3l 4r U' 4r' z' U 3r' 3r z 3d' d 3r U' U' 3r' y F U' r U' r' z' x' x z r U' r' z' x' x' D' 4r2 U' U' 4r' 3l D' l' z U' U' l' U U l z' x U U l U x' 3r r' U 3r' r U' U' D' 3r2 U 3r' x' U' x' 3r U' 3r' U r' F r2 r U' 4l' U' 4r' U l' x 3l' U U 3l U r U r' U r U' r' U r U r' 3r' 3r 4r' 3r U' 4r 3r' U' 3r r' U x' F 3r' r U 3r U 3r' U r l' U 4l' U U l x' U' 3l' U U 3l x r' U' r x' F l' r U U r' U r U' r' l U 3r 3r' 3r r' U 3r' r U' 3r r' U' 3r' r U' r U r' U' r U' r' U 4l' U' 3l' 4l U r U' x' z 3d' U R U' R' 3u y' U R U' R' U U d d 5d R U' R' u' d2 z' x' z' R U R' F R' F' R d 3d' L' U L 3d d' L' U L u' R U R' F R' F' R u' U' R U' R' z' z' U R U' R' 3u u' 5d U R U' R' 3u' u U' U' R U' R' z 4r2' 3r2 z' R U' R' 4d z x' x z' 3u 5d R U' R' 3d' 4u' 4u 3u' d' U R U' R' u 4u' R U R' 5d' L' U L z2' u U' U' R U' R' u R U R' F R' F' R 3u' U d U R U' R' u' x2' R U R' F R' F' R y 3u' 3d' d U R U' R' d d U R U' R' z' 3r' r l2' x x' U R' U' z' 3u' R U R' F R' F' R 3u R' U R 3u' u U' U' F R' F' R 3u u' R U R' F R' F' R U d R U' R' d' u 4u' F R' F' R u' d z' x' U' U' 3r2' r2 z' R U R' F R' F' R z' 4r2' 3r2 x' F x' F z' L U D R2 U D F' D D U L U' L' R' U' U' R y U' R U R' 5d R U R' L' U L U' R U' U' R' U R U' R' R U R' U' R U' R' F' U' F R U R' U' x R' U R' D D R U' R' D D R2 x' u' u U' x",
    },
    {
        cubeType: CubeTypes.Six,
        scramble:
            "D2 B 3Fw' Rw R2 3Uw D2 3Rw2 B' Lw2 L' Bw2 3Rw Rw2 Dw 3Rw Bw 3Uw2 Bw Fw' R2 Rw' Lw U' F' Bw2 Fw2 U2 Fw2 Uw2 3Uw2 D' Rw 3Fw R' Fw' F U2 Bw2 Dw 3Uw U2 D Rw D2 B D L 3Rw 3Uw Rw F' Fw' Dw L' 3Rw2 Bw' U Fw 3Uw2 Dw2 Fw' Bw2 D2 Dw2 Lw' 3Uw Lw Fw' Uw' F Bw' B' 3Fw' R2 3Rw2 L2 F2 Bw L2",
        solution:
            "x z2 U' r' 4r2 U x' U r U' U' r' U' l' x U r U' x' z' 3r r' 3u u' x' x' F r U r U' 3r r' U' 3r' r 5r' d' z' F U l' U l U' r U r' z' U' 3r' r U' r' z r U' U' r' z' x' 3r' r F 3r r' z u 3r U' U' 3r' z' U' 3r' U r U' x' U r' z U l' U U l z' 4r U' U' l' r' U' r x U 3r r' U 3r' r U l' x U 4l U x 4l U r' D' D' 3r2' r2 U 3r r' U' 3r2 U' 3l2' U 3r' r 4r' 3r U' 4r r' U' r' x' F 4l' U r U' U' x' x U r' U' r U' x' x' 3r U' 3r' x r' U r x' l2' U U l2 x U x' U 4l' U r2 U' U' r' U x' U l' U l U' r U' r' 3r2' r2 U2 3r2' r2 4r 3r' U2 4r' 3r U 3r U' U' 3r' F U U' r U' r2' F' 3r U r U' 3r' F' U' r' F 3r U' r U 3r' x' z' R U' R' u U' F R' F' R u' U L' U L 3u' u y R U' R' U 4u' U 5d' L' U L z2' u U' U' R U' R' d' R U R' F R' F' R d U' L' U L u' U L' U L 4u' 3u R U' R' L' U L u' z' x' z' U' y U F R' F' R 3u u' R U' R' 3u u' z2 U R U' R' 3d' d R U R' F R' F' R d U' F R' F' R 3d' d U' F R' F' R u' z' x' z' u U' R U' R' u' y u' d R U' R' u' d 5d' L' U L z' x' 3r' x' z' R U R' F R' F' R 4u' u U' R U' R' z' x' 3r' r z' U' U' z' 4r 3r2' U R' U' z' R' U R 3u' R U' R' 3u d U F R' F' R u d d U U L' U L u' 3d R U R' F R' F' R 3d' d U' x' D R' D x' 5r x z' x' U' R2 D U 5r U' U' 5r' U L U L' D' U R' U' R2 U' U' R2' U' U' R U R' U' R L' U L 5d R U' R' U 3r U' U' 3r x U U 3r U' U' 3r' U x' F 3r U' U' 3r' U U 3r U' U' 3r' U U 3r' U R U R' F' R U R' U' R' F R2 U' R' U' 2-3Rw2 U U 2-3Rw2 3u 3u 2-3Rw2 3u 3u y2 x'",
    },
    {
        cubeType: CubeTypes.Seven,
        scramble:
            "B' Rw' Lw2 3Rw2 Fw' 3Rw' 3Uw2 Lw2 3Lw' 3Rw B Rw2 U 3Bw' 3Fw2 U' Bw F' Uw R' Lw 3Fw' Fw2 R' 3Rw' 3Uw 3Rw' Fw' 3Lw' R2 B Uw' Rw2 Bw Uw' F2 R B Fw' Rw' Bw 3Bw 3Uw2 3Dw' L2 D2 R 3Rw 3Uw2 3Lw' 3Fw Fw2 B' Rw' 3Rw Lw R U' Rw' 3Bw' 3Rw2 3Bw2 Fw U2 Uw B2 Dw' Lw' Dw2 Rw2 Lw2 Dw Rw' D L' 3Bw 3Fw2 D 3Fw2 3Bw' Rw 3Fw2 Uw2 3Fw2 3Rw L' D 3Bw' 3Fw2 3Lw Rw 3Bw D2 3Uw U 3Dw2 3Rw Rw 3Lw2 3Uw'",
        solution:
            "x' y 4r 3r' U' 4r' 3r 5r U 5r' U' 5r U F r U r' z' F' 4r U' 4r' 3r r' U' r U' r' U' x' 4r' x' U' r2' 5r2 U x' l2' z U' 3r 4r' z' r' z x' 4r U 4r' 3r U x2' 3r' x' D r2 y' U' x' D' U' r' F r2 3r' r U r' U x 3r' U' 3r U' y x' 3r U 4r' x2 U x' U' 4r' z' U2 4l' U2 4l z U x' U' 3r' z' z U' R R' u' R2 u U' x' x' 4r2 U' U' 4r2' x x U r U' r' U x2 U' x' l' 3l' l U2 3l 4l' l' B' l U x l2 F z' 4l' U2 3r z y' U' x' U 4l x' U' 4r' R' F x' l2' x' D' x' R' L' 3l U 5r2 3r2' x' x' r' L F U 6r2 U' 3l' L x' l2' L U' x' 6r U x' L' U' r' 6r U' 6r' 5r U 4r' U' 3r' U' 4r U' 3r' U 3r U' r' U' 5r' 6r' 6r' 3r r' U' r U' r' U' U2 4r x L U' U' 3r U' U' r 6r' U' 6r2 4r2' 3r2 U' 4r r' U' r' U' r' 4r 3r' U 6r' 4r U' 4r' U' r U r' U x' L' U' 5r2 U' 5r2' U' r U r' 6r l' x' 4r2 3r2' U' 4r2 3r2' 5r 4r' U' 4r U' 3r U' 3r' r U r2' 3r U' 6r' r 3r' 4r U' 4r' U' 3r U 3r' 5r 4r' U' l' 3l r U' r U' U' r2' U' 6r r' U' r 6r' U 5r U 4r' U 4r 5r' U' 4r U' r' U r U' 4r' 3r U' 3r' U' 3r U 3r' U' 3r U' 3r' U' r U' U' r' U' r U' r' U r U' U' r' U' r U 4r 3r' U' r' U 4r' 3r 6r2' U R U 3r 6r' U' U' R' U R U r' R2' 6r U R U' x2' U' R U 5r' x' 3l2' U F U' F' 6r 4r 5r R' U R U' 5r' R U' R' U D R' D' r' 3r2 x' x' D R' D' 4r r' R R' F R F' x' U' R U r 3r2' 5r2 x' R' D R' D' U R U' 3r 4r2' 5r U' R U x r l2 3l2' R' U R U' x' 4r 3r' R' U R U' 4r' x 3r' r 4r' U' R' U 6l' U R U' 4r 6l' U' R' U 6l U R U' 3r' U' R' U 6l' U R U' 4l 3l 3l' l R' U' R U 4r' U' R' U 6l' U U' U R U' l' 3l x' 3r U' U 3r' r U' R' U 6l' U R U' r' z' y' R' F R 6d R' U L U L' D U2 R U R' D' R U' R' U R U' R' y U2 R U' R' U R' F R F' L' U L L' U L U L' U L U' x R' U R' D D R U' R' D D R2 y2 x'",
    },
    {
        cubeType: CubeTypes.Seven,
        scramble:
            "Rw2 3Rw' 3Fw2 F' Lw' 3Lw' 3Fw2 B Dw' Fw' B 3Fw2 U2 F' Uw 3Lw Lw' L' B2 U2 Lw2 3Dw2 Dw 3Fw Rw Bw 3Bw 3Lw2 Uw 3Dw2 U B' Bw2 Lw R' 3Dw2 Bw2 Fw2 3Fw2 Dw 3Uw U2 3Rw2 Uw' L2 Rw' F 3Rw2 U2 Rw2 R' 3Uw' F2 Bw2 Rw' 3Dw' Fw2 B' Rw' R L' 3Fw' Uw' 3Uw' Bw2 R' Fw' Bw2 3Rw2 F Dw2 3Fw 3Rw' 3Dw Lw' 3Dw D' Bw' 3Lw' Lw2 F L2 Dw Lw U R 3Lw2 Fw2 Uw' Lw' Bw2 U2 Uw' 3Bw' B' Uw' 3Lw 3Uw Uw Fw",
        solution:
            "y2 U' 4l U 4r F x 5r' U' z F U 3r' r z' d 3l r y U U' x' D U 3r' r z' x U 4r' 3r U 4r 3r' 3l l 3l' U' x' U' l' U l 3r' z' 4r' 3r r R' z' 4r 4r2' 5r x' 3r r' x' z r' z' 3r' r l' U' 4l' 3r U 3r' r U' 3r r' z y U 4r' 3r x U U 3r r' U' U' x' u F 4r z' y' u' x' x U' r' U r B' 3r' r U 3r2' r2 U U 3r' r x' r U r' l' U U l 3r U 3r' l' U l U' l' U' l U' U 3r r' U 3r' r y x' U U 4r' 3r 5r' L U U 3r2' r2 x z 3r U' U' 3r' z' U' x' r U' 4r' 3r z U' r U' U' r' z' F U' U' 3r' r' F U x U' r' U' r U' U' 3l' U x U 4l r' D 5r2' 4r2 U 5r2' 4r3 3r' x U' U 3r' U' U' r F r U' r2' x 4r' 4r 3r' U 3r 3r r' U' 4r' 3r U' U' 4r r' U' 3r' r U 3r r' U 3r' r x' 5r U' U' 5r' 3r U' U' 3r' x' 3l' U' 4r r2' F r2 U 3r' 3r r 4r' 3r U' U' 4r 3r' U r' U' U U U 3r r' U' U' 3r' r U x' 5l' U r l' U l U U 3r r' U U x' 3r' r U' 3r U 3r' U' 3l' U' 3l 5r U' 5r' U r U' r2' D D x r U' x' x U r' U' r U x' 4r r' U r U' 4r' U' 4r 4r' 3r U' U' r' U r U r' U' 3r' r U r U' 5r 4r' U' r' U 5r' 4r U' z' F R' F' R 3u' U U R U' R' 3u U' R U' R' u U' y' R U' R' 3d' U F R' F' R U' d' U' R U' R' u' d z' z' U U' U R U' R' 3u u' 6d R U' R' u 6d' U' F R' F' R 3d' R U' R' U' d' 6d R U' R' 3d' d y U R U' R' z' 4r 3r' z U L' U L z' x' z' U' d' F R' F' R 3u U' 3d' d R U' R' L' U L u' U' U' F R' F' R 4u' u' L' U L u' U' R U' R' z2' d U U R U' R' 4u' 3u U' R U' R' U' R U' R' u' U' 3d R U' R' 3d' 6d' F R' F' R d' R U R' F R' F' R 3u' U y' R U' R' y u' U d L' U L 3d d' 6d' L' U L z' z' u U' U' R U' R' U d y L' U L z' 3r2' r2 z' U R U' R' z' 3l' l' 3r2' r2 x' U U 5r' 4r z' R U R' F R' F' R z 5r 4r' U2 r z R U R' F R' F' R z' 4r 3r' r' U' U' 4r' 3r x' U2 r' z' R U R' F R' F' R u z U R' U' 5r' 4r z' F R' F' R 3u' u d 3d' R U R' F R' F' R 3u u' x y' r U' U' r U' U' x U U r U' U' 5r' U U l U' U' r2' z x' D' L R' D y D R' 6d 6d U R U' R2' U' R U' L U L' U L U' L' y' U' R' U R2 U' R' 6d R' U R R U R' U R U' U' R' R' U U R U' U' R' F R U R' U' R' F' R2 U' y",
    },
    {
        cubeType: CubeTypes.Seven,
        scramble:
            "Bw' Dw F 3Rw2 3Bw2 F2 3Lw' 3Fw' R2 3Fw2 Rw2 3Lw' D 3Bw2 Dw' 3Dw R 3Uw2 F U2 3Bw2 3Fw B' L2 F2 3Bw Dw Lw Fw2 Uw2 Bw 3Lw' B2 Fw' U' 3Rw' R' Bw2 Uw 3Rw2 Dw' U2 3Bw 3Fw2 D U Uw R 3Lw U2 3Lw' Rw R2 Dw2 Lw2 D2 Fw' R2 Dw 3Uw 3Rw2 3Lw Bw 3Lw Bw' 3Bw2 3Dw' 3Fw 3Uw' D2 3Fw2 R Rw 3Rw2 3Fw' F' L' Dw F' 3Rw2 3Fw' D Fw2 3Rw U 3Dw2 Fw 3Uw 3Lw 3Uw2 Rw' 3Uw L2 Uw 3Bw 3Lw' 3Uw F' L2 Dw",
        solution:
            "x' 3r' U' x r' U' x U 3r U' 3r' F' 3l' U 3l l2' y' U r U' r' 4r 3r' x u 3u' 3r U 3r' U' 3r U' x' U l x' U' x 3r2' r2 L2 3d' U x U' 5r' D 5r2 4r2' U' U' 5r2 4r2' x' U l L u z' F' 3r U' 3r' r U r' y' U' F 3r U' 3r' U r U' r' x U' 3r' U 3r U' y U' x' U 4r U' 3r' F U' r' z' U 3r U' U' 3r' x y U x' U 3r' U l z' U' r U' U' r' z U' U' 5r' x' U' U' 4r2' x R' u 3u' R2 u' 3u x' r x' x 4r' 3r x' U' x 3r2' r2 R2' u' R2 u U 3r2' x l U' l' 3l x U' x U' U 3r' F' 3r 3l' U 3l U x U' U' x' r U' 3r U' 4r U' 4r' 3r U 3r' U 3r r' U 3r' r2 U' U' r U' r' x x U' U' 3r2' U' U' 3r2 U' 3r' U 3r U' x' 3l U U' 3r' F' 3r 5r 4r' U 5r' 4r U x' U' 4r U 4r' r U r' U' r U r' U' l' F' U U 3r U' 3r' x U' U' r U' r' U r U r' U 3r' U' U' 3r 3r' F' 3r U' r U x' r U' U' r2' x 3r' U 3r 4r 3r' U 4r' 3r U' l' U' l U r' U r 3r' U' U' 3r U' 3r U' 3r' 5r U 5r' 4r U' 4r' r' U' U' r U F 3r U' 3r' U' l' U' l U U x 3r' U' 3r U' 3r' U 3r U' 3r' U 3r r' U' r U' x' x U' l U l' U' l U' l' U' 3r' U 3r U 3r' r U 3r r' U' r' U r U' 4r' 3r U U 4r 3r' U' r' U' r U r' U' r U' U' x' r U 3r r' U' r' U 3r' r U' U' R' 3u' U' R' U R d' y u' U R U' R' 4u' 5u y' y L' U L 3u' L' U L y u' y' R U R' F R' F' R z2' 3d U' U' y' U' R' U R U' d' U R U' R' d U' R U' R' z2' u' u 3u' 4u U' R U' R' y' 4u' 5u U R U' R' 3u' R' U R 3u' 4u U' R U' R' y 3u 4u' R U' R' u' u' R' U' R y u' U d U R U' R' y x x u u U' y U' L' U L u' d y' r' r R' U R y u' 3u R U' R' 3u' 4u L' U L 3d' U' R R' U' U R U' R' 3u 3u' u d' y' u 3u' U' R U' R' U' U R U' R' y' u' 3u R U R' F R' F' R u u 3u U' R U' R' u' z' 3r' r x' U U' x 3r2' r2 U' R' U x R' U R U' 3r2' r2 U' U' x r' U' R U R' x U R' U' r x' 3r 3r' U U x' 3r2 r2' U' R U R' x U R' U' 3r2' x' U' R U R' x U R' U' x r2 x 3r2' F2 U' U' 3r2' U' U' F2 3r2 x' r U' R' U 6l' U R U' r' r' U' R U R' x U R' U' r x' U x' y' D y' R' U y' U y' R U' R' y' U L U' L' U U L' U U L U L' U' L 6d R' U R U' R' U R 6d' U' R U' U' R2' U' R2 y R U' R' F' U U' R' U' R U' R' U2 R F R U R' U' F' U x R' U R' D2 R U' R' D2 R2 x",
    },
    {
        cubeType: CubeTypes.Seven,
        scramble:
            "3Uw Rw2 3Fw' 3Lw' F 3Lw B' 3Fw' 3Rw 3Dw B2 3Uw Lw2 3Bw' Fw Rw2 F' 3Dw' 3Rw2 3Lw' Uw' Rw Lw 3Uw2 Rw Fw2 Uw 3Uw 3Lw2 D 3Fw Uw U2 R Bw' 3Fw' Rw2 Bw2 F 3Fw 3Lw U 3Uw2 3Rw Bw' R F2 3Fw2 R' Lw2 3Uw 3Fw2 Uw2 F' 3Fw' 3Lw2 D2 3Rw B' 3Uw' Dw' 3Bw 3Lw Uw Bw B' D2 Bw 3Fw' 3Rw2 U R 3Fw 3Dw D2 R' U2 3Uw' D' F D Fw' B2 3Uw 3Rw2 Rw D2 U2 F2 B L 3Rw Dw2 3Bw B2 3Dw' D2 Lw' 3Uw' 3Rw",
        solution:
            "z2 3r' U' 4r U' 5r U' 5r' 3r U 3r' x' U' U' r2' D 3r' U' 3r' r U 3r r' r2 U' U' r2' U r2 r2 y D' y D' U' 4r 3r' U' 4r' 3r r2 U' 3r' F 3r U x U r' U' r x z' U 4r 3r' z' 3r U' 3r' U 3r U' U' 3r U 3r' z U 5r U2' 5r' z' F2 r' y' U2 3r U' 3r' U l' U l z x U' r' U' r x' 4r' 3r z' 3r U' U' 3r' z U 4r 3r' r x' D' l' z' 3l' U2 3l z U' U' 4r' r U' x' 3r 4r' U' U' r2' x z' l' U2 l z x U x U' 3r 4r2' l x' x z' u2' U r U' U' r' z F R2 U 4l r' 5r U x 6r' r' r 3r2' U' r' R U' 4r2 6r' F' R U' 6r' 3r' R2 U 5r 6r' U' r' 6r' D 6r2 6r U 6r U 3r2' U r U r' U' 6r2 6r U' 3r' U r' U r U' 4r 6r U 6r U' U' 6r' U' U' 6r 3r' U U 3r U' 5r2' 6r' U U 3r U' 3r' U' r' U r 6r' 5r U 5r' U' 3r' U' 6r' U' 3r U 3r' U r2' 6r U 5r' U r U' 5r 6r' U' 3r U 3r' U' 6r 4r 6r' U' U' r U r' 3l' L U' 3r' U' 3r U' 6r' 5r U2 2L' 6r U 3r' U 3r 6r' 6r U' r' U r U' U U' 3r2' U' U' 3r2 6r' 3r U 3r' 5r 4r' U' 5r' 4r 6r r' U' 6r' r U r' U2' r U' 3r U 3r' r U' r' U r U r' U 6r 3r' U' U' 3r 6r' U r U' r' U 4r U' 4r' 3r U' U' 3r' U 3r U' U' 3r' U U r U' 4r 3r' U2' 4r' 3r U' U' r' U r U' U' r' z' U' u U' R U' R' u' 3u 4u' 3d' R' F R F' R U' R' u' D' R U R U' R2' D y L' U L 3u 4u' y u 3u 3u' u 5u' 6d R U' R' 4u' U R U' R' u 3u' U' R' U R2 U' R' u' U U R U' R' 5u' R' F R F' R U' R' 4u d U y' R u' u U' R' y' R U' R' L' U' L u2 3u2' 5u U' R U' R' u 3u 4u' R U' R2' U' R y' L' U L u' R' F R F' R U' R' u U' U F U' F' u 3u' U R U' R' u' 3u 6d R U' R' 4u 3u' U U R U' R' 3u 3d' 3u' R' F R F' R U' R' 3u 3u 3u' u U L' U L u' R U' R' F r' U' U' r2 U' U' r U2' r' U2 r U2' r2' U2' r' F' U y U R U' R' U R U R' D' U' L U2 L' 6u U R U' R' y R U' R' U2 L F' L' F L' U L U' U' L' U L x' R2 U2' R' U2' x R' U R U' L U' L' U R' x2 y",
    },
    {
        cubeType: CubeTypes.Seven,
        scramble:
            "L2 3Rw' Dw 3Uw R' Fw 3Rw Uw' 3Uw D' 3Lw2 Dw' Rw2 3Lw' F 3Dw2 U 3Uw2 3Rw 3Dw' L Rw B' Uw2 3Bw' B' Rw' Fw' B' Lw 3Lw 3Dw' 3Fw Uw2 D' 3Rw2 R' 3Lw2 Dw' 3Lw' B2 R' D R 3Fw2 3Lw2 Lw2 Fw' Bw' 3Uw' Lw2 Bw' U2 3Fw2 Uw' 3Rw 3Bw2 R' 3Rw' Uw2 3Bw' D' Lw' L' R2 U2 3Fw2 Uw2 Bw B F' D 3Rw Dw2 Fw2 Uw' R 3Fw 3Rw2 L' 3Bw2 F2 Uw Rw' Lw' Dw R2 F' Uw2 R Dw2 3Rw 3Uw R' Bw F Uw2 U 3Rw' 3Lw'",
        solution:
            "y' z U' 5r 3r2' x U F 3r2' x U' r U r' x x' D' 5r2' 4r2 U 5r 4r' 6d' x' U 3r U 3r U 3r' F' x' 3r r' U' z' x U' r' U' r x' z x' F F 3r' U' U' r2' x z' U U U 3r r' x U U l U' l' U l F 5r 4r' U' 5r' 4r 6r' 3u' u r U' U' r' z' z' F r U' r' U' F' r U' r' y 5r 4r' U 5r' 4r U' 3r r' U 3r' r z x' 5r 4r' U 4r' r z' U 3r r' U U 3r' r x y x 4r' 6d' l' U' l U l' U l 6d' x r U 4r' U' U' r2 x' z U 5r 4r' U U 5r' 4r z x' D x r' U' 5l U' 3r' D 5r' 5r2' 4r2 x z' r U' U' r' z x' r U' U' r' 4r' U 3l' 3r' r U 3r r' U' 4r r' U r 4r' U' U U' 3r' U' U' 3r U' 5r U' 5l' U 3r 3r' r' r 3r' 4r U 4r' 3r r U' U' r' U' l' x U' x' U' 3r U 3r' U 3r2' r2 U 3r r' x' x' r U' r 3r' r U' 3r r' x' r' 5l' U' r U' B 3r' U' 3r r2' U 3r' U' 3r U x' U U' 3r U 3r' U 3r U 3r' U U l' l x' x r U' r' 3r' F F 3r x' x r' U' 3r U' U' 4r' 3r U' 4r 3r2' r U x' 4r U' U' 4r' 5r U l' U' r U' r' U r U r' U' x' U U 3l' U' 4r U x' U' 4l' U' 3r U r' l' U' l U r U 3r' U' 3r U r' U r U' r' U r x' F' 4r 3r' U' 4r' 3r U' 5r U' r' U r 5r' U r U r' U U 3r r' U' 3r' r U' 5r 4r' U2 5r' 4r2 3r' U2 4r' 3r U r U r' U U r U r' 3r U' U' 3r' 4r 3r' U2 4r' 3r U 5l' U' 5r' r U r U' x' 5r r' U' L' U L 3u U' R U' R' u L' U L 3d U' L' U L d L' U L d 6d R U' R' z' x' z' u' R U R' F R' F' R 6d R U' R' z' x' 3r r' z u U' L' U L 3u' U y L' U L 3d d U U F R' F' R u' U R U' R' z2' 3d' U U F R' F' R 3d d d L' U L R U R' F R' F' R u U' R R' F R' F' R u U' d' U' L' U L d 3d' u' z' z R U' R' u U' L' U L z' x' 4r' 3r z L' U L y' 3u u' z2' U' R U' R' 3d' R U R' F R' F' R 3u' 3d R U' R' z' z' u' 3u' U L' U L z' 4r 3r' z R U R' F R' F' R 5d' 6d R U' R' z' 4r2' 3r2 z U R R' F R' F' R 3u' d R' U R z x' x U U l' x' z' R U R' F R' F' R y' R U R' F R' F' R d 3d' d R U R' F R' F' R 3d d' U' 6d' R U' R' 3u u' y' R U R' F R' F' R u' u z' x' 4r' 5r U x' F r2 x' z' R U R' F R' F' R u' u' z x U x' D' 6d' D 6r U' 6r' y R U R2' U' R D' R U' R' U L' U L D' U L' U L U' L' U L D U' U' R U R' U R U' U' R' U R2' D' R U' U' R' D R U' U' R U' U' y2 x'",
    },
];
