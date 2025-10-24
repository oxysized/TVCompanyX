import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const shows = await db.getShows();
        res.status(200).json(shows);
        break;

      case 'POST':
        const { 
          name, 
          time_slot, 
          base_price_per_min, 
          show_type, 
          duration_minutes, 
          description, 
          is_active 
        } = req.body;
        
        if (!name || !time_slot || !base_price_per_min) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const newShow = await db.createShow({
          name,
          time_slot,
          base_price_per_min: parseFloat(base_price_per_min),
          show_type: show_type || 'program',
          duration_minutes: parseInt(duration_minutes) || 60,
          description: description || null,
          is_active: is_active !== undefined ? is_active : true
        });
        
        res.status(201).json(newShow);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Shows API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
