export type ActivityType = 'file' | 'folder' | 'session';

type Activity = {
  id: string;
  type: ActivityType;
  action: string;
  name: string;
  timestamp: string;
  user: string;
};

const getCurrentUser = () => sessionStorage.getItem('displayName') || 'User';

export const logActivity = (type: ActivityType, action: string, name: string) => {
  const username = getCurrentUser();
  const activity: Activity = {
    id: Date.now().toString(),
    type,
    action,
    name,
    timestamp: new Date().toLocaleString(),
    user: username,
  };

  const stored = localStorage.getItem('app_activities');
  let activities: Activity[] = [];
  if (stored) {
    try {
      activities = JSON.parse(stored);
    } catch {}
  }
  activities.unshift(activity);
  if (activities.length > 100) {
    activities = activities.slice(0, 100);
  }
  localStorage.setItem('app_activities', JSON.stringify(activities));
};

export const clearActivityLog = () => {
  const username = getCurrentUser();
  const stored = localStorage.getItem('app_activities');
  if (!stored) {
    return;
  }

  try {
    const activities: Activity[] = JSON.parse(stored);
    const filtered = activities.filter((activity) => activity.user !== username);
    localStorage.setItem('app_activities', JSON.stringify(filtered));
  } catch {
    localStorage.removeItem('app_activities');
  }
};