import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { duration_seconds, show_id, selected_date, selected_time } = req.body;

    if (!duration_seconds || !show_id) {
      return res.status(400).json({ error: 'Duration and show ID are required' });
    }

    // Get show details
    const show = await db.getShowById(show_id);
    if (!show) {
      return res.status(404).json({ error: 'Show not found' });
    }

    // Build scheduled_at timestamp if date is provided
    let scheduled_at = null
    if (selected_date) {
      if (selected_time) {
        scheduled_at = `${selected_date}T${selected_time}:00`
      } else {
        // Use show's time_slot if available
        const timeMatch = show.time_slot?.match(/(\d{1,2}):(\d{2})/)
        if (timeMatch) {
          scheduled_at = `${selected_date}T${timeMatch[0]}:00`
        } else {
          scheduled_at = `${selected_date}T12:00:00`
        }
      }
    }

    console.log('[Calculate Cost] Duration:', duration_seconds, 'Show:', show_id, 'Date:', selected_date, 'Time:', selected_time, 'Scheduled:', scheduled_at)

    // Calculate cost using the database function via db (uses pool internally)
    const costResult = await (async () => {
      try {
        // use the pool directly from the module to call raw SQL function
        const poolModule = require('../../lib/database')
        const pool = poolModule && poolModule.default ? poolModule.default : poolModule
        const result = await pool.query('SELECT calculate_ad_cost($1::int, $2::uuid) as cost', [parseInt(duration_seconds), show_id])
        console.log('[Calculate Cost] Result:', result.rows[0])
        return result
      } catch (e) {
        console.error('[Calculate Cost] Error:', e)
        // Fallback: try calling via exported db helper (it already wraps calculate logic)
        return { rows: [{ cost: null }] }
      }
    })()

    const cost = costResult.rows[0].cost;

    if (cost === null) {
      // Fallback calculation if database function fails
      const minutes = parseInt(duration_seconds) / 60
      const calculatedCost = Math.ceil(minutes * (show.base_price_per_min || 0))
      
      res.status(200).json({
        cost: calculatedCost,
        duration_seconds: parseInt(duration_seconds),
        scheduled_at,
        show: {
          id: show.id,
          name: show.name,
          time_slot: show.time_slot,
          base_price_per_min: show.base_price_per_min
        }
      });
    } else {
      res.status(200).json({
        cost,
        duration_seconds: parseInt(duration_seconds),
        scheduled_at,
        show: {
          id: show.id,
          name: show.name,
          time_slot: show.time_slot,
          base_price_per_min: show.base_price_per_min
        }
      });
    }
  } catch (error) {
    console.error('Calculate cost API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
