import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

// Fallback values so forms work instantly; the server list replaces them on load
const DEFAULT_META = {
  programmes: ["Business Computing", "Computer Science", "Data Science", "Software Engineering", "Finance", "Marketing"],
  statuses: ["Active", "On leave", "Suspended", "Graduated"],
  genders: ["Female", "Male", "Prefer not to say"],
  years: [1, 2, 3, 4, 5],
};

const MetaContext = createContext(DEFAULT_META);

export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(DEFAULT_META);

  useEffect(() => {
    api.getMeta().then(setMeta).catch(() => {});
  }, []);

  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

export const useMeta = () => useContext(MetaContext);
