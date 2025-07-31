import { useEffect, useState } from "react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Notes App" },
  { name: "description", content: "Minimalistic light notes application" },
];

// Adjust as appropriate for production
const API_BASE = "http://localhost:3001"; // Backend Flask API endpoint

type Note = {
  id: number;
  title: string;
  content: string;
};

const theme = {
  primary: "#1976D2",
  secondary: "#FFC107",
  accent: "#4CAF50",
};

// Sidebar note item style helpers
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

// PUBLIC_INTERFACE
export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing/creating state
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState<Partial<Note>>({ title: "", content: "" });

  const selectedNote = notes.find(n => n.id === selectedId) ?? null;

  // Load notes
  useEffect(() => {
    // Intentionally not adding fetchNotes as a dependency to avoid infinite loops, as fetchNotes does not change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/notes/`);
      if (!res.ok) throw new Error("Failed to load notes");
      const data = await res.json();
      setNotes(data);
      // Auto-select first note if any
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].id);
      }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Error loading notes.");
      else setError("Error loading notes.");
    } finally {
      setLoading(false);
    }
  };

  // CRUD
  const handleSelect = (note: Note) => {
    setSelectedId(note.id);
    setIsEditing(false);
    setEditNote({});
  };

  const handleNew = () => {
    setSelectedId(null);
    setIsEditing(true);
    setEditNote({ title: "", content: "" });
  };

  const handleEdit = () => {
    if (selectedNote) {
      setIsEditing(true);
      setEditNote({ ...selectedNote });
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    if (!window.confirm("Delete this note?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/notes/${selectedNote.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete note");
      await fetchNotes();
      setSelectedId(notes.length > 1 ? notes.filter(n => n.id !== selectedNote.id)[0]?.id ?? null : null);
      setIsEditing(false);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Error deleting note.");
      else setError("Error deleting note.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const isNew = selectedId === null;
    try {
      const res = await fetch(
        isNew ? `${API_BASE}/notes/` : `${API_BASE}/notes/${selectedId}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editNote.title,
            content: editNote.content,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to save note");
      await fetchNotes();
      setIsEditing(false);
      // select the (possibly new) note
      if (isNew) {
        // refetch and select the newly created
        const listRes = await fetch(`${API_BASE}/notes/`);
        const list = await listRes.json();
        setSelectedId(list[list.length - 1]?.id ?? null);
      }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Error saving note.");
      else setError("Error saving note.");
    } finally {
      setLoading(false);
    }
  };

  // PUBLIC_INTERFACE
  return (
    <div className="flex h-screen bg-white" style={{ fontFamily: "Inter, Arial, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-72 min-w-[220px] border-r border-gray-200 bg-white"
        style={{ background: "#F7F9FB" }}
      >
        <div
          className="p-4 font-bold text-lg"
          style={{
            color: theme.primary,
            letterSpacing: "0.01em",
            borderBottom: `2px solid ${theme.primary}`,
            background: "#F7F9FB",
          }}
        >
          <span role="img" aria-label="notes">📝</span> Notes
        </div>
        <button
          className="m-4 mb-2 rounded px-4 py-2 text-white font-semibold transition hover:shadow"
          style={{
            background: theme.primary,
            boxShadow: "0 1px 3px rgba(25,118,210,0.10)",
          }}
          onClick={handleNew}
        >
          + New Note
        </button>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="text-center text-xs text-gray-400 py-2">Loading...</div>
          )}
          {notes.length === 0 && !loading && (
            <div className="text-sm text-gray-400 p-4 text-center">
              No notes yet.
            </div>
          )}
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full text-left px-4 py-2 mb-1 rounded transition",
                    selectedId === note.id
                      ? "bg-blue-100 text-blue-900"
                      : "hover:bg-blue-50 text-gray-800"
                  )}
                  style={selectedId === note.id ? { borderLeft: `5px solid ${theme.primary}` } : {}}
                  onClick={() => handleSelect(note)}
                >
                  <span className="block font-medium truncate">{note.title || "Untitled"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 text-xs text-gray-400 text-center border-t border-gray-100">
          <span>
            <span className="font-semibold" style={{ color: theme.primary }}>Notes App</span>{" "}
            &bull; Minimal, light, responsive.
          </span>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div>
            {isEditing ? (
              <span className="font-bold text-lg" style={{ color: theme.primary }}>
                {selectedId !== null ? "Edit Note" : "New Note"}
              </span>
            ) : (
              <span className="text-lg font-bold text-gray-700">{selectedNote?.title || "Select a note"}</span>
            )}
          </div>
          {!isEditing && selectedNote && (
            <div className="flex gap-2">
              <button
                className="rounded px-3 py-1 text-white font-semibold"
                style={{
                  background: theme.primary,
                  filter: "brightness(0.97)",
                }}
                onClick={handleEdit}
              >
                Edit
              </button>
              <button
                className="rounded px-3 py-1 text-white font-semibold"
                style={{
                  background: theme.secondary,
                  color: "#212121",
                }}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 text-sm text-red-600">
              {error}
            </div>
          )}
          {isEditing ? (
            <form className="space-y-4 max-w-2xl mx-auto" onSubmit={handleSave} autoComplete="off">
              <div>
                <label htmlFor="note-title" className="block text-sm font-semibold text-gray-700 mb-1">
                  Title
                </label>
                <input
                  id="note-title"
                  type="text"
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-base focus:ring focus:ring-blue-200"
                  value={editNote.title}
                  maxLength={120}
                  onChange={(e) =>
                    setEditNote((prev) => ({ ...prev, title: e.target.value }))
                  }
                  style={{ background: "#F5F8FA" }}
                  placeholder="Enter note title"
                />
              </div>
              <div>
                <label htmlFor="note-content" className="block text-sm font-semibold text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  id="note-content"
                  required
                  rows={10}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-base font-mono focus:ring focus:ring-blue-200 resize-vertical"
                  value={editNote.content}
                  maxLength={5000}
                  onChange={(e) =>
                    setEditNote((prev) => ({ ...prev, content: e.target.value }))
                  }
                  style={{ background: "#F5F8FA", minHeight: "180px" }}
                  placeholder="Write your note here..."
                />
              </div>
              <div className="flex gap-2 items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded px-5 py-2 font-bold text-white shadow-sm transition"
                  style={{
                    background: theme.accent,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {selectedId !== null ? "Save" : "Create"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className="rounded px-4 py-2 font-semibold text-gray-700 border border-gray-200"
                  onClick={() => { setIsEditing(false); setEditNote({}); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : selectedNote ? (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-2" style={{ color: theme.primary }}>
                {selectedNote.title}
              </h2>
              <hr className="border-t-2 border-blue-200 mb-4" />
              <div className="whitespace-pre-line text-gray-800 text-base" style={{ minHeight: "120px" }}>
                {selectedNote.content}
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-full text-gray-400 text-center">
              <span className="text-lg">Select a note or create a new one</span>
            </div>
          )}
        </div>
      </main>

      {/* Responsive styles */}
      <style>
        {`
          @media (max-width: 900px) {
            aside { min-width: 55px !important; width: 55px !important; }
            aside > div, aside ul, aside button:not(:first-child), aside input, aside span, aside .p-3 { display: none !important; }
            aside > .p-4 { font-size: 1.3rem !important; padding: 14px !important; text-align: center; }
            main { padding-left: 0 !important; }
          }
          @media (max-width: 600px) {
            .flex.h-screen { flex-direction: column !important; height: 100vh !important; }
            aside { width: 100vw !important; min-width: 0 !important; border-right: none !important; border-bottom: 2px solid #eee; flex-direction: row !important; }
            aside > .p-4 { width: 100%; text-align: left !important; }
            main { width: 100vw !important; }
          }
        `}
      </style>
    </div>
  );
}
