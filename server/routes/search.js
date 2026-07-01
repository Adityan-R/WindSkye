import { Router } from 'express';
import { searchInternetArchive } from '../searchProviders/internetArchive.js';
import { searchLinuxISOs } from '../searchProviders/linuxISOs.js';
import { searchFOSS } from '../searchProviders/fossTorrents.js';

const router = Router();

/**
 * GET /api/search?q=<query>&category=<all|archive|linux|software|datasets>
 * Aggregates results from all providers based on category
 */
router.get('/', async (req, res) => {
  const { q, category = 'all' } = req.query;

  if (!q || q.trim().length === 0) {
    return res.json({ results: [], query: '', category, total: 0 });
  }

  const query = q.trim();
  let results = [];

  try {
    const providers = [];

    // Determine which providers to search
    if (category === 'all' || category === 'archive' || category === 'datasets') {
      providers.push(
        searchInternetArchive(query, {
          mediatype: category === 'datasets' ? 'data' : undefined,
          rows: 15,
        }).catch((err) => {
          console.error('[Search] Internet Archive error:', err.message);
          return [];
        })
      );
    }

    if (category === 'all' || category === 'linux') {
      providers.push(Promise.resolve(searchLinuxISOs(query)));
    }

    if (category === 'all' || category === 'software') {
      providers.push(Promise.resolve(searchFOSS(query)));
    }

    // Wait for all providers
    const allResults = await Promise.all(providers);
    results = allResults.flat();

    // Sort by seeds (descending)
    results.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));

    // Deduplicate by id
    const seen = new Set();
    results = results.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    res.json({
      results,
      query,
      category,
      total: results.length,
      sources: [...new Set(results.map((r) => r.source))],
    });
  } catch (error) {
    console.error('[Search] Error:', error.message);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

export default router;
