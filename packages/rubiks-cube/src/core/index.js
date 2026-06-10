// @ts-check

/**
 * reverses the direction of a movement or rotation
 * @template {Movement | Rotation} T
 * @param {T} action
 * @returns {T}
 * */
export function reverse(action) {
    let reversedAction = action;
    if (action.at(-1) === "'") {
        reversedAction = /** @type {T} */ (action.slice(0, -1));
    } else {
        const newAction = /** @type {T} */ (action + "'");
        reversedAction = newAction;
    }
    return reversedAction;
}

/**
 * Translates notation meant for a 3x3 into notation a big cube. This is so that 3x3 algorithms can be used on a big cube if desired. eg. for a 6x6 r -> 5r
 * @template {Movement | Rotation} T
 * @param {T} action
 * @param {CubeType} cubeType
 * @returns {T}
 * */
export function translate(action, cubeType) {
    if (Object.values(Movements.Wide).includes(/** @type {WideMove} **/ (action))) {
        return /** @type {T}  */ (LayerCount[cubeType] - 1 + action);
    }
    return action;
}

/**
 * @typedef {typeof Movements.Single[keyof typeof Movements.Single]} SingleMove
 * @typedef {typeof Movements.Wide[keyof typeof Movements.Wide]} WideMove
 * @typedef {typeof Movements.Two[keyof typeof Movements.Two]} TwoMove
 * @typedef {typeof Movements.Three[keyof typeof Movements.Three]} ThreeMove
 * @typedef {typeof Movements.Four[keyof typeof Movements.Four]} FourMove
 * @typedef {typeof Movements.Five[keyof typeof Movements.Five]} FiveMove
 * @typedef {typeof Movements.Six[keyof typeof Movements.Six]} SixMove
 * @typedef {SingleMove | WideMove | TwoMove | ThreeMove | FourMove | FiveMove | SixMove} Movement
 */
