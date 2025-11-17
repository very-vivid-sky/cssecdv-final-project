const { test, expect } = require('@playwright/test')

test.describe('Login Tests', () => {
    test('Login as cashier redirects to /cashier', async ({ page }) => {
        await page.goto('/login')
        await page.fill('[name="username"]', 'cashier1')
        await page.fill('[name="password"]', 'password123')
        await page.click('button[type="submit"]')
        await page.waitForURL(/cashier/)
        expect(page.url()).toContain('/cashier')
    })

    test('Login as manager redirects to /manager', async ({ page }) => {
        await page.goto('/login')
        await page.fill('[name="username"]', 'manager1')
        await page.fill('[name="password"]', 'managerpass123')
        await page.click('button[type="submit"]')
        await page.waitForURL(/manager/)
        expect(page.url()).toContain('/manager')
    })

    test('Invalid credentials redirect to login', async ({ page }) => {
        await page.goto('/login')
        await page.fill('[name="username"]', 'invaliduser')
        await page.fill('[name="password"]', 'invalidpass')
        await page.click('button[type="submit"]')
        await page.waitForURL(/login/)
        expect(page.url()).toContain('/login')
    })
})
