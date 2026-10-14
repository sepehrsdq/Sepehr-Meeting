'use strict';

/**
 * Sepehr Meeting — Server Profiler & Auto-Tuner
 * =====================================================
 * Reads the host's real hardware capacity at startup and produces an
 * optimal mediasoup/SFU configuration for the detected profile.
 *
 * Fully offline: uses only os.* APIs, no external services.
 *
 * Usage (in config.js or Server.js bootstrap):
 *   const { profileServer, getRecommendedConfig } = require('./ServerProfiler');
 *   const profile  = profileServer();        // hardware snapshot + tier
 *   const tuned    = getRecommendedConfig(); // recommended SFU settings
 *
 * The recommendation is logged at startup and exposed on /api/v1/stats
 * (serverInfo section) so admins can see what the server auto-detected.
 *
 * @license Proprietary — see LICENSE
 */

const os = require('os');

// ------------------------------------------------------------
// Hardware snapshot
// ------------------------------------------------------------

function profileServer() {
    const cpus = os.cpus();
    const cores = cpus.length;
    const totalMemGB = os.totalmem() / 1024 ** 3;

    // Windows: os.freemem() is a good approximation at startup.
    const freeMemGB = os.freemem() / 1024 ** 3;

    // Load average is POSIX-only; on Windows use a cheap CPU-model heuristic.
    let cpuScore = cores; // baseline: 1 point per core

    // Weight by CPU generation proxy: clock speed from first core's speed
    const avgMHz = cpus.reduce((s, c) => s + (c.speed || 0), 0) / cores;
    if (avgMHz > 3500) cpuScore *= 1.2;
    else if (avgMHz < 2200) cpuScore *= 0.8;

    // Detect hyper-threading: most modern x86 CPUs ship 2 logical threads per
    // physical core. Model-name counting is unreliable (all threads share one
    // model string), so use the common ratios instead.
    const models = new Set(cpus.map((c) => c.model));
    let physicalCores = cores;
    let hyperThreaded = false;
    if (cores % 2 === 0 && cores >= 4) {
        // Assume 2 threads/core (HT/AMT), the overwhelming majority on servers
        physicalCores = cores / 2;
        hyperThreaded = true;
        cpuScore = physicalCores * 1.6; // HT adds ~60% effective throughput for media
    }

    const tier = classify(cpuScore, totalMemGB);

    return {
        timestamp: new Date().toISOString(),
        os: {
            platform: os.platform(),
            type: os.type(),
            release: os.release(),
            arch: os.arch(),
        },
        cpu: {
            model: cpus[0]?.model || 'unknown',
            logicalCores: cores,
            physicalCores,
            hyperThreaded,
            avgClockMHz: Math.round(avgMHz),
            score: Math.round(cpuScore * 10) / 10,
        },
        memory: {
            totalGB: round2(totalMemGB),
            freeGB: round2(freeMemGB),
            perCoreGB: round2(totalMemGB / cores),
        },
        network: {
            interfaces: Object.keys(os.networkInterfaces()).filter(
                (n) => !/^lo/i.test(n) && !/docker|veth|tun|vEthernet/i.test(n)
            ),
        },
        tier: tier.name,
        tierReason: tier.reason,
    };
}

// ------------------------------------------------------------
// Tier classification
// ------------------------------------------------------------

function classify(cpuScore, totalMemGB) {
    if (cpuScore >= 16 && totalMemGB >= 16) {
        return { name: 'enterprise', reason: 'High CPU + plenty of RAM — large meetings (30-80+ peers)' };
    }
    if (cpuScore >= 8 && totalMemGB >= 8) {
        return { name: 'large', reason: 'Strong server — medium/large meetings (20-40 peers)' };
    }
    if (cpuScore >= 4 && totalMemGB >= 4) {
        return { name: 'medium', reason: 'Mid-range server — team meetings (10-20 peers)' };
    }
    if (cpuScore >= 2 && totalMemGB >= 2) {
        return { name: 'small', reason: 'Modest server — small meetings (4-10 peers)' };
    }
    return { name: 'minimal', reason: 'Limited resources — 1:1 calls and small groups (2-4 peers)' };
}

// ------------------------------------------------------------
// Recommended config per tier
// ------------------------------------------------------------

