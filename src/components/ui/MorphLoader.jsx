const COLORS = ['#c8922a', '#d4a843', '#e8c76a', '#c8922a'];

const MorphLoader = ({ visible, searchTerm }) => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 100,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(13,17,23,0.85)',
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'auto' : 'none',
    transition: 'opacity 0.5s ease',
    transform: 'translateZ(0)',
  }}>
    <div style={{
      position: 'relative',
      width: 80, height: 80,
      transform: 'translateZ(0)',
    }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 16, height: 16,
            background: COLORS[i],
            borderRadius: 2,
            willChange: 'transform',
            transform: 'translateZ(0)',
            animation: `morph-${i} 2s infinite ease-in-out`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
    <div style={{
      marginTop: 24,
      color: 'rgba(255,255,255,0.5)',
      fontSize: 11, fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.15em',
    }}>
      {searchTerm ? `Loading all data for (${searchTerm})` : 'Loading all data…'}
    </div>
  </div>
);

export default MorphLoader;
