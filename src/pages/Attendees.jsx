import { useState, useEffect } from 'react';
import { supabase } from "../api/supabaseClient";
import StudentForm from '../components/StudentForm';
import BatchUpload from '../components/BatchUpload';
import AttendeeActions from '../components/AttendeeActions';
import { generateCertificate } from '../utils/certificateUtils';
import { loadEmailConfig } from '../utils/emailConfig';
import { Plus, Upload, Search, Users, UserCheck, Clock, LogOut, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const formatTime = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const statusBadge = (s) => {
  if (s === 'PRESENT') return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">PRESENT</span>;
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700">ABSENT</span>;
};

// Convert base64 data URL to Blob for Supabase Storage upload
function base64ToBlob(base64Data, contentType = 'application/pdf') {
  const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

export default function Attendees() {
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [editing, setEditing] = useState(null);
  const [rowLoading, setRowLoading] = useState({});

  const load = async () => {
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
        .limit(5000);
      if (studentsError) throw studentsError;

      setEvents(evts || []);
      setStudents(stds || []);
      
      if (!selectedEvent && evts?.length > 0) {
        const active = evts.find(e => e.is_active) || evts[0];
        setSelectedEvent(active.id);
      }
    } catch (err) {
      console.error('Load error:', err);
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const currentEvent = events.find(e => e.id === selectedEvent);
  const filtered = students
    .filter(s => s.event_id === selectedEvent)
    .filter(s => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.student_id?.includes(search) || s.section?.toLowerCase().includes(search.toLowerCase()));

  const handleUpdate = (updated) => setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  const handleDelete = (id) => setStudents(prev => prev.filter(s => s.id !== id));
  const handleStudentSaved = (saved) => {
    console.log("Student saved:", saved);
    setStudents(prev => editing ? prev.map(s => s.id === saved.id ? saved : s) : [saved, ...prev]);
    setShowForm(false);
    setEditing(null);
  };

  const setLoading2 = (id, key, val) => setRowLoading(l => ({ ...l, [`${id}_${key}`]: val }));

  const handleTimeIn = async (student) => {
    setLoading2(student.id, 'in', true);
    try {
      const timeIn = new Date().toISOString();
      const { error } = await supabase
        .from('students')
        .update({ attendance_status: 'PRESENT', time_in: timeIn })
        .eq('id', student.id);
      if (error) throw error;
      const updated = { ...student, attendance_status: 'PRESENT', time_in: timeIn };
      handleUpdate(updated);
      toast.success(`✅ Time In: ${student.full_name} checked in at ${formatTime(timeIn)}`, { duration: 1000 });
    } catch (err) {
      console.error('Time in error:', err);
      toast.error('Failed to check in');
    }
    setLoading2(student.id, 'in', false);
  };

  const sendEmail = async (certUrl, student, event) => {
    const config = loadEmailConfig();
    if (!config.publicKey || !config.serviceId || !config.templateId) return 'FAILED';
    try {
      const emailjs = await import('@emailjs/browser');
      emailjs.init(config.publicKey);
      await emailjs.send(config.serviceId, config.templateId, {
        to_name: student.full_name,
        to_email: student.sti_email,
        event_name: event.event_name,
        event_date: event.event_date,
        event_venue: event.event_venue || '',
        certificate_url: certUrl,
        certificate_id: student.student_id,
        course: student.course,
        year_level: student.year_level,
        section: student.section,
      });
      return 'SUCCESS';
    } catch {
      return 'FAILED';
    }
  };

  const handleTimeOut = async (student) => {
    if (!currentEvent) return;
    setLoading2(student.id, 'out', true);
    
    try {
      let certUrl = student.certificate_url;
      
      // Generate and upload if no certificate exists, or if existing is still a base64 data URL
      if (!certUrl || certUrl.startsWith('data:')) {
        // Generate PDF as base64 data URL
        const pdfBase64 = await generateCertificate(student, currentEvent);
        
        // Convert to Blob for upload
        const blob = base64ToBlob(pdfBase64, 'application/pdf');
        
        // Upload to Supabase Storage
        const fileName = `certificates/${currentEvent.id}/${student.id}_${Date.now()}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('certificates')
          .upload(fileName, blob, { 
            contentType: 'application/pdf',
            upsert: true 
          });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('certificates')
          .getPublicUrl(fileName);
        
        certUrl = publicUrl;
      }
      
      // Send only the small URL string via EmailJS (no more 413!)
      const emailStatus = await sendEmail(certUrl, student, currentEvent);
      const timeOut = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('students')
        .update({
          time_out: timeOut,
          certificate_url: certUrl,
          email_status: emailStatus,
        })
        .eq('id', student.id);
        
      if (updateError) throw updateError;
      
      const updated = { ...student, time_out: timeOut, certificate_url: certUrl, email_status: emailStatus };
      handleUpdate(updated);
      
      if (emailStatus === 'SUCCESS') {
        toast.success(`✅ Certificate emailed to ${student.sti_email} at ${formatTime(timeOut)}`, { duration: 1000 });
      } else {
        toast.error(`⚠️ Checked out at ${formatTime(timeOut)}. Email delivery failed.`, { duration: 1000 });
      }
    } catch (err) {
      console.error('Time out error:', err);
      toast.error('Failed to check out: ' + (err.message || 'Unknown error'));
    }
    
    setLoading2(student.id, 'out', false);
  };

  const presentCount = filtered.filter(s => s.attendance_status === 'PRESENT').length;

  const exportToExcel = () => {
    if (!filtered.length) return;
    const headers = ['Student ID', 'Full Name', 'Course', 'Year Level', 'Section', 'STI Email', 'Status', 'Time In', 'Time Out', 'Email Status', 'Certificate URL'];
    const rows = filtered.map(s => [
      s.student_id, s.full_name, s.course, s.year_level, s.section, s.sti_email || '',
      s.attendance_status, s.time_in ? formatDateTime(s.time_in) : '', s.time_out ? formatDateTime(s.time_out) : '',
      s.email_status || '', s.certificate_url || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${currentEvent?.event_name || 'attendees'}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`✅ ${filtered.length} records exported to Excel.`, { duration: 1000 });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendees</h1>
          <p className="text-muted-foreground text-sm">{presentCount}/{filtered.length} present</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!filtered.length} className="gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBatch(true)} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Batch Upload
          </Button>
          <Button size="sm" onClick={() => { console.log("Add Student clicked, selectedEvent:", selectedEvent); setEditing(null); setShowForm(true); }} className="gap-1.5" disabled={!selectedEvent}>
            <Plus className="w-3.5 h-3.5" /> Add Student
          </Button>
        </div>
      </div>

      {/* Event Selector & Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger className="sm:w-56 bg-white">
            <SelectValue placeholder="Select event..." />
          </SelectTrigger>
          <SelectContent position="popper" className="bg-white border border-border shadow-lg z-50 w-[var(--radix-select-trigger-width)]">
            {events.map(e => (
              <SelectItem key={e.id} value={e.id} className="cursor-pointer focus:bg-muted focus:text-foreground">
                {e.event_name}{e.is_active ? ' (Active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 bg-white" placeholder="Search by name, ID, or section..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Stats */}
      {currentEvent && (
        <div className="flex gap-3">
          <div className="bg-white border border-border rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">{filtered.length}</span>
            <span className="text-muted-foreground">students</span>
          </div>
          <div className="bg-white border border-border rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">{presentCount}</span>
            <span className="text-muted-foreground">present</span>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border p-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !selectedEvent ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
          Select an event to view attendees
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No students found. Add students or upload CSV.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Student ID</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Full Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Course</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Section</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Time In</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Time Out</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">More</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(student => {
                  const inLoading = rowLoading[`${student.id}_in`];
                  const outLoading = rowLoading[`${student.id}_out`];
                  const canTimeIn = student.attendance_status !== 'PRESENT';
                  const canTimeOut = student.attendance_status === 'PRESENT' && !student.time_out;
                  return (
                    <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{student.student_id}</td>
                      <td className="px-3 py-2 font-medium text-foreground text-xs">{student.full_name || `${student.last_name}, ${student.first_name}`}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{student.course}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">{student.section}</td>
                      <td className="px-3 py-2">{statusBadge(student.attendance_status)}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => handleTimeIn(student)}
                            disabled={!canTimeIn || inLoading}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              canTimeIn
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                          >
                            {inLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                            In
                          </button>
                          {student.time_in && <span className="text-[10px] text-emerald-600 font-medium">{formatTime(student.time_in)}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => handleTimeOut(student)}
                            disabled={!canTimeOut || outLoading}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              canTimeOut
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                          >
                            {outLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                            Out
                          </button>
                          {student.time_out && <span className="text-[10px] text-amber-600 font-medium">{formatTime(student.time_out)}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <AttendeeActions
                          student={student}
                          event={currentEvent}
                          onUpdate={handleUpdate}
                          onEdit={(s) => { setEditing(s); setShowForm(true); }}
                          onDelete={handleDelete}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <StudentForm
          student={editing}
          eventId={selectedEvent}
          existingStudents={students.filter(s => s.event_id === selectedEvent)}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={handleStudentSaved}
        />
      )}
      {showBatch && (
        <BatchUpload
          eventId={selectedEvent}
          onClose={() => setShowBatch(false)}
          onDone={load}
        />
      )}
    </div>
  );
}