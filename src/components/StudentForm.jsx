import { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const COURSES = ['BSIT', 'BSHM', 'BSBA', 'BSTM'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export default function StudentForm({ student, eventId, existingStudents = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    student_id: '', first_name: '', middle_initial: '', last_name: '',
    course: 'BSIT', year_level: '1st Year', section: '', event_id: eventId || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) setForm({ ...student });
  }, [student]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const full_name = `${form.last_name}, ${form.first_name}${form.middle_initial ? ' ' + form.middle_initial + '.' : ''}`.trim();
  const sti_email = form.last_name && form.student_id
    ? `${form.last_name.toLowerCase()}.${form.student_id}@alabang.sti.edu.ph`
    : '';

  const handleSave = async () => {
    if (!form.student_id || !form.first_name || !form.last_name || !form.section) {
      setError('Please fill in all required fields.');
      return;
    }
    
    const duplicate = existingStudents.find(s => s.student_id === form.student_id && s.id !== student?.id);
    if (duplicate) {
      setError(`Student ID "${form.student_id}" already exists in this event.`);
      return;
    }
    
    setSaving(true);
    setError('');
    const data = { ...form, full_name, sti_email };
    
    try {
      let saved;
      if (student) {
        const { data: updated, error } = await supabase
          .from('students')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', student.id)
          .select()
          .single();
        if (error) throw error;
        saved = { ...student, ...updated };
      } else {
        const { data: inserted, error } = await supabase
          .from('students')
          .insert([{
            ...data,
            attendance_status: 'ABSENT',
            email_status: 'PENDING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
        if (error) throw error;
        saved = inserted;
      }
      
      setSaving(false);
      onSaved(saved);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save student. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{student ? 'Edit Student' : 'Add Student'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-destructive text-xs bg-red-50 p-2 rounded">{error}</p>}
          <div>
            <Label className="text-xs">Student ID *</Label>
            <Input className="mt-1 h-9" value={form.student_id} onChange={e => set('student_id', e.target.value)} placeholder="e.g. 2300123" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Label className="text-xs">First Name *</Label>
              <Input className="mt-1 h-9" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">M.I.</Label>
              <Input className="mt-1 h-9" value={form.middle_initial} onChange={e => set('middle_initial', e.target.value.slice(0,1))} maxLength={1} />
            </div>
            <div>
              <Label className="text-xs">Last Name *</Label>
              <Input className="mt-1 h-9" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Course *</Label>
              <Select value={form.course} onValueChange={v => set('course', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" className="bg-white border border-border shadow-lg z-50">
                  {COURSES.map(c => <SelectItem key={c} value={c} className="cursor-pointer focus:bg-muted focus:text-foreground">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Year Level *</Label>
              <Select value={form.year_level} onValueChange={v => set('year_level', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" className="bg-white border border-border shadow-lg z-50">
                  {YEARS.map(y => <SelectItem key={y} value={y} className="cursor-pointer focus:bg-muted focus:text-foreground">{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Section *</Label>
            <Input className="mt-1 h-9" value={form.section} onChange={e => set('section', e.target.value)} placeholder="e.g. BSIT-2A" />
          </div>
          {(full_name.trim() !== ',' || sti_email) && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              {full_name.trim() !== ',' && (
                <div className="text-xs"><span className="text-muted-foreground">Full Name: </span><span className="font-medium">{full_name}</span></div>
              )}
              {sti_email && (
                <div className="text-xs"><span className="text-muted-foreground">STI Email: </span><span className="font-medium">{sti_email}</span></div>
              )}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {student ? 'Save Changes' : 'Add Student'}
          </Button>
        </div>
      </div>
    </div>
  );
}