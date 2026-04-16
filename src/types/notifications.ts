export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  email_task_updates: boolean;
  email_digest: boolean;
}