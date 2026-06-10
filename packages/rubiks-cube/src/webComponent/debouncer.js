// @ts-check
/**
 * @param {number} delay
 * @param {{ (entries: { contentRect: { width: number; height: number; }; }[]): void; apply?: any; }} f
 */
export function debounce(f, delay) {
    let timer = 0;
    /**
     * @this {any}
     * @param {any[]} args
     */
    return function (...args) {
        clearTimeout(timer);
        timer = window.setTimeout(() => f.apply(this, args), delay);
    };
}
