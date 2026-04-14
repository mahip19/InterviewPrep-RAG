import { useState, useRef, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function SourceChip({ source }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        fontFamily: "'IBM Plex Mono', monospace",
        background: "rgba(99,102,241,0.10)",
        color: "#6366f1",
        border: "1px solid rgba(99,102,241,0.18)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: "10px" }}>📄</span>
      {source.filename}
      {source.chunk_index !== undefined && (
        <span style={{ opacity: 0.6 }}> §{source.chunk_index}</span>
      )}
    </span>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "16px",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          padding: "14px 18px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg, #6366f1, #818cf8)"
            : "rgba(255,255,255,0.06)",
          color: isUser ? "#fff" : "#e2e8f0",
          fontSize: "14.5px",
          lineHeight: "1.65",
          fontFamily: "'DM Sans', sans-serif",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: isUser
            ? "0 2px 12px rgba(99,102,241,0.25)"
            : "0 1px 4px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
        {msg.sources && msg.sources.length > 0 && (
          <div
            style={{
              marginTop: "12px",
              paddingTop: "10px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#94a3b8",
                fontFamily: "'IBM Plex Mono', monospace",
                marginRight: "4px",
                alignSelf: "center",
              }}
            >
              Sources
            </span>
            {msg.sources.map((s, i) => (
              <SourceChip key={i} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionPill({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      style={{
        padding: "8px 16px",
        borderRadius: "20px",
        border: "1px solid rgba(99,102,241,0.25)",
        background: "rgba(99,102,241,0.08)",
        color: "#a5b4fc",
        fontSize: "13px",
        fontFamily: "'DM Sans', sans-serif",
        cursor: "pointer",
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "rgba(99,102,241,0.18)";
        e.target.style.borderColor = "rgba(99,102,241,0.4)";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "rgba(99,102,241,0.08)";
        e.target.style.borderColor = "rgba(99,102,241,0.25)";
      }}
    >
      {text}
    </button>
  );
}

function DocumentPanel({ documents, onDelete, onUpload, uploading }) {
  const fileInputRef = useRef(null);

  return (
    <div
      style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(12,15,26,0.6)",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {/* Upload area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: documents.length > 0 ? "16px" : 0,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.html,.pdf"
            onChange={onUpload}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(99,102,241,0.3)",
              background: uploading
                ? "rgba(99,102,241,0.1)"
                : "rgba(99,102,241,0.15)",
              color: uploading ? "#64748b" : "#a5b4fc",
              fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif",
              cursor: uploading ? "default" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {uploading ? "Processing..." : "Upload Document"}
          </button>
          <span
            style={{
              fontSize: "12px",
              color: "#475569",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            .md, .txt, .html, .pdf
          </span>
        </div>

        {/* Document list */}
        {documents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {documents.map((doc) => (
              <div
                key={doc.filename}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span style={{ fontSize: "14px", flexShrink: 0 }}>📄</span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#e2e8f0",
                      fontFamily: "'DM Sans', sans-serif",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.filename}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      fontFamily: "'IBM Plex Mono', monospace",
                      flexShrink: 0,
                    }}
                  >
                    {doc.chunkCount} chunks
                  </span>
                </div>
                <button
                  onClick={() => onDelete(doc.filename)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(239,68,68,0.2)",
                    background: "rgba(239,68,68,0.08)",
                    color: "#f87171",
                    fontSize: "11px",
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(239,68,68,0.18)";
                    e.target.style.borderColor = "rgba(239,68,68,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(239,68,68,0.08)";
                    e.target.style.borderColor = "rgba(239,68,68,0.2)";
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Tell me about a time I showed leadership",
  "What's my experience with distributed systems?",
  "How should I approach sliding window problems?",
  "Give me a STAR story about teamwork",
  "What are my strongest technical projects?",
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalChunks: null, totalDocs: null });
  const [showDocs, setShowDocs] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStats = () => {
    fetch(`${API_URL}/api/stats`)
      .then((r) => r.json())
      .then((d) => setStats({ totalChunks: d.totalChunks, totalDocs: d.totalDocs }))
      .catch(() => {});
  };

  const fetchDocuments = () => {
    fetch(`${API_URL}/api/documents`)
      .then((r) => r.json())
      .then((d) => setDocuments(d.documents || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (showDocs) fetchDocuments();
  }, [showDocs]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchDocuments();
      fetchStats();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Remove "${filename}" from context?`)) return;

    try {
      const res = await fetch(
        `${API_URL}/api/documents/${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchDocuments();
      fetchStats();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const sendMessage = async (text) => {
    const query = text || input.trim();
    if (!query || loading) return;

    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong connecting to the server. Make sure the backend is running on port 3001.",
        },
      ]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0c0f1a",
        backgroundImage:
          "radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(99,102,241,0.05) 0%, transparent 50%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@700&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 3px; }
        textarea::placeholder { color: #475569; }
      `}</style>

      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(12px)",
          background: "rgba(12,15,26,0.8)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
            }}
          >
            ⚡
          </div>
          <div>
            <h1
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#f1f5f9",
                letterSpacing: "-0.01em",
              }}
            >
              Interview Prep RAG
            </h1>
            <p
              style={{
                fontSize: "11px",
                color: "#64748b",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              powered by your docs
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setShowDocs((prev) => !prev)}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              border: showDocs
                ? "1px solid rgba(99,102,241,0.4)"
                : "1px solid rgba(255,255,255,0.1)",
              background: showDocs
                ? "rgba(99,102,241,0.15)"
                : "rgba(255,255,255,0.05)",
              color: showDocs ? "#a5b4fc" : "#94a3b8",
              fontSize: "12px",
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Manage Docs
          </button>
          {stats.totalChunks !== null && (
            <div
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
                fontSize: "12px",
                color: "#4ade80",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {stats.totalDocs} docs / {stats.totalChunks} chunks
            </div>
          )}
        </div>
      </header>

      {/* Document management panel */}
      {showDocs && (
        <DocumentPanel
          documents={documents}
          onDelete={handleDelete}
          onUpload={handleUpload}
          uploading={uploading}
        />
      )}

      {/* Messages */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 24px 100px",
          maxWidth: "800px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "50vh",
              animation: "fadeIn 0.5s ease",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                marginBottom: "16px",
              }}
            >
              🎯
            </div>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              Your Interview Knowledge Base
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "28px",
                textAlign: "center",
                maxWidth: "420px",
                lineHeight: "1.6",
              }}
            >
              Ask about your STAR stories, LeetCode patterns, behavioral prep,
              or anything from your indexed documents.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                justifyContent: "center",
                maxWidth: "520px",
              }}
            >
              {SUGGESTIONS.map((s, i) => (
                <SuggestionPill key={i} text={s} onClick={sendMessage} />
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              padding: "14px 18px",
              maxWidth: "80px",
              animation: "fadeIn 0.2s ease",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#6366f1",
                  animation: `pulse 1.2s ease infinite ${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 24px 20px",
          background:
            "linear-gradient(to top, #0c0f1a 60%, transparent)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            width: "100%",
            display: "flex",
            gap: "10px",
            alignItems: "flex-end",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your interview prep..."
            rows={1}
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#e2e8f0",
              fontSize: "14.5px",
              fontFamily: "'DM Sans', sans-serif",
              resize: "none",
              outline: "none",
              transition: "border-color 0.2s",
              lineHeight: "1.5",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "rgba(99,102,241,0.4)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              padding: "14px 20px",
              borderRadius: "14px",
              border: "none",
              background:
                loading || !input.trim()
                  ? "rgba(99,102,241,0.2)"
                  : "linear-gradient(135deg, #6366f1, #818cf8)",
              color: loading || !input.trim() ? "#475569" : "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading || !input.trim() ? "default" : "pointer",
              transition: "all 0.2s",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow:
                loading || !input.trim()
                  ? "none"
                  : "0 2px 10px rgba(99,102,241,0.3)",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
