import type { MegaminxFace, MegaminxMove, MegaminxMoveSuffix, MegaminxTurn, MegaminxWcaWideTurn } from './types';
import { MegaminxFaceOrder, MegaminxFaces } from './types';

const faceSymbols = new Set<string>(MegaminxFaceOrder);
type MegaminxTurnAmount = -2 | -1 | 1 | 2;

const suffixToAmount = new Map<MegaminxMoveSuffix, MegaminxTurnAmount>([
  ['', 1],
  ["'", -1],
  ['2', 2],
  ["2'", -2],
  ['++', 2],
  ['--', -2],
]);

const amountToFaceSuffix = new Map<MegaminxTurnAmount, MegaminxMoveSuffix>([
  [1, ''],
  [-1, "'"],
  [2, '2'],
  [-2, "2'"],
]);

const amountToWcaSuffix = new Map<MegaminxWcaWideTurn['amount'], MegaminxMoveSuffix>([
  [2, '++'],
  [-2, '--'],
]);

export class MegaminxNotationError extends Error {
  token: string;

  constructor(token: string) {
    super(`Invalid Megaminx move notation token: ${token}`);
    this.name = 'MegaminxNotationError';
    this.token = token;
  }
}

export function isMegaminxMove(value: string): value is MegaminxMove {
  return parseMegaminxMove(value) != null;
}

export function megaminxMoveToTurn(move: MegaminxMove): MegaminxTurn {
  const turn = parseMegaminxMove(move);
  if (!turn) {
    throw new MegaminxNotationError(move);
  }

  return turn;
}

export function reverseMegaminxMove(move: MegaminxMove): MegaminxMove {
  const turn = megaminxMoveToTurn(move);
  const suffix =
    turn.kind === 'wca-wide'
      ? (amountToWcaSuffix.get(-turn.amount as MegaminxWcaWideTurn['amount']) as MegaminxMoveSuffix)
      : (amountToFaceSuffix.get(-turn.amount as MegaminxTurnAmount) as MegaminxMoveSuffix);

  return `${megaminxFaceForMove(move)}${suffix}` as MegaminxMove;
}

export function parseMegaminxAlgorithm(input: string): MegaminxMove[] {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return [];
  }

  return trimmed.split(/\s+/).map((token) => {
    if (!isMegaminxMove(token)) {
      throw new MegaminxNotationError(token);
    }

    return token;
  });
}

export function invertMegaminxAlgorithm(moves: readonly MegaminxMove[]): MegaminxMove[] {
  return moves.slice().reverse().map(reverseMegaminxMove);
}

export function megaminxFaceForMove(move: MegaminxMove): MegaminxFace {
  const turn = megaminxMoveToTurn(move);
  return turn.kind === 'face' ? turn.face : turn.axis;
}

function parseMegaminxMove(value: string): MegaminxTurn | undefined {
  const result = /^([A-Z])((?:2')|(?:\+\+)|(?:--)|(?:2)|(?:'))?$/.exec(value);
  if (!result) {
    return undefined;
  }

  const face = result[1];
  if (!faceSymbols.has(face)) {
    return undefined;
  }

  const suffix = (result[2] ?? '') as MegaminxMoveSuffix;
  const amount = suffixToAmount.get(suffix) as MegaminxTurnAmount;

  if ((face === MegaminxFaces.R || face === MegaminxFaces.D) && (suffix === '++' || suffix === '--')) {
    return {
      amount: amount as MegaminxWcaWideTurn['amount'],
      axis: face,
      fixedFace: face === MegaminxFaces.R ? MegaminxFaces.L : MegaminxFaces.U,
      kind: 'wca-wide',
    };
  }

  if (suffix === '++' || suffix === '--') {
    return undefined;
  }

  return { amount, face: face as MegaminxFace, kind: 'face' };
}
