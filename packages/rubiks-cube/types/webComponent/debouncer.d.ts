/**
 * @param {number} delay
 * @param {{ (entries: { contentRect: { width: number; height: number; }; }[]): void; apply?: any; }} f
 */
export function debounce(f: {
    (entries: {
        contentRect: {
            width: number;
            height: number;
        };
    }[]): void;
    apply?: any;
}, delay: number): (...args: any[]) => void;
