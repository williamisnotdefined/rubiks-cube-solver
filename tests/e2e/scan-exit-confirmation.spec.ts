import { expect, test } from '@playwright/test'
import { chooseRadixSelectOption } from './select-helpers'

test.use({ locale: 'pt-BR' })

test('keeps scan progress when exit confirmation is canceled', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => Promise.reject(new Error('camera disabled for e2e')),
      },
    })
  })

  await page.goto('/solve/')
  await expect(page.getByRole('combobox', { name: 'Puzzle' })).toBeEnabled({ timeout: 15_000 })
  await chooseRadixSelectOption(page, 'Puzzle', '3x3x3 Cube')
  const scanButton = page.getByRole('button', { name: 'Escanear cubo com a câmera' })
  await expect(scanButton).toBeEnabled({ timeout: 15_000 })
  await scanButton.click()

  await page.getByTestId('scan-sticker-0').click()
  await page.getByRole('button', { exact: true, name: 'Vermelho' }).click()
  await page.getByLabel('Fechar scan do cubo').click({ position: { x: 5, y: 5 } })

  const confirmation = page.getByRole('alertdialog', { name: 'Sair do scan?' })
  await expect(confirmation).toBeVisible()
  await page.getByLabel('Cancelar saída do scan do cubo').click({ position: { x: 5, y: 5 } })

  await expect(confirmation).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Escanear cubo' })).toBeVisible()
})
