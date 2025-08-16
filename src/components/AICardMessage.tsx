'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';

export default function AICardMessage() {
  const [form, setForm] = useState({ occasion: '', recipient: '', tone: 'romantis', maxWords: 35 });
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  const generate = async () => {
    setLoading(true); setText('');
    const res = await fetch('/api/ai-card', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setLoading(false);
    setText(data.ok ? data.text : ('Gagal: ' + data.error));
  };

  const downloadPdf = () => {
    if (!text.trim()) { alert('Buat pesannya dulu ya 🙂'); return; }

    const doc = new jsPDF({ unit: 'pt', format: 'a5' }); // kecil & cantik
    const margin = 36;
    const width = doc.internal.pageSize.getWidth() - margin * 2;

    // Judul sederhana
    doc.setFont('Times', 'bold');
    doc.setFontSize(16);
    doc.text('Kartu Ucapan', margin, 60);

    // Subtitle
    const sub = `${form.occasion || '—'} untuk ${form.recipient || '—'}`;
    doc.setFont('Times', 'normal');
    doc.setFontSize(11);
    doc.text(sub, margin, 80);

    // Garis pemisah
    doc.setLineWidth(0.5);
    doc.line(margin, 92, doc.internal.pageSize.getWidth() - margin, 92);

    // Isi pesan (wrap otomatis)
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, margin, 120, { maxWidth: width, lineHeightFactor: 1.4 });

    // Footer kecil
    doc.setFontSize(9);
    doc.setTextColor('#666666');
    doc.text('Dibuat otomatis dengan AI di Bloomify', margin, doc.internal.pageSize.getHeight() - 30);

    const filename = `kartu-ucapan-${(form.occasion || 'umum').toLowerCase().replace(/\s+/g,'-')}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="border rounded-2xl p-4">
      <h3 className="font-semibold mb-2">Butuh teks kartu ucapan?</h3>
      <div className="grid grid-cols-1 gap-2">
        <input className="border rounded-xl px-3 py-2" placeholder="Occasion (ulang tahun, anniversary, wisuda...)"
          value={form.occasion} onChange={e => setForm({ ...form, occasion: e.target.value })} />
        <input className="border rounded-xl px-3 py-2" placeholder="Untuk siapa? (ibu, pasangan, sahabat...)"
          value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} />
        <select className="border rounded-xl px-3 py-2"
          value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}>
          <option value="romantis">Romantis</option>
          <option value="formal">Formal</option>
          <option value="ceria">Ceria</option>
        </select>
        <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={generate} disabled={loading}>
          {loading ? 'Membuat...' : 'Buat Pesan'}
        </button>
      </div>

      {text && (
        <div className="mt-3">
          <div className="text-sm whitespace-pre-wrap bg-gray-50 border rounded-xl p-3">{text}</div>
          <button className="mt-2 px-3 py-2 rounded-xl border" onClick={downloadPdf}>
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
}
