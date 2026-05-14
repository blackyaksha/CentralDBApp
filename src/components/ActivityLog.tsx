import { Clock, FileText, Folder } from 'lucide-react';

type Activity = {
  id: string;
  type: 'file' | 'folder';
  action: string;
  name: string;
  timestamp: string;
};
    
const sampleActivities: Activity[] = [
  { id: '1', type: 'file', action: 'Opened', name: 'Database App.docx', timestamp: '2 min ago' },
  { id: '2', type: 'folder', action: 'Added', name: 'HR Documents', timestamp: '5 min ago' },
  { id: '3', type: 'file', action: 'Downloaded', name: 'Budget 2026.xlsx', timestamp: '10 min ago' },
  { id: '4', type: 'file', action: 'Viewed', name: 'SPMS Matrix.xlsx', timestamp: '15 min ago' },
];

export default function ActivityLog({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Clock size={16} color="rgba(255,255,255,0.5)" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
      <p style={{
        margin: '0 0 8px 0',
        fontSize: 10,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.22)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }}>
        Recent Activity
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
        {sampleActivities.map((activity) => (
          <div key={activity.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            {activity.type === 'file' ? (
              <FileText size={14} color="rgba(255,255,255,0.6)" />
            ) : (
              <Folder size={14} color="rgba(255,255,255,0.6)" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.8)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {activity.action} {activity.name}
              </div>
              <div style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.4)',
                marginTop: 2
              }}>
                {activity.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}