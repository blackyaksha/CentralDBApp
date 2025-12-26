import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>Welcome to the Central Database App</h1>
      <p>Click below to access the database content.</p>
      <button
        onClick={() => navigate('/current')}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Enter App
      </button>
    </div>
  );
}
