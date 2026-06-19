export function debounce<T extends (...args: any[]) => void>(f: T, delay: number) {
  let timer = 0;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timer);
    timer = window.setTimeout(() => f.apply(this, args), delay);
  };
}
