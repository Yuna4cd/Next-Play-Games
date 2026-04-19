import './App.css'
import Dashboard from '../pages/Dashborad'
import Navbar from '../components/Navbar'

function App() {

  

  return (
    <div className="app-shell">
      <Navbar logo="NextPlay" username="Maya Chen" />
      <Dashboard />
    </div>
  )
}

export default App
