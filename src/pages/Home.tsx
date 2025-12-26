import { useNavigate } from 'react-router-dom';

interface HomeProps {
  navigateToApp?: () => void;
}

export default function Home({ navigateToApp }: HomeProps) {
  const navigate = useNavigate();

  const goToApp = () => {
    if (navigateToApp) navigateToApp();
    navigate('/current'); // route to your main gallery page
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>Welcome to the Central Database App</h1>
      <p>Click below to access the database content.</p>
      <button
        onClick={goToApp}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Enter App
      </button>
    </div>
  );
}
