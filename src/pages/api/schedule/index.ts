import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const { dateFrom, dateTo, showId } = req.query;
        const schedule = await db.getSchedule({
          dateFrom: dateFrom as string,
          dateTo: dateTo as string,
          showId: showId as string
        });
        res.status(200).json(schedule);
        break;

      case 'POST':
        const { show_id, scheduled_date, duration_minutes, ad_minutes, available_slots } = req.body;
        
        if (!show_id || !scheduled_date || !duration_minutes || ad_minutes === undefined || available_slots === undefined) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const newScheduleItem = await db.createScheduleItem({
          show_id,
          scheduled_date,
          duration_minutes: parseInt(duration_minutes),
          ad_minutes: parseInt(ad_minutes),
          available_slots: parseInt(available_slots)
        });
        
        res.status(201).json(newScheduleItem);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Schedule API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
