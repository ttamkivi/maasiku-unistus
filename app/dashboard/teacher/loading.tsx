export default function TeacherDashboardLoading() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ width: 80, height: 14, background: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ width: 220, height: 28, background: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ width: 120, height: 14, background: '#e5e7eb', borderRadius: 4 }} />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 8, padding: '20px 22px' }}>
            <div style={{ width: 48, height: 32, background: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 80, height: 12, background: '#e5e7eb', borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 8, padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid #1C2832',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: 14, color: '#6b7280' }}>Laen andmeid...</p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
