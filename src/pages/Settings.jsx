import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Save, CheckCircle2, Mail, Info, RotateCcw, Monitor } from 'lucide-react';
import { loadEmailConfig, saveEmailConfig, resetEmailConfig } from '../utils/emailConfig';

export default function Settings() {
  const [form, setForm] = useState({ publicKey: '', serviceId: '', templateId: '', departmentName: '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(loadEmailConfig());
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.publicKey || !form.serviceId || !form.templateId) {
      setError('Public Key, Service ID, and Template ID are required.');
      return;
    }
    setError('');
    saveEmailConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    resetEmailConfig();
    setForm({ publicKey: '', serviceId: '', templateId: '', departmentName: '' });
    setError('');
  };

  return (
    
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm">Configure EmailJS for certificate delivery</p>
        </div>

        {/* Device-local notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
          <Monitor className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-semibold mb-0.5">Device-Local Configuration</p>
            <p>These settings are stored only on <strong>this device/browser</strong>. Each device maintains its own independent EmailJS configuration and will not affect other devices.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">EmailJS Configuration</h2>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 flex gap-2">
              <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div className="text-xs text-sky-700">
                <p className="font-semibold mb-1">How to set up EmailJS:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Go to <a href="https://www.emailjs.com" target="_blank" className="underline">emailjs.com</a> and create a free account</li>
                  <li>Add an Email Service and note your Service ID</li>
                  <li>Create an Email Template with the required variables</li>
                  <li>Copy your Public Key from the Account page</li>
                </ol>
              </div>
            </div>

            <div>
              <Label>Public Key <span className="text-destructive">*</span></Label>
              <Input className="mt-1" value={form.publicKey} onChange={e => set('publicKey', e.target.value)} placeholder="e.g. user_xxxxxxxxxxxxx" />
            </div>
            <div>
              <Label>Service ID <span className="text-destructive">*</span></Label>
              <Input className="mt-1" value={form.serviceId} onChange={e => set('serviceId', e.target.value)} placeholder="e.g. service_xxxxxxx" />
            </div>
            <div>
              <Label>Template ID <span className="text-destructive">*</span></Label>
              <Input className="mt-1" value={form.templateId} onChange={e => set('templateId', e.target.value)} placeholder="e.g. template_xxxxxxx" />
            </div>
            <div>
              <Label>Department Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input className="mt-1" value={form.departmentName} onChange={e => set('departmentName', e.target.value)} placeholder="e.g. BSIT Department" />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 gap-2">
                {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved to this device!' : 'Save to this Device'}
              </Button>
              <Button variant="outline" onClick={handleReset} className="gap-2 text-destructive hover:text-destructive">
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Template Variables */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h2 className="font-semibold text-foreground mb-3">Required Template Variables</h2>
          <div className="grid grid-cols-2 gap-1.5">
            {['{{to_name}}','{{to_email}}','{{event_name}}','{{event_date}}','{{event_venue}}','{{certificate_url}}','{{certificate_id}}','{{course}}','{{year_level}}','{{section}}'].map(v => (
              <code key={v} className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">{v}</code>
            ))}
          </div>
        </div>
      </div>
    
  );
}