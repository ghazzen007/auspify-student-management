import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import StudentsPage from "./pages/StudentsPage.jsx";
import StudentDetailPage from "./pages/StudentDetailPage.jsx";
import StudentFormPage from "./pages/StudentFormPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<StudentsPage />} />
        <Route path="students/new" element={<StudentFormPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="students/:id/edit" element={<StudentFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
