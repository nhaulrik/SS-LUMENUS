import { useState, useEffect } from 'react'
import CreateProjectDialog from '../components/CreateProjectDialog.jsx'
import styles from './ProjectLandingStep.module.css'

/**
 * ProjectLandingStep
 * 
 * Entry screen for the application.
 * Shows either "Start New Project" for first-time users,
 * or "Continue Project" + recent projects list for returning users.
 */
export default function ProjectLandingStep({ onProjectSelected, onCreateProject }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (!response.ok) throw new Error('Failed to load projects')
        const data = await response.json()
        setProjects(data.projects || [])
      } catch (err) {
        setError(err.message)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  const handleProjectCreated = async (projectData) => {
    setShowCreateDialog(false)
    // Reload projects
    const response = await fetch('/api/projects')
    const data = await response.json()
    setProjects(data.projects || [])
    // Navigate to project
    onCreateProject(projectData)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>SOLON Slide Studio</h1>
          <p className={styles.subtitle}>
            {projects.length === 0
              ? 'Create your first project to get started'
              : 'Continue working on your projects'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className={styles.errorBanner}>
            <p>{error}</p>
          </div>
        )}

        {/* Main content */}
        <div className={styles.content}>
          {projects.length === 0 ? (
            // New user flow
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <h2>No projects yet</h2>
              <p>Create a new project to start generating slide content with AI.</p>
              <button
                className={styles.primaryButton}
                onClick={() => setShowCreateDialog(true)}
              >
                Start New Project
              </button>
            </div>
          ) : (
            // Returning user flow
            <div className={styles.projectsContainer}>
              <div className={styles.projectsHeader}>
                <h2>Recent Projects</h2>
                <button
                  className={styles.primaryButton}
                  onClick={() => setShowCreateDialog(true)}
                >
                  + New Project
                </button>
              </div>

              <div className={styles.projectsList}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={styles.projectCard}
                    onClick={() => onProjectSelected(project.id)}
                  >
                    <div className={styles.projectCardHeader}>
                      <h3 className={styles.projectName}>{project.name}</h3>
                      <span className={styles.projectStatus}>{project.status}</span>
                    </div>

                    <div className={styles.projectMeta}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Templates:</span>
                        <span className={styles.metaValue}>{project.templates.length}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Flows:</span>
                        <span className={styles.metaValue}>{project.flows.length}</span>
                      </div>
                    </div>

                    <div className={styles.projectFooter}>
                      <time className={styles.timestamp}>
                        Updated {new Date(project.updatedAt).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <CreateProjectDialog
          onClose={() => setShowCreateDialog(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}
    </>
  )
}
