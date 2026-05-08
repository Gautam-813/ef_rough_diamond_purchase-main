import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem("ef_token");
    if (token) {
      try {
        const userData = await api.getMe();
        if (userData.id) setUser(userData);
        else localStorage.removeItem("ef_token");
      } catch (e) {
        localStorage.removeItem("ef_token");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem("ef_token");
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
