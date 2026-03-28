import { Outlet } from 'react-router-dom';
import Header from './Header';
import ToastContainer from '../common/Toast';

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '32px 24px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
