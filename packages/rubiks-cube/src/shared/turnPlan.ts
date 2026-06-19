// Animation-only data for renderers. This is not a puzzle move model or BaseMove.
export type TurnPlan = {
  axis: { x: number; y: number; z: number };
  angleRadians: number;
  pieceIds: string[];
};
