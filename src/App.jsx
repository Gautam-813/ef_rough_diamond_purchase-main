import './App.css';
import { UserProvider, useUser } from './context/UserContext';
import LoginForm from './components/LoginForm';
import Dashboard from './Dashboard';

function AppContent() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', background: '#0f172a', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', color: '#fff' 
      }}>
        Loading EF Diamond ERP...
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginForm />;
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
