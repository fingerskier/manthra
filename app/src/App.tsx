import { useEffect, useRef, useState, type MouseEvent } from 'react';
import './App.css';
import QuotesList from './QuotesList';
import { db } from './db';

function App() {
  const clicks = useRef(0);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const userSub = db.cloud.currentUser.subscribe((user) => {
      setLoggedIn(!!user.isLoggedIn);
      if (user.isLoggedIn) {
        db.cloud.sync().catch((err) => console.error('Sync failed', err));
      }
    });
    db.cloud.sync().catch((err) => console.error('Sync failed', err));
    return () => {
      userSub.unsubscribe();
    };
  }, []);

  const handleHeaderClick = () => {
    clicks.current += 1;
    if (clicks.current === 10) {
      db.cloud.login();
      clicks.current = 0;
    }
  };

  const handleLogout = (e: MouseEvent) => {
    e.stopPropagation();
    clicks.current = 0;
    db.cloud.logout();
  };

  return (
    <div>
      <h1 onClick={handleHeaderClick}>
        Manthra
        {loggedIn && (
          <span
            aria-label="log out"
            onClick={handleLogout}
            role="button"
            style={{ cursor: 'pointer' }}
          >
            👤
          </span>
        )}
        <br />
        <sub>considerable careful crafty compositions</sub>
      </h1>
      <QuotesList loggedIn={loggedIn} />
    </div>
  );
}

export default App;
