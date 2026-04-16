'use client'

import { useEffect, useState, useCallback } from 'react'
import { Mail, MailOpen, CheckCheck } from 'lucide-react'
import type { Notification } from '@/types/notifications'

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        const items: Notification[] = data.notifications ?? data ?? []
        items.sort((a, b) => {
          if (a.read !== b.read) return a.read ? 1 : -1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        setNotifications(items)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (ids: string[]) => {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      )
    }
  }

  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">📬 Inbox</h1>
        <div className="text-zinc-500 dark:text-zinc-400">Loading notifications…</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">📬 Inbox</h1>
        {unreadIds.length > 0 && (
          <button
            onClick={() => markAsRead(unreadIds)}
            className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 text-center text-zinc-500 dark:text-zinc-400">
          No notifications yet
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 flex items-start gap-3 transition-colors ${
                !n.read ? 'border-l-4 border-amber-500' : 'opacity-70'
              }`}
            >
              <div className="mt-0.5">
                {n.read ? (
                  <MailOpen size={18} className="text-zinc-400 dark:text-zinc-500" />
                ) : (
                  <Mail size={18} className="text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                    {n.title}
                  </span>
                  {n.type && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      {n.type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{n.message}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <button
                  onClick={() => markAsRead([n.id])}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 whitespace-nowrap"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}