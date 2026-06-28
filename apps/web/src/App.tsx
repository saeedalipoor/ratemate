import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './lib/auth';
import { BusinessPage } from './pages/BusinessPage';
import { HomePage } from './pages/HomePage';
import { ReviewPage } from './pages/ReviewPage';
import { SubmitReviewPage } from './pages/SubmitReviewPage';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/business/:slug" element={<BusinessPage />} />
            <Route path="/business/:slug/review" element={<SubmitReviewPage />} />
            <Route path="/review/:number" element={<ReviewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
