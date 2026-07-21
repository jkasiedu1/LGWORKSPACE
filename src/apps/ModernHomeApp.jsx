import {
  Users,
  Calendar,
  TrendingUp,
  Heart,
  ArrowRight,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import MetricCard from '../components/modern/MetricCard';
import StatCard from '../components/modern/StatCard';

export default function ModernHomeApp({ 
  events, 
  people, 
  isAdmin, 
  isSeniorPastor, 
  setActiveApp, 
  loadingPeople, 
  loadingEvents, 
  user 
}) {
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Calculate metrics
  const totalPeople = people.length;
  const kidsCount = people.filter(p => p.type === 'Child').length;
  const volunteersCount = people.filter(p => p.type === 'Volunteer').length;
  const upcomingEvents = events.slice(0, 5);
  
  // Quick actions based on role
  const quickActions = isSeniorPastor || isAdmin ? [
    { label: 'Add Person', icon: Users, action: () => setActiveApp('people'), color: 'primary' },
    { label: 'Create Event', icon: Calendar, action: () => setActiveApp('calendar'), color: 'success' },
    { label: 'View Reports', icon: TrendingUp, action: () => setActiveApp('reporting'), color: 'warning' },
    { label: 'Manage Teams', icon: Heart, action: () => setActiveApp('teams'), color: 'error' },
  ] : [
    { label: 'My Schedule', icon: Calendar, action: () => setActiveApp('calendar'), color: 'primary' },
    { label: 'Community', icon: Users, action: () => setActiveApp('community'), color: 'success' },
    { label: 'Services', icon: CheckCircle, action: () => setActiveApp('services'), color: 'warning' },
  ];

  const formatEventDate = (dateStr, timeStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(`${dateStr}T00:00:00`);
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = d.getDate();
      return { month, day, time: timeStr || '' };
    } catch {
      return { month: '', day: '', time: '' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="glass-panel rounded-3xl p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-5 shadow-lg badge badge-primary">
              <Sparkles size={14} />
              <span>EXECUTIVE DASHBOARD</span>
            </div>
            <h1 className="display-1 mb-3">
              {greeting}, {firstName}
            </h1>
            <p className="text-lg text-secondary font-medium">
              Here's what's happening in your ministry today
            </p>
          </div>
          <button
            onClick={() => setActiveApp('calendar')}
            className="btn-primary px-8 py-4 text-base rounded-xl"
          >
            View Calendar
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Metrics Grid */}
      <section>
        <h2 className="text-2xl font-bold text-primary mb-5" style={{ fontFamily: 'Lexend, sans-serif', letterSpacing: '-0.02em' }}>Key Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total People"
            value={loadingPeople ? '...' : totalPeople}
            change="+12% this month"
            trend="up"
            icon={Users}
            loading={loadingPeople}
          />
          <MetricCard
            title="Upcoming Events"
            value={loadingEvents ? '...' : events.length}
            change="3 this week"
            trend="up"
            icon={Calendar}
            loading={loadingEvents}
          />
          <MetricCard
            title="Children"
            value={loadingPeople ? '...' : kidsCount}
            change="+5% this month"
            trend="up"
            icon={Heart}
            loading={loadingPeople}
          />
          <MetricCard
            title="Volunteers"
            value={loadingPeople ? '...' : volunteersCount}
            change="+8% this month"
            trend="up"
            icon={TrendingUp}
            loading={loadingPeople}
          />
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Upcoming Events</h2>
              <p className="card-description">Next events on your calendar</p>
            </div>
            <div className="space-y-3">
              {loadingEvents ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-lg" style={{ background: 'rgba(250, 250, 249, 0.95)', border: '1px solid rgba(41, 37, 36, 0.08)' }}>
                    <div className="skeleton w-16 h-16 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-3/4"></div>
                      <div className="skeleton h-3 w-1/2"></div>
                    </div>
                  </div>
                ))
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar size={48} className="mx-auto text-neutral-300 mb-4" />
                  <p className="text-secondary">No upcoming events</p>
                </div>
              ) : (
                upcomingEvents.map((event, idx) => {
                  const dateInfo = formatEventDate(event.date, event.time);
                  const gradients = [
                    'linear-gradient(135deg, #0d9488, #0284c7)',
                    'linear-gradient(135deg, #ea580c, #f59e0b)',
                    'linear-gradient(135deg, #0284c7, #0d9488)',
                    'linear-gradient(135deg, #e11d48, #ea580c)',
                    'linear-gradient(135deg, #f59e0b, #0d9488)',
                  ];
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 rounded-lg hover:shadow-lg transition-all cursor-pointer"
                      style={{ background: 'rgba(250, 250, 249, 0.95)', border: '1px solid rgba(41, 37, 36, 0.12)' }}
                      onClick={() => setActiveApp('calendar')}
                    >
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg text-white flex-shrink-0 shadow-md" style={{ background: gradients[idx % gradients.length] }}>
                        <span className="text-xs font-semibold uppercase">{dateInfo.month}</span>
                        <span className="text-2xl font-bold">{dateInfo.day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-primary truncate">{event.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-secondary mt-1">
                          <Clock size={14} />
                          <span>{dateInfo.time || 'Time TBD'}</span>
                        </div>
                      </div>
                      <ArrowRight size={20} className="text-neutral-400" />
                    </div>
                  );
                })
              )}
            </div>
            {!loadingEvents && upcomingEvents.length > 0 && (
              <button
                onClick={() => setActiveApp('calendar')}
                className="btn-ghost w-full mt-4"
              >
                View All Events
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
              <p className="card-description">Common tasks</p>
            </div>
            <div className="space-y-2">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                const colorGradients = {
                  primary: 'linear-gradient(90deg, #0d9488, #0284c7)',
                  success: 'linear-gradient(90deg, #059669, #14b8a6)',
                  warning: 'linear-gradient(90deg, #ea580c, #f59e0b)',
                  error: 'linear-gradient(90deg, #e11d48, #ea580c)',
                };
                return (
                  <button
                    key={idx}
                    onClick={action.action}
                    className="flex items-center gap-3 w-full p-3 rounded-lg transition-all text-white shadow-lg hover:shadow-xl hover:scale-105"
                    style={{ background: colorGradients[action.color] }}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{action.label}</span>
                    <ArrowRight size={16} className="ml-auto" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ministry Stats */}
          <div className="space-y-3">
            <StatCard
              label="Active Teams"
              value="12"
              icon={Users}
              color="primary"
            />
            <StatCard
              label="This Week's Attendance"
              value="248"
              icon={CheckCircle}
              color="success"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
