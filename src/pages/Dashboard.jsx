import { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
// import { Calendar, Users, UserCheck, UserX, Mail, Award } from 'lucide-react';
const Calendar = (props) => <span {...props}>📅</span>;
const Users = (props) => <span {...props}>👥</span>;
const UserCheck = (props) => <span {...props}>✅</span>;
const UserX = (props) => <span {...props}>❌</span>;
const Mail = (props) => <span {...props}>📧</span>;
const Award = (props) => <span {...props}>🏆</span>;

export default function Dashboard() {
  console.log("hello");
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const { data: evts, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (eventsError) throw eventsError;

      const { data: stds, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (studentsError) throw studentsError;

      setEvents(evts || []);
      setStudents(stds || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();

    // Realtime subscriptions
    const eventsChannel = supabase
      .channel('dashboard-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchAll())
      .subscribe();

    const studentsChannel = supabase
      .channel('dashboard-students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(studentsChannel);
    };
  }, []);

  const total = students.length;
  const present = students.filter(s => s.attendance_status === 'PRESENT').length;
  const absent = total - present;
  const certs = students.filter(s => s.certificate_url).length;
  const emailSuccess = students.filter(s => s.email_status === 'SUCCESS').length;
  const emailFailed = students.filter(s => s.email_status === 'FAILED').length;
  const emailRate = total > 0 ? Math.round((emailSuccess / total) * 100) : 0;

  const stats = [
    { label: 'Total Events', value: events.length, icon: Calendar, color: 'text-sky-500', bg: 'bg-sky-50' },
    { label: 'Total Students', value: total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Present', value: present, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Absent', value: absent, icon: UserX, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Certificates', value: certs, icon: Award, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Email Success', value: `${emailRate}%`, icon: Mail, color: 'text-violet-500', bg: 'bg-violet-50' },
  ];

  // TEMPORARY: Force show content even if loading
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of all events and attendance</p>
      </div>

      {/* Always show stats, even if loading */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`${bg} p-2 rounded-lg`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Recent Events</h2>
        </div>
        {events.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No events yet. Create your first event!</div>
        ) : (
          <div className="divide-y divide-border">
            {events.slice(0, 5).map(evt => {
              const evtStudents = students.filter(s => s.event_id === evt.id);
              const evtPresent = evtStudents.filter(s => s.attendance_status === 'PRESENT').length;
              return (
                <div key={evt.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-foreground">{evt.event_name}</div>
                    <div className="text-xs text-muted-foreground">{evt.event_date} · {evt.event_venue || 'No venue'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary">{evtPresent}/{evtStudents.length}</div>
                    <div className="text-xs text-muted-foreground">present</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-4">
          <h2 className="font-semibold text-foreground mb-3">Email Delivery Stats</h2>
          <div className="flex gap-4 flex-wrap">
            <div className="text-sm"><span className="font-medium text-emerald-600">{emailSuccess}</span> <span className="text-muted-foreground">Delivered</span></div>
            <div className="text-sm"><span className="font-medium text-rose-600">{emailFailed}</span> <span className="text-muted-foreground">Failed</span></div>
            <div className="text-sm"><span className="font-medium text-amber-600">{students.filter(s => s.email_status === 'PENDING').length}</span> <span className="text-muted-foreground">Pending</span></div>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${emailRate}%` }} />
          </div>
          <div className="text-xs text-muted-foreground mt-1">{emailRate}% success rate</div>
        </div>
      )}
    </div>
  );
}