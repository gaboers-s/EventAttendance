import { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import EventForm from '../components/EventForm';
import { Plus, Pencil, Trash2, Calendar, MapPin, CheckCircle2, Image } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      const { data: evts, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setEvents(evts || []);
    } catch (err) {
      console.error('Events load error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved) => {
    setEvents(prev => editing ? prev.map(e => e.id === saved.id ? saved : e) : [saved, ...prev]);
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      // Cascade delete all students linked to this event
      const { error: studentsError } = await supabase
        .from('students')
        .delete()
        .eq('event_id', id);
      if (studentsError) throw studentsError;

      // Delete the event
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      if (eventError) throw eventError;

      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
    setDeleting(null);
  };

  const handleSetActive = async (evt) => {
    try {
      // Update all events: set is_active false except the selected one
      const updatePromises = events.map(e => {
        const eventRef = doc(db, 'events', e.id);
        return updateDoc(eventRef, { is_active: e.id === evt.id });
      });
      await Promise.all(updatePromises);
      
      setEvents(prev => prev.map(e => ({ ...e, is_active: e.id === evt.id })));
    } catch (err) {
      console.error('Set active error:', err);
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground text-sm">{events.length} events total</p>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> New Event
          </Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl h-40 animate-pulse border border-border" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">No events yet</p>
            <p className="text-muted-foreground text-sm mt-1">Create your first event to get started</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>Create Event</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {events.map(evt => (
              <div key={evt.id} className={`bg-white rounded-xl border shadow-sm p-5 ${evt.is_active ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{evt.event_name}</h3>
                      {evt.is_active && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium shrink-0">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3" /> {evt.event_date}
                    </div>
                    {evt.event_venue && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" /> {evt.event_venue}
                      </div>
                    )}
                    {evt.event_description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{evt.event_description}</p>
                    )}
                    {/* Logo indicators */}
                    <div className="flex items-center gap-2 mt-2">
                      {[evt.event_logo_left, evt.event_logo_center, evt.event_logo_right].filter(Boolean).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-8 h-8 object-contain rounded border border-border bg-muted" />
                      ))}
                      {![evt.event_logo_left, evt.event_logo_center, evt.event_logo_right].some(Boolean) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Image className="w-3 h-3" /> No logos uploaded</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditing(evt); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(evt.id)} disabled={deleting === evt.id}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {!evt.is_active && (
                  <Button size="sm" variant="outline" className="mt-3 w-full gap-1 text-xs" onClick={() => handleSetActive(evt)}>
                    <CheckCircle2 className="w-3 h-3" /> Set as Active
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <EventForm
          event={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}