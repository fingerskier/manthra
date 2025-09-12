import { useEffect, useRef, useState, type MouseEvent } from 'react';
import './App.css';
import QuotesList from './com/QuotesList';
import { db } from './db';

function App() {
  const clicks = useRef(0);
  const initialUser = db.cloud.currentUser.value;
  const [loggedIn, setLoggedIn] = useState(!!initialUser.isLoggedIn);
  const [username, setUsername] = useState<string | null>(
    initialUser.isLoggedIn ? initialUser.userId ?? null : null,
  );

  useEffect(() => {
    const userSub = db.cloud.currentUser.subscribe((user) => {
      const isLoggedIn = !!user.isLoggedIn;
      setLoggedIn(isLoggedIn);
      setUsername(isLoggedIn ? user.userId ?? null : null);
      if (isLoggedIn) {
        db.cloud
          .sync()
          .catch((err) => console.error('Sync failed', err));
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
        {loggedIn && username && (
          <>
            {' '}
            <span
              aria-label="log out"
              onClick={handleLogout}
              role="button"
              style={{ cursor: 'pointer' }}
            >
              {username}
            </span>
          </>
        )}
        <br />
        <sub>considerable careful crafty compositions</sub>
      </h1>
      <QuotesList loggedIn={loggedIn} />
    </div>
  );
}

export default App;