export const Movements = Object.freeze({
    Single: Object.freeze({
        R: 'R',
        R2: 'R2',
        RP: "R'",
        L: 'L',
        L2: 'L2',
        LP: "L'",
        U: 'U',
        U2: 'U2',
        UP: "U'",
        D: 'D',
        D2: 'D2',
        DP: "D'",
        F: 'F',
        F2: 'F2',
        FP: "F'",
        B: 'B',
        B2: 'B2',
        BP: "B'",
        M: 'M',
        M2: 'M2',
        MP: "M'",
        E: 'E',
        E2: 'E2',
        EP: "E'",
        S: 'S',
        S2: 'S2',
        SP: "S'",
    }),
    Wide: Object.freeze({
        Rw: 'Rw',
        Rw2: 'Rw2',
        RwP: "Rw'",
        r: 'r',
        r2: 'r2',
        rP: "r'",
        Lw: 'Lw',
        Lw2: 'Lw2',
        LwP: "Lw'",
        l: 'l',
        l2: 'l2',
        lP: "l'",
        Fw: 'Fw',
        Fw2: 'Fw2',
        FwP: "Fw'",
        f: 'f',
        f2: 'f2',
        fP: "f'",
        Bw: 'Bw',
        Bw2: 'Bw2',
        BwP: "Bw'",
        b: 'b',
        b2: 'b2',
        bP: "b'",
        Uw: 'Uw',
        Uw2: 'Uw2',
        UwP: "Uw'",
        u: 'u',
        u2: 'u2',
        uP: "u'",
        Dw: 'Dw',
        Dw2: 'Dw2',
        DwP: "Dw'",
        d: 'd',
        d2: 'd2',
        dP: "d'",
    }),
    Two: Object.freeze({
        Rw: '2Rw',
        Rw2: '2Rw2',
        RwP: "2Rw'",
        r: '2r',
        r2: '2r2',
        rP: "2r'",
        R: '2R',
        R2: '2R2',
        RP: "2R'",
        Lw: '2Lw',
        Lw2: '2Lw2',
        LwP: "2Lw'",
        l: '2l',
        l2: '2l2',
        lP: "2l'",
        L: '2L',
        L2: '2L2',
        LP: "2L'",
        Fw: '2Fw',
        Fw2: '2Fw2',
        FwP: "2Fw'",
        f: '2f',
        f2: '2f2',
        fP: "2f'",
        F: '2F',
        F2: '2F2',
        FP: "2F'",
        Bw: '2Bw',
        Bw2: '2Bw2',
        BwP: "2Bw'",
        b: '2b',
        b2: '2b2',
        bP: "2b'",
        B: '2B',
        B2: '2B2',
        BP: "2B'",
        Uw: '2Uw',
        Uw2: '2Uw2',
        UwP: "2Uw'",
        u: '2u',
        u2: '2u2',
        uP: "2u'",
        U: '2U',
        U2: '2U2',
        UP: "2U'",
        Dw: '2Dw',
        Dw2: '2Dw2',
        DwP: "2Dw'",
        d: '2d',
        d2: '2d2',
        dP: "2d'",
        D: '2D',
        D2: '2D2',
        DP: "2D'",
    }),
    Three: Object.freeze({
        Rw: '3Rw',
        Rw2: '3Rw2',
        RwP: "3Rw'",
        r: '3r',
        r2: '3r2',
        rP: "3r'",
        R: '3R',
        R2: '3R2',
        RP: "3R'",
        Lw: '3Lw',
        Lw2: '3Lw2',
        LwP: "3Lw'",
        l: '3l',
        l2: '3l2',
        lP: "3l'",
        L: '3L',
        L2: '3L2',
        LP: "3L'",
        Fw: '3Fw',
        Fw2: '3Fw2',
        FwP: "3Fw'",
        f: '3f',
        f2: '3f2',
        fP: "3f'",
        F: '3F',
        F2: '3F2',
        FP: "3F'",
        Bw: '3Bw',
        Bw2: '3Bw2',
        BwP: "3Bw'",
        b: '3b',
        b2: '3b2',
        bP: "3b'",
        B: '3B',
        B2: '3B2',
        BP: "3B'",
        Uw: '3Uw',
        Uw2: '3Uw2',
        UwP: "3Uw'",
        u: '3u',
        u2: '3u2',
        uP: "3u'",
        U: '3U',
        U2: '3U2',
        UP: "3U'",
        Dw: '3Dw',
        Dw2: '3Dw2',
        DwP: "3Dw'",
        d: '3d',
        d2: '3d2',
        dP: "3d'",
        D: '3D',
        D2: '3D2',
        DP: "3D'",
    }),
    Four: Object.freeze({
        Rw: '4Rw',
        Rw2: '4Rw2',
        RwP: "4Rw'",
        r: '4r',
        r2: '4r2',
        rP: "4r'",
        R: '4R',
        R2: '4R2',
        RP: "4R'",
        Lw: '4Lw',
        Lw2: '4Lw2',
        LwP: "4Lw'",
        l: '4l',
        l2: '4l2',
        lP: "4l'",
        L: '4L',
        L2: '4L2',
        LP: "4L'",
        Fw: '4Fw',
        Fw2: '4Fw2',
        FwP: "4Fw'",
        f: '4f',
        f2: '4f2',
        fP: "4f'",
        F: '4F',
        F2: '4F2',
        FP: "4F'",
        Bw: '4Bw',
        Bw2: '4Bw2',
        BwP: "4Bw'",
        b: '4b',
        b2: '4b2',
        bP: "4b'",
        B: '4B',
        B2: '4B2',
        BP: "4B'",
        Uw: '4Uw',
        Uw2: '4Uw2',
        UwP: "4Uw'",
        u: '4u',
        u2: '4u2',
        uP: "4u'",
        U: '4U',
        U2: '4U2',
        UP: "4U'",
        Dw: '4Dw',
        Dw2: '4Dw2',
        DwP: "4Dw'",
        d: '4d',
        d2: '4d2',
        dP: "4d'",
        D: '4D',
        D2: '4D2',
        DP: "4D'",
    }),
    Five: Object.freeze({
        Rw: '5Rw',
        Rw2: '5Rw2',
        RwP: "5Rw'",
        r: '5r',
        r2: '5r2',
        rP: "5r'",
        R: '5R',
        R2: '5R2',
        RP: "5R'",
        Lw: '5Lw',
        Lw2: '5Lw2',
        LwP: "5Lw'",
        l: '5l',
        l2: '5l2',
        lP: "5l'",
        L: '5L',
        L2: '5L2',
        LP: "5L'",
        Fw: '5Fw',
        Fw2: '5Fw2',
        FwP: "5Fw'",
        f: '5f',
        f2: '5f2',
        fP: "5f'",
        F: '5F',
        F2: '5F2',
        FP: "5F'",
        Bw: '5Bw',
        Bw2: '5Bw2',
        BwP: "5Bw'",
        b: '5b',
        b2: '5b2',
        bP: "5b'",
        B: '5B',
        B2: '5B2',
        BP: "5B'",
        Uw: '5Uw',
        Uw2: '5Uw2',
        UwP: "5Uw'",
        u: '5u',
        u2: '5u2',
        uP: "5u'",
        U: '5U',
        U2: '5U2',
        UP: "5U'",
        Dw: '5Dw',
        Dw2: '5Dw2',
        DwP: "5Dw'",
        d: '5d',
        d2: '5d2',
        dP: "5d'",
        D: '5D',
        D2: '5D2',
        DP: "5D'",
    }),
    Six: Object.freeze({
        Rw: '6Rw',
        Rw2: '6Rw2',
        RwP: "6Rw'",
        r: '6r',
        r2: '6r2',
        rP: "6r'",
        R: '6R',
        R2: '6R2',
        RP: "6R'",
        Lw: '6Lw',
        Lw2: '6Lw2',
        LwP: "6Lw'",
        l: '6l',
        l2: '6l2',
        lP: "6l'",
        L: '6L',
        L2: '6L2',
        LP: "6L'",
        Fw: '6Fw',
        Fw2: '6Fw2',
        FwP: "6Fw'",
        f: '6f',
        f2: '6f2',
        fP: "6f'",
        F: '6F',
        F2: '6F2',
        FP: "6F'",
        Bw: '6Bw',
        Bw2: '6Bw2',
        BwP: "6Bw'",
        b: '6b',
        b2: '6b2',
        bP: "6b'",
        B: '6B',
        B2: '6B2',
        BP: "6B'",
        Uw: '6Uw',
        Uw2: '6Uw2',
        UwP: "6Uw'",
        u: '6u',
        u2: '6u2',
        uP: "6u'",
        U: '6U',
        U2: '6U2',
        UP: "6U'",
        Dw: '6Dw',
        Dw2: '6Dw2',
        DwP: "6Dw'",
        d: '6d',
        d2: '6d2',
        dP: "6d'",
        D: '6D',
        D2: '6D2',
        DP: "6D'",
    }),
    /**
     * Build a layer-range move for big-cube notation. e.g. Movements.Range(2, 4, Movements.Wide.Rw) returns '2-4Rw',
     * meaning "rotate layers 2 through 4 from the right face." Accepts wide moves (`Movements.Wide.*`), face
     * moves (`Movements.Single.{R,L,U,D,F,B}` and modifiers), and slice moves (`Movements.Single.{M,E,S}` and
     * modifiers). Already-prefixed moves (`2R`, `2-4Rw`) are rejected.
     * @param {number} lower
     * @param {number} upper
     * @param {WideMove | SingleMove} baseMove
     * @returns {Movement}
     */
    Range: (lower, upper, baseMove) => {
        if (!Number.isInteger(lower) || !Number.isInteger(upper) || lower < 1 || lower >= upper || upper > 7) {
            throw new Error(`Invalid layer range [${lower}-${upper}]: require integers with 1 <= lower < upper <= 7`);
        }
        const move = /** @type {Movement} */ (`${lower}-${upper}${baseMove}`);
        if (!isMovement(move)) {
            throw new Error(`Invalid range movement: ${move}`);
        }

        return move;
    },
});

