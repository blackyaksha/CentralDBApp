import { useEffect, useState } from 'react';
import { Clock, FileText, Folder, User, X } from 'lucide-react';
import { clearActivityLog } from '../services/activityLogger';

type Activity = {
  id: string;
  type: 'file' | 'folder' | 'session';
  action: string;
  name: string;
  timestamp: string;
  user: string;
};

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<Activity[]>([]);

  const loadActivities = () => {
    const stored = localStorage.getItem('app_activities');
    if (stored) {
      try {
        const parsed: Activity[] = JSON.parse(stored);
        const username = sessionStorage.getItem('displayName') || 'User';
        setActivities(parsed.filter((a) => a.user === username));
      } catch {
        setActivities([]);
      }
    } else {
      setActivities([]);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleClear = () => {
    clearActivityLog();
    setActivities([]);
  };

  return (
    <div style={{
      padding: '32px',
      flex: 1,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      background: '#0f1f3d',
      fontFamily: "'Geist', 'DM Sans', system-ui, sans-serif",
      color: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: 40,
            fontWeight: 600,
            color: '#fff',
            letterSpacing: '-0.02em'
          }}>
            Activity Log
          </h1>
          <p style={{
            margin: 0,
            fontSize: 13.5,
            color: 'rgba(255,255,255,0.38)'
          }}>
            Track your recent activities in the app
          </p>
        </div>
        <button
          onClick={handleClear}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 0.15s ease',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
        >
          <X size={14} /> Clear log
        </button>
      </div>

      <div style={{
        background: '#1a2f52',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {activities.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 12
          }}>
            <Clock size={48} color="rgba(255,255,255,0.2)" />
            <span style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.4)',
              textAlign: 'center'
            }}>
              No activities yet. Start using the app to see your actions here.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activities.map((activity) => (
              <div key={activity.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.15s ease'
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {activity.type === 'file' ? (
                    <FileText size={18} color="#818cf8" />
                  ) : activity.type === 'folder' ? (
                    <Folder size={18} color="#818cf8" />
                  ) : (
                    <User size={18} color="#818cf8" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.9)',
                    marginBottom: 4
                  }}>
                    {activity.action} <strong>{activity.name}</strong>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={12} />
                      {activity.user}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {activity.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}