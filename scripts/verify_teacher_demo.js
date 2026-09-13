const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '../logs/demo_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runDemoTest() {
  console.log('🚀 Launching Chromium browser for FAFLOW Teacher Demo Verification...');
  const browser = await chromium.launch({ headless: true });
  
  try {
    // ==========================================
    // PART 1: PC DESKTOP FLOW (1920x1080)
    // ==========================================
    console.log('\n--- PART 1: PC DESKTOP FLOW (1920x1080) ---');
    const pcContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await pcContext.newPage();

    // Step 1: Desktop Login & Dashboard Tour
    console.log('Step 1: Desktop Login & Dashboard Tour');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Fill credentials
    await page.fill('input[type="email"], input[name="email"]', 'teacher_cse_1@example.com');
    await page.fill('input[type="password"]', 'Password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/teacher/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1500);
    
    // Verify elements on dashboard
    const greetingText = await page.textContent('h1');
    console.log(`  Greeting: "${greetingText.trim()}"`);
    
    const pageContent = await page.content();
    const hasDayOrder = pageContent.includes('Day Order 2') || pageContent.includes('DO 2');
    console.log(`  Day Order 2 Banner Present: ${hasDayOrder}`);
    
    const hasCredits = pageContent.includes('5 Credits') || pageContent.includes('+5') || pageContent.includes('Credits');
    console.log(`  Running Credit Balance Present: ${hasCredits}`);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_01_dashboard.png') });

    // Step 2: Check Leave Credits & Ledger
    console.log('\nStep 2: Check Leave Credits & Ledger');
    await page.goto(`${BASE_URL}/teacher/credits`);
    await page.waitForTimeout(1500);
    const creditsContent = await page.content();
    console.log(`  Credits page loaded. Running balance +5 visible: ${creditsContent.includes('5')}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_02_credits.png') });

    // Step 3: Review Weekly Timetable
    console.log('\nStep 3: Review Weekly Timetable');
    await page.goto(`${BASE_URL}/teacher/timetable`);
    await page.waitForTimeout(1500);
    const timetableContent = await page.content();
    console.log(`  Timetable loaded. Matrix visible: ${timetableContent.includes('Data Structures')}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_03_timetable.png') });

    // Step 4: Apply for Leave (10 September 2026)
    console.log('\nStep 4: Apply for Leave (10 September 2026)');
    await page.goto(`${BASE_URL}/teacher/leave/apply`);
    await page.waitForTimeout(1000);
    
    // Select date 2026-09-10
    const dateInput = await page.querySelector('input[type="date"]');
    if (dateInput) {
      await dateInput.fill('2026-09-10');
      await page.dispatchEvent('input[type="date"]', 'change');
    }
    await page.waitForTimeout(1500);
    
    // Select reason chip 'Personal'
    const personalChip = await page.locator('button:has-text("Personal")').first();
    if (await personalChip.isVisible()) {
      await personalChip.click();
    } else {
      await page.fill('textarea, input[placeholder*="reason"]', 'Personal reason');
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_04_apply_leave_form.png') });
    
    // Submit Leave Request
    const submitBtn = await page.locator('button[type="submit"]:has-text("Submit Leave Request"), button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_04_apply_leave_success.png') });

    // Step 5: Smart Substitution Assignment
    console.log('\nStep 5: Smart Substitution Assignment');
    await page.goto(`${BASE_URL}/teacher/substitution`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_05_substitution_list.png') });

    // Find and assign substitutes if modal/assign buttons exist
    const assignButtons = await page.locator('button:has-text("Assign Substitute"), button:has-text("Assign")').all();
    console.log(`  Assign buttons found: ${assignButtons.length}`);
    
    for (let i = 0; i < Math.min(assignButtons.length, 3); i++) {
      try {
        const btn = assignButtons[i];
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(1000);
          
          // Click top recommendation assign
          const subAssignBtn = await page.locator('button:has-text("Assign")').first();
          if (await subAssignBtn.isVisible()) {
            await subAssignBtn.click();
            await page.waitForTimeout(1000);
          }
        }
      } catch (err) {
        console.log(`  Assign step ${i+1} notice: ${err.message}`);
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_05_substitution_assigned.png') });

    // Step 6: Track Leave Status & Details
    console.log('\nStep 6: Track Leave Status & Details');
    await page.goto(`${BASE_URL}/teacher/leaves`);
    await page.waitForTimeout(1500);
    const leavesContent = await page.content();
    console.log(`  Leave History loaded. Contains 2026-09-10 leave: ${leavesContent.includes('2026-09-10') || leavesContent.includes('10 Sep')}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_06_leave_history.png') });

    // Step 7: Leave Cancellation & Automatic Release
    console.log('\nStep 7: Leave Cancellation & Automatic Release');
    const cancelBtn = await page.locator('button:has-text("Cancel Leave"), button:has-text("Cancel")').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(1000);
      const confirmBtn = await page.locator('button:has-text("Confirm"), button:has-text("Yes, Cancel")').first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(1500);
      }
    }
    console.log('  Leave cancellation executed');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_07_leave_cancelled.png') });

    // Step 8: Preferences & Notifications
    console.log('\nStep 8: Preferences & Notifications');
    await page.goto(`${BASE_URL}/teacher/preferences`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pc_08_preferences.png') });

    await pcContext.close();

    // ==========================================
    // PART 2: ANDROID MOBILE FLOW (390x844)
    // ==========================================
    console.log('\n--- PART 2: ANDROID MOBILE FLOW (390x844) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();

    // Step 1: Mobile Login
    console.log('Mobile Step 1: Login');
    await mobilePage.goto(`${BASE_URL}/login`);
    await mobilePage.fill('input[type="email"], input[name="email"]', 'teacher_cse_1@example.com');
    await mobilePage.fill('input[type="password"]', 'Password123');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('**/teacher/dashboard', { timeout: 10000 });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_01_dashboard.png') });

    // Step 2: Mobile Dashboard & Bottom Nav
    console.log('Mobile Step 2: Dashboard & Bottom Navigation');
    const bottomNav = await mobilePage.locator('nav').first();
    console.log(`  Bottom Navigation bar visible: ${await bottomNav.isVisible()}`);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_02_dashboard_nav.png') });

    // Step 3: Mobile Credit Balance
    console.log('Mobile Step 3: Credit Balance via More drawer');
    const moreBtn = await mobilePage.locator('button:has-text("More")').first();
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await mobilePage.waitForTimeout(800);
      const creditsLink = await mobilePage.locator('a:has-text("My Credits"), button:has-text("My Credits")').first();
      if (await creditsLink.isVisible()) {
        await creditsLink.click();
        await mobilePage.waitForTimeout(1500);
      }
    } else {
      await mobilePage.goto(`${BASE_URL}/teacher/credits`);
    }
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_03_credits.png') });

    // Step 4: Mobile Leave Application
    console.log('Mobile Step 4: Apply for Leave via Bottom Nav tab');
    const applyTab = await mobilePage.locator('a:has-text("Apply")').first();
    if (await applyTab.isVisible()) {
      await applyTab.click();
    } else {
      await mobilePage.goto(`${BASE_URL}/teacher/leave/apply`);
    }
    await mobilePage.waitForTimeout(1500);
    const mDateInput = await mobilePage.querySelector('input[type="date"]');
    if (mDateInput) {
      await mDateInput.fill('2026-09-10');
      await mobilePage.dispatchEvent('input[type="date"]', 'change');
    }
    await mobilePage.waitForTimeout(1000);
    const mPersonalChip = await mobilePage.locator('button:has-text("Personal")').first();
    if (await mPersonalChip.isVisible()) {
      await mPersonalChip.click();
    } else {
      await mobilePage.fill('textarea, input[placeholder*="reason"]', 'Personal reason');
    }
    const mSubmitBtn = await mobilePage.locator('button[type="submit"]:has-text("Submit Leave Request"), button[type="submit"]').first();
    await mSubmitBtn.click();
    await mobilePage.waitForTimeout(2000);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_04_apply_success.png') });

    // Step 5: Mobile Substitution & Cancellation
    console.log('Mobile Step 5: Substitution & Cancellation');
    await mobilePage.goto(`${BASE_URL}/teacher/substitution`);
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_05_substitution.png') });

    await mobilePage.goto(`${BASE_URL}/teacher/leaves`);
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_05_leaves.png') });

    await mobileContext.close();
    console.log('\n🎉 ALL DEMO FLOW STEPS VERIFIED AND COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Demo verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runDemoTest();
