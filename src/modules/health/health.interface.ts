export interface ServiceHealth {
  status:  'connected' | 'error';
  latency?: number;
}

export interface HealthResponse {
  status:    'ok' | 'degraded';
  version:   string;
  uptime:    number;
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis:    ServiceHealth;
  };
}
