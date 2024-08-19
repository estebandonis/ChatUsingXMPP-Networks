import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Login, SignUp, XMPPChat } from "./pages";

function App() {

  return (
      <Router>
          <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/chat" element={<XMPPChat />} />
          </Routes>
      </Router>
  )
}

export default App
