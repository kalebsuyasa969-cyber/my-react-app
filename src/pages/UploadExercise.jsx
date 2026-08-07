import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, functions } from '../firebase';
import { extractTextFromFile } from '../utils/parseDocument';
import { getFormatGuide, parseQuestionsFromText } from '../utils/parseQuestions';
import { httpsCallable } from 'firebase/functions';

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
explanation: null,
  };
}

function isQuestionComplete(question) {
  const filledOptions = question.options.filter(
    (option) => option.text.trim()
  );

  return (
    Boolean(question.text.trim()) &&
    filledOptions.length >= 2
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

  const [timerMode, setTimerMode] = useState('stopwatch');
  const [durationMinutes, setDurationMinutes] = useState(30);

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
       const options = question.options
    .filter((_, o) => o !== optIndex)
    .map((option, o) => ({
      ...option,
      key: OPTION_KEYS[o],
    }));

  return {
    ...question,
    options,
  };
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
        `${incomplete.length} soal belum lengkap — pastikan tiap soal memiliki teks dan minimal dua pilihan jawaban.`
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
          .map((option) => ({
            key: option.key,
            text: option.text.trim(),
          })),

        correctAnswer: null,
        explanation: null,
      }));

      const docRef = await addDoc(collection(db, 'exercises'), {
        title: title.trim() || 'Latihan Tanpa Judul',
        fileName: file?.name || 'manual',
        fileType: file ? file.name.split('.').pop().toLowerCase() : 'manual',
        userId: user.uid,
        uploaderName: user.displayName || user.email,
        questionCount: finalQuestions.length,
        questions: finalQuestions,

        status: 'processing',

        timerMode,

        durationMinutes:
          timerMode === 'countdown'
            ? Number(durationMinutes)
            : null,

        createdAt: serverTimestamp(),
      });

      // Trigger AI processing to fill correctAnswer and explanation
      try {
        const processExercise = httpsCallable(functions, 'processExercise');
        await processExercise({ exerciseId: docRef.id });
      } catch (aiErr) {
        console.warn('AI processing failed:', aiErr);
        // Not blocking the flow; questions will still be usable
      }

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
        <p>
Upload file PDF, DOCX, atau TXT, lalu periksa kembali soal sebelum disimpan.
Kunci jawaban dan pembahasan akan diproses otomatis oleh sistem.
        </p>
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
          {completeCount}/{previewQuestions.length} soal siap diupload.
        </div>
      )}

        <div className="timer-setting">
          <h3>Mode Waktu</h3>

          <label>
            <input
              type="radio"
              name="timerMode"
              value="stopwatch"
              checked={timerMode === "stopwatch"}
              onChange={() => setTimerMode("stopwatch")}
            />
            Stopwatch (hitung lama pengerjaan)
          </label>

          <label>
            <input
              type="radio"
              name="timerMode"
              value="countdown"
              checked={timerMode === "countdown"}
              onChange={() => setTimerMode("countdown")}
            />
            Hitung Mundur
          </label>

          {timerMode === "countdown" && (
            <label>
              Durasi (menit)

              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Number(e.target.value))
                }
              />
            </label>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading || parsing}
        >
          {loading ? "Menyimpan..." : "Simpan & Mulai Latihan"}
        </button>
                </form>

                <aside className="guide-panel card-panel">
                  <h2>Format Dokumen</h2>
                  <p>
Dokumen cukup berisi nomor soal, pertanyaan, dan pilihan jawaban.
Jawaban benar serta pembahasan akan diproses otomatis oleh sistem setelah latihan diupload.
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
                    <h2>Review Soal ({previewQuestions.length} soal)</h2>
                  </div>

                  <div className="review-edit-list">
                    {previewQuestions.map((question, qIndex) => (
                      <article key={question.id} className={`edit-card ${isQuestionComplete(question) ? 'complete' : 'incomplete'}`}>
                        <div className="edit-card-top">
                          <span className="question-badge">Soal {qIndex + 1}</span>
                          <span className={`status-pill ${isQuestionComplete(question) ? 'success' : 'danger'}`}>
                            {isQuestionComplete(question) ? 'Siap Upload' : 'Belum Lengkap'}
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