function getRecommendedConfig(profile) {
    const p = profile || profileServer();

    // Mediasoup workers: 1 per physical core is the sweet spot (worker is CPU-bound).
    // Leave 1 core free for the Node event loop + portals co-hosted on the same box.
    const physical = p.cpu.physicalCores || Math.max(1, Math.floor(p.cpu.logicalCores / 2));
    const numWorkers = Math.max(1, physical - 1);

    // RTC port range must fit 2 ports (audio+video) * concurrent transports.
    // 4 ports per worker is a safe default for up to ~50 peers per worker.
    const portsPerWorker = 50;
    const rtcMinPort = 40000;
    const rtcMaxPort = Math.min(65535, rtcMinPort + numWorkers * portsPerWorker);

    const recommendations = {
        minimal: {
            numWorkers,
            rtcMinPort,
            rtcMaxPort,
            maxParticipantsPerRoom: 4,
            simulcast: true,
            simulcastLayers: [
                { spatialLayer: 0, temporalLayer: 2 },
                { spatialLayer: 0, temporalLayer: 2 },
            ],
            enableDataChannel: true,
            recording: false, // disk/CPU heavy
            notes: 'Disable screen-share-heavy usage; prefer audio-only mode for 3rd peer onward.',
        },
        small: {
            numWorkers,
            rtcMinPort,
            rtcMaxPort,
            maxParticipantsPerRoom: 10,
            simulcast: true,
            enableDataChannel: true,
            recording: true,
            notes: null,
        },
        medium: {
            numWorkers,
            rtcMinPort,
            rtcMaxPort,
            maxParticipantsPerRoom: 20,
            simulcast: true,
            enableDataChannel: true,
            recording: true,
            notes: null,
        },
        large: {
            numWorkers,
            rtcMinPort,
            rtcMaxPort,
            maxParticipantsPerRoom: 40,
            simulcast: true,
            enableDataChannel: true,
            recording: true,
            notes: 'Consider SFU_SERVER=true (WebRTC server mode) for better port management.',
        },
        enterprise: {
            numWorkers: Math.min(numWorkers, 16), // mediasoup practical cap per process
            rtcMinPort,
            rtcMaxPort: 65535,
            maxParticipantsPerRoom: 80,
            simulcast: true,
            enableDataChannel: true,
            recording: true,
            notes: 'Enable horizontal scaling (cluster mode) if multiple rooms exceed 50 peers each.',
        },
    };

    const rec = recommendations[p.tier] || recommendations.medium;

    return {
        tier: p.tier,
        tierReason: p.tierReason,
        ...rec,
        hardware: {
            cpuModel: p.cpu.model,
            logicalCores: p.cpu.logicalCores,
            physicalCores: p.cpu.physicalCores,
            totalMemoryGB: p.memory.totalGB,
        },
        generatedAt: p.timestamp,
    };
}

// ------------------------------------------------------------
// Startup report (pretty console output)
// ------------------------------------------------------------

function logStartupReport(logger) {
    const profile = profileServer();
    const rec = getRecommendedConfig(profile);

    const line = () => logger.log('  ' + '-'.repeat(56));

    logger.log('');
    line();
    logger.log('  SMART SERVER PROFILER — auto-detected hardware profile');
    line();
    logger.log(`  CPU      : ${profile.cpu.model}`);
    logger.log(
        `           : ${profile.cpu.logicalCores} logical / ${profile.cpu.physicalCores} physical cores @ ${profile.cpu.avgClockMHz} MHz`
    );
    logger.log(`  Memory   : ${profile.memory.totalGB} GB total (${profile.memory.freeGB} GB free)`);
    logger.log(`  Platform : ${profile.os.platform} ${profile.os.arch} (${profile.os.release})`);
    line();
    logger.log(`  TIER     : ${profile.tier.toUpperCase()} — ${profile.tierReason}`);
    line();
    logger.log('  Recommended SFU settings:');
    logger.log(`    workers          : ${rec.numWorkers}`);
    logger.log(`    RTC ports        : ${rec.rtcMinPort}-${rec.rtcMaxPort}`);
    logger.log(`    max participants : ${rec.maxParticipantsPerRoom} per room`);
    logger.log(`    simulcast        : ${rec.simulcast ? 'on' : 'off'}`);
    logger.log(`    recording        : ${rec.recording ? 'allowed' : 'discouraged'}`);
    if (rec.notes) logger.log(`    note             : ${rec.notes}`);
    line();
    logger.log('');

    return { profile, rec };
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

module.exports = { profileServer, getRecommendedConfig, logStartupReport };

// CLI usage: node ServerProfiler.js
if (require.main === module) {
    const { profile, rec } = (() => {
        const logger = { log: (m) => console.log(m) };
        return logStartupReport(logger);
    })();
    console.log(JSON.stringify({ profile, rec }, null, 2));
}
