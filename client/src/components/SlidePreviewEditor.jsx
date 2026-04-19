import { useEffect, useRef } from 'react'
import styles from './SlidePreviewEditor.module.css'

/**
 * SlidePreviewEditor
 *
 * Preview iframe with click-to-edit support.
 * Reuses the click-to-edit script from HtmlPreviewStep.
 */
export default function SlidePreviewEditor({
  html,
  onEdit,
  projectName,
  flowId,
  exportId,
  slideFile,
}) {
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!iframeRef.current) return

    const iframe = iframeRef.current
    iframe.srcdoc = html

    const handleIframeLoad = () => {
      const doc = iframe.contentDocument
      if (!doc) return

      // Inject click-to-edit script
      const script = doc.createElement('script')
      script.textContent = `
        (function() {
          const editableTagNames = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'LI', 'TD', 'TH', 'DIV']
          const structuralTagNames = ['HTML', 'BODY', 'SECTION', 'ARTICLE', 'NAV', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE']

          function isEditable(el) {
            if (structuralTagNames.includes(el.tagName)) return false
            if (!editableTagNames.includes(el.tagName)) return false
            const text = el.innerText?.trim() || el.textContent?.trim()
            return text && text.length > 0
          }

          function getSelectorPath(el) {
            const parts = []
            let node = el
            while (node && node !== document.body) {
              let selector = node.tagName.toLowerCase()
              if (node.id) {
                selector += '#' + node.id
                parts.unshift(selector)
                break
              }
              const siblings = Array.from(node.parentNode?.children || []).filter(
                s => s.tagName === node.tagName
              )
              if (siblings.length > 1) {
                const idx = siblings.indexOf(node) + 1
                selector += ':nth-of-type(' + idx + ')'
              }
              parts.unshift(selector)
              node = node.parentNode
            }
            return parts.join(' > ')
          }

          // Mark editable elements
          document.querySelectorAll('*').forEach(el => {
            if (isEditable(el)) {
              el.style.cursor = 'text'
              el.addEventListener('mouseenter', () => {
                el.style.outline = '2px solid #93c5fd'
                el.style.outlineOffset = '2px'
              })
              el.addEventListener('mouseleave', () => {
                if (el.contentEditable !== 'true') {
                  el.style.outline = 'none'
                }
              })
              el.addEventListener('click', e => {
                e.stopPropagation()
                el.contentEditable = 'true'
                el.focus()
                const range = document.createRange()
                range.selectNodeContents(el)
                const sel = window.getSelection()
                sel.removeAllRanges()
                sel.addRange(range)
              })
              el.addEventListener('blur', () => {
                el.contentEditable = 'false'
                el.style.outline = 'none'
                const newHtml = document.documentElement.outerHTML
                window.parent.postMessage({ type: 'solon-edit', newHtml }, '*')
              })
              el.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  el.blur()
                }
              })
            }
          })
        })()
      `
      doc.head.appendChild(script)
    }

    iframe.addEventListener('load', handleIframeLoad)

    return () => {
      iframe.removeEventListener('load', handleIframeLoad)
    }
  }, [html])

  // Listen for postMessage from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type !== 'solon-edit') return

      const { newHtml } = event.data
      if (newHtml) {
        onEdit(newHtml)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [onEdit])

  return (
    <div className={styles.previewContainer}>
      <iframe
        ref={iframeRef}
        className={styles.preview}
        sandbox="allow-same-origin allow-scripts"
        title="Slide preview"
      />
    </div>
  )
}
