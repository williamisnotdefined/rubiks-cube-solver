type Debounced<T extends (...args: any[]) => void> = ((this: ThisParameterType<T>, ...args: Parameters<T>) => void) & {
  cancel: () => void;
};

export function debounce<T extends (...args: any[]) => void>(f: T, delay: number): Debounced<T> {
  let timer = 0;
  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => f.apply(this, args), delay);
  } as Debounced<T>;

  debounced.cancel = () => {
    window.clearTimeout(timer);
    timer = 0;
  };

  return debounced;
}
