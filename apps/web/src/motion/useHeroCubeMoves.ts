import { useEffect, type RefObject } from 'react'
import { reverse, type Movement } from '@rubiks-cube-solver/rubiks-cube/core'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import { prefersReducedMotion } from '@src/motion/gsap'
import { createHeroMoveGenerator, targetHeroMoveCount } from './heroMoves'

type UseHeroCubeMovesOptions = {
  cubeRef: RefObject<RubiksCubeElement | null>
  hostRef: RefObject<HTMLDivElement | null>
  ready: boolean
}

/**
 * Keeps the hero cube in sync with the landing scroll position.
 * Scrolling down applies the next random move; scrolling up applies its inverse.
 * At the top the prefix is empty again, so the cube is solved.
 */
export function useHeroCubeMoves({
  cubeRef,
  hostRef,
  ready,
}: UseHeroCubeMovesOptions): void {
  useEffect(() => {
    const host = hostRef.current
    const cube = cubeRef.current
    const scrollRoot = host?.closest<HTMLElement>('[data-route-scroll]')

    if (
      host === null ||
      cube === null ||
      scrollRoot === null ||
      scrollRoot === undefined ||
      !ready ||
      prefersReducedMotion()
    ) {
      return
    }

    const hostElement: HTMLDivElement = host
    const cubeElement: RubiksCubeElement = cube
    const scrollElement: HTMLElement = scrollRoot

    let cancelled = false
    let applied = 0
    let inFlight = false
    let resetPending = false
    const nextMove = createHeroMoveGenerator(Math.floor(performance.now()) ^ 0x9e3779b9)
    const sequence: Movement[] = []

    function moveAt(index: number): Movement {
      while (sequence.length <= index) {
        sequence.push(nextMove())
      }

      return sequence[index] ?? 'R'
    }

    function publish() {
      const target = targetHeroMoveCount(scrollElement.scrollTop)
      hostElement.dataset.heroCubeMoves = String(applied)
      hostElement.dataset.cubeApplied = String(applied)
      hostElement.dataset.cubeTarget = String(target)
      hostElement.dataset.cubeSolved = String(applied === 0)
      hostElement.dataset.heroCubeReady = 'true'
    }

    function resetToSolved() {
      if (cancelled) {
        return
      }

      cubeElement.reset()
      applied = 0
      resetPending = false
      publish()
    }

    function reconcile() {
      if (cancelled || inFlight) {
        return
      }

      const target = targetHeroMoveCount(scrollElement.scrollTop)

      if (scrollElement.scrollTop <= 2) {
        if (applied !== 0) {
          resetToSolved()
        }
        return
      }

      if (target === applied) {
        publish()
        return
      }

      const diff = Math.abs(target - applied)
      const movingForward = target > applied
      const move = movingForward ? moveAt(applied) : reverse(moveAt(applied - 1))
      const nextApplied = movingForward ? applied + 1 : applied - 1
      const animationSpeedMs = diff > 4 ? 0 : 160

      inFlight = true
      publish()

      void cubeElement
        .move(move, { animationSpeedMs })
        .catch(() => undefined)
        .finally(() => {
          if (cancelled) {
            return
          }

          applied = nextApplied
          inFlight = false

          if (resetPending) {
            resetToSolved()
            return
          }

          publish()
          reconcile()
        })
    }

    function handleScroll() {
      if (scrollElement.scrollTop > 2) {
        resetPending = false
      }

      if (scrollElement.scrollTop <= 2) {
        if (inFlight) {
          resetPending = true
          return
        }

        if (applied === 0) {
          publish()
        } else {
          resetToSolved()
        }
        return
      }

      reconcile()
    }

    resetToSolved()
    scrollElement.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      cancelled = true
      scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [cubeRef, hostRef, ready])
}
