import { useEffect, useRef } from 'react'

/**
 * useFocusTrap — Traps keyboard focus within a modal element.
 * 
 * When the modal is mounted, focus is moved to the first focusable element.
 * Tab/Shift+Tab navigation is constrained within the modal.
 * When the modal unmounts, focus is restored to the previously focused element.
 * 
 * Usage:
 *   const modalRef = useFocusTrap()
 *   return <div ref={modalRef} role="dialog">...</div>
 */
export function useFocusTrap() {
  const modalRef = useRef(null)
  const previousActiveElementRef = useRef(null)

  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    // Save the element that had focus before the modal opened
    previousActiveElementRef.current = document.activeElement

    // Get all focusable elements within the modal
    const getFocusableElements = () => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',')
      return Array.from(modal.querySelectorAll(selector))
    }

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    // Move focus to the first focusable element
    focusableElements[0].focus()

    // Handle Tab key to trap focus
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      const activeEl = document.activeElement

      if (e.shiftKey) {
        // Shift+Tab on first element: focus last
        if (activeEl === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab on last element: focus first
        if (activeEl === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    modal.addEventListener('keydown', handleKeyDown)

    return () => {
      modal.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that had it before
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus()
      }
    }
  }, [])

  return modalRef
}
