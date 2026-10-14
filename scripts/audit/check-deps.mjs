/**
 * Dependency Security and Version Pinning Audit.
 * Verifies npm audit (0 vulnerabilities) and strict version pinning in package.json.
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('=== AUDIT DEPENDENCIES & SECURITY VULNERABILITIES ===\n');

let failed = false;

// 1. Check package.json pinning & engines
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

console.log('1. Memeriksa Pinning Versi di package.json:');
const checkPinning = (deps, type) => {
    if (!deps) return;
    for (const [name, version] of Object.entries(deps)) {
        if (/^[\^~><*]/.test(version)) {
            console.error(`  [FAIL] ${type} "${name}": "${version}" tidak di-pin secara ketat (mengandung ^, ~, >, <, *)!`);
            failed = true;
        } else {
            console.log(`  [PASS] ${type} "${name}": "${version}" (ter-pin ketat)`);
        }
    }
};

checkPinning(pkg.dependencies, 'dependency');
checkPinning(pkg.devDependencies, 'devDependency');

if (!pkg.engines || !pkg.engines.node) {
    console.error('  [FAIL] package.json tidak memiliki deklarasi engines.node!');
    failed = true;
} else {
    console.log(`  [PASS] engines.node: "${pkg.engines.node}"`);
}

// 2. Run npm audit --omit=dev
console.log('\n2. Memeriksa Vulnerability via npm audit (--omit=dev):');
try {
    const auditOutput = execSync('npm audit --omit=dev --json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const auditJson = JSON.parse(auditOutput);
    const totalVulns = auditJson.metadata?.vulnerabilities?.total ?? 0;
    const critical = auditJson.metadata?.vulnerabilities?.critical ?? 0;
    const high = auditJson.metadata?.vulnerabilities?.high ?? 0;
    const moderate = auditJson.metadata?.vulnerabilities?.moderate ?? 0;
    const low = auditJson.metadata?.vulnerabilities?.low ?? 0;

    console.log(`  Total Vulnerabilities: ${totalVulns} (Critical: ${critical}, High: ${high}, Moderate: ${moderate}, Low: ${low})`);

    if (totalVulns > 0) {
        console.error(`  [FAIL] Ditemukan ${totalVulns} vulnerability pada runtime dependencies!`);
        failed = true;
    } else {
        console.log('  [PASS] 0 vulnerability ditemukan pada runtime dependencies.');
    }
} catch (err) {
    // npm audit returns non-zero exit code if vulnerabilities are found
    if (err.stdout) {
        try {
            const auditJson = JSON.parse(err.stdout);
            const totalVulns = auditJson.metadata?.vulnerabilities?.total ?? 0;
            console.error(`  [FAIL] npm audit mendeteksi ${totalVulns} vulnerabilities!`);
        } catch {
            console.error(`  [FAIL] Gagal menjalankan npm audit: ${err.message}`);
        }
    } else {
        console.error(`  [FAIL] Gagal menjalankan npm audit: ${err.message}`);
    }
    failed = true;
}

if (failed) {
    console.error('\nHASIL AUDIT DEPENDENCY: GAGAL!');
    process.exit(1);
} else {
    console.log('\nHASIL AUDIT DEPENDENCY: LULUS (0 Vulnerabilities, All Pinned)!\n');
}
