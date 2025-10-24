// API endpoint for database health check
import { NextApiRequest, NextApiResponse } from 'next';
import { testConnection } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    const { connected, error } = await testConnection();
    const responseTime = Date.now() - startTime;

    if (connected) {
      res.status(200).json({
        connected: true,
        message: 'Database connection successful',
        responseTime,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        connected: false,
        error: error || 'Database connection failed',
        responseTime,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
}
