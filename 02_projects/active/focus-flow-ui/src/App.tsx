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
const CommandCenter = lazy(() => import('./components/CommandCenter/CommandCenter').then(module => ({ default: module.CommandCenter })))
const IdeaDetail = lazy(() => import('./components/IdeaDetail/IdeaDetail').then(module => ({ default: module.IdeaDetail })))
const Sales = lazy(() => import('./components/Sales/Sales').then(module => ({ default: module.Sales })))
const CRM = lazy(() => import('./components/CRM/CRM').then(module => ({ default: module.CRM })))
const CRMDetail = lazy(() => import('./components/CRM/CRMDetail').then(module => ({ default: module.CRMDetail })))
const Voice = lazy(() => import('./components/Voice/Voice').then(module => ({ default: module.Voice })))
const Settings = lazy(() => import('./components/Settings/Settings').then(module => ({ default: module.Settings })))
const Upload = lazy(() => import('./components/Upload/Upload').then(module => ({ default: module.Upload })))
const Memory = lazy(() => import('./components/Memory/Memory').then(module => ({ default: module.Memory })))

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
            <Route path="/ideas/:id" element={<IdeaDetail />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/wellbeing" element={<Wellbeing />} />
            <Route path="/command" element={<CommandCenter />} />
            <Route path="/command/:threadId" element={<CommandCenter />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/crm/:id" element={<CRMDetail />} />
            <Route path="/voice" element={<Voice />} />
            <Route path="/voice/:threadId" element={<Voice />} />
            <Route path="/uploads" element={<Upload />} />
            <Route path="/memory" element={<Memory />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}

export default App
