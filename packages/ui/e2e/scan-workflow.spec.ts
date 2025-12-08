import { test, expect } from '@playwright/test'

test.describe('Scan Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Navigate to scan page
    await page.click('text=Create New Bundle')
  })

  test('should complete full scan workflow', async ({ page }) => {
    // Step 1: Select scan options
    await page.check('input[type="checkbox"][value="vscode"]')
    await page.check('input[type="checkbox"][value="docker"]')
    await page.check('input[type="checkbox"][value="databases"]')
    
    await page.click('button:has-text("Start Scan")')
    
    // Step 2: Wait for scan to complete
    await expect(page.locator('text=Scan Complete')).toBeVisible({ timeout: 60000 })
    
    await page.click('button:has-text("View Results")')
    
    // Step 3: Verify manifest items appear
    await expect(page.locator('[data-testid="manifest-item"]').first()).toBeVisible()
    
    // Step 4: Select some items
    const firstCheckbox = page.locator('[data-testid="manifest-checkbox"]').first()
    await firstCheckbox.check()
    
    // Step 5: Configure bundle metadata
    await page.click('button:has-text("Export Bundle")')
    
    await page.fill('input[name="bundleName"]', 'Test Bundle')
    await page.fill('textarea[name="description"]', 'Test Description')
    
    // Step 6: Export bundle
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.buildsmith\.zip$/)
  })

  test('should allow selecting VS Code extensions', async ({ page }) => {
    await page.check('input[type="checkbox"][value="vscode"]')
    await page.click('button:has-text("Start Scan")')
    
    await expect(page.locator('text=Scan Complete')).toBeVisible({ timeout: 60000 })
    await page.click('button:has-text("View Results")')
    
    // Should see VS Code extensions in manifest
    await expect(page.locator('text=VS Code Extensions')).toBeVisible()
  })

  test('should allow selecting Docker images', async ({ page }) => {
    await page.check('input[type="checkbox"][value="docker"]')
    await page.click('button:has-text("Start Scan")')
    
    await expect(page.locator('text=Scan Complete')).toBeVisible({ timeout: 60000 })
    await page.click('button:has-text("View Results")')
    
    // Docker image selector should be visible
    await expect(page.locator('[data-testid="docker-image-selector"]')).toBeVisible()
  })

  test('should allow selecting database connections', async ({ page }) => {
    await page.check('input[type="checkbox"][value="databases"]')
    await page.click('button:has-text("Start Scan")')
    
    await expect(page.locator('text=Scan Complete')).toBeVisible({ timeout: 60000 })
    await page.click('button:has-text("View Results")')
    
    // Database connections should be visible
    await expect(page.locator('text=Database Connections')).toBeVisible()
  })

  test('should validate required bundle name', async ({ page }) => {
    await page.check('input[type="checkbox"][value="vscode"]')
    await page.click('button:has-text("Start Scan")')
    
    await expect(page.locator('text=Scan Complete')).toBeVisible({ timeout: 60000 })
    await page.click('button:has-text("View Results")')
    
    await page.click('button:has-text("Export Bundle")')
    
    // Try to export without bundle name
    await page.click('button:has-text("Export")')
    
    // Should show validation error
    await expect(page.locator('text=Bundle name is required')).toBeVisible()
  })

  test('should support encryption with passphrase', async ({ page }) => {
    await page.check('input[type="checkbox"][value="vscode"]')
    await page.check('input[type="checkbox"][id="includeSecrets"]')
    
    await page.fill('input[name="encryptionPassphrase"]', 'test-password')
    await page.fill('input[name="confirmPassphrase"]', 'test-password')
    
    await page.click('button:has-text("Start Scan")')
    
    await expect(page.locator('text=Scan Complete')).toBeVisible({ timeout: 60000 })
    
    // Bundle should be marked as encrypted
    await page.click('button:has-text("View Results")')
    await expect(page.locator('text=Encrypted')).toBeVisible()
  })
})
