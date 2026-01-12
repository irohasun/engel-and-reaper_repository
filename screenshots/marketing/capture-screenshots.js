const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function captureScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();

    // Set viewport to iPhone 14 Pro Max size (1242x2688)
    await page.setViewport({
      width: 1242,
      height: 2688,
      deviceScaleFactor: 1
    });

    // Load the HTML file
    const htmlPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    // Wait for fonts to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get number of slides
    const slideCount = await page.evaluate(() => {
      return document.querySelectorAll('.screenshot-container').length;
    });

    console.log(`Found ${slideCount} slides to capture`);

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Capture each slide by hiding others
    for (let i = 0; i < slideCount; i++) {
      const slideNumber = i + 1;
      console.log(`Capturing slide ${slideNumber}...`);

      // Hide all slides except the current one
      await page.evaluate((index) => {
        const containers = document.querySelectorAll('.screenshot-container');
        containers.forEach((container, i) => {
          if (i === index) {
            container.style.display = 'flex';
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
          } else {
            container.style.display = 'none';
          }
        });
        document.body.style.padding = '0';
        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';
      }, i);

      // Wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Take full page screenshot
      await page.screenshot({
        path: path.join(outputDir, `slide_${slideNumber}.png`),
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width: 1242,
          height: 2688
        }
      });

      console.log(`✓ Saved slide_${slideNumber}.png`);
    }

    console.log('\nAll screenshots captured successfully!');
    console.log(`Output directory: ${outputDir}`);

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
