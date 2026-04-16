import { useState, useEffect } from 'react'
import TemplateUploadDialog from '../components/TemplateUploadDialog.jsx'
import CreateFlowDialog from '../components/CreateFlowDialog.jsx'
import styles from './ProjectDashboardStep.module.css'

/**
 * ProjectDashboardStep
 * 
 * Shows all templates and flows for a project.
 * Allows user to:
 * - Upload new templates
 * - Create new flows from templates
 * - Open existing flows to continue work
 * - Go back to project list
 */
export default function ProjectDashboardStep({
  projectName,
  onFlowSelected,
  onBackToProjects
}) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showFlowDialog, setShowFlowDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  // Load project on mount
  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectName}`)
        if (!response.ok) throw new Error('Failed to load project')
        const data = await response.json()
        setProject(data.project)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [projectName])

  const handleTemplateUploadSuccess = async () => {
    setShowTemplateDialog(false)
    // Reload project
    const response = await fetch(`/api/projects/${projectName}`)
    const data = await response.json()
    setProject(data.project)
  }

  const handleCreateFlowClick = (template) => {
    setSelectedTemplate(template)
    setShowFlowDialog(true)
  }

  const handleFlowCreated = async () => {
    setShowFlowDialog(false)
    // Reload project
    const response = await fetch(`/api/projects/${projectName}`)
    const data = await response.json()
    setProject(data.project)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Error Loading Project</h2>
          <p>{error || 'Project not found'}</p>
          <button className={styles.primaryButton} onClick={onBackToProjects}>
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <button
              className={styles.backButton}
              onClick={onBackToProjects}
              aria-label="Back to projects"
            >
              ← Back
            </button>
            <h1 className={styles.projectTitle}>{project.name}</h1>
          </div>
          <p className={styles.projectStatus}>
            Status: <span className={styles.statusBadge}>{project.status}</span>
          </p>
        </div>

        {/* Main content */}
        <div className={styles.content}>
          {/* Templates Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Templates</h2>
              <button
                className={styles.primaryButton}
                onClick={() => setShowTemplateDialog(true)}
              >
                + Upload Template
              </button>
            </div>

            {project.templates.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No templates yet. Upload one to get started.</p>
              </div>
            ) : (
              <div className={styles.templatesList}>
                {project.templates.map((template) => {
                  // Count flows using this template
                  const flowsForTemplate = project.flows.filter(
                    (f) => f.templateId === template.templateId
                  )

                  return (
                    <div key={template.templateId} className={styles.templateCard}>
                      <div className={styles.templateHeader}>
                        <h3 className={styles.templateName}>{template.filename}</h3>
                        <span className={styles.templateSize}>
                          {(template.fileSize / 1024).toFixed(1)} KB
                        </span>
                      </div>

                      {template.description && (
                        <p className={styles.templateDescription}>{template.description}</p>
                      )}

                      <div className={styles.templateMeta}>
                        <span className={styles.metaItem}>
                          {flowsForTemplate.length} flow{flowsForTemplate.length !== 1 ? 's' : ''}
                        </span>
                        <span className={styles.metaItem}>
                          Uploaded {new Date(template.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className={styles.templateActions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleCreateFlowClick(template)}
                        >
                          + New Flow
                        </button>
                      </div>

                      {/* Flows for this template */}
                      {flowsForTemplate.length > 0 && (
                        <div className={styles.flowsList}>
                          <div className={styles.flowsListHeader}>Active Flows:</div>
                          {flowsForTemplate.map((flow) => (
                            <button
                              key={flow.flowId}
                              className={styles.flowLink}
                              onClick={() => onFlowSelected(flow.flowId)}
                            >
                              <span className={styles.flowName}>{flow.flowId}</span>
                              <span className={styles.flowArrow}>→</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* All Flows Section (if multiple flows exist) */}
          {project.flows.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>All Flows</h2>

              <div className={styles.flowsGrid}>
                {project.flows.map((flow) => (
                  <div key={flow.flowId} className={styles.flowCard}>
                    <div className={styles.flowCardHeader}>
                      <h3 className={styles.flowName}>{flow.flowId}</h3>
                      <span className={styles.flowStatus}>{flow.status}</span>
                    </div>

                    <div className={styles.flowMeta}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Template:</span>
                        <span className={styles.metaValue}>{flow.templateFilename}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Created:</span>
                        <span className={styles.metaValue}>
                          {new Date(flow.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      className={styles.flowOpenButton}
                      onClick={() => onFlowSelected(flow.flowId)}
                    >
                      Open Flow
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showTemplateDialog && (
        <TemplateUploadDialog
          projectName={projectName}
          onClose={() => setShowTemplateDialog(false)}
          onSuccess={handleTemplateUploadSuccess}
        />
      )}

      {showFlowDialog && selectedTemplate && (
        <CreateFlowDialog
          projectName={projectName}
          template={selectedTemplate}
          onClose={() => {
            setShowFlowDialog(false)
            setSelectedTemplate(null)
          }}
          onSuccess={handleFlowCreated}
        />
      )}
    </>
  )
}
