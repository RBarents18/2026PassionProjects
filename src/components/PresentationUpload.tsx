import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { extractTextFromFile, parsePresentation } from '../utils/presentationParser';
import type { ParsedPresentation } from '../utils/presentationParser';

interface PresentationUploadProps {
  onApply: (data: ParsedPresentation) => void;
  compact?: boolean;
}

const ACCEPTED = '.pdf,.txt,.text';

export default function PresentationUpload({ onApply, compact = false }: PresentationUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [parsed, setParsed] = useState<ParsedPresentation | null>(null);
  const [fileName, setFileName] = useState('');
  const [expanded, setExpanded] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'txt', 'text'].includes(ext) && file.type !== 'application/pdf') {
      setStatus('error');
      setErrorMsg('Only PDF and plain-text (.txt) files are supported.');
      return;
    }
    setFileName(file.name);
    setStatus('parsing');
    setErrorMsg('');
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) throw new Error('No text could be extracted from this file.');
      const result = parsePresentation(text);
      setParsed(result);
      setStatus('done');
      setExpanded(true);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const reset = () => {
    setStatus('idle');
    setParsed(null);
    setFileName('');
    setErrorMsg('');
    setExpanded(true);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Upload size={16} className="text-indigo-400" />
          <span className="text-sm font-medium text-white">
            {compact ? 'Smart Fill from Presentation' : 'Upload Student Presentation'}
          </span>
          {status === 'done' && fileName && (
            <span className="text-xs text-gray-400 truncate max-w-[180px]">{fileName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === 'done' && <CheckCircle size={16} className="text-green-400" />}
          {status === 'error' && <AlertCircle size={16} className="text-red-400" />}
          {status === 'parsing' && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
          {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Drop Zone */}
          {status !== 'done' && (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-indigo-400 bg-indigo-950/40'
                  : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/40'
              }`}
            >
              {status === 'parsing' ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Loader2 size={28} className="animate-spin text-indigo-400" />
                  <p className="text-sm">Reading &amp; analyzing {fileName}…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText size={28} className="text-gray-500" />
                  <p className="text-sm text-gray-300">Drop a presentation here, or <span className="text-indigo-400 underline">browse</span></p>
                  <p className="text-xs text-gray-500">Supports PDF and plain-text (.txt) files</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED}
                onChange={handleChange}
                className="hidden"
              />
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex items-start gap-2 bg-red-950/40 border border-red-800 rounded-lg p-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 text-sm">{errorMsg}</p>
              </div>
              <button onClick={reset} className="text-red-400 hover:text-red-300 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Parsed Results */}
          {status === 'done' && parsed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Review the extracted information below, then apply it to the project.</p>
                <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300 underline cursor-pointer">
                  Upload different file
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm">
                {parsed.studentName && (
                  <InfoRow label="Student Name" value={parsed.studentName} />
                )}
                {parsed.title && (
                  <InfoRow label="Project Title" value={parsed.title} />
                )}
                {parsed.description && (
                  <InfoRow label="Description" value={parsed.description} multiline />
                )}
                {parsed.category && (
                  <InfoRow label="Category" value={parsed.category} />
                )}
                {parsed.startDate && (
                  <InfoRow label="Start Date" value={parsed.startDate} />
                )}
                {parsed.targetDate && (
                  <InfoRow label="Target Date" value={parsed.targetDate} />
                )}
                {parsed.milestones.length > 0 && (
                  <InfoRow
                    label={`Milestones (${parsed.milestones.length})`}
                    value={parsed.milestones.map(m => `• ${m.title}${m.dueDate ? ` — ${m.dueDate}` : ''}`).join('\n')}
                    multiline
                  />
                )}
                {parsed.nextSteps.length > 0 && (
                  <InfoRow
                    label={`Recommended Next Steps (${parsed.nextSteps.length})`}
                    value={parsed.nextSteps.map(s => `• ${s}`).join('\n')}
                    multiline
                  />
                )}
              </div>

              <button
                onClick={() => onApply(parsed)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <CheckCircle size={16} />
                Apply to Project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {multiline ? (
        <pre className="text-white text-xs whitespace-pre-wrap font-sans leading-relaxed">{value}</pre>
      ) : (
        <p className="text-white text-sm">{value}</p>
      )}
    </div>
  );
}
