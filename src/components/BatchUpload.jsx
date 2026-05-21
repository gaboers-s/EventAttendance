import { useState } from 'react';
import { supabase } from "../api/supabaseClient";
import { X, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

export default function BatchUpload({ eventId, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (f) => setFile(f);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      return obj;
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const text = await file.text();
    const rows = parseCSV(text);
    let success = 0, failed = 0;
    
    for (const row of rows) {
      const last_name = row.last_name || row.lastname || '';
      const student_id = row.student_id || row.studentid || row.id || '';
      const first_name = row.first_name || row.firstname || '';
      const middle_initial = row.middle_initial || row.mi || '';
      const course = row.course || 'BSIT';
      const year_level = row.year_level || row.yearlevel || '1st Year';
      const section = row.section || '';
      
      if (!student_id || !first_name || !last_name) { failed++; continue; }
      
      const full_name = `${last_name}, ${first_name}${middle_initial ? ' ' + middle_initial + '.' : ''}`;
      const sti_email = `${last_name.toLowerCase()}.${student_id}@alabang.sti.edu.ph`;
      
      try {
        const { error } = await supabase.from('students').insert([{
          student_id,
          first_name,
          middle_initial,
          last_name,
          full_name,
          sti_email,
          course,
          year_level,
          section,
          event_id: eventId,
          attendance_status: 'ABSENT',
          email_status: 'PENDING',
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
        success++;
      } catch (err) {
        console.error('Upload error:', err);
        failed++;
      }
    }
    
    setResult({ success, failed });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Batch Upload Students</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">CSV Format (required columns):</p>
            <p>student_id, first_name, last_name, middle_initial, course, year_level, section</p>
          </div>
          {!result ? (
            <>
              <label className="block cursor-pointer border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">{file ? file.name : 'Click to select CSV file'}</p>
                <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
                <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              </label>
              <Button className="w-full" disabled={!file || loading} onClick={handleUpload}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</> : 'Upload Students'}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div>
                <p className="font-semibold text-foreground">Upload Complete</p>
                <p className="text-sm text-emerald-600 mt-1">{result.success} students added</p>
                {result.failed > 0 && <p className="text-sm text-rose-600">{result.failed} rows failed</p>}
              </div>
              <Button className="w-full" onClick={() => { onDone(); onClose(); }}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}