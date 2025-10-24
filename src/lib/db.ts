// Database connection and health check
export interface DatabaseStatus {
  connected: boolean;
  error?: string;
  responseTime?: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected = false;
  private lastCheck = 0;
  private checkInterval = 30000; // 30 seconds

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async checkConnection(): Promise<DatabaseStatus> {
    const startTime = Date.now();
    
    try {
      // Try to fetch users count as a simple health check
      const response = await fetch('/api/health/database', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (response.ok && data.connected) {
        this.isConnected = true;
        this.lastCheck = Date.now();
        return {
          connected: true,
          responseTime,
        };
      } else {
        this.isConnected = false;
        return {
          connected: false,
          error: data.error || 'Database connection failed',
          responseTime,
        };
      }
    } catch (error) {
      this.isConnected = false;
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  async getConnectionStatus(): Promise<DatabaseStatus> {
    const now = Date.now();
    
    // Return cached result if checked recently
    if (this.isConnected && (now - this.lastCheck) < this.checkInterval) {
      return { connected: true };
    }

    return await this.checkConnection();
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export const dbService = DatabaseService.getInstance();
