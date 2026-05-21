import { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { X, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

// Convert file to base64 string
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });
};

// Resize image, preserve PNG transparency
function resizeImage(file, maxWidth = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Clear with transparency
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Always use PNG to preserve transparency
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    };
    img.onerror = reject;
  });
}

export default function EventForm({ event, onClose, onSaved }) {
  const [form, setForm] = useState({
    event_name: '', event_date: '', event_description: '',
    event_organizer: '', event_venue: '',
    event_logo_left: '', event_logo_center: '', event_logo_right: '',
  });
  const [uploading, setUploading] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (event) setForm({ ...event });
  }, [event]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogoUpload = async (key, file) => {
    setUploading(u => ({ ...u, [key]: true }));
    setError('');

    try {
      let processedFile = file;
      
      // Only resize if image is large
      if (file.size > 100000) {
        processedFile = await resizeImage(file, 400);
      }
      
      const base64 = await fileToBase64(processedFile);

      if (base64.length > 300000) {
        setError('Image too large. Try a smaller image.');
        setUploading(u => ({ ...u, [key]: false }));
        return;
      }

      set(key, base64);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to process image: ' + err.message);
    }

    setUploading(u => ({ ...u, [key]: false }));
  };

  const handleSave = async () => {
    if (!form.event_name || !form.event_date) {
      setError('Event name and date are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let saved;
      const payload = {
        event_name: form.event_name,
        event_date: form.event_date,
        event_description: form.event_description || '',
        event_organizer: form.event_organizer || '',
        event_venue: form.event_venue || '',
        event_logo_left: form.event_logo_left || '',
        event_logo_center: form.event_logo_center || '',
        event_logo_right: form.event_logo_right || '',
      };

      if (event) {
        const { data, error } = await supabase
          .from('events')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', event.id)
          .select()
          .single();
        if (error) throw error;
        saved = { ...event, ...data };
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert([{ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
          .select()
          .single();
        if (error) throw error;
        saved = data;
      }

      onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const LogoUpload = ({ field, label }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        {form[field] ? (
          <div className="relative w-16 h-12 border rounded overflow-hidden bg-muted">
            <img src={form[field]} alt="" className="w-full h-full object-contain" />
            <button onClick={() => set(field, '')} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <label className="cursor-pointer flex items-center gap-1 px-3 py-1.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
            {uploading[field] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload
            <input type="file" accept="image/png,image/webp" className="hidden" onChange={e => e.target.files[0] && handleLogoUpload(field, e.target.files[0])} />
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{event ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div>
            <Label>Event Name *</Label>
            <Input className="mt-1" value={form.event_name} onChange={e => set('event_name', e.target.value)} placeholder="e.g. Tech Summit 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input className="mt-1" type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
            </div>
            <div>
              <Label>Venue</Label>
              <Input className="mt-1" value={form.event_venue} onChange={e => set('event_venue', e.target.value)} placeholder="e.g. AVR" />
            </div>
          </div>
          <div>
            <Label>Organizer</Label>
            <Input className="mt-1" value={form.event_organizer} onChange={e => set('event_organizer', e.target.value)} placeholder="e.g. Computer Society" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" value={form.event_description} onChange={e => set('event_description', e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="text-sm font-semibold">Event Logos</Label>
            <div className="mt-2 grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg">
              <LogoUpload field="event_logo_left" label="Logo Left" />
              <LogoUpload field="event_logo_center" label="Center Watermark" />
              <LogoUpload field="event_logo_right" label="Logo Right" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.event_name || !form.event_date}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {event ? 'Save Changes' : 'Create Event'}
          </Button>
        </div>
      </div>
    </div>
  );
}