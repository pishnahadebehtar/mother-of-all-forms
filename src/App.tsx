import { HashRouter as Router, Routes, Route } from "react-router-dom";
import ThemeProviders from "./components/ThemeProviders";
import Home from "./pages/Home";
import AboutPage from "./pages/About";

function App() {
  return (
    <div dir="rtl">
      <ThemeProviders>
        {/* Now using HashRouter */}
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </Router>
      </ThemeProviders>
    </div>
  );
}

export default App;
