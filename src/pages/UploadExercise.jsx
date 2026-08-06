import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { extractTextFromFile } from '../utils/parseDocument';
import { getFormatGuide, parseQuestionsFromText } from '../utils/parseQuestions';

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];

function blankQuestion(number) {
  return {
    id: `manual-${Date.now()}-${number}`,
    number,
    text: '',
    options: [
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' },
    ],
    correctAnswer: null,
    explanation: '',
  };
}

function isQuestionComplete(question) {
  const filledOptions = question.options.filter((option) => option.text.trim());
  return (
    Boolean(question.text.trim()) &&
    filledOptions.length >= 2 &&
    Boolean(question.correctAnswer) &&
    filledOptions.some((option) => option.key === question.correctAnswer)
  );
}

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
          'Tidak ada soal yang terdeteksi. Pastikan dokumen menomori tiap soal (1. 2. 3. ...) dan pilihan diawali A. B. C. D. — atau tambahkan soal secara manual di bawah.'
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

  function updateQuestion(index, patch) {
    setPreviewQuestions((prev) =>
      prev.map((question, i) => (i === index ? { ...question, ...patch } : question))
    );
  }

  function updateOptionText(qIndex, optIndex, value) {
    setPreviewQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== qIndex) return question;
        const options = question.options.map((option, o) =>
          o === optIndex ? { ...option, text: value } : option
        );
        return { ...question, options };
      })
    );
  }

  function addOption(qIndex) {
    setPreviewQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== qIndex) return question;
        const nextKey = OPTION_KEYS[question.options.length];
        if (!nextKey) return question;
        return { ...question, options: [...question.options, { key: nextKey, text: '' }] };
      })
    );
  }

  function removeOption(qIndex, optIndex) {
    setPreviewQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== qIndex) return question;
        if (question.options.length <= 2) return question;
        const removedKey = question.options[optIndex].key;
        const options = question.options
          .filter((_, o) => o !== optIndex)
          .map((option, o) => ({ ...option, key: OPTION_KEYS[o] }));
        const correctAnswer = question.correctAnswer === removedKey ? null : question.correctAnswer;
        return { ...question, options, correctAnswer };
      })
    );
  }

  function removeQuestion(index) {
    setPreviewQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function addQuestion() {
    setPreviewQuestions((prev) => [...prev, blankQuestion(prev.length + 1)]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (previewQuestions.length === 0) {
      setError('Upload dokumen atau tambahkan minimal satu soal secara manual.');
      return;
    }

    const incomplete = previewQuestions.filter((q) => !isQuestionComplete(q));
    if (incomplete.length > 0) {
      setError(
        `${incomplete.length} soal belum lengkap — pastikan tiap soal punya teks, minimal 2 pilihan, dan jawaban benar dipilih.`
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalQuestions = previewQuestions.map((question, index) => ({
        id: `q${index + 1}`,
        number: index + 1,
        text: question.text.trim(),
        options: question.options
          .filter((option) => option.text.trim())
          .map((option) => ({ key: option.key, text: option.text.trim() })),
        correctAnswer: question.correctAnswer,
        explanation: question.explanation.trim() || 'Pembahasan belum tersedia untuk soal ini.',
      }));

      const docRef = await addDoc(collection(db, 'exercises'), {
        title: title.trim() || 'Latihan Tanpa Judul',
        fileName: file?.name || 'manual',
        fileType: file ? file.name.split('.').pop().toLowerCase() : 'manual',
        userId: user.uid,
        uploaderName: user.displayName || user.email,
        questionCount: finalQuestions.length,
        questions: finalQuestions,
        createdAt: serverTimestamp(),
      });

      navigate(`/quiz/${docRef.id}`);
    } catch (err) {
      setError('Gagal menyimpan latihan. Pastikan Firebase Auth dan Firestore sudah aktif.');
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

  const completeCount = previewQuestions.filter(isQuestionComplete).length;

  return (
    <div className="page upload-page">
      <div className="page-header">
        <h1>Upload Latihan Soal</h1>
        <p>Upload file PDF, DOCX, atau TXT, lalu tentukan jawaban benar tiap soal sebelum disimpan.</p>
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
            />
          </label>

          <label className="file-drop">
            <span>File Soal (PDF / DOCX / TXT)</span>
            <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
            {file && <small>File dipilih: {file.name}</small>}
          </label>

          {parsing && <p className="muted">Sedang membaca dan menganalisis dokumen...</p>}

          {!parsing && previewQuestions.length > 0 && (
            <div className={`alert ${completeCount === previewQuestions.length ? 'alert-success' : 'alert-error'}`}>
              {completeCount}/{previewQuestions.length} soal siap (sudah ada jawaban benar).
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading || parsing}>
            {loading ? 'Menyimpan...' : 'Simpan & Mulai Latihan'}
          </button>
        </form>

        <aside className="guide-panel card-panel">
          <h2>Format Dokumen</h2>
          <p>
            Kalau dokumen sudah menyertakan <code>Jawaban: X</code> per soal, kunci jawabannya
            otomatis terisi. Kalau tidak (mis. bank soal biasa), kamu tinggal pilih jawaban benar
            manual di panel sebelah kanan bawah setelah upload.
          </p>
          <pre className="format-example">{getFormatGuide()}</pre>
          <button type="button" className="btn btn-secondary btn-block" onClick={downloadTemplate}>
            Download Contoh Format
          </button>

          <div className="tips-list">
            <h3>Tips</h3>
            <ul>
              <li>Nomor soal diawali angka + titik (1., 2., 3.)</li>
              <li>Pilihan jawaban: A. B. C. D. (E. opsional)</li>
              <li>Kalau soal tergabung/tidak terpisah dengan benar, hapus soal itu dan tambahkan manual</li>
              <li>Bisa juga langsung klik "Tambah Soal Manual" tanpa upload file sama sekali</li>
            </ul>
          </div>
        </aside>
      </div>

      {previewQuestions.length > 0 && (
        <section className="section-block">
          <div className="section-header">
            <h2>Review & Tentukan Jawaban ({previewQuestions.length} soal)</h2>
          </div>

          <div className="review-edit-list">
            {previewQuestions.map((question, qIndex) => (
              <article key={question.id} className={`edit-card ${isQuestionComplete(question) ? 'complete' : 'incomplete'}`}>
                <div className="edit-card-top">
                  <span className="question-badge">Soal {qIndex + 1}</span>
                  <span className={`status-pill ${isQuestionComplete(question) ? 'success' : 'danger'}`}>
                    {isQuestionComplete(question) ? 'Lengkap' : 'Perlu jawaban'}
                  </span>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => removeQuestion(qIndex)}
                    title="Hapus soal ini"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <label>
                  Pertanyaan
                  <textarea
                    value={question.text}
                    onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                    rows={2}
                    placeholder="Tulis pertanyaan di sini..."
                  />
                </label>

                <div className="option-edit-list">
                  {question.options.map((option, optIndex) => (
                    <div key={option.key} className="option-edit-row">
                      <button
                        type="button"
                        className={`option-key-btn ${question.correctAnswer === option.key ? 'selected' : ''}`}
                        onClick={() => updateQuestion(qIndex, { correctAnswer: option.key })}
                        title="Tandai sebagai jawaban benar"
                      >
                        {option.key}
                      </button>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                        placeholder={`Pilihan ${option.key}`}
                      />
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => removeOption(qIndex, optIndex)}
                          title="Hapus pilihan ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {question.options.length < 5 && (
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => addOption(qIndex)}>
                      <Plus size={14} /> Tambah Pilihan
                    </button>
                  )}
                </div>

                <label>
                  Pembahasan (opsional)
                  <textarea
                    value={question.explanation}
                    onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                    rows={2}
                    placeholder="Jelaskan kenapa jawaban itu benar (boleh dikosongkan)"
                  />
                </label>
              </article>
            ))}
          </div>

          <button type="button" className="btn btn-secondary" onClick={addQuestion}>
            <Plus size={16} /> Tambah Soal Manual
          </button>
        </section>
      )}
    </div>
  );
}