/**
 * @typedef {typeof Rotations[keyof typeof Rotations]} Rotation
 */
export const Rotations = Object.freeze({
    x: 'x',
    x2: 'x2',
    xP: "x'",
    y: 'y',
    y2: 'y2',
    yP: "y'",
    z: 'z',
    z2: 'z2',
    zP: "z'",
});

/**
 * @typedef {typeof Faces [keyof typeof Faces]} Face
 */
export const Faces = Object.freeze({
    U: 'U',
    D: 'D',
    L: 'L',
    R: 'R',
    F: 'F',
    B: 'B',
});

/**
 * @typedef {typeof CubeTypes [keyof typeof CubeTypes]} CubeType
 */
export const CubeTypes = Object.freeze({
    Two: 'Two',
    Three: 'Three',
    Four: 'Four',
    Five: 'Five',
    Six: 'Six',
    Seven: 'Seven',
});

export const LayerCount = Object.freeze({
    [CubeTypes.Two]: 2,
    [CubeTypes.Three]: 3,
    [CubeTypes.Four]: 4,
    [CubeTypes.Five]: 5,
    [CubeTypes.Six]: 6,
    [CubeTypes.Seven]: 7,
});

/**
 *
 * @param {string} rotation
 */
export function IsRotation(rotation) {
    return /^([xyz])(\d)?(\')?$/.test(rotation);
}

/**
 *
 * @param {string} movement
 * @return {boolean}
 */
export function isMovement(movement) {
    return /^([1234567]|[123456]-[1234567])?([RLUDFB]w|[RLUDFBMES]|[rludfbmes])([123])?(\')?$/.test(movement);
}
