from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:9002")

        # Wait for the main card to be visible
        page.wait_for_selector('h3:has-text("Service Connections")', timeout=10000)

        # Take a screenshot of the light mode
        page.screenshot(path="jules-scratch/verification/light-mode.png")

        # Toggle to dark mode
        theme_toggle_button = page.get_by_label("Switch to dark mode")
        theme_toggle_button.click()

        # Wait for the theme to change
        page.wait_for_selector('button[aria-label="Switch to light mode"]', timeout=5000)

        # Take a screenshot of the dark mode
        page.screenshot(path="jules-scratch/verification/dark-mode.png")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
