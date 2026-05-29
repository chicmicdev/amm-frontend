import { Outlet } from 'react-router-dom';
import Header from './Header';
import AppToaster from './AppToaster';

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '32px 16px' }}>
        <Outlet />
      </main>
      <AppToaster />
    </div>
  );
}
