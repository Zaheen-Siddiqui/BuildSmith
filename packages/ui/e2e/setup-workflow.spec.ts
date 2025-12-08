import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Setup Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Navigate to setup page
    await page.click('text=Import Bundle')
  })

  test('should complete full setup workflow', async ({ page }) => {
    // Step 1: Import bundle file
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.click('button:has-text("Select Bundle File")')
    const fileChooser = await fileChooserPromise
    
    // Note: In real test, you'd use a fixture bundle file
    // await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-bundle.buildsmith.zip'))
    
    // Step 2: Configure setup options
    await page.check('input[type="checkbox"][value="vscode"]')
    await page.check('input[type="checkbox"][value="docker"]')
    
    await page.click('button:has-text("Next")')
    
    // Step 3: Select VS Code extensions
    await expect(page.locator('h2:has-text("Select VS Code Extensions")')).toBeVisible()
    
    await page.click('button:has-text("Select All")')
    await page.click('button:has-text("Next")')
    
    // Step 4: Select Docker images
    await expect(page.locator('h2:has-text("Select Docker Images")')).toBeVisible()
    
    const dockerCheckbox = page.locator('[data-testid="docker-checkbox"]').first()
    await dockerCheckbox.check()
    
    await page.click('button:has-text("Next")')
    
    // Step 5: Preview selections
    await expect(page.locator('h2:has-text("Preview Installation")')).toBeVisible()
    
    await page.click('button:has-text("Start Installation")')
    
    // Step 6: Monitor installation progress
    await expect(page.locator('text=Installing')).toBeVisible()
    
    // Step 7: Verify completion
    await expect(page.locator('text=Installation Complete')).toBeVisible({ timeout: 120000 })
  })

  test('should show validation error for invalid bundle', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.click('button:has-text("Select Bundle File")')
    const fileChooser = await fileChooserPromise
    
    // Try to upload a non-bundle file
    await fileChooser.setFiles(path.join(__dirname, 'scan-workflow.spec.ts'))
    
    // Should show error message
    await expect(page.locator('text=Invalid bundle file')).toBeVisible()
  })

  test('should allow filtering VS Code extensions', async ({ page }) => {
    // Skip file import for this test (assume bundle already imported)
    await page.check('input[type="checkbox"][value="vscode"]')
    await page.click('button:has-text("Next")')
    
    // Search for specific extension
    await page.fill('input[placeholder*="Search"]', 'ESLint')
    
    // Should filter results
    await expect(page.locator('text=ESLint')).toBeVisible()
  })

  test('should allow selecting/deselecting all Docker images', async ({ page }) => {
    await page.check('input[type="checkbox"][value="docker"]')
    await page.click('button:has-text("Next")')
    
    // Skip to docker page if vscode not selected
    await expect(page.locator('h2:has-text("Select Docker Images")')).toBeVisible()
    
    // Select all
    await page.click('button:has-text("Select All")')
    
    const checkedBoxes = await page.locator('[data-testid="docker-checkbox"]:checked').count()
    expect(checkedBoxes).toBeGreaterThan(0)
    
    // Deselect all
    await page.click('button:has-text("Deselect All")')
    
    const uncheckedBoxes = await page.locator('[data-testid="docker-checkbox"]:checked').count()
    expect(uncheckedBoxes).toBe(0)
  })

  test('should show installation progress', async ({ page }) => {
    await page.check('input[type="checkbox"][value="vscode"]')
    await page.click('button:has-text("Next")')
    
    await page.click('button:has-text("Select All")')
    await page.click('button:has-text("Next")')
    
    await page.click('button:has-text("Start Installation")')
    
    // Should show progress bars
    await expect(page.locator('[role="progressbar"]')).toBeVisible()
    
    // Should show status updates
    await expect(page.locator('text=Installing VS Code extensions')).toBeVisible()
  })

  test('should allow navigation back through setup steps', async ({ page }) => {
    await page.check('input[type="checkbox"][value="vscode"]')
    await page.check('input[type="checkbox"][value="docker"]')
    await page.click('button:has-text("Next")')
    
    // On VS Code page
    await expect(page.locator('h2:has-text("Select VS Code Extensions")')).toBeVisible()
    
    await page.click('button:has-text("Next")')
    
    // On Docker page
    await expect(page.locator('h2:has-text("Select Docker Images")')).toBeVisible()
    
    // Go back
    await page.click('button:has-text("Back")')
    
    // Should be back on VS Code page
    await expect(page.locator('h2:has-text("Select VS Code Extensions")')).toBeVisible()
  })

  test('should show results summary on completion', async ({ page }) => {
    await page.check('input[type="checkbox"][value="vscode"]')
    await page.click('button:has-text("Next")')
    
    await page.click('button:has-text("Select All")')
    await page.click('button:has-text("Next")')
    
    await page.click('button:has-text("Start Installation")')
    
    await expect(page.locator('text=Installation Complete')).toBeVisible({ timeout: 120000 })
    
    // Should show summary
    await expect(page.locator('text=Successfully installed')).toBeVisible()
    await expect(page.locator('text=Failed')).toBeVisible()
  })
})
