import { useState } from 'react';
import { supabase } from "../api/supabaseClient";
import emailjs from '@emailjs/browser';
import { MoreVertical, Award, Mail, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from './ui/dropdown-menu';

export default function AttendeeActions({ student, event, emailSettings, onUpdate, onEdit, onDelete }) {
  const [loading, setLoading] = useState(false);

  const sendEmail = async (certUrl, s) => {
    if (!emailSettings?.public_key || !emailSettings?.service_id || !emailSettings?.template_id) return 'FAILED';
    try {
      emailjs.init(emailSettings.public_key);
      await emailjs.send(emailSettings.service_id, emailSettings.template_id, {
        to_name: s.full_name,
        to_email: s.sti_email,
        event_name: event.event_name,
        event_date: event.event_date,
        event_venue: event.event_venue || '',
        certificate_url: certUrl,
        certificate_id: s.student_id,
        course: s.course,
        year_level: s.year_level,
        section: s.section,
      });
      return 'SUCCESS';
    } catch {
      return 'FAILED';
    }
  };

  const handleResendEmail = async () => {
    if (!student.certificate_url) return;
    setLoading(true);
    const emailStatus = await sendEmail(student.certificate_url, student);

    // Supabase: update document
    await supabase.from('students').update({ email_status: emailStatus }).eq('id', student.id);

    onUpdate({ ...student, email_status: emailStatus });
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);

    // Supabase: delete document
    await supabase.from('students').delete().eq('id', student.id);

    onDelete(student.id);
    setLoading(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" disabled={loading}>
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            : <MoreVertical className="w-4 h-4 text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {student.certificate_url && (
          <DropdownMenuItem onClick={() => window.open(student.certificate_url, '_blank')}>
            <Award className="w-3.5 h-3.5 mr-2 text-sky-500" />
            View Certificate
          </DropdownMenuItem>
        )}
        {student.email_status === 'FAILED' && (
          <DropdownMenuItem onClick={handleResendEmail}>
            <Mail className="w-3.5 h-3.5 mr-2 text-rose-500" />
            Resend Email
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onEdit(student)}>
          <Pencil className="w-3.5 h-3.5 mr-2" />
          Edit Student
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}