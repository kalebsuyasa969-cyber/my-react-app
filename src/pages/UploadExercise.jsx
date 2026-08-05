import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { extractTextFromFile } from '../utils/parseDocument';
import { getFormatGuide, parseQuestionsFromText } from '../utils/parseQuestions';

export default function UploadExercise() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setParsing(true);

    try {
      const text = await extractTextFromFile(selectedFile);
      const questions = parseQuestionsFromText(text);

      if (questions.length === 0) {
        setPreviewQuestions([]);
        setError(
          'Tidak ada soal pilihan ganda yang terdeteksi. Pastikan format dokumen sesuai panduan di bawah.'
        );
      } else {
        setPreviewQuestions(questions);
        if (!title) {
          setTitle(selectedFile.name.replace(/\.[^.]+$/, ''));
        }
      }
    } catch (err) {
      setPreviewQuestions([]);
      setError(err.message || 'Gagal membaca dokumen.');
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file || previewQuestions.length === 0) {
      setError('Upload dan pastikan dokumen berisi soal yang valid.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const extension = file.name.split('.').pop().toLowerCase();
      const storageRef = ref(storage, `exercises/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      const docRef = await addDoc(collection(db, 'exercises'), {
        title: title.trim(),
        fileName: file.name,
        fileType: extension,
        fileUrl,
        userId: user.uid,
        uploaderName: user.displayName || user.email,
        questionCount: previewQuestions.length,
        questions: previewQuestions,
        createdAt: serverTimestamp(),
      });

      navigate(`/quiz/${docRef.id}`);
    } catch (err) {
      setError('Gagal menyimpan latihan. Pastikan Firebase Auth, Firestore, dan Storage sudah aktif.');
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([getFormatGuide()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contoh-format-soal.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page upload-page">
      <div className="page-header">
        <h1>Upload Latihan Soal</h1>
        <p>Upload file PDF, DOCX, atau TXT. Sistem akan otomatis mendeteksi soal pilihan ganda.</p>
      </div>

      <div className="upload-layout">
        <form onSubmit={handleSubmit} className="upload-form card-panel">
          {error && <div className="alert alert-error">{error}</div>}

          <label>
            Judul Latihan
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Latihan Matematika Bab 1"
              required
            />
          </label>

          <label className="file-drop">
            <span>File Soal (PDF / DOCX / TXT)</span>
            <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} required />
            {file && <small>File dipilih: {file.name}</small>}
          </label>

          {parsing && <p className="muted">Sedang membaca dan menganalisis dokumen...</p>}

          {!parsing && previewQuestions.length > 0 && (
            <div className="alert alert-success">
              ✓ {previewQuestions.length} soal berhasil terdeteksi dan siap digunakan.
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading || parsing}>
            {loading ? 'Menyimpan...' : 'Simpan & Mulai Latihan'}
          </button>
        </form>

        <aside className="guide-panel card-panel">
          <h2>Format Dokumen</h2>
          <p>Gunakan format berikut agar soal terbaca otomatis:</p>
          <pre className="format-example">{getFormatGuide()}</pre>
          <button type="button" className="btn btn-secondary btn-block" onClick={downloadTemplate}>
            Download Contoh Format
          </button>

          <div className="tips-list">
            <h3>Tips</h3>
            <ul>
              <li>Nomor soal diawali angka + titik (1., 2., 3.)</li>
              <li>Pilihan jawaban: A. B. C. D.</li>
              <li>Tulis "Jawaban: X" untuk kunci jawaban</li>
              <li>Tulis "Penjelasan:" untuk pembahasan otomatis</li>
            </ul>
          </div>
        </aside>
      </div>

      {previewQuestions.length > 0 && (
        <section className="section-block">
          <h2>Preview Soal ({previewQuestions.length})</h2>
          <div className="preview-list">
            {previewQuestions.slice(0, 5).map((question) => (
              <article key={question.id} className="preview-item">
                <strong>{question.number}. {question.text}</strong>
                <p>{question.options.map((o) => `${o.key}. ${o.text}`).join(' | ')}</p>
                <small>Jawaban: {question.correctAnswer}</small>
              </article>
            ))}
            {previewQuestions.length > 5 && (
              <p className="muted">+ {previewQuestions.length - 5} soal lainnya...</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
