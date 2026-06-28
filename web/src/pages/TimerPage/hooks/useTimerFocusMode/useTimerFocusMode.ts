import { useRef, type FocusEvent, type MouseEvent, type PointerEvent } from 'react'

const timerDisplaySelector = '[data-timer-display]'
const interactiveSelector = 'button, input, select, textarea, [contenteditable="true"], [role="switch"], [role="combobox"]'
const timerFocusReturnSkipSelector = '[role="combobox"]'

export function useTimerFocusMode() {
  const rootRef = useRef<HTMLElement>(null)

  function focusTimerDisplay() {
    rootRef.current
      ?.querySelector<HTMLElement>(timerDisplaySelector)
      ?.focus({ preventScroll: true })
  }

  function focusTimerDisplaySoon() {
    window.setTimeout(focusTimerDisplay, 0)
  }

  function handlePointerDownCapture(event: PointerEvent<HTMLElement>) {
    const target = event.target

    if (!(target instanceof Element)) {
      return
    }

    const interactiveTarget = target.closest(interactiveSelector)

    if (interactiveTarget === null) {
      return
    }

    if (target.closest(timerDisplaySelector) !== null) {
      event.stopPropagation()
      event.preventDefault()
      return
    }

    if (!interactiveTarget.matches(timerFocusReturnSkipSelector)) {
      event.preventDefault()
    }
  }

  function handleClickCapture(event: MouseEvent<HTMLElement>) {
    const target = event.target

    if (!(target instanceof Element)) {
      return
    }

    const interactiveTarget = target.closest(interactiveSelector)

    if (interactiveTarget === null || interactiveTarget.matches(timerFocusReturnSkipSelector)) {
      return
    }

    focusTimerDisplaySoon()
  }

  function handleFocusCapture(event: FocusEvent<HTMLElement>) {
    const target = event.target

    if (!(target instanceof Element) || target.matches(timerDisplaySelector)) {
      return
    }

    const interactiveTarget = target.closest(interactiveSelector)

    if (interactiveTarget === null || interactiveTarget.matches(timerFocusReturnSkipSelector)) {
      return
    }

    focusTimerDisplaySoon()
  }

  return {
    focusTimerDisplay,
    focusTimerDisplaySoon,
    rootRef,
    timerFocusProps: {
      onClickCapture: handleClickCapture,
      onFocusCapture: handleFocusCapture,
      onPointerDownCapture: handlePointerDownCapture,
      ref: rootRef,
    },
  }
}

export function focusTimerDisplayElement() {
  document.querySelector<HTMLElement>(timerDisplaySelector)?.focus({ preventScroll: true })
}
