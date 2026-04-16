/**
 * SlidePreview — Displays HTML content of a selected slide
 *
 * Shows:
 * - Slide metadata (title, export/slide reference)
 * - Slide index information
 * - Close button to dismiss preview
 *
 * Note: HTML content loading would require additional backend endpoints
 * to fetch the actual slide content from exports. For now, shows metadata.
 */

import styles from './SlidePreview.module.css';

const SlidePreview = ({ slide, onClose }) => {
  if (!slide) return null;

  const [exportId, slideIndex] = slide.slideRef ? slide.slideRef.split('/') : ['', ''];

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewHeader}>
        <div className={styles.previewMeta}>
          <h4 className={styles.previewTitle}>{slide.title}</h4>
          <div className={styles.previewDetails}>
            <span className={styles.badge}>{exportId}</span>
            <span className={styles.slideId}>Slide {slideIndex}</span>
          </div>
        </div>
        <button
          className={styles.closeButton}
          onClick={onClose}
          title="Close preview"
        >
          ✕
        </button>
      </div>

      <div className={styles.previewContent}>
        <div className={styles.noContent}>
          <p>Slide Preview</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
            Export: {exportId}<br />
            Slide Index: {slideIndex}<br />
            Title: {slide.title}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SlidePreview;
