import { BrowserRouter as Router } from 'react-router-dom';
import AppProviders from './app/providers/AppProviders';
import AppRoutes from './app/router/AppRoutes';
import './App.css';

function App() {
  return (
    <Router>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </Router>
  );
}

export default App;
