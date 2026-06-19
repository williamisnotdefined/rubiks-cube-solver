import { PyraminxFaces, PyraminxMoves } from './types';
import type { PyraminxFace, PyraminxMove, PyraminxTurn } from './types';

const moveToTurn = new Map<PyraminxMove, PyraminxTurn>([
  [PyraminxMoves.U, { vertex: PyraminxFaces.U, tip: false, prime: false }],
  [PyraminxMoves.UP, { vertex: PyraminxFaces.U, tip: false, prime: true }],
  [PyraminxMoves.L, { vertex: PyraminxFaces.L, tip: false, prime: false }],
  [PyraminxMoves.LP, { vertex: PyraminxFaces.L, tip: false, prime: true }],
  [PyraminxMoves.R, { vertex: PyraminxFaces.R, tip: false, prime: false }],
  [PyraminxMoves.RP, { vertex: PyraminxFaces.R, tip: false, prime: true }],
  [PyraminxMoves.B, { vertex: PyraminxFaces.B, tip: false, prime: false }],
  [PyraminxMoves.BP, { vertex: PyraminxFaces.B, tip: false, prime: true }],
  [PyraminxMoves.u, { vertex: PyraminxFaces.U, tip: true, prime: false }],
  [PyraminxMoves.uP, { vertex: PyraminxFaces.U, tip: true, prime: true }],
  [PyraminxMoves.l, { vertex: PyraminxFaces.L, tip: true, prime: false }],
  [PyraminxMoves.lP, { vertex: PyraminxFaces.L, tip: true, prime: true }],
  [PyraminxMoves.r, { vertex: PyraminxFaces.R, tip: true, prime: false }],
  [PyraminxMoves.rP, { vertex: PyraminxFaces.R, tip: true, prime: true }],
  [PyraminxMoves.b, { vertex: PyraminxFaces.B, tip: true, prime: false }],
  [PyraminxMoves.bP, { vertex: PyraminxFaces.B, tip: true, prime: true }],
]);

const inverseMoves = new Map<PyraminxMove, PyraminxMove>([
  [PyraminxMoves.U, PyraminxMoves.UP],
  [PyraminxMoves.UP, PyraminxMoves.U],
  [PyraminxMoves.L, PyraminxMoves.LP],
  [PyraminxMoves.LP, PyraminxMoves.L],
  [PyraminxMoves.R, PyraminxMoves.RP],
  [PyraminxMoves.RP, PyraminxMoves.R],
  [PyraminxMoves.B, PyraminxMoves.BP],
  [PyraminxMoves.BP, PyraminxMoves.B],
  [PyraminxMoves.u, PyraminxMoves.uP],
  [PyraminxMoves.uP, PyraminxMoves.u],
  [PyraminxMoves.l, PyraminxMoves.lP],
  [PyraminxMoves.lP, PyraminxMoves.l],
  [PyraminxMoves.r, PyraminxMoves.rP],
  [PyraminxMoves.rP, PyraminxMoves.r],
  [PyraminxMoves.b, PyraminxMoves.bP],
  [PyraminxMoves.bP, PyraminxMoves.b],
]);

export class PyraminxNotationError extends Error {
  token: string;

  constructor(token: string) {
    super(`Invalid Pyraminx move notation token: ${token}`);
    this.name = 'PyraminxNotationError';
    this.token = token;
  }
}

export function isPyraminxMove(value: string): value is PyraminxMove {
  return moveToTurn.has(value as PyraminxMove);
}

export function pyraminxMoveToTurn(move: PyraminxMove): PyraminxTurn {
  const turn = moveToTurn.get(move);
  if (!turn) {
    throw new PyraminxNotationError(move);
  }

  return turn;
}

export function reversePyraminxMove(move: PyraminxMove): PyraminxMove {
  const inverse = inverseMoves.get(move);
  if (!inverse) {
    throw new PyraminxNotationError(move);
  }

  return inverse;
}

export function parsePyraminxAlgorithm(input: string): PyraminxMove[] {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return [];
  }

  return trimmed.split(/\s+/).map((token) => {
    if (!isPyraminxMove(token)) {
      throw new PyraminxNotationError(token);
    }

    return token;
  });
}

export function invertPyraminxAlgorithm(moves: readonly PyraminxMove[]): PyraminxMove[] {
  return moves.slice().reverse().map(reversePyraminxMove);
}

export function pyraminxVertexForMove(move: PyraminxMove): PyraminxFace {
  return pyraminxMoveToTurn(move).vertex;
}
