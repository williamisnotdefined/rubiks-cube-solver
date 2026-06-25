import type { Square1CoordinateMove, Square1Move } from './types';

const minCoordinateUnits = -5;
const maxCoordinateUnits = 6;

export class Square1NotationError extends Error {
  token: string;

  constructor(token: string) {
    super(`Invalid Square-1 move notation token: ${token}`);
    this.name = 'Square1NotationError';
    this.token = token;
  }
}

export function isSquare1MoveToken(value: string): boolean {
  return parseSquare1MoveToken(value) != null;
}

export function parseSquare1MoveToken(value: string): Square1Move | undefined {
  try {
    const moves = parseSquare1Algorithm(value);
    return moves.length === 1 ? moves[0] : undefined;
  } catch {
    return undefined;
  }
}

export function parseSquare1Algorithm(input: string): Square1Move[] {
  const moves: Square1Move[] = [];
  let index = skipWhitespace(input, 0);

  while (index < input.length) {
    const parsed = parseMoveAt(input, index);
    if (!parsed) {
      throw new Square1NotationError(readInvalidToken(input, index));
    }
    moves.push(parsed.move);
    index = skipWhitespace(input, parsed.nextIndex);
  }

  return moves;
}

export function invertSquare1Algorithm(moves: readonly Square1Move[]): Square1Move[] {
  return moves.slice().reverse().map(reverseSquare1Move);
}

export function reverseSquare1Move(move: Square1Move): Square1Move {
  if (move.kind === 'slash') {
    return { kind: 'slash' };
  }

  return {
    bottom: normalizeSignedCoordinate(-move.bottom),
    kind: 'coordinate',
    top: normalizeSignedCoordinate(-move.top),
  };
}

export function square1MoveToString(move: Square1Move): string {
  return move.kind === 'slash' ? '/' : `(${move.top},${move.bottom})`;
}

function parseMoveAt(input: string, index: number): { move: Square1Move; nextIndex: number } | undefined {
  if (input[index] === '/') {
    return { move: { kind: 'slash' }, nextIndex: index + 1 };
  }

  const coordinatePattern = /\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/y;
  coordinatePattern.lastIndex = index;
  const match = coordinatePattern.exec(input);
  if (!match) {
    return undefined;
  }

  const top = Number(match[1]);
  const bottom = Number(match[2]);
  if (!isValidCoordinate(top) || !isValidCoordinate(bottom)) {
    return undefined;
  }

  return {
    move: { bottom, kind: 'coordinate', top } satisfies Square1CoordinateMove,
    nextIndex: coordinatePattern.lastIndex,
  };
}

function isValidCoordinate(value: number): boolean {
  return Number.isInteger(value) && value >= minCoordinateUnits && value <= maxCoordinateUnits;
}

function normalizeSignedCoordinate(value: number): number {
  const normalized = ((value % 12) + 12) % 12;
  return normalized > 6 ? normalized - 12 : normalized;
}

function skipWhitespace(input: string, index: number): number {
  let nextIndex = index;
  while (nextIndex < input.length && /\s/.test(input[nextIndex])) {
    nextIndex++;
  }
  return nextIndex;
}

function readInvalidToken(input: string, index: number): string {
  const rest = input.slice(index).trimStart();
  const token = rest.split(/\s+/)[0];
  return token.length > 0 ? token : input;
}
