const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:8000');
    // Wait for load
    await page.waitForTimeout(1000);
    // Log initial camera
    let cam1 = await page.evaluate(() => {
        if(!window._debugCamera) return null;
        return { pos: window._debugCamera.position, rot: window._debugCamera.rotation, fov: window._debugCamera.fov };
    });
    console.log('INIT CAM:', cam1);

    // Click screen to dismiss intro
    await page.mouse.click(500, 500);
    await page.waitForTimeout(1000);
    // Click 'Играть'
    await page.mouse.click(804, 898);
    await page.waitForTimeout(500);
    // Click 'Игра с ботами'
    await page.mouse.click(500, 418);
    await page.waitForTimeout(500);

    // Now in team selection. Black screen happens here!
    let cam2 = await page.evaluate(() => {
        return { pos: window._debugCamera.position, rot: window._debugCamera.rotation, fov: window._debugCamera.fov, mAuto: window._debugCamera.matrixAutoUpdate, isNum: !isNaN(window._debugCamera.projectionMatrix.elements[0]) };
    });
    console.log('TEAM SCREEN CAM:', cam2);

    // Click 'СИНИЕ'
    await page.mouse.click(379, 490);
    await page.waitForTimeout(1000);

    // Now in fight
    let cam3 = await page.evaluate(() => {
        return { pos: window._debugCamera.position, rot: window._debugCamera.rotation, m: window._debugCamera.matrixWorld.elements };
    });
    console.log('FIGHT CAM:', cam3);

    await browser.close();
})();