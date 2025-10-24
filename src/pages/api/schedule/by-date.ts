import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

interface Show {
  id: string
  name: string
  time_slot: string
  base_price_per_min: number
  duration_minutes: number
  is_active: boolean
  is_recurring?: boolean
  recurring_days?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Get shows scheduled for the specific date
    const schedule = await db.getSchedule({
      dateFrom: date,
      dateTo: date
    });

    // Group by show and return unique shows with their schedule info
    const showsMap = new Map();
    
    schedule.forEach(item => {
      if (!showsMap.has(item.show_id)) {
        showsMap.set(item.show_id, {
          id: item.show_id,
          name: item.show_name,
          time_slot: item.time_slot,
          base_price_per_min: item.base_price_per_min,
          scheduled_date: item.scheduled_date,
          duration_minutes: item.duration_minutes,
          ad_minutes: item.ad_minutes,
          available_slots: item.available_slots,
          is_recurring: false
        });
      }
    });

    // Add all active recurring shows for this date
    const allShows = await db.getShows();
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    allShows.forEach((show: Show) => {
      // Skip if show is already in the schedule
      if (showsMap.has(show.id)) {
        return;
      }

      // Only add if show is active and recurring
      if (!show.is_active || !show.is_recurring) {
        return;
      }

      // Check if show should be shown on this day
      let shouldShow = false;
      if (show.recurring_days === 'daily') {
        shouldShow = true;
      } else if (show.recurring_days === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) {
        shouldShow = true;
      } else if (show.recurring_days === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) {
        shouldShow = true;
      }

      if (shouldShow) {
        showsMap.set(show.id, {
          id: show.id,
          name: show.name,
          time_slot: show.time_slot,
          base_price_per_min: show.base_price_per_min,
          scheduled_date: date,
          duration_minutes: show.duration_minutes || 60,
          ad_minutes: 0, // Will be calculated from existing ads
          available_slots: 999, // Large number for recurring shows
          is_recurring: true
        });
      }
    });

    const shows = Array.from(showsMap.values());

    res.status(200).json(shows);
  } catch (error) {
    console.error('Schedule by date API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
