import { chromium } from 'playwright';

(async () => {
  console.log('Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    if (response.url().includes('/rest/v1/trades')) {
      console.log(`\n--- Supabase Response: ${response.request().method()} ${response.url()} ---`);
      console.log('Status:', response.status());
      try {
        const body = await response.json();
        console.log('Body snippet:', JSON.stringify(body).substring(0, 500));
      } catch (e) {
        console.log('Could not parse JSON body');
      }
    }
  });

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Waiting for trades to load...');
    await page.waitForTimeout(3000);
  } catch (err) {
    console.error('Error during navigation:', err);
  } finally {
    await browser.close();
  }
})();
