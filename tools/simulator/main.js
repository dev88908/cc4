// Cocos Engine Native Window Test
// This is a minimal main.js to verify the native engine window is working

console.log('===========================================');
console.log('  Cocos Engine Native Window Test');
console.log('  Build: Release');
console.log('  Platform: Windows x64');
console.log('===========================================');

// Simple render loop to keep the window alive
let frameCount = 0;
let lastLogTime = Date.now();

function mainLoop() {
    frameCount++;
    
    // Log every 5 seconds
    const now = Date.now();
    if (now - lastLogTime >= 5000) {
        console.log('[MainLoop] Frames: ' + frameCount + ', Time: ' + Math.round((now - lastLogTime) / 1000) + 's');
        lastLogTime = now;
    }
    
    // Continue the loop
    requestAnimationFrame(mainLoop);
}

// Start the main loop
console.log('[main.js] Starting main loop...');
requestAnimationFrame(mainLoop);

console.log('[main.js] Window test initialized successfully!');
console.log('[main.js] The window should now be visible.');
console.log('[main.js] Press Ctrl+C or close the window to exit.');
