export default function LoadingSpinner({ message = 'Memuat...' }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}
