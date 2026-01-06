import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>Welcome Planning Division Team!</h1>
      <button
        onClick={() => navigate('/current')}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Enter App
      </button>
    </div>
  );
}
