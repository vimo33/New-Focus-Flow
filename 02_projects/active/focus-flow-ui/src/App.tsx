import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './lib'
import LoadingFallback from './components/LoadingFallback/LoadingFallback'

// Lazy load route components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then(module => ({ default: module.Dashboard })))
const Capture = lazy(() => import('./components/Capture/Capture').then(module => ({ default: module.Capture })))
const Inbox = lazy(() => import('./components/Inbox/Inbox').then(module => ({ default: module.Inbox })))
const Projects = lazy(() => import('./components/Projects/Projects').then(module => ({ default: module.Projects })))
const ProjectDetail = lazy(() => import('./components/ProjectDetail/ProjectDetail').then(module => ({ default: module.ProjectDetail })))
const Calendar = lazy(() => import('./components/Calendar/Calendar').then(module => ({ default: module.Calendar })))
const Ideas = lazy(() => import('./components/Ideas/Ideas').then(module => ({ default: module.Ideas })))
const Wellbeing = lazy(() => import('./components/Wellbeing/Wellbeing').then(module => ({ default: module.Wellbeing })))
const Voice = lazy(() => import('./components/Voice/Voice').then(module => ({ default: module.Voice })))

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/capture" element={<Capture />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/wellbeing" element={<Wellbeing />} />
            <Route path="/voice" element={<Voice />} />
            <Route path="/voice/:threadId" element={<Voice />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}

export default App
