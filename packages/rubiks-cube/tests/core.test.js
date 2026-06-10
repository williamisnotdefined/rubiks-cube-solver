import { expect, test } from 'vitest';
import { CubeTypes, isMovement, IsRotation, Movements, reverse, Rotations, translate } from '../src/core';

test("reverse 5B -> 5B'", () => {
    expect(Movements.Five.B).toBe(reverse(Movements.Five.BP));
});

test("reverse 2Uw -> 2Uw'", () => {
    expect(Movements.Two.Uw).toBe(reverse(Movements.Two.UwP));
});

test("reverse f -> f'", () => {
    expect(Movements.Wide.f).toBe(reverse(Movements.Wide.fP));
});

test("reverse 2-3f -> 2-3f'", () => {
    expect('2-3f').toBe(reverse("2-3f'"));
});

test("reverse U -> U'", () => {
    expect(Movements.Single.U).toBe(reverse(Movements.Single.UP));
});

test('translate u -> 5u', () => {
    expect(Movements.Five.u).toBe(translate(Movements.Wide.u, CubeTypes.Six));
});

test('translate Rw -> 4Rw', () => {
    expect(Movements.Four.u).toBe(translate(Movements.Wide.u, CubeTypes.Five));
});

test('translate l -> 6l', () => {
    expect(Movements.Six.u).toBe(translate(Movements.Wide.u, CubeTypes.Seven));
});

const allMovements = Object.values(Movements).flatMap((group) => (typeof group === 'object' ? Object.values(group) : []));
test.each(allMovements)('IsMovement %s', (movement) => {
    expect(isMovement(movement)).toBe(true);
});

const allRotations = Object.values(Rotations);
test.each(allRotations)('IsRotation %s', (rotation) => {
    expect(IsRotation(rotation)).toBe(true);
});

const rangeableBases = [...Object.values(Movements.Wide), ...Object.values(Movements.Single)];
const layerRanges = [];
for (let lower = 1; lower <= 6; lower++) {
    for (let upper = lower + 1; upper <= 7; upper++) {
        layerRanges.push([lower, upper]);
    }
}
const allRangeMovements = layerRanges.flatMap(([lower, upper]) => rangeableBases.map((base) => Movements.Range(lower, upper, base)));
test.each(allRangeMovements)('IsMovement Range %s', (movement) => {
    expect(isMovement(movement)).toBe(true);
});
