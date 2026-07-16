import { expect, type Page } from '@playwright/test'

export async function chooseRadixSelectOption(page: Page, label: string, optionName: string) {
  const select = page.getByRole('combobox', { name: label })

  await select.click()
  await page.getByRole('option', { exact: true, name: optionName }).click()
  await expect(select).toContainText(optionName)
}

export async function expectRadixSelectOptionEnabled(page: Page, label: string, optionName: string) {
  const select = page.getByRole('combobox', { name: label })

  await select.click()
  await expect(page.getByRole('option', { exact: true, name: optionName })).not.toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('option')).toHaveCount(0)
}

export async function expectRadixSelectOptions(page: Page, label: string, optionNames: readonly string[]) {
  const select = page.getByRole('combobox', { name: label })

  await select.click()
  await expect(page.getByRole('option')).toHaveText(optionNames)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('option')).toHaveCount(0)
}

export async function expectRadixSelectValue(page: Page, label: string, value: string) {
  await expect(page.getByRole('combobox', { name: label })).toContainText(value)
}
