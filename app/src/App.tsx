import { useEffect, useRef, useState } from 'react';
import type { DBRealmRole } from 'dexie-cloud-common';
import './App.css';
import QuotesList from './QuotesList';
import { db } from './db';

function App() {
  const clicks = useRef(0);
  const [canEdit, setCanEdit] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const rolesSub = db.cloud.roles.subscribe(
      (roles: Record<string, DBRealmRole>) => {
        setCanEdit(!!roles.editor);
      },
    );
    const userSub = db.cloud.currentUser.subscribe((user) => {
      setLoggedIn(user.isLoggedIn);
      if (user.isLoggedIn) {
        db.cloud.sync().catch((err) => console.error('Sync failed', err));
      }
    });
    db.cloud.sync().catch((err) => console.error('Sync failed', err));
    return () => {
      rolesSub.unsubscribe();
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

  return (
    <div>
      <h1 onClick={handleHeaderClick}>
        Manthra {loggedIn && <span aria-label="logged in">👤</span>}
        <br />
        <sub>considerable careful crafty compositions</sub>
      </h1>
      <QuotesList editable={canEdit} />
    </div>
  );
}

export default App;
