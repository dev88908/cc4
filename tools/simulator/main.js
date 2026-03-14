// Cocos Engine - Basic Functionality Test

console.log('===========================================');
console.log('  Cocos Engine - Basic Functionality Test');
console.log('  Build: Release');
console.log('===========================================');

// Test 1: Check cc namespace
console.log('\n[Test 1] Checking cc namespace...');
console.log('  - cc:', typeof cc !== 'undefined' ? 'OK' : 'MISSING');
console.log('  - cc.Vec3:', typeof cc !== 'undefined' && typeof cc.Vec3 !== 'undefined' ? 'OK' : 'MISSING');
console.log('  - cc.Vec4:', typeof cc !== 'undefined' && typeof cc.Vec4 !== 'undefined' ? 'OK' : 'MISSING');
console.log('  - cc.Mat4:', typeof cc !== 'undefined' && typeof cc.Mat4 !== 'undefined' ? 'OK' : 'MISSING');
console.log('  - cc.Quat:', typeof cc !== 'undefined' && typeof cc.Quat !== 'undefined' ? 'OK' : 'MISSING');
console.log('  - cc.Color:', typeof cc !== 'undefined' && typeof cc.Color !== 'undefined' ? 'OK' : 'MISSING');

window.onload = function() {
    console.log('\n[Test 2] Window loaded, starting tests...');
    
    // Test 2: Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.backgroundColor = '#1a1a2e';
    canvas.style.position = 'absolute';
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Test 3: Create cc objects
    console.log('\n[Test 3] Creating cc objects...');
    
    let testResults = [];
    
    // Test Vec3
    try {
        if (cc.Vec3) {
            const v3 = new cc.Vec3(1, 2, 3);
            console.log('  cc.Vec3(1,2,3):', v3);
            testResults.push('Vec3 OK');
        }
    } catch(e) {
        console.log('  cc.Vec3 ERROR:', e.message);
    }
    
    // Test Vec4
    try {
        if (cc.Vec4) {
            const v4 = new cc.Vec4(1, 2, 3, 4);
            console.log('  cc.Vec4(1,2,3,4):', v4);
            testResults.push('Vec4 OK');
        }
    } catch(e) {
        console.log('  cc.Vec4 ERROR:', e.message);
    }
    
    // Test Color
    try {
        if (cc.Color) {
            const color = new cc.Color(1, 0, 0, 1);
            console.log('  cc.Color(1,0,0,1):', color);
            testResults.push('Color OK');
        }
    } catch(e) {
        console.log('  cc.Color ERROR:', e.message);
    }
    
    // Test Quat
    try {
        if (cc.Quat) {
            const quat = new cc.Quat();
            console.log('  cc.Quat():', quat);
            testResults.push('Quat OK');
        }
    } catch(e) {
        console.log('  cc.Quat ERROR:', e.message);
    }
    
    // Test Mat4
    try {
        if (cc.Mat4) {
            const mat = new cc.Mat4();
            console.log('  cc.Mat4():', mat);
            testResults.push('Mat4 OK');
        }
    } catch(e) {
        console.log('  cc.Mat4 ERROR:', e.message);
    }
    
    console.log('\n[Test Results]:', testResults.join(', '));
    
    // Render test
    let angle = 0;
    function render() {
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw test pattern
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const size = 80;
        
        // Gradient square
        const gradient = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
        gradient.addColorStop(0, '#00d4ff');
        gradient.addColorStop(0.5, '#7b2cbf');
        gradient.addColorStop(1, '#ff006e');
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-size/2, -size/2, size, size);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(-size/2, -size/2, size, size);
        
        ctx.restore();
        
        // Info
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Cocos Engine WASM Test', 10, 25);
        ctx.fillText('API Tests: ' + testResults.length + ' passed', 10, 50);
        
        angle += 0.02;
        requestAnimationFrame(render);
    }
    
    render();
    console.log('\n===========================================');
    console.log('Test completed!');
    console.log('===========================================');
};

console.log('[main.js] Init complete');
