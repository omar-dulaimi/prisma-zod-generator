#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Extract download metrics from README badges and package.json
 * This runs during build to keep metrics in sync
 */
async function extractMetrics() {
  try {
    // Read README
    const readmePath = path.join(__dirname, '../../README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');

    // Read package.json for version
    const packagePath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Extract download badge URL (it's dynamic and shows real numbers)
    const downloadBadgeMatch = readmeContent.match(
      /https:\/\/img\.shields\.io\/npm\/dw\/prisma-zod-generator/,
    );
    const hasDownloadBadge = !!downloadBadgeMatch;

    // Get version from package.json
    const version = packageJson.version;

    // Fetch actual download stats from npm API
    let weeklyDownloads = '7k+'; // fallback
    try {
      console.log('📊 Fetching npm download stats...');
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(
        'https://api.npmjs.org/downloads/point/last-week/prisma-zod-generator',
      );
      const data = await response.json();
      console.log('📊 NPM API Response:', data);
      if (data.downloads) {
        const downloads = data.downloads;
        console.log(`📊 Raw downloads: ${downloads}`);
        if (downloads >= 1000) {
          weeklyDownloads = `${Math.round(downloads / 1000)}k+`;
        } else {
          weeklyDownloads = downloads.toString();
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch download stats, using fallback:', error.message);
    }

    // Get GitHub stars
    let githubStars = '650+'; // fallback
    try {
      console.log('⭐ Fetching GitHub stars...');
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(
        'https://api.github.com/repos/omar-dulaimi/prisma-zod-generator',
      );
      const data = await response.json();
      console.log('⭐ GitHub API Response:', {
        stargazers_count: data.stargazers_count,
        forks_count: data.forks_count,
        open_issues_count: data.open_issues_count,
      });
      if (data.stargazers_count) {
        githubStars = `${data.stargazers_count}+`;
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch GitHub stars, using fallback:', error.message);
    }

    const metrics = {
      version: `v${version}`,
      weeklyDownloads,
      githubStars,
      lastUpdated: new Date().toISOString(),
    };

    // Write metrics to a JSON file that can be imported
    const metricsPath = path.join(__dirname, '../src/data/metrics.json');
    const metricsDir = path.dirname(metricsPath);

    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

    console.log('✅ Metrics extracted successfully:', metrics);
    return metrics;
  } catch (error) {
    console.error('❌ Error extracting metrics:', error);
    // Return fallback metrics
    return {
      version: 'v1.9.3',
      weeklyDownloads: '7k+',
      githubStars: '650+',
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Run if called directly
if (require.main === module) {
  extractMetrics();
}

module.exports = extractMetrics;
