import type { MegaminxFace, MegaminxMove, MegaminxMoveSuffix, MegaminxTurn } from './types';
import { MegaminxFaceOrder } from './types';

const faceSymbols = new Set<string>(MegaminxFaceOrder);
const suffixToAmount = new Map<MegaminxMoveSuffix, MegaminxTurn['amount']>([
  ['', 1],
  ["'", -1],
  ['2', 2],
  ["2'", -2],
  ['++', 2],
  ['--', -2],
]);

const amountToSuffix = new Map<MegaminxTurn['amount'], MegaminxMoveSuffix>([
  [1, ''],
  [-1, "'"],
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
  const suffix = amountToSuffix.get(-turn.amount as MegaminxTurn['amount']) as MegaminxMoveSuffix;

  return `${turn.face}${suffix}` as MegaminxMove;
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
  return megaminxMoveToTurn(move).face;
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
  const amount = suffixToAmount.get(suffix) as MegaminxTurn['amount'];

  return { amount, face: face as MegaminxFace };
}
