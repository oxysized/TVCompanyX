import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }

  try {
    switch (req.method) {
      case 'PUT':
        const { scheduled_date, duration_minutes, ad_minutes, available_slots } = req.body;
        
        const updatedItem = await db.updateScheduleItem(id, {
          scheduled_date,
          duration_minutes: duration_minutes ? parseInt(duration_minutes) : undefined,
          ad_minutes: ad_minutes !== undefined ? parseInt(ad_minutes) : undefined,
          available_slots: available_slots !== undefined ? parseInt(available_slots) : undefined
        });
        
        if (!updatedItem) {
          return res.status(404).json({ error: 'Schedule item not found' });
        }
        
        res.status(200).json(updatedItem);
        break;

      case 'DELETE':
        await db.deleteScheduleItem(id);
        res.status(200).json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Schedule item API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
