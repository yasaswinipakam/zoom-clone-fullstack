"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";

interface CurrentUser {
  hostId: number;
  displayName: string;
}

interface CurrentUserContextValue extends CurrentUser {
  setDisplayName: (name: string) => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

const STORAGE_KEY = "zoom_clone_user";

function loadOrCreateUser(): CurrentUser {
  if (typeof window === "undefined") {
    return { hostId: 1, displayName: "Host" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CurrentUser>;
      if (
        typeof parsed.hostId === "number" &&
        typeof parsed.displayName === "string"
      ) {
        return { hostId: parsed.hostId, displayName: parsed.displayName };
      }
    }
  } catch {
    // ignore parse errors — fall through to create new
  }
  const newUser: CurrentUser = {
    hostId: Math.floor(Math.random() * 999) + 1,
    displayName: "Host",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  return newUser;
}

export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<CurrentUser>({ hostId: 1, displayName: "Host" });

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    setUser(loadOrCreateUser());
  }, []);

  const setDisplayName = (name: string) => {
    const updated = { ...user, displayName: name };
    setUser(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const value = useMemo<CurrentUserContextValue>(
    () => ({ ...user, setDisplayName }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within <CurrentUserProvider>");
  }
  return ctx;
}